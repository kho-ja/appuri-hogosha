import { config } from 'dotenv';
import DatabaseClient from '../db-client';
import { PlayMobileService } from '../services/playmobile/api';
import { AwsSmsService } from '../services/aws/sms';
import { UnifiedPushService } from '../services/unified/push';
import { TelegramService } from '../services/telegram/bot';
import { getUzbekistanOperatorRouting } from '../utils/validation';
import { NotificationPost } from '../types/events';

config();

const DB = new DatabaseClient();
const playMobileService = new PlayMobileService();
const awsSmsService = new AwsSmsService();
const unifiedPushService = new UnifiedPushService();
const telegramService = new TelegramService();

interface SendOptions {
    type: 'sms' | 'push' | 'telegram';
    recipient: string;
    message?: string;
    title?: string;
    description?: string;
    studentId?: string;
    familyName?: string;
    givenName?: string;
    language?: string;
}

const sendSms = async (options: SendOptions): Promise<boolean> => {
    console.log('\n📱 Sending SMS...');
    console.log(`To: ${options.recipient}`);
    console.log(`Message: ${options.message}`);

    const routing = getUzbekistanOperatorRouting(options.recipient);
    console.log(`Operator: ${routing.operator}`);
    console.log(
        `Provider: ${routing.usePlayMobile ? '🟢 PlayMobile' : '🔵 AWS SMS'}`
    );

    if (!routing.isUzbekistan) {
        // International number - use AWS SMS
        const formattedPhone = options.recipient.startsWith('+')
            ? options.recipient
            : `+${options.recipient}`;
        console.log(`\n📤 Sending via AWS SMS (international)...`);
        const success = await awsSmsService.sendSms(
            formattedPhone,
            options.message || 'Test message from JDU'
        );
        return success;
    }

    if (routing.usePlayMobile) {
        console.log(`\n📤 Sending via PlayMobile...`);
        const result = await playMobileService.sendSmsWithProtection(
            options.recipient,
            options.message || 'Test message from JDU',
            undefined,
            'normal'
        );
        return result.success;
    } else {
        console.log(`\n📤 Sending via AWS SMS (Ucell)...`);
        const formattedPhone = options.recipient.startsWith('+998')
            ? options.recipient
            : `+998${options.recipient.substring(3)}`;
        const success = await awsSmsService.sendSms(
            formattedPhone,
            options.message || 'Test message from JDU'
        );
        return success;
    }
};

const sendPush = async (options: SendOptions): Promise<boolean> => {
    console.log('\n🔔 Sending Push Notification...');
    console.log(`To: ${options.recipient}`);
    console.log(`Title: ${options.title || 'JDU Notification'}`);
    console.log(`Message: ${options.message || 'Test notification'}`);

    const testPost: NotificationPost = {
        id: `cli-${Date.now()}`,
        arn: options.recipient,
        title: options.title || 'JDU Notification',
        description:
            options.description || options.message || 'Test notification',
        family_name: options.familyName || 'Test',
        given_name: options.givenName || 'User',
        student_id: options.studentId || '0',
        phone_number: '',
        chat_id: '',
        language: (options.language as any) || 'en',
        priority: 'high',
        sms: false,
    } as NotificationPost;

    console.log(`\n📤 Sending via Unified Push Service...`);
    const success = await unifiedPushService.sendPushNotification(testPost);
    return success;
};

const sendTelegram = async (options: SendOptions): Promise<boolean> => {
    console.log('\n💬 Sending Telegram Message...');
    console.log(`Chat ID: ${options.recipient}`);
    console.log(`Title: ${options.title || 'JDU Notification'}`);
    console.log(`Message: ${options.message || 'Test message'}`);

    const testPost: NotificationPost = {
        id: `cli-${Date.now()}`,
        arn: '',
        title: options.title || 'JDU Notification',
        description: options.description || options.message || 'Test message',
        family_name: options.familyName || 'Test',
        given_name: options.givenName || 'User',
        student_id: options.studentId || '0',
        phone_number: '',
        chat_id: options.recipient,
        language: (options.language as any) || 'en',
        priority: 'high',
        sms: false,
    } as NotificationPost;

    console.log(`\n📤 Sending via Telegram...`);
    const success = await telegramService.sendNotification(testPost);
    return success;
};

