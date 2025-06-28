import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';
import { KmsDecryptionService } from '../../services/aws/kms';
import { CognitoTemplateService } from '../../services/cognito/template-service';
import { getUzbekistanOperatorRouting } from '../../utils/validation';
import { CognitoEvent } from '../../types/events';

export class CognitoHandler {
    private kmsService: KmsDecryptionService;
    private templateService: CognitoTemplateService;

    constructor(
        private playMobileService: PlayMobileService,
        private awsSmsService: AwsSmsService,
        userPoolId?: string
    ) {
        this.kmsService = new KmsDecryptionService();
        this.templateService = new CognitoTemplateService(userPoolId);
    }

    async handleCognitoSms(event: CognitoEvent): Promise<CognitoEvent> {
        try {
            const triggerSource = event.triggerSource;
            const phoneNumber = event.request.userAttributes.phone_number || '';

            console.log(`📱 Processing Cognito trigger: ${triggerSource} for phone ending in ${phoneNumber.slice(-4)}`);

            // Handle CustomSMSSender triggers (modern approach with encrypted codes)
            if (triggerSource.startsWith('CustomSMSSender_')) {
                return await this.handleCustomSMSSenderWithTemplates(event, phoneNumber);
            }

            // Handle other triggers using templates
            return await this.handleTemplateBasedSms(event, phoneNumber);

        } catch (error) {
            console.error('❌ Cognito SMS handler error:', error);
            return event;
        }
    }

    private async handleCustomSMSSenderWithTemplates(event: CognitoEvent, phoneNumber: string): Promise<CognitoEvent> {
        console.log(`🔐 CustomSMSSender trigger detected: ${event.triggerSource}`);

        try {
            const encryptedCode = event.request.code;
            if (!encryptedCode) {
                throw new Error('No encrypted code provided in CustomSMSSender event');
            }

            console.log(`🔓 Decrypting code from Cognito...`);
            const decryptedCode = await this.kmsService.decryptCode(encryptedCode);
            console.log(`✅ Code decrypted successfully`);

            // Fetch the appropriate template from Cognito User Pool
            console.log(`📋 Fetching template for trigger: ${event.triggerSource}`);
            const template = await this.templateService.getTemplate(event.triggerSource, 'sms');

            if (!template) {
                console.warn(`⚠️ No template found for ${event.triggerSource}, using fallback`);
                return await this.handleFallbackMessage(event, phoneNumber, decryptedCode);
            }

            // Prepare placeholders for template processing
            const placeholders = this.buildPlaceholders(event, decryptedCode);

            // Process the template with actual values
            const message = this.templateService.processTemplate(template, placeholders);

            console.log(`📤 Using Cognito template: "${template}"`);
            console.log(`📤 Processed message: [CONTENT_REDACTED]`);

            await this.routeMessage(phoneNumber, message);

            // Suppress Cognito's fallback SMS since we sent our own
            if (!event.response) {
                event.response = {};
            }
            event.response.smsMessage = '';

            return event;

        } catch (error) {
            console.error('❌ CustomSMSSender processing failed:', error);
            console.warn('⚠️ Falling back to Cognito SMS due to error');
            return event;
        }
    }

    private async handleTemplateBasedSms(event: CognitoEvent, phoneNumber: string): Promise<CognitoEvent> {
        const shouldProcess = event.triggerSource.includes('SMS') ||
            event.triggerSource.includes('CustomMessage_');

        if (!shouldProcess) {
            console.log(`⏭️ Skipping trigger: ${event.triggerSource} (not SMS-related)`);
            return event;
        }

        try {
            // Try to get template from Cognito User Pool first
            const template = await this.templateService.getTemplate(event.triggerSource, 'sms');

            if (template) {
                // Use Cognito template
                const placeholders = this.buildPlaceholders(event);
                const message = this.templateService.processTemplate(template, placeholders);

                console.log(`📋 Using Cognito User Pool template for ${event.triggerSource}`);
                const success = await this.routeMessage(phoneNumber, message);

                if (success) {
                    if (!event.response) {
                        event.response = {};
                    }
                    event.response.smsMessage = '';
                    console.log('✅ SMS sent successfully using Cognito template');
                } else {
                    console.warn('⚠️ Custom routing failed, letting Cognito handle SMS');
                }
            } else {
                // Fallback to Cognito's prepared message
                const message = event.response?.smsMessage;
                if (message) {
                    console.log(`📱 Using Cognito prepared message for ${event.triggerSource}`);
                    const success = await this.routeMessage(phoneNumber, message);

                    if (success) {
                        if (!event.response) {
                            event.response = {};
                        }
                        event.response.smsMessage = '';
                        console.log('✅ SMS sent successfully via custom routing');
                    }
                }
            }

        } catch (templateError) {
            console.error('❌ Template processing error:', templateError);
            console.warn('⚠️ Falling back to default Cognito behavior');
        }

        return event;
    }

    private async handleFallbackMessage(event: CognitoEvent, phoneNumber: string, decryptedCode: string): Promise<CognitoEvent> {
        console.log('🔄 Using fallback message templates');

        let message = '';
        const username = this.extractUsername(event);

        // Fallback templates (AWS default format)
        switch (event.triggerSource) {
            case 'CustomSMSSender_AdminCreateUser':
                message = `Your username is ${username} and temporary password is ${decryptedCode}`;
                break;
            case 'CustomSMSSender_Authentication':
            case 'CustomSMSSender_ForgotPassword':
            case 'CustomSMSSender_ResendCode':
                message = `Your verification code is ${decryptedCode}`;
                break;
            default:
                message = `Your code is ${decryptedCode}`;
                break;
        }

        await this.routeMessage(phoneNumber, message);

        if (!event.response) {
            event.response = {};
        }
        event.response.smsMessage = '';

        return event;
    }

    private buildPlaceholders(event: CognitoEvent, decryptedCode?: string): Record<string, string> {
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
        Object.entries(event.request.userAttributes || {}).forEach(([key, value]) => {
            placeholders[key] = value;
        });

        return placeholders;
    }

    private async routeMessage(phoneNumber: string, message: string): Promise<boolean> {
        const routing = getUzbekistanOperatorRouting(phoneNumber);

        if (routing.isUzbekistan && routing.usePlayMobile) {
            console.log(`📤 Routing ${routing.operator} via PlayMobile`);
            return await this.playMobileService.sendSms(phoneNumber, message);
        } else {
            console.log(`📤 Routing ${routing.operator || 'international'} via AWS`);
            return await this.awsSmsService.sendSms(phoneNumber, message);
        }
    }

    private extractUsername(event: CognitoEvent): string {
        return event.request.usernameParameter ||
            event.request.userAttributes.preferred_username ||
            event.request.userAttributes.email?.split('@')[0] ||
            event.request.userAttributes.phone_number?.replace(/[^0-9]/g, '').slice(-8) ||
            `user${Date.now().toString().slice(-4)}`;
    }

    /**
     * Validate that required templates are configured
     */
    async validateTemplateConfiguration(): Promise<void> {
        try {
            const validation = await this.templateService.validateTemplateConfiguration();

            if (!validation.valid) {
                console.warn('⚠️ Missing Cognito message templates:', validation.missing);
                console.warn('📝 Please configure these templates in AWS Console > Cognito User Pool > Message Templates');
            } else {
                console.log('✅ All required Cognito message templates are configured');
            }
        } catch (error) {
            console.warn('⚠️ Could not validate template configuration:', error);
        }
    }
}