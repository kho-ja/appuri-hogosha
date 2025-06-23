import { PinpointClient, SendMessagesCommand, ChannelType } from '@aws-sdk/client-pinpoint';
import { config } from "dotenv";
import DatabaseClient from "./db-client";

config();

const pinpointClient = new PinpointClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

const DB = new DatabaseClient();

// Enhanced token detection with more details
const analyzeToken = (token: string) => {
    if (!token) {
        return { type: 'invalid', platform: 'unknown', issues: ['Token is empty'] };
    }

    const issues: string[] = [];

    // iOS APNS token patterns
    const iosDeviceTokenPattern = /^[a-fA-F0-9]{64}$/; // 64 hex chars (legacy)
    const iosModernTokenPattern = /^[a-fA-F0-9]{64,}$/; // 64+ hex chars (modern)

    // FCM token patterns
    const fcmLegacyPattern = /^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/; // Contains colon
    const fcmModernPattern = /^[A-Za-z0-9_-]{140,}$/; // Very long base64-like

    // Check token characteristics
    const hasColon = token.includes(':');
    const isHexOnly = /^[a-fA-F0-9]+$/.test(token);
    const length = token.length;

    if (iosDeviceTokenPattern.test(token)) {
        return {
            type: 'apns',
            platform: 'iOS',
            channelType: ChannelType.APNS,
            length: length,
            format: 'Device Token (64 hex)',
            issues: length !== 64 ? ['Unusual length for iOS token'] : []
        };
    } else if (iosModernTokenPattern.test(token) && isHexOnly) {
        return {
            type: 'apns',
            platform: 'iOS',
            channelType: ChannelType.APNS,
            length: length,
            format: 'Modern iOS Token',
            issues: length < 64 ? ['Token too short for iOS'] : []
        };
    } else if (fcmLegacyPattern.test(token) || hasColon) {
        return {
            type: 'fcm',
            platform: 'Android',
            channelType: ChannelType.GCM,
            length: length,
            format: 'FCM Token',
            issues: length < 100 ? ['Token seems too short for FCM'] : []
        };
    } else {
        issues.push('Unknown token format');
        issues.push(`Length: ${length} chars`);
        issues.push(`Has colon: ${hasColon}`);
        issues.push(`Is hex only: ${isHexOnly}`);

        return {
            type: 'unknown',
            platform: 'Unknown',
            channelType: ChannelType.GCM, // Default to GCM
            length: length,
            format: 'Unknown Format',
            issues: issues
        };
    }
};