const parseArguments = (args: string[]): SendOptions | null => {
    if (args.length < 3) {
        return null;
    }

    const type = args[0].toLowerCase() as 'sms' | 'push' | 'telegram';
    const recipient = args[1];
    const message = args.slice(2).join(' ');

    if (!['sms', 'push', 'telegram'].includes(type)) {
        console.error(`❌ Invalid type: ${type}`);
        return null;
    }

    const options: SendOptions = {
        type,
        recipient,
        message,
        title: 'JDU Notification',
        description: message,
        familyName: 'Test',
        givenName: 'User',
        language: 'en',
    };

    // Parse additional options from message
    // Format: "message" --option value
    if (message.includes('--')) {
        const parts = message.split('--');
        options.message = parts[0].trim();

        for (let i = 1; i < parts.length; i++) {
            const optPart = parts[i].trim();
            const [key, ...valueParts] = optPart.split(' ');
            const value = valueParts.join(' ');

            switch (key) {
                case 'title':
                    options.title = value;
                    break;
                case 'description':
                    options.description = value;
                    break;
                case 'name':
                    const nameParts = value.split(' ');
                    if (nameParts.length >= 2) {
                        options.familyName = nameParts[0];
                        options.givenName = nameParts.slice(1).join(' ');
                    }
                    break;
                case 'language':
                    options.language = value;
                    break;
            }
        }
    }

    return options;
};

const printUsage = () => {
    console.log('\n🚀 JDU Notification CLI');
    console.log('═'.repeat(80));
    console.log('\n📖 USAGE:');
    console.log(
        '  npx ts-node src/scripts/send-notification.ts <type> <recipient> <message> [options]'
    );
    console.log('\n📋 ARGUMENTS:');
    console.log('  <type>        : sms | push | telegram');
    console.log(
        '  <recipient>   : Phone number (SMS), Push token (push), or Chat ID (Telegram)'
    );
    console.log('  <message>     : Message content (can be multiple words)');
    console.log('\n⚙️  OPTIONS (append to message with -- prefix):');
    console.log(
        '  --title VALUE       : Notification title (default: "JDU Notification")'
    );
    console.log('  --description VALUE : Description text');
    console.log('  --name FIRST LAST   : Recipient name');
    console.log('  --language CODE     : Language (en, ru, ja, uz)');

    console.log('\n📱 SMS EXAMPLES:');
    console.log('  # Send to Uzbekistan number via PlayMobile/AWS');
    console.log(
        '  npx ts-node src/scripts/send-notification.ts sms +998901234567 "Hello from JDU"'
    );
    console.log('  ');
    console.log('  # Send to international number via AWS SMS');
    console.log(
        '  npx ts-node src/scripts/send-notification.ts sms +16175551234 "Hello"'
    );
    console.log('  ');
    console.log('  # With name option');
    console.log(
        '  npx ts-node src/scripts/send-notification.ts sms +998901234567 "Your child has news" --name John Doe'
    );

    console.log('\n🔔 PUSH EXAMPLES:');
    console.log('  # Send push notification to iOS or Android');
    console.log(
        '  npx ts-node src/scripts/send-notification.ts push "ExponentPushToken[...]" "New notification"'
    );
    console.log('  ');
    console.log('  # With custom title');
    console.log(
        '  npx ts-node src/scripts/send-notification.ts push "token_here" "Message body" --title "Custom Title"'
    );

    console.log('\n💬 TELEGRAM EXAMPLES:');
    console.log('  # Send Telegram message');
    console.log(
        '  npx ts-node src/scripts/send-notification.ts telegram 123456789 "Hello from JDU"'
    );
    console.log('  ');
    console.log('  # With title and name');
    console.log(
        '  npx ts-node src/scripts/send-notification.ts telegram 123456789 "Your update" --title "Update" --name Alex Smith'
    );

    console.log('\n✅ EXIT CODES:');
    console.log('  0 : Success');
    console.log('  1 : Invalid arguments');
    console.log('  2 : Send failed');
    console.log('\n');
};

const main = async () => {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printUsage();
        process.exit(0);
    }

    const options = parseArguments(args);

    if (!options) {
        console.error('❌ Invalid arguments');
        printUsage();
        process.exit(1);
    }

    console.log('🚀 JDU Notification CLI');
    console.log('═'.repeat(80));

    let success = false;

    try {
        switch (options.type) {
            case 'sms':
                success = await sendSms(options);
                break;
            case 'push':
                success = await sendPush(options);
                break;
            case 'telegram':
                success = await sendTelegram(options);
                break;
        }

        if (success) {
            console.log('\n✅ Notification sent successfully!');
            process.exit(0);
        } else {
            console.log('\n❌ Failed to send notification');
            process.exit(2);
        }
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(2);
    } finally {
        await DB.closeConnection();
    }
};

main();
