import { CognitoEvent } from '../../types/events';
import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';
import { CognitoTemplateService } from '../../services/cognito/template-service';
import { getUzbekistanOperatorRouting } from '../../utils/validation';

export class AuthChallengeHandler {
    private templateService: CognitoTemplateService;

    constructor(
        private playMobileService: PlayMobileService,
        private awsSmsService: AwsSmsService,
        userPoolId?: string
    ) {
        this.templateService = new CognitoTemplateService(userPoolId);
    }

    async handleDefineAuthChallenge(event: CognitoEvent): Promise<CognitoEvent> {
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

        if (session.length === 0) {
            // Step 1: Issue Custom Challenge (OTP)
            event.response = {
                challengeName: 'CUSTOM_CHALLENGE',
                issueTokens: false,
                failAuthentication: false,
            };
        } else if (
            session.length === 1 &&
            session[0].challengeName === 'CUSTOM_CHALLENGE' &&
            session[0].challengeResult === true
        ) {
            // Step 2: Challenge passed, issue tokens
            event.response = {
                issueTokens: true,
                failAuthentication: false,
            };
        } else {
            // Invalid session state
            event.response = {
                issueTokens: false,
                failAuthentication: true,
            };
        }

        return event;
    }

    async handleCreateAuthChallenge(event: CognitoEvent): Promise<CognitoEvent> {
        console.log('🎲 Creating Auth Challenge');

        const phoneNumber = event.request.userAttributes.phone_number;

        if (!phoneNumber) {
            throw new Error('Phone number is missing');
        }

        // Generate 6-digit code
        const secretCode = Math.floor(100000 + Math.random() * 900000).toString();

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
            message = this.templateService.processTemplate(template, placeholders);
            console.log(`📤 Using Cognito template: "${template}"`);
        } else {
            // Fallback message if no template is configured
            // Format optimized for iOS/Android OTP auto-fill
            console.warn('⚠️ No Cognito template found, using fallback message');
            message = `${secretCode} is your Appuri verification code.`;
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
                const sent = await this.routeMessageWithFallback(phoneNumber, message, routing);

                if (sent) {
                    console.log(`✅ OTP sent successfully to ${phoneNumber.slice(-4)}`);
                } else {
                    console.error(`❌ Failed to send OTP to ${phoneNumber.slice(-4)}`);
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
                phone_number: phoneNumber
            },
            privateChallengeParameters: {
                code: secretCode
            },
            challengeMetadata: 'OTP_CHALLENGE'
        };

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
                    console.error(`❌ AWS delivery failed for ${routing.operator}`);
                    return false;
                }
            }
        } catch (error) {
            console.error('❌ Message routing failed:', error);
            return false;
        }
    }

    private async tryAwsFallback(
        phoneNumber: string,
        message: string,
        reason: string
    ): Promise<boolean> {
        console.log(`🔄 Attempting AWS fallback (reason: ${reason})`);
        try {
            const success = await this.awsSmsService.sendSms(phoneNumber, message);
            if (success) {
                console.log(`✅ AWS fallback successful`);
                return true;
            } else {
                console.error(`❌ AWS fallback failed`);
                return false;
            }
        } catch (error) {
            console.error('❌ AWS fallback error:', error);
            return false;
        }
    }

    async handleVerifyAuthChallenge(event: CognitoEvent): Promise<CognitoEvent> {
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
