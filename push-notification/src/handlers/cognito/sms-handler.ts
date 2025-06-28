import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';
import { KmsDecryptionService } from '../../services/aws/kms';
import { getUzbekistanOperatorRouting } from '../../utils/validation';
import { CognitoEvent } from '../../types/events';

// Utility function to sanitize sensitive content for logging
const sanitizeCredentialsForLogging = (credentials: string): string => {
    if (!credentials) return '[EMPTY]';
    if (credentials.length <= 4) return '[REDACTED]';
    return `${credentials.substring(0, 2)}***${credentials.substring(credentials.length - 2)}`;
};

export class CognitoHandler {
    private kmsService: KmsDecryptionService;

    constructor(
        private playMobileService: PlayMobileService,
        private awsSmsService: AwsSmsService
    ) {
        this.kmsService = new KmsDecryptionService();
    }

    async handleCognitoSms(event: CognitoEvent): Promise<CognitoEvent> {
        try {
            const triggerSource = event.triggerSource;
            const phoneNumber = event.request.userAttributes.phone_number || '';

            console.log(`📱 Processing Cognito trigger: ${triggerSource} for ${phoneNumber}`);

            // Handle CustomSMSSender triggers (modern approach with real OTP/password)
            if (triggerSource.startsWith('CustomSMSSender_')) {
                return await this.handleCustomSMSSender(event, phoneNumber);
            }

            // Handle legacy Custom Message triggers
            if (triggerSource === 'CustomMessage_AdminCreateUser') {
                return await this.handleLegacyAdminCreateUser(event, phoneNumber);
            }

            // Handle other SMS triggers (verification codes, etc.)
            return await this.handleOtherSMSTriggers(event, phoneNumber);

        } catch (error) {
            console.error('❌ Cognito SMS handler error:', error);
            return event;
        }
    }

    private async handleCustomSMSSender(event: CognitoEvent, phoneNumber: string): Promise<CognitoEvent> {
        console.log(`🔐 CustomSMSSender trigger detected: ${event.triggerSource}`);

        try {
            const encryptedCode = event.request.code;
            if (!encryptedCode) {
                throw new Error('No encrypted code provided in CustomSMSSender event');
            }

            console.log(`🔓 Decrypting code from Cognito...`);
            const decryptedCode = await this.kmsService.decryptCode(encryptedCode);
            console.log(`✅ Code decrypted successfully: ${decryptedCode.length} characters`);

            // Determine message type based on trigger
            let message = '';
            const username = this.extractUsername(event);

            if (event.triggerSource.includes('AdminCreateUser')) {
                message = `JDU Parent: ${username} / ${decryptedCode}`;
                const sanitizedPassword = sanitizeCredentialsForLogging(decryptedCode);
                console.log(`👤 Parent user creation - Username: ${username}, Password: ${sanitizedPassword}`);
            } else if (event.triggerSource.includes('Authentication') ||
                event.triggerSource.includes('ForgotPassword') ||
                event.triggerSource.includes('ResendCode')) {
                message = `JDU Verification: ${decryptedCode}`;
                const sanitizedCode = sanitizeCredentialsForLogging(decryptedCode);
                console.log(`🔢 Verification code: ${sanitizedCode}`);
            } else {
                message = `JDU Code: ${decryptedCode}`;
                const sanitizedCode = sanitizeCredentialsForLogging(decryptedCode);
                console.log(`📝 Generic code: ${sanitizedCode}`);
            }

            await this.routeMessage(phoneNumber, message);

            // Suppress Cognito's fallback SMS since we sent our own
            if (!event.response) {
                event.response = {};
            }
            event.response.smsMessage = '';

            return event;

        } catch (decryptError) {
            console.error('❌ CustomSMSSender decryption failed:', decryptError);
            console.warn('⚠️ Falling back to Cognito SMS due to decryption failure');
            return event;
        }
    }

