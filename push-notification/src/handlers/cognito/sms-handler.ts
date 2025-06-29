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

            // Check if it's an international number first
            const routing = getUzbekistanOperatorRouting(phoneNumber);

            if (!routing.isUzbekistan) {
                console.log(`🌍 International number detected (${phoneNumber.slice(0, 4)}***), letting Cognito handle it`);
                return event; // Let Cognito handle international numbers
            }

            console.log(`🇺🇿 Uzbekistan number detected: ${routing.operator}`);

            // Handle CustomSMSSender triggers (modern approach with encrypted codes)
            if (triggerSource.startsWith('CustomSMSSender_')) {
                return await this.handleCustomSMSSenderWithFallback(event, phoneNumber, routing);
            }

            // Handle other triggers using templates
            return await this.handleTemplateBasedSmsWithFallback(event, phoneNumber, routing);

        } catch (error) {
            console.error('❌ Cognito SMS handler error:', error);
            console.warn('⚠️ Falling back to Cognito due to handler error');
            return event; // Let Cognito handle on any error
        }
    }

    private async handleCustomSMSSenderWithFallback(
        event: CognitoEvent,
        phoneNumber: string,
        routing: any
    ): Promise<CognitoEvent> {
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

            let message: string;
            if (template) {
                // Prepare placeholders for template processing
                const placeholders = this.buildPlaceholders(event, decryptedCode);
                message = this.templateService.processTemplate(template, placeholders);
                console.log(`📤 Using Cognito template: "${template}"`);
            } else {
                console.warn(`⚠️ No template found for ${event.triggerSource}, using fallback`);
                message = this.buildFallbackMessage(event, decryptedCode);
            }

            // Try to send via local routing with fallback
            const success = await this.routeMessageWithFallback(phoneNumber, message, routing);

            if (success) {
                // Suppress Cognito's fallback SMS since we sent our own
                if (!event.response) {
                    event.response = {};
                }
                event.response.smsMessage = '';
                console.log('✅ SMS sent successfully via custom routing');
            } else {
                console.warn('⚠️ Custom routing failed completely, letting Cognito handle SMS');
                // Don't modify event.response - let Cognito send it
            }

            return event;

        } catch (error) {
            console.error('❌ CustomSMSSender processing failed:', error);
            console.warn('⚠️ Falling back to Cognito SMS due to error');
            return event; // Let Cognito handle on error
        }
    }

    private async handleTemplateBasedSmsWithFallback(
        event: CognitoEvent,
        phoneNumber: string,
        routing: any
    ): Promise<CognitoEvent> {
        const shouldProcess = event.triggerSource.includes('SMS') ||
            event.triggerSource.includes('CustomMessage_');

        if (!shouldProcess) {
            console.log(`⏭️ Skipping trigger: ${event.triggerSource} (not SMS-related)`);
            return event;
        }

        try {
            let message: string | undefined;

            // Try to get template from Cognito User Pool first
            const template = await this.templateService.getTemplate(event.triggerSource, 'sms');

            if (template) {
                // Use Cognito template
                const placeholders = this.buildPlaceholders(event);
                message = this.templateService.processTemplate(template, placeholders);
                console.log(`📋 Using Cognito User Pool template for ${event.triggerSource}`);
            } else {
                // Fallback to Cognito's prepared message
                message = event.response?.smsMessage;
                if (message) {
                    console.log(`📱 Using Cognito prepared message for ${event.triggerSource}`);
                }
            }

            if (message) {
                const success = await this.routeMessageWithFallback(phoneNumber, message, routing);

                if (success) {
                    // Suppress Cognito's SMS since we sent our own
                    if (!event.response) {
                        event.response = {};
                    }
                    event.response.smsMessage = '';
                    console.log('✅ SMS sent successfully via custom routing');
                } else {
                    console.warn('⚠️ Custom routing failed, letting Cognito handle SMS');
                    // Don't modify event.response - let Cognito send it
                }
            }

        } catch (templateError) {
            console.error('❌ Template processing error:', templateError);
            console.warn('⚠️ Falling back to default Cognito behavior');
        }

        return event;
    }

    private async routeMessageWithFallback(
        phoneNumber: string,
        message: string,
        routing: any
    ): Promise<boolean> {
        try {
            if (routing.usePlayMobile) {
                console.log(`📤 Attempting to send via PlayMobile (${routing.operator})`);
                const success = await this.playMobileService.sendSms(phoneNumber, message);

                if (success) {
                    console.log(`✅ PlayMobile delivery successful for ${routing.operator}`);
                    return true;
                } else {
                    console.warn(`⚠️ PlayMobile failed for ${routing.operator}, trying AWS fallback`);

                    // Try AWS as fallback for PlayMobile failure
                    return await this.tryAwsFallback(phoneNumber, message, 'PlayMobile failure');
                }
            } else {
                // Ucell bypass - use AWS directly
                console.log(`📤 Attempting to send via AWS (${routing.operator} bypass)`);
                const success = await this.awsSmsService.sendSms(phoneNumber, message);

                if (success) {
                    console.log(`✅ AWS delivery successful for ${routing.operator}`);
                    return true;
                } else {
                    console.warn(`⚠️ AWS delivery failed for ${routing.operator}`);
                    return false; // No more fallbacks for AWS failure
                }
            }
        } catch (error) {
            console.error('❌ Routing error:', error);

            if (routing.usePlayMobile) {
                console.warn('⚠️ PlayMobile error, trying AWS fallback');
                return await this.tryAwsFallback(phoneNumber, message, 'PlayMobile error');
            }

            return false;
        }
    }

    private async tryAwsFallback(phoneNumber: string, message: string, reason: string): Promise<boolean> {
        try {
            console.log(`🔄 AWS fallback attempt (reason: ${reason})`);
            const success = await this.awsSmsService.sendSms(phoneNumber, message);

            if (success) {
                console.log(`✅ AWS fallback successful`);
                return true;
            } else {
                console.warn(`⚠️ AWS fallback also failed`);
                return false;
            }
        } catch (fallbackError) {
            console.error('❌ AWS fallback error:', fallbackError);
            return false;
        }
    }

    private buildFallbackMessage(event: CognitoEvent, decryptedCode: string): string {
        const username = this.extractUsername(event);

        // Fallback templates (AWS default format)
        switch (event.triggerSource) {
            case 'CustomSMSSender_AdminCreateUser':
                return `Your username is ${username} and temporary password is ${decryptedCode}`;
            case 'CustomSMSSender_Authentication':
            case 'CustomSMSSender_ForgotPassword':
            case 'CustomSMSSender_ResendCode':
                return `Your verification code is ${decryptedCode}`;
            default:
                return `Your code is ${decryptedCode}`;
        }
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

    private extractUsername(event: CognitoEvent): string {
        return event.request.userAttributes.phone_number ||
            event.request.usernameParameter ||
            event.request.userAttributes.preferred_username ||
            event.request.userAttributes.email?.split('@')[0] ||
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