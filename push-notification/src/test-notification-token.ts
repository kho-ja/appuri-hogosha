import { config } from "dotenv";
import { PinpointService } from './services/aws/pinpoint';
import { TelegramService } from './services/telegram/bot';
import { AwsSmsService } from './services/aws/sms';
import { PlayMobileService } from './services/playmobile/api';
import { analyzeToken } from './utils/token-detection';
import { getUzbekistanOperatorRouting } from './utils/validation';
import { generateSmsText } from './utils/localization';
import { NotificationPost } from './types/events';
import { ENVIRONMENT, getEnvironmentInfo } from './config/environment';

config();

const TEST_CONFIG = {
    defaultPost: {
        id: 'test-001',
        title: 'Test Notification',
        description: 'This is a test notification to verify token functionality.',
        family_name: 'Doe',
        given_name: 'John',
        chat_id: '', // Will be set if testing Telegram
        language: 'en', // en, ja, ru, uz
        phone_number: '', // Will be set if testing SMS
        priority: 'high',
        sms: false // Will be set if testing SMS
    } as Partial<NotificationPost>,

    // Test modes
    testModes: {
        PUSH_ONLY: 'push_only',
        SMS_ONLY: 'sms_only',
        TELEGRAM_ONLY: 'telegram_only',
        ALL_CHANNELS: 'all_channels'
    }
};

class NotificationTokenTester {
    private pinpointService: PinpointService;
    private telegramService: TelegramService;
    private awsSmsService: AwsSmsService;
    private playMobileService: PlayMobileService;

    constructor() {
        this.pinpointService = new PinpointService();
        this.telegramService = new TelegramService();
        this.awsSmsService = new AwsSmsService();
        this.playMobileService = new PlayMobileService();
    }

    /**
     * Test a push notification token
     */
    async testPushToken(token: string, customData?: Partial<NotificationPost>): Promise<boolean> {
        console.log('\n🔍 === TESTING PUSH NOTIFICATION TOKEN ===');
        console.log(`Token: ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);

        // Analyze the token
        const analysis = analyzeToken(token);
        console.log('\n📊 Token Analysis:');
        console.log(`   Platform: ${analysis.platform}`);
        console.log(`   Type: ${analysis.type || 'N/A'}`);
        console.log(`   Format: ${analysis.format || 'N/A'}`);
        console.log(`   Length: ${analysis.length || 0} chars`);
        console.log(`   Valid: ${analysis.isValid ? '✅' : '❌'}`);

        if (analysis.issues && analysis.issues.length > 0) {
            console.log(`   Issues: ${analysis.issues.join(', ')}`);
        }

        if (!analysis.isValid) {
            console.log('❌ Token validation failed, aborting test');
            return false;
        }

        // Create test post
        const testPost: NotificationPost = {
            ...TEST_CONFIG.defaultPost,
            ...customData,
            arn: token
        } as NotificationPost;

        try {
            console.log('\n📤 Sending push notification...');
            const success = await this.pinpointService.sendPushNotification(testPost);

            if (success) {
                console.log('✅ Push notification sent successfully!');
            } else {
                console.log('❌ Push notification failed');
            }

            return success;
        } catch (error) {
            console.error('❌ Error sending push notification:', error);
            return false;
        }
    }

    /**
     * Test SMS functionality with a phone number
     */
    async testSMS(phoneNumber: string, customData?: Partial<NotificationPost>): Promise<boolean> {
        console.log('\n📱 === TESTING SMS NOTIFICATION ===');
        console.log(`Phone: ${phoneNumber}`);

        // Validate phone number
        const routing = getUzbekistanOperatorRouting(phoneNumber);
        console.log('\n📊 Phone Analysis:');
        console.log(`   Is Uzbekistan: ${routing.isUzbekistan ? '✅' : '❌'}`);
        console.log(`   Operator: ${routing.operator}`);
        console.log(`   Use PlayMobile: ${routing.usePlayMobile ? '✅' : '❌'}`);

        // Create test post
        const testPost: NotificationPost = {
            ...TEST_CONFIG.defaultPost,
            ...customData,
            phone_number: phoneNumber,
            sms: true,
            arn: '' // No push token for SMS-only test
        } as NotificationPost;

        try {
            console.log('\n📤 Sending SMS...');
            const text = generateSmsText(testPost);
            console.log(`SMS Text: ${text}`);

            // for International numbers, we send SMS via AWS SMS
            if (!routing.isUzbekistan) {
                console.log('🌐 Sending SMS via AWS SMS...');
                const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
                console.log(`Formatted Phone: ${formattedPhone}`);
                return await this.awsSmsService.sendSms(formattedPhone, text);
            }

            let success = false;

            if (routing.usePlayMobile) {
                console.log('📤 Using PlayMobile API...');
                success = await this.playMobileService.sendSms(phoneNumber, text, testPost.id);
            } else {
                console.log('📤 Using AWS SMS...');
                const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
                success = await this.awsSmsService.sendSms(formattedPhone, text);
            }

            if (success) {
                console.log('✅ SMS sent successfully!');
            } else {
                console.log('❌ SMS failed');
            }

            return success;
        } catch (error) {
            console.error('❌ Error sending SMS:', error);
            return false;
        }
    }

    /**
     * Test Telegram notification
     */
    async testTelegram(chatId: string, customData?: Partial<NotificationPost>): Promise<boolean> {
        console.log('\n💬 === TESTING TELEGRAM NOTIFICATION ===');
        console.log(`Chat ID: ${chatId}`);

        // Create test post
        const testPost: NotificationPost = {
            ...TEST_CONFIG.defaultPost,
            ...customData,
            chat_id: chatId,
            arn: '' // No push token for Telegram-only test
        } as NotificationPost;

        try {
            console.log('\n📤 Sending Telegram notification...');
            const success = await this.telegramService.sendNotification(testPost);

            if (success) {
                console.log('✅ Telegram notification sent successfully!');
            } else {
                console.log('❌ Telegram notification failed');
            }

            return success;
        } catch (error) {
            console.error('❌ Error sending Telegram notification:', error);
            return false;
        }
    }

    /**
     * Test all notification channels for a complete post
     */
    async testAllChannels(
        pushToken?: string,
        phoneNumber?: string,
        chatId?: string,
        customData?: Partial<NotificationPost>
    ): Promise<{ push: boolean; sms: boolean; telegram: boolean }> {
        console.log('\n🎯 === TESTING ALL NOTIFICATION CHANNELS ===');

        const results = {
            push: false,
            sms: false,
            telegram: false
        };

        // Create comprehensive test post
        const testPost: NotificationPost = {
            ...TEST_CONFIG.defaultPost,
            ...customData,
            arn: pushToken || '',
            phone_number: phoneNumber || '',
            chat_id: chatId || '',
            sms: !!phoneNumber
        } as NotificationPost;

        // Test push notification
        if (pushToken) {
            console.log('\n1️⃣ Testing Push Notification...');
            results.push = await this.testPushToken(pushToken, testPost);
        }

        // Test SMS
        if (phoneNumber) {
            console.log('\n2️⃣ Testing SMS...');
            results.sms = await this.testSMS(phoneNumber, testPost);
        }

        // Test Telegram
        if (chatId) {
            console.log('\n3️⃣ Testing Telegram...');
            results.telegram = await this.testTelegram(chatId, testPost);
        }

        // Summary
        console.log('\n📊 === TEST RESULTS SUMMARY ===');
        console.log(`Push: ${results.push ? '✅' : '❌'}`);
        console.log(`SMS: ${results.sms ? '✅' : '❌'}`);
        console.log(`Telegram: ${results.telegram ? '✅' : '❌'}`);

        return results;
    }

    /**
     * Display environment information
     */
    displayEnvironmentInfo(): void {
        console.log('\n🌍 === ENVIRONMENT INFO ===');
        const envInfo = getEnvironmentInfo();

        console.log(`Runtime: ${envInfo.runtime}`);
        console.log(`Region: ${envInfo.region}`);
        console.log(`PlayMobile Config: ${envInfo.hasPlayMobileConfig ? '✅' : '❌'}`);
        console.log(`Telegram Config: ${envInfo.hasTelegramConfig ? '✅' : '❌'}`);
        console.log(`AWS Credentials: ${envInfo.hasLocalAwsCredentials ? '✅' : '❌'}`);
        console.log(`Cognito Config: ${envInfo.hasCognitoConfig ? '✅' : '❌'}`);

        console.log('\n📋 Required Environment Variables:');
        console.log(`PINPOINT_APP_ID: ${ENVIRONMENT.PINPOINT_APP_ID ? '✅' : '❌'}`);
        console.log(`BOT_TOKEN: ${ENVIRONMENT.BOT_TOKEN ? '✅' : '❌'}`);
        console.log(`BROKER_URL: ${ENVIRONMENT.BROKER_URL ? '✅' : '❌'}`);
        console.log(`DB_HOST: ${ENVIRONMENT.DB_HOST ? '✅' : '❌'}`);
    }
}

// Example usage and command line interface
async function main() {
    const tester = new NotificationTokenTester();

    // Display environment info
    tester.displayEnvironmentInfo();

    // Get command line arguments
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('\n🚀 === NOTIFICATION TOKEN TESTER ===');
        console.log('\nUsage:');
        console.log('  npm run test-token -- push <token>');
        console.log('  npm run test-token -- sms <phone_number>');
        console.log('  npm run test-token -- telegram <chat_id>');
        console.log('  npm run test-token -- all <push_token> <phone_number> <chat_id>');
        console.log('\nExamples:');
        console.log('  npm run test-token -- push "fcm_token_here"');
        console.log('  npm run test-token -- sms "+998901234567"');
        console.log('  npm run test-token -- telegram "123456789"');
        console.log('  npm run test-token -- all "fcm_token" "+998901234567" "123456789"');

        // Interactive mode - you can customize this section
        console.log('\n🔧 === INTERACTIVE TEST MODE ===');
        console.log('Modify the code below to test your specific tokens:');

        // Example tests (uncomment and modify as needed)
        /*
        // Test a specific push token
        await tester.testPushToken('your_push_token_here', {
            title: 'Custom Test Title',
            description: 'Custom test message',
            language: 'en'
        });

        // Test a specific phone number
        await tester.testSMS('+998901234567', {
            title: 'SMS Test',
            description: 'Testing SMS functionality'
        });

        // Test a specific Telegram chat
        await tester.testTelegram('123456789', {
            title: 'Telegram Test',
            description: 'Testing Telegram functionality'
        });

        // Test all channels
        await tester.testAllChannels(
            'your_push_token_here',
            '+998901234567',
            '123456789',
            {
                title: 'Multi-Channel Test',
                description: 'Testing all notification channels',
                language: 'en'
            }
        );
        */

        return;
    }

    const mode = args[0];

    try {
        switch (mode) {
            case 'push':
                if (args[1]) {
                    await tester.testPushToken(args[1]);
                } else {
                    console.error('❌ Push token required');
                }
                break;

            case 'sms':
                if (args[1]) {
                    await tester.testSMS(args[1]);
                } else {
                    console.error('❌ Phone number required');
                }
                break;

            case 'telegram':
                if (args[1]) {
                    await tester.testTelegram(args[1]);
                } else {
                    console.error('❌ Chat ID required');
                }
                break;

            case 'all':
                await tester.testAllChannels(args[1], args[2], args[3]);
                break;

            default:
                console.error('❌ Invalid mode. Use: push, sms, telegram, or all');
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Export for use as module
export { NotificationTokenTester, TEST_CONFIG };

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}