// Enhanced push notification with better payload
const sendEnhancedPushNotification = async (token: string, testMessage: any) => {
    const analysis = analyzeToken(token);

    console.log(`\n🔍 Token Analysis:`);
    console.log(`   Platform: ${analysis.platform}`);
    console.log(`   Type: ${analysis.type}`);
    console.log(`   Format: ${analysis.format}`);
    console.log(`   Length: ${analysis.length} chars`);
    if (analysis.issues.length > 0) {
        console.log(`   ⚠️  Issues: ${analysis.issues.join(', ')}`);
    }

    try {
        let messageConfiguration: any = {};

        if (analysis.type === 'apns') {
            // Enhanced iOS APNS payload
            messageConfiguration = {
                APNSMessage: {
                    Title: testMessage.title,
                    Body: testMessage.body,
                    Priority: 'high',
                    Sound: 'default',
                    Badge: 1,
                    Action: 'OPEN_APP',
                    TimeToLive: 86400, // 24 hours
                    SilentPush: false,
                    Data: {
                        test: 'true',
                        timestamp: new Date().toISOString(),
                        url: testMessage.url,
                        post_id: testMessage.post_id
                    },
                    // Add iOS-specific payload
                    RawContent: JSON.stringify({
                        aps: {
                            alert: {
                                title: testMessage.title,
                                body: testMessage.body
                            },
                            sound: 'default',
                            badge: 1,
                            'mutable-content': 1,
                            'content-available': 1
                        },
                        data: {
                            test: 'true',
                            url: testMessage.url,
                            post_id: testMessage.post_id
                        }
                    })
                }
            };
        } else {
            // Enhanced Android FCM payload
            messageConfiguration = {
                GCMMessage: {
                    Title: testMessage.title,
                    Body: testMessage.body,
                    Priority: 'high',
                    Sound: 'default',
                    TimeToLive: 86400, // 24 hours
                    SilentPush: false,
                    Data: {
                        test: 'true',
                        timestamp: new Date().toISOString(),
                        url: testMessage.url,
                        post_id: testMessage.post_id
                    },
                    // Add Android-specific payload with FCM v1 format
                    RawContent: JSON.stringify({
                        message: {
                            notification: {
                                title: testMessage.title,
                                body: testMessage.body
                            },
                            data: {
                                test: 'true',
                                url: testMessage.url,
                                post_id: testMessage.post_id,
                                click_action: 'FLUTTER_NOTIFICATION_CLICK'
                            },
                            android: {
                                priority: 'high',
                                notification: {
                                    title: testMessage.title,
                                    body: testMessage.body,
                                    icon: 'ic_notification',
                                    color: '#005678',
                                    sound: 'default',
                                    channel_id: 'default',
                                    default_sound: true,
                                    default_vibrate_timings: true
                                }
                            }
                        }
                    })
                }
            };
        }

        const command = new SendMessagesCommand({
            ApplicationId: process.env.PINPOINT_APP_ID!,
            MessageRequest: {
                Addresses: {
                    [token]: {
                        ChannelType: analysis.channelType
                    }
                },
                MessageConfiguration: messageConfiguration
            }
        });

        console.log(`\n📤 Sending ${analysis.platform} notification...`);
        const result = await pinpointClient.send(command);

        const messageResult = result.MessageResponse?.Result?.[token];

        console.log(`\n📊 AWS Response Details:`);
        console.log(`   Delivery Status: ${messageResult?.DeliveryStatus}`);
        console.log(`   Status Code: ${messageResult?.StatusCode}`);
        console.log(`   Status Message: ${messageResult?.StatusMessage}`);
        console.log(`   Message ID: ${messageResult?.MessageId}`);

        if (messageResult?.DeliveryStatus === 'SUCCESSFUL') {
            console.log(`\n✅ AWS reports success for ${analysis.platform}!`);
            console.log(`\n🔍 Debugging Tips:`);

            if (analysis.type === 'fcm') {
                console.log(`   📱 Android Troubleshooting:`);
                console.log(`      1. Check if app is in background/foreground`);
                console.log(`      2. Verify FCM server key in Pinpoint console`);
                console.log(`      3. Check device notification permissions`);
                console.log(`      4. Look for 'onMessageReceived' in app logs`);
                console.log(`      5. Test with Firebase Console directly`);
                console.log(`      6. Check if device has internet connectivity`);
                console.log(`      7. Verify notification channel is created in app`);
            } else {
                console.log(`   📱 iOS Troubleshooting:`);
                console.log(`      1. Check APNS certificate in Pinpoint console`);
                console.log(`      2. Verify app is signed with correct provisioning profile`);
                console.log(`      3. Check device notification permissions`);
                console.log(`      4. Ensure app delegate handles notifications`);
                console.log(`      5. Test with production vs sandbox APNS`);
                console.log(`      6. Check if device is connected to internet`);
            }

            return true;
        } else {
            console.log(`\n❌ AWS reports failure:`, messageResult?.StatusMessage);
            return false;
        }
    } catch (error) {
        console.error(`\n❌ Error sending notification:`, error);
        return false;
    }
};