    private async handleLegacyAdminCreateUser(event: CognitoEvent, phoneNumber: string): Promise<CognitoEvent> {
        console.log(`👤 Legacy admin user creation trigger detected`);

        const originalMessage = event.response?.smsMessage;
        console.log(`📧 Original Cognito message pattern detected (content redacted for security)`);

        if (originalMessage && !originalMessage.includes('{')) {
            const username = this.extractUsername(event);
            const extractedPassword = this.extractPassword(originalMessage, event);

            if (extractedPassword) {
                const credentialsMessage = `JDU Admin: ${username} / ${extractedPassword}`;
                const sanitizedPassword = sanitizeCredentialsForLogging(extractedPassword);
                console.log(`✅ Legacy: Extracted credentials successfully - Username: ${username}, Password: ${sanitizedPassword}`);

                const success = await this.routeMessage(phoneNumber, credentialsMessage);

                if (!event.response) {
                    event.response = {};
                }
                event.response.smsMessage = success ? '' : credentialsMessage;
            }
        }

        return event;
    }

    private async handleOtherSMSTriggers(event: CognitoEvent, phoneNumber: string): Promise<CognitoEvent> {
        const shouldProcess = event.triggerSource.includes('SMS') ||
            event.triggerSource.includes('CustomMessage_Authentication') ||
            event.triggerSource.includes('CustomMessage_ResendCode') ||
            event.triggerSource.includes('CustomMessage_ForgotPassword');

        if (!shouldProcess) {
            console.log(`⏭️ Skipping trigger: ${event.triggerSource} (not SMS-related)`);
            return event;
        }

        const message = event.response?.smsMessage;
        if (!message) {
            console.log(`ℹ️ No SMS message provided for ${event.triggerSource}`);
            return event;
        }

        // Handle verification codes
        if (event.triggerSource.includes('Authentication') ||
            event.triggerSource.includes('ForgotPassword') ||
            event.triggerSource.includes('ResendCode')) {

            const codeMatch = message.match(/\b\d{6}\b/);
            const code = codeMatch ? codeMatch[0] : event.request.codeParameter;

            if (code) {
                const verificationMessage = `JDU Verification: ${code}`;
                const sanitizedCode = sanitizeCredentialsForLogging(code);
                console.log(`📱 Verification code message prepared with code: ${sanitizedCode}`);

                const success = await this.routeMessage(phoneNumber, verificationMessage);

                if (!event.response) {
                    event.response = {};
                }
                event.response.smsMessage = success ? '' : verificationMessage;
            }
        } else {
            // For other SMS messages, handle routing (avoid logging the full message for security)
            console.log(`📤 Processing other SMS message type: ${event.triggerSource}`);
            const success = await this.routeMessage(phoneNumber, message);

            if (success) {
                if (!event.response) {
                    event.response = {};
                }
                event.response.smsMessage = '';
                console.log('✅ SMS sent successfully via PlayMobile API');
            } else {
                console.warn('⚠️ PlayMobile API failed, falling back to Cognito SMS');
            }
        }

        return event;
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
        return event.request.userAttributes.phone_number?.replace(/[^0-9]/g, '').slice(-8) ||
            event.request.usernameParameter ||
            event.request.userAttributes.preferred_username ||
            event.request.userAttributes.email?.split('@')[0] ||
            `admin${Date.now().toString().slice(-4)}`;
    }

    private extractPassword(originalMessage: string, event: CognitoEvent): string {
        const passwordPatterns = [
            /password is ([^\s]+)/i,
            /password: ([^\s]+)/i,
            /Password is ([^\s\n]+)/i,
            /temporary password is ([^\s]+)/i,
            /temp password: ([^\s]+)/i
        ];

        for (const pattern of passwordPatterns) {
            const match = originalMessage.match(pattern);
            if (match && match[1] && !match[1].includes('{')) {
                return match[1].replace(/[.,;]$/, '');
            }
        }

        if (event.request.codeParameter && !event.request.codeParameter.includes('{')) {
            return event.request.codeParameter;
        }

        // Simple fallback if no password found (rare case)
        return `Temp${Date.now().toString().slice(-6)}!`;
    }
}