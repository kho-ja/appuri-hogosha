import { CognitoEvent } from '../../types/events';
import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';
import { CognitoTemplateService } from '../../services/cognito/template-service';
import { SmsTemplateService } from '../../services/sms/template-service';
import { getUzbekistanOperatorRouting } from '../../utils/validation';

export class AuthChallengeHandler {
    private templateService: CognitoTemplateService;
    private smsTemplateService: SmsTemplateService;

    constructor(
        private playMobileService: PlayMobileService,
        private awsSmsService: AwsSmsService,
        userPoolId?: string
    ) {
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

    async handleDefineAuthChallenge(
        event: CognitoEvent
    ): Promise<CognitoEvent> {
        console.log('🤔 Defining Auth Challenge');

        // If user is not found or other error
        if (event.request.userAttributes == null) {
            event.response = {
                failAuthentication: true,
                issueTokens: false,
            };
            return event;
        }

        const session = event.request.session || [];
        const MAX_ATTEMPTS = 3;

        if (session.length === 0) {
            // Step 1: Issue Custom Challenge (OTP)
            event.response = {
                challengeName: 'CUSTOM_CHALLENGE',
                issueTokens: false,
                failAuthentication: false,
            };
        } else {
            const lastAttempt = session[session.length - 1];

            if (
                lastAttempt.challengeName === 'CUSTOM_CHALLENGE' &&
                lastAttempt.challengeResult === true
            ) {
                // Correct OTP — issue tokens
                event.response = {
                    issueTokens: true,
                    failAuthentication: false,
                };
            } else if (session.length < MAX_ATTEMPTS) {
                // Wrong OTP but still have attempts left — re-issue same challenge
                event.response = {
                    challengeName: 'CUSTOM_CHALLENGE',
                    issueTokens: false,
                    failAuthentication: false,
                };
            } else {
                // Max attempts exceeded — fail authentication
                event.response = {
                    issueTokens: false,
                    failAuthentication: true,
                };
            }
        }

        return event;
    }

    async handleCreateAuthChallenge(
        event: CognitoEvent
    ): Promise<CognitoEvent> {
        console.log('🎲 Creating Auth Challenge');

        const phoneNumber = event.request.userAttributes.phone_number;

        if (!phoneNumber) {
            throw new Error('Phone number is missing');
        }

        // Check if this is a retry — reuse previous OTP code without sending new SMS
        const session = event.request.session || [];
        const previousChallenge = session.find(
            (s: any) =>
                s.challengeName === 'CUSTOM_CHALLENGE' &&
                s.challengeMetadata?.startsWith('OTP_CHALLENGE_')
        );

        if (previousChallenge) {
            const previousCode =
                previousChallenge.challengeMetadata!.replace(
                    'OTP_CHALLENGE_',
                    ''
                );
            console.log(
                '🔄 Retry attempt — reusing previous OTP code (no new SMS)'
            );
            event.response = {
                publicChallengeParameters: {
                    phone_number: phoneNumber,
                },
                privateChallengeParameters: {
                    code: previousCode,
                },
                challengeMetadata: `OTP_CHALLENGE_${previousCode}`,
            };
            return event;
        }

        // Generate 6-digit code
        const secretCode = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // Try to get template from Cognito User Pool
        console.log('📋 Fetching SMS authentication template from Cognito...');
        const template = await this.templateService.getTemplate(
            'CustomSMSSender_Authentication',
            'sms'
        );

        let message: string;
        if (template) {
            // Use Cognito template with placeholders
            const placeholders = {
                code: secretCode,
                username: phoneNumber,
            };
            message = this.templateService.processTemplate(
                template,
                placeholders
            );
            console.log(`📤 Using Cognito template: "${template}"`);
        } else {
            // Use SmsTemplateService for localized, optimized fallback message
            console.log(
                '📋 No Cognito template found, using SmsTemplateService'
            );
            const language = this.detectLanguageFromPhone(phoneNumber);
            message = this.smsTemplateService.generateLoginCodeSms(
                {
                    code: secretCode,
                    expiryMinutes: 5,
                },
                { language }
            );
        }

        console.log(`📝 OTP Message: "${message}"`);
        console.log(`📱 Phone Number: ${phoneNumber}`);

        // Get routing decision
        const routing = getUzbekistanOperatorRouting(phoneNumber);

        try {
            if (!routing.isUzbekistan) {
                // International number - use AWS directly
                console.log(`🌍 Sending OTP via AWS for international number`);
                await this.awsSmsService.sendSms(phoneNumber, message);
                console.log(`✅ OTP sent via AWS to ${phoneNumber.slice(-4)}`);
            } else {
                // Uzbekistan number - use routing logic
                console.log(`🇺🇿 Sending OTP for ${routing.operator}`);
                const sent = await this.routeMessage(
                    phoneNumber,
                    message,
                    routing
                );

                if (sent) {
                    console.log(
                        `✅ OTP sent successfully to ${phoneNumber.slice(-4)}`
                    );
                } else {
                    console.error(
                        `❌ Failed to send OTP to ${phoneNumber.slice(-4)}`
                    );
                }
            }
        } catch (error) {
            console.error('❌ Failed to send OTP:', error);
            // We still proceed to set the challenge, but user won't get the code.
            // In production, you might want to fail here or have better error handling.
        }

        // Set private parameters (server-side only)
        event.response = {
            publicChallengeParameters: {
                phone_number: phoneNumber,
            },
            privateChallengeParameters: {
                code: secretCode,
            },
            challengeMetadata: `OTP_CHALLENGE_${secretCode}`,
        };

        return event;
    }

    private async routeMessage(
        phoneNumber: string,
        message: string,
        routing: any
    ): Promise<boolean> {
        try {
            if (routing.isUzbekistan) {
                // All Uzbekistan numbers use PlayMobile
                console.log(`📤 Sending via PlayMobile (${routing.operator})`);
                const success = await this.playMobileService.sendSms(
                    phoneNumber,
                    message
                );

                if (success) {
                    console.log(
                        `✅ PlayMobile delivery successful for ${routing.operator}`
                    );
                    return true;
                } else {
                    console.error(
                        `❌ PlayMobile delivery failed for ${routing.operator}`
                    );
                    return false;
                }
            } else {
                // International numbers use AWS
                console.log(`📤 Sending via AWS (International)`);
                const success = await this.awsSmsService.sendSms(
                    phoneNumber,
                    message
                );

                if (success) {
                    console.log(`✅ AWS delivery successful`);
                    return true;
                } else {
                    console.error(`❌ AWS delivery failed`);
                    return false;
                }
            }
        } catch (error) {
            console.error('❌ Message routing failed:', error);
            return false;
        }
    }

    async handleVerifyAuthChallenge(
        event: CognitoEvent
    ): Promise<CognitoEvent> {
        console.log('✅ Verifying Auth Challenge');

        const expectedAnswer = event.request.privateChallengeParameters?.code;
        const userAnswer = event.request.challengeAnswer;

        if (expectedAnswer === userAnswer) {
            event.response = {
                answerCorrect: true,
            };
            console.log('🔓 OTP Verified Successfully');
        } else {
            event.response = {
                answerCorrect: false,
            };
            console.log('🔒 OTP Verification Failed');
        }

        return event;
    }
}
