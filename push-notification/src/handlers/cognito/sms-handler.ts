import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';
import { KmsDecryptionService } from '../../services/aws/kms';
import { CognitoTemplateService } from '../../services/cognito/template-service';
import { SmsTemplateService } from '../../services/sms/template-service';
import { getUzbekistanOperatorRouting } from '../../utils/validation';
import { CognitoEvent } from '../../types/events';

export class CognitoHandler {
    private kmsService: KmsDecryptionService;
    private templateService: CognitoTemplateService;
    private smsTemplateService: SmsTemplateService;

    constructor(
        private playMobileService: PlayMobileService,
        private awsSmsService: AwsSmsService,
        userPoolId?: string
    ) {
        this.kmsService = new KmsDecryptionService();
        this.templateService = new CognitoTemplateService(userPoolId);
        this.smsTemplateService = new SmsTemplateService();
    }

    /**
     * Detect language based on phone number region
     * Uzbekistan numbers (998) -> 'uz', all others -> 'ja'
     */
    private detectLanguageFromPhone(phoneNumber: string): 'uz' | 'ja' {
        const routing = getUzbekistanOperatorRouting(phoneNumber);
        return routing.isUzbekistan ? 'uz' : 'ja';
    }

    async handleCognitoSms(event: CognitoEvent): Promise<CognitoEvent> {
        try {
            const triggerSource = event.triggerSource;
            const phoneNumber = event.request.userAttributes.phone_number || '';

            console.log(
                `📱 Processing Cognito trigger: ${triggerSource} for phone ending in ${phoneNumber.slice(-4)}`
            );

            // Check if it's an international number first
            const routing = getUzbekistanOperatorRouting(phoneNumber);

            if (!routing.isUzbekistan) {
                console.log(
                    `🌍 International number detected (${phoneNumber.slice(0, 4)}***), routing via AWS`
                );
                return await this.handleInternationalNumber(event, phoneNumber);
            }

            console.log(
                `🇺🇿 Uzbekistan number detected: ${routing.operator} - routing to PlayMobile`
            );

            // Handle CustomSMSSender triggers (modern approach with encrypted codes)
            if (triggerSource.startsWith('CustomSMSSender_')) {
                return await this.handleCustomSMSSender(event, phoneNumber);
            }

            // Handle other triggers using templates
            return await this.handleTemplateBasedSms(event, phoneNumber);
        } catch (error) {
            console.error('❌ Cognito SMS handler error:', error);
            console.warn('⚠️ Falling back to Cognito due to handler error');
            return event; // Let Cognito handle on any error
        }
    }

    private async handleInternationalNumber(
        event: CognitoEvent,
        phoneNumber: string
    ): Promise<CognitoEvent> {
        console.log(`🌍 Processing international number via AWS SMS`);

        try {
            let message: string;

            // Handle CustomSMSSender triggers (with encrypted codes)
            if (event.triggerSource.startsWith('CustomSMSSender_')) {
                const encryptedCode = event.request.code;
                if (!encryptedCode) {
                    throw new Error(
                        'No encrypted code provided in CustomSMSSender event'
                    );
                }

                console.log(`🔓 Decrypting code for international SMS...`);
                const decryptedCode =
                    await this.kmsService.decryptCode(encryptedCode);

                // Try to get template from Cognito User Pool
                const template = await this.templateService.getTemplate(
                    event.triggerSource,
                    'sms'
                );

                if (template) {
                    const placeholders = this.buildPlaceholders(
                        event,
                        decryptedCode
                    );
                    message = this.templateService.processTemplate(
                        template,
                        placeholders
                    );
                    // Append a mobile deep link for smoother onboarding
                    const link = this.buildAuthDeepLink();
                    if (link) message = `${message} ${link}`;
                    console.log(
                        `📋 Using Cognito template for international SMS`
                    );
                } else {
                    message = this.buildFallbackMessage(event, decryptedCode);
                    console.log(
                        `📱 Using fallback message for international SMS`
                    );
                }
            } else {
                // Handle other triggers using templates or prepared messages
                const template = await this.templateService.getTemplate(
                    event.triggerSource,
                    'sms'
                );

                if (template) {
                    const placeholders = this.buildPlaceholders(event);
                    message = this.templateService.processTemplate(
                        template,
                        placeholders
                    );
                    const link = this.buildAuthDeepLink();
                    if (link) message = `${message} ${link}`;
                    console.log(
                        `📋 Using Cognito template for international SMS`
                    );
                } else if (event.response?.smsMessage) {
                    message = event.response.smsMessage;
                    const link = this.buildAuthDeepLink();
                    if (link) message = `${message} ${link}`;
                    console.log(
                        `📱 Using Cognito prepared message for international SMS`
                    );
                } else {
                    console.warn(
                        '⚠️ No message template or prepared message found for international SMS'
                    );
                    return event; // Let Cognito handle if no message available
                }
            }

            // Send via AWS SMS
            console.log(
                `📤 Sending international SMS via AWS to ${phoneNumber.slice(0, 4)}***`
            );
            const success = await this.awsSmsService.sendSms(
                phoneNumber,
                message
            );

            if (success) {
                // Suppress Cognito's SMS since we sent our own
                if (!event.response) {
                    event.response = {};
                }
                event.response.smsMessage = '';
                console.log('✅ International SMS sent successfully via AWS');
            } else {
                console.warn(
                    '⚠️ AWS international SMS failed, letting Cognito handle SMS'
                );
                // Don't modify event.response - let Cognito send it as fallback
            }

            return event;
        } catch (error) {
            console.error('❌ International SMS processing failed:', error);
            console.warn('⚠️ Falling back to Cognito for international SMS');
            return event; // Let Cognito handle on error
        }
    }

    private async handleCustomSMSSender(
        event: CognitoEvent,
        phoneNumber: string
    ): Promise<CognitoEvent> {
        console.log(
            `🔐 CustomSMSSender trigger detected: ${event.triggerSource}`
        );

        try {
            const encryptedCode = event.request.code;
            if (!encryptedCode) {
                throw new Error(
                    'No encrypted code provided in CustomSMSSender event'
                );
            }

            console.log(`🔓 Decrypting code from Cognito...`);
            const decryptedCode =
                await this.kmsService.decryptCode(encryptedCode);
            console.log(`✅ Code decrypted successfully`);

            // Fetch the appropriate template from Cognito User Pool
            console.log(
                `📋 Fetching template for trigger: ${event.triggerSource}`
            );
            const template = await this.templateService.getTemplate(
                event.triggerSource,
                'sms'
            );

            let message: string;
            if (template) {
                // Prepare placeholders for template processing
                const placeholders = this.buildPlaceholders(
                    event,
                    decryptedCode
                );
                message = this.templateService.processTemplate(
                    template,
                    placeholders
                );
                const link = this.buildAuthDeepLink();
                if (link) message = `${message} ${link}`;
                console.log(`📤 Using Cognito template: "${template}"`);
            } else {
                console.warn(
                    `⚠️ No template found for ${event.triggerSource}, using fallback`
                );
                message = this.buildFallbackMessage(event, decryptedCode);
            }

            // Send via PlayMobile for Uzbekistan numbers
            console.log(`📤 Sending SMS via PlayMobile`);
            const success = await this.playMobileService.sendSms(
                phoneNumber,
                message
            );

            if (success) {
                // Suppress Cognito's fallback SMS since we sent our own
                if (!event.response) {
                    event.response = {};
                }
                event.response.smsMessage = '';
                console.log('✅ SMS sent successfully via PlayMobile');
            } else {
                console.warn(
                    '⚠️ PlayMobile failed, letting Cognito handle SMS'
                );
                // Don't modify event.response - let Cognito send it
            }

            return event;
        } catch (error) {
            console.error('❌ CustomSMSSender processing failed:', error);
            console.warn('⚠️ Falling back to Cognito SMS due to error');
            return event; // Let Cognito handle on error
        }
    }

    private async handleTemplateBasedSms(
        event: CognitoEvent,
        phoneNumber: string
    ): Promise<CognitoEvent> {
        const shouldProcess =
            event.triggerSource.includes('SMS') ||
            event.triggerSource.includes('CustomMessage_');

        if (!shouldProcess) {
            console.log(
                `⏭️ Skipping trigger: ${event.triggerSource} (not SMS-related)`
            );
            return event;
        }

        try {
            let message: string | undefined;

            // Try to get template from Cognito User Pool first
            const template = await this.templateService.getTemplate(
                event.triggerSource,
                'sms'
            );

            if (template) {
                // Use Cognito template
                const placeholders = this.buildPlaceholders(event);
                message = this.templateService.processTemplate(
                    template,
                    placeholders
                );
                const link = this.buildAuthDeepLink();
                if (link) message = `${message} ${link}`;
                console.log(
                    `📋 Using Cognito User Pool template for ${event.triggerSource}`
                );
            } else {
                // Fallback to Cognito's prepared message
                message = event.response?.smsMessage;
                if (message) {
                    const link = this.buildAuthDeepLink();
                    if (link) message = `${message} ${link}`;
                    console.log(
                        `📱 Using Cognito prepared message for ${event.triggerSource}`
                    );
                }
            }

            if (message) {
                // Send via PlayMobile for Uzbekistan numbers
                console.log(`📤 Sending SMS via PlayMobile`);
                const success = await this.playMobileService.sendSms(
                    phoneNumber,
                    message
                );

                if (success) {
                    // Suppress Cognito's SMS since we sent our own
                    if (!event.response) {
                        event.response = {};
                    }
                    event.response.smsMessage = '';
                    console.log('✅ SMS sent successfully via PlayMobile');
                } else {
                    console.warn(
                        '⚠️ PlayMobile failed, letting Cognito handle SMS'
                    );
                    // Don't modify event.response - let Cognito send it
                }
            }
        } catch (templateError) {
            console.error('❌ Template processing error:', templateError);
            console.warn('⚠️ Falling back to default Cognito behavior');
        }

        return event;
    }

    private buildFallbackMessage(
        event: CognitoEvent,
        decryptedCode: string
    ): string {
        const username = this.extractUsername(event);
        const link = this.buildAuthDeepLink();
        const phoneNumber = event.request.userAttributes.phone_number || '';
        const language = this.detectLanguageFromPhone(phoneNumber);

        // Use SmsTemplateService for localized, optimized messages
        switch (event.triggerSource) {
            case 'CustomSMSSender_AdminCreateUser':
                return this.smsTemplateService.generateAccountCreationSms(
                    {
                        login: username,
                        tempPassword: decryptedCode,
                        appLink: link,
                    },
                    { language }
                );
            case 'CustomSMSSender_ForgotPassword':
                return this.smsTemplateService.generatePasswordResetSms(
                    {
                        code: decryptedCode,
                        expiryMinutes: 5,
                    },
                    { language }
                );
            case 'CustomSMSSender_Authentication':
            case 'CustomSMSSender_ResendCode':
            default:
                return this.smsTemplateService.generateLoginCodeSms(
                    {
                        code: decryptedCode,
                        expiryMinutes: 5,
                    },
                    { language }
                );
        }
    }

    private buildPlaceholders(
        event: CognitoEvent,
        decryptedCode?: string
    ): Record<string, string> {
        const placeholders: Record<string, string> = {};

        // Add code placeholder
        if (decryptedCode) {
            placeholders.code = decryptedCode;
        } else if (event.request.codeParameter) {
            placeholders.code = event.request.codeParameter;
        }

        // Add username placeholder
        if (event.request.usernameParameter) {
            placeholders.username = event.request.usernameParameter;
        } else {
            placeholders.username = this.extractUsername(event);
        }

        // Add user attributes
        Object.entries(event.request.userAttributes || {}).forEach(
            ([key, value]) => {
                placeholders[key] = value;
            }
        );

        // Add deep link placeholder for templates that include it
        const deepLink = this.buildAuthDeepLink();
        if (deepLink) {
            placeholders.deeplink = deepLink;
            placeholders.deepLink = deepLink;
        }

        return placeholders;
    }

    private extractUsername(event: CognitoEvent): string {
        return (
            event.request.userAttributes.phone_number ||
            event.request.usernameParameter ||
            event.request.userAttributes.preferred_username ||
            event.request.userAttributes.email?.split('@')[0] ||
            `user${Date.now().toString().slice(-4)}`
        );
    }

    /**
     * Validate that required templates are configured
     */
    async validateTemplateConfiguration(): Promise<void> {
        try {
            const validation =
                await this.templateService.validateTemplateConfiguration();

            if (!validation.valid) {
                console.warn(
                    '⚠️ Missing Cognito message templates:',
                    validation.missing
                );
                console.warn(
                    '📝 Please configure these templates in AWS Console > Cognito User Pool > Message Templates'
                );
            } else {
                console.log(
                    '✅ All required Cognito message templates are configured'
                );
            }
        } catch (error) {
            console.warn(
                '⚠️ Could not validate template configuration:',
                error
            );
        }
    }

    /**
     * Build a simple universal link to the mobile app (no extra params)
     */
    private buildAuthDeepLink(): string {
        return 'https://appuri-hogosha.vercel.app/parentnotification';
    }
}
