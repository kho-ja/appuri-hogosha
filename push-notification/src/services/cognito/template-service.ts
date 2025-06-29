import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getAwsConfig } from '../../config/aws';
import { ENVIRONMENT } from '../../config/environment';

export interface CognitoMessageTemplates {
    // Verification templates
    smsVerificationMessage?: string;
    emailVerificationMessage?: string;
    emailVerificationSubject?: string;

    // Admin invitation templates  
    adminInviteEmailMessage?: string;
    adminInviteEmailSubject?: string;
    adminInviteSmsMessage?: string;

    // MFA templates
    smsAuthenticationMessage?: string;
}

export class CognitoTemplateService {
    private cognitoClient: CognitoIdentityProviderClient;
    private userPoolId: string;
    private templateCache: CognitoMessageTemplates | null = null;
    private cacheExpiry: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor(userPoolId?: string) {
        this.cognitoClient = new CognitoIdentityProviderClient(getAwsConfig());
        this.userPoolId = userPoolId || ENVIRONMENT.COGNITO_USER_POOL_ID;
    }

    /**
     * Fetch message templates from Cognito User Pool
     * These are the templates configured in AWS Console > User Pool > Message Templates
     */
    async getMessageTemplates(): Promise<CognitoMessageTemplates> {
        // Check cache first
        if (this.templateCache && Date.now() < this.cacheExpiry) {
            console.log('📋 Using cached Cognito templates');
            return this.templateCache;
        }

        try {
            console.log('🔍 Fetching message templates from Cognito User Pool...');

            const command = new DescribeUserPoolCommand({
                UserPoolId: this.userPoolId
            });

            const response = await this.cognitoClient.send(command);
            const userPool = response.UserPool;

            if (!userPool) {
                throw new Error('User pool not found');
            }

            // Extract message templates from user pool configuration
            const templates: CognitoMessageTemplates = {
                // Verification templates (from VerificationMessageTemplate)
                smsVerificationMessage: userPool.SmsVerificationMessage,
                emailVerificationMessage: userPool.EmailVerificationMessage,
                emailVerificationSubject: userPool.EmailVerificationSubject,

                // MFA template
                smsAuthenticationMessage: userPool.SmsAuthenticationMessage,

                // Admin invitation templates (from AdminCreateUserConfig.InviteMessageTemplate)
                adminInviteEmailMessage: userPool.AdminCreateUserConfig?.InviteMessageTemplate?.EmailMessage,
                adminInviteEmailSubject: userPool.AdminCreateUserConfig?.InviteMessageTemplate?.EmailSubject,
                adminInviteSmsMessage: userPool.AdminCreateUserConfig?.InviteMessageTemplate?.SMSMessage,
            };

            // Cache the templates
            this.templateCache = templates;
            this.cacheExpiry = Date.now() + this.CACHE_DURATION;

            console.log('✅ Successfully fetched Cognito message templates');
            console.log('📋 Available templates:', Object.keys(templates).filter(key => templates[key as keyof CognitoMessageTemplates]));

            return templates;

        } catch (error) {
            console.error('❌ Failed to fetch Cognito message templates:', error);
            throw new Error(`Failed to fetch templates: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get a specific template by type and trigger
     */
    async getTemplate(triggerSource: string, messageType: 'sms' | 'email' = 'sms'): Promise<string | null> {
        const templates = await this.getMessageTemplates();

        // Map trigger sources to template keys
        const templateMapping: Record<string, keyof CognitoMessageTemplates> = {
            // Verification templates
            'CustomMessage_SignUp': messageType === 'sms' ? 'smsVerificationMessage' : 'emailVerificationMessage',
            'CustomMessage_ResendCode': messageType === 'sms' ? 'smsVerificationMessage' : 'emailVerificationMessage',
            'CustomMessage_ForgotPassword': messageType === 'sms' ? 'smsVerificationMessage' : 'emailVerificationMessage',
            'CustomMessage_VerifyUserAttribute': messageType === 'sms' ? 'smsVerificationMessage' : 'emailVerificationMessage',

            // Admin invitation templates
            'CustomMessage_AdminCreateUser': messageType === 'sms' ? 'adminInviteSmsMessage' : 'adminInviteEmailMessage',
            'CustomSMSSender_AdminCreateUser': 'adminInviteSmsMessage',

            // MFA templates
            'CustomMessage_Authentication': 'smsAuthenticationMessage',
            'CustomSMSSender_Authentication': 'smsAuthenticationMessage',
            'CustomSMSSender_ForgotPassword': 'smsVerificationMessage',
            'CustomSMSSender_ResendCode': 'smsVerificationMessage',
        };

        const templateKey = templateMapping[triggerSource];
        if (!templateKey) {
            console.warn(`⚠️ No template mapping found for trigger: ${triggerSource}`);
            return null;
        }

        const template = templates[templateKey];
        if (!template) {
            console.warn(`⚠️ Template not configured in User Pool: ${templateKey}`);
            return null;
        }

        console.log(`📋 Using Cognito template for ${triggerSource}: ${templateKey}`);
        return template;
    }

    /**
     * Process template with placeholders
     */
    processTemplate(template: string, placeholders: Record<string, string>): string {
        let processedTemplate = template;

        // Replace AWS Cognito placeholders
        Object.entries(placeholders).forEach(([key, value]) => {
            const patterns = [
                new RegExp(`\\{${key}\\}`, 'g'),     // {key}
                new RegExp(`\\{#{4}\\}`, 'g'),       // {####} for codes
                new RegExp(`\\{username\\}`, 'g'),   // {username}
            ];

            patterns.forEach(pattern => {
                if (pattern.source.includes(key) || (key === 'code' && pattern.source.includes('#{4}'))) {
                    processedTemplate = processedTemplate.replace(pattern, value);
                }
            });
        });

        return processedTemplate;
    }

    /**
     * Get email subject template
     */
    async getEmailSubject(triggerSource: string): Promise<string | null> {
        const templates = await this.getMessageTemplates();

        if (triggerSource === 'CustomMessage_AdminCreateUser') {
            return templates.adminInviteEmailSubject || null;
        }

        return templates.emailVerificationSubject || null;
    }

    /**
     * Check if templates are configured
     */
    async validateTemplateConfiguration(): Promise<{ valid: boolean, missing: string[] }> {
        try {
            const templates = await this.getMessageTemplates();
            const missing: string[] = [];

            // Check for essential templates
            if (!templates.smsVerificationMessage) missing.push('SMS Verification Message');
            if (!templates.emailVerificationMessage) missing.push('Email Verification Message');
            if (!templates.adminInviteSmsMessage) missing.push('Admin Invite SMS Message');

            return {
                valid: missing.length === 0,
                missing
            };
        } catch (error) {
            return {
                valid: false,
                missing: ['Failed to fetch templates']
            };
        }
    }

    /**
     * Clear template cache (useful for testing)
     */
    clearCache(): void {
        this.templateCache = null;
        this.cacheExpiry = 0;
        console.log('🗑️ Cognito template cache cleared');
    }
}

// Usage example:
/*
const templateService = new CognitoTemplateService('us-east-1_ABC123DEF');

// Get specific template
const smsTemplate = await templateService.getTemplate('CustomMessage_AdminCreateUser', 'sms');

// Process with placeholders
const processedMessage = templateService.processTemplate(smsTemplate, {
    username: 'admin123',
    code: 'TempPass123!'
});

// Result: "Your username is admin123 and temporary password is TempPass123!"
*/