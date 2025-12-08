import { CognitoEvent } from '../../types/events';
import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';

export class AuthChallengeHandler {
    constructor(
        private playMobileService: PlayMobileService,
        private awsSmsService: AwsSmsService
    ) { }

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

        // Send SMS
        const message = `Your verification code is: ${secretCode}`;

        try {
            // Try PlayMobile first (Uzbekistan)
            let sent = false;
            if (phoneNumber.startsWith('+998')) {
                sent = await this.playMobileService.sendSms(phoneNumber, message);
            }

            // Fallback to AWS SMS
            if (!sent) {
                await this.awsSmsService.sendSms(phoneNumber, message);
            }

            console.log(`✅ OTP sent to ${phoneNumber.slice(-4)}`);

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