// Test with real tokens from database
const testWithDatabaseTokens = async () => {
    console.log('\n🔍 Testing with real tokens from database...');

    try {
        // Get sample tokens from database
        const tokens = await DB.query(`
            SELECT 
                arn as token,
                id,
                phone_number
            FROM Parent 
            WHERE arn IS NOT NULL 
            AND arn != ''
            LIMIT 5
        `);

        if (!tokens || tokens.length === 0) {
            console.log('❌ No tokens found in database');
            return;
        }

        console.log(`Found ${tokens.length} tokens to test:\n`);

        for (const [index, row] of tokens.entries()) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🧪 Testing Token ${index + 1}/${tokens.length}`);
            console.log(`   Parent ID: ${row.id}`);
            console.log(`   Phone: ${row.phone_number}`);
            console.log(`   Token: ${row.token.substring(0, 30)}...`);

            const testMessage = {
                title: `Test ${index + 1} - Debug Notification`,
                body: `This is a debug test notification sent at ${new Date().toLocaleTimeString()}`,
                url: `jduapp://(tabs)/(home)/message/test-${index + 1}`,
                post_id: `test-${index + 1}`
            };

            const success = await sendEnhancedPushNotification(row.token, testMessage);

            if (success) {
                console.log(`\n⏰ Notification sent! Check your device in the next 30 seconds...`);
                console.log(`   📱 Expected: "${testMessage.title}"`);
                console.log(`   💬 Content: "${testMessage.body}"`);
            }

            // Wait between tests to avoid rate limiting
            if (index < tokens.length - 1) {
                console.log(`\n⏳ Waiting 3 seconds before next test...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

    } catch (error) {
        console.error('❌ Database test error:', error);
    }
};

// Check Pinpoint app configuration
const checkPinpointConfiguration = async () => {
    console.log('\n🔍 Checking Pinpoint App Configuration...');

    try {
        // This would require additional AWS SDK calls to check app settings
        // For now, provide manual verification steps
        console.log(`\n📋 Manual Verification Checklist:`);
        console.log(`   1. Go to: https://console.aws.amazon.com/pinpoint/`);
        console.log(`   2. Select your app: ${process.env.PINPOINT_APP_ID}`);
        console.log(`   3. Check Settings → Push notifications:`);
        console.log(`      ✅ Firebase Cloud Messaging (FCM) - Enabled with valid server key`);
        console.log(`      ✅ Apple Push Notification service (APNs) - Enabled with valid certificate`);
        console.log(`   4. Verify channel status shows "Enabled"`);
        console.log(`   5. Check if certificates are not expired`);

    } catch (error) {
        console.error('❌ Configuration check error:', error);
    }
};

// Main debug function
const debugPushNotifications = async () => {
    console.log('🔧 AWS End User Messaging Push Notification Debugger');
    console.log('═'.repeat(60));
    console.log(`📱 App ID: ${process.env.PINPOINT_APP_ID}`);
    console.log(`🌐 Region: ${process.env.AWS_REGION}`);
    console.log('═'.repeat(60));

    // Check configuration
    await checkPinpointConfiguration();

    // Test with real database tokens
    await testWithDatabaseTokens();

    console.log('\n📋 Final Troubleshooting Steps:');
    console.log('═'.repeat(40));
    console.log('1. 📱 Check device notification permissions');
    console.log('2. 🔄 Try restarting your mobile app');
    console.log('3. 🌐 Verify device internet connection');
    console.log('4. 📲 Test app in both foreground and background');
    console.log('5. 🔍 Check mobile app logs for notification handling');
    console.log('6. 🧪 Test with Firebase Console directly (for Android)');
    console.log('7. 📊 Check AWS CloudWatch logs for delivery receipts');
    console.log('8. ⚙️  Verify FCM server key and APNS certificates');

    console.log('\n💡 Common Issues:');
    console.log('   • App not handling background notifications');
    console.log('   • Notification permissions denied');
    console.log('   • FCM server key incorrect or expired');
    console.log('   • APNS certificate expired or wrong environment');
    console.log('   • Device in do-not-disturb mode');
    console.log('   • App killed by system (battery optimization)');

    await DB.closeConnection();
};

// Run the debugger
debugPushNotifications().then(() => {
    console.log('\n✅ Debug session completed!');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Debug session failed:', error);
    process.exit(1);
});