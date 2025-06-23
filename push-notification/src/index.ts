import { PinpointClient, SendMessagesCommand, ChannelType, DirectMessageConfiguration, PinpointClientConfig } from '@aws-sdk/client-pinpoint';
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { Telegraf, Markup } from "telegraf";
import { config } from "dotenv";
import DatabaseClient from "./db-client";
config();

// Check if running locally or in Lambda
const isLocal = !process.env.AWS_LAMBDA_FUNCTION_NAME;

console.log(`🏃 Running in ${isLocal ? 'LOCAL' : 'LAMBDA'} environment`);

// AWS Client configuration
const awsConfig: PinpointClientConfig = {
    region: process.env.AWS_REGION || 'us-east-1'
};

// For local development, you can optionally specify custom credentials
if (isLocal && process.env.LOCAL_AWS_ACCESS_KEY_ID && process.env.LOCAL_AWS_SECRET_ACCESS_KEY) {
    console.log('🔑 Using custom local AWS credentials');
    awsConfig.credentials = {
        accessKeyId: process.env.LOCAL_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.LOCAL_AWS_SECRET_ACCESS_KEY
    };
} else if (isLocal) {
    console.log('🔑 Using AWS CLI credentials or default credential chain');
}

// Initialize AWS End User Messaging clients
const pinpointClient = new PinpointClient(awsConfig);
const smsClient = new PinpointSMSVoiceV2Client(awsConfig);

// Initialize Telegram bot
const bot = new Telegraf(process.env.BOT_TOKEN!);

// Get DB instance
const DB = new DatabaseClient();

const fetchPosts = async () => {
    return await DB.query(
        `SELECT pp.id,
                pa.arn,
                po.title,
                po.description,
                st.family_name,
                st.given_name,
                pses.chat_id,
                pses.language,
                pa.phone_number,
                po.priority,
                CASE
                    WHEN (po.priority = 'high' AND sc.sms_high = true) OR
                         (po.priority = 'medium' AND sc.sms_medium = true) OR
                         (po.priority = 'low' AND sc.sms_low = true)
                        THEN true
                    ELSE false
                    END AS sms
         FROM PostParent AS pp
                  INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                  INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                  LEFT JOIN Post AS po ON ps.post_id = po.id
                  INNER JOIN Student AS st ON ps.student_id = st.id
                  LEFT JOIN ParentSession AS pses ON pses.parent_id = pa.id
                  INNER JOIN School AS sc ON st.school_id = sc.id
         WHERE pa.arn IS NOT NULL
           AND pp.push = false
           AND pp.viewed_at IS NULL LIMIT 25;`);
};

// Helper function to detect token type (iOS APNS vs Android FCM)
const detectTokenType = (token: string): { channelType: ChannelType; isValid: boolean; platform: string } => {
    if (!token) {
        return { channelType: ChannelType.GCM, isValid: false, platform: 'unknown' };
    }

    // iOS APNS tokens are typically 64 characters of hexadecimal (device tokens)
    const iosTokenPattern = /^[a-fA-F0-9]{64,}$/;

    // FCM tokens contain colons and are much longer
    const fcmTokenPattern = /^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/;

    if (iosTokenPattern.test(token)) {
        return { channelType: ChannelType.APNS, isValid: true, platform: 'iOS' };
    } else if (fcmTokenPattern.test(token) || token.includes(':')) {
        return { channelType: ChannelType.GCM, isValid: true, platform: 'Android' };
    } else {
        return { channelType: ChannelType.GCM, isValid: true, platform: 'Android (assumed)' };
    }
};

// Helper function to get localized text
const getLocalizedText = (language: string, type: 'title' | 'body' | 'sms', data: any) => {
    const studentName = `${data.given_name} ${data.family_name}`;

    const texts = {
        jp: {
            title: `新しい投稿: ${data.title}`,
            body: `${studentName}への新しいメッセージがあります`,
            sms: `新しい投稿: ${data.title} - ${data.description ? data.description.substring(0, 50) + '...' : ''} ${studentName}宛 リンク: https://appuri-hogosha.vercel.app/parentnotification`
        },
        ru: {
            title: `Новый пост: ${data.title}`,
            body: `Новое сообщение для ${studentName}`,
            sms: `Новый пост: ${data.title} - ${data.description ? data.description.substring(0, 50) + '...' : ''} для ${studentName} ссылка: https://appuri-hogosha.vercel.app/parentnotification`
        },
        uz: {
            title: `Yangi post: ${data.title}`,
            body: `${studentName} uchun yangi xabar`,
            sms: `Yangi post: ${data.title} - ${data.description ? data.description.substring(0, 50) + '...' : ''} ${studentName} uchun havola: https://appuri-hogosha.vercel.app/parentnotification`
        }
    };

    return texts[language as keyof typeof texts]?.[type] || texts.uz[type];
};

// Send push notification via AWS End User Messaging (still uses Pinpoint API)
const sendPushNotification = async (post: any): Promise<boolean> => {
    try {
        if (!post.arn) {
            console.log(`No push token for post ${post.id}`);
            return false;
        }

        const { channelType, isValid, platform } = detectTokenType(post.arn);

        if (!isValid) {
            console.log(`Invalid token format for post ${post.id}`);
            return false;
        }

        const title = getLocalizedText(post.language, 'title', post);
        const body = getLocalizedText(post.language, 'body', post);

        const messageData = {
            url: `jduapp://(tabs)/(home)/message/${post.id}`,
            post_id: post.id.toString(),
            priority: post.priority,
            student_name: `${post.given_name} ${post.family_name}`,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        };

        let messageConfiguration: DirectMessageConfiguration = {};

        if (channelType === ChannelType.APNS) {
            // iOS Configuration (unchanged - iOS works fine)
            messageConfiguration = {
                APNSMessage: {
                    Title: title,
                    Body: body,
                    Priority: 'high',
                    Sound: 'default',
                    Badge: 1,
                    Action: 'OPEN_APP',
                    TimeToLive: 86400,
                    SilentPush: false,
                    Data: messageData,
                    RawContent: JSON.stringify({
                        aps: {
                            alert: {
                                title: title,
                                body: body
                            },
                            sound: 'default',
                            badge: 1,
                            'mutable-content': 1,
                            'content-available': 1
                        },
                        data: messageData
                    })
                }
            };
        } else {
            // 🤖 ANDROID - PROVEN WORKING FORMAT (Test 2)
            messageConfiguration = {
                GCMMessage: {
                    // Root level title/body for AWS
                    Title: title,
                    Body: body,
                    Priority: 'high',
                    Data: messageData,

                    // 🏆 THE WINNING PAYLOAD - Android-Optimized Format
                    RawContent: JSON.stringify({
                        notification: {
                            title: title,
                            body: body,
                            icon: 'ic_notification',
                            color: '#005678',
                            click_action: 'FLUTTER_NOTIFICATION_CLICK',
                            channel_id: 'default',
                            priority: 'high'
                        },
                        data: {
                            url: `jduapp://(tabs)/(home)/message/${post.id}`,
                            post_id: post.id.toString(),
                            priority: post.priority,
                            student_name: `${post.given_name} ${post.family_name}`,
                            test_type: 'production',
                            title: title,  // Duplicate for app handling
                            body: body,    // Duplicate for app handling
                            click_action: 'FLUTTER_NOTIFICATION_CLICK'
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                title: title,
                                body: body,
                                icon: 'ic_notification',
                                color: '#005678',
                                channel_id: 'default',
                                notification_priority: 'PRIORITY_HIGH',
                                default_sound: true,
                                default_vibrate_timings: true
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
                    [post.arn]: {
                        ChannelType: channelType
                    }
                },
                MessageConfiguration: messageConfiguration
            }
        });

        const result = await pinpointClient.send(command);

        const messageResult = result.MessageResponse?.Result?.[post.arn];

        if (messageResult?.DeliveryStatus === 'SUCCESSFUL') {
            console.log(`✅ Push notification sent successfully for post ${post.id} via ${platform}`);
            console.log(`   📱 Title: ${title}`);
            console.log(`   💬 Body: ${body}`);
            console.log(`   📊 AWS Message ID: ${messageResult.MessageId}`);
            return true;
        } else {
            console.log(`❌ Push notification failed for post ${post.id} via ${platform}`);
            console.log(`   📊 Status: ${messageResult?.DeliveryStatus}`);
            console.log(`   📊 Status Code: ${messageResult?.StatusCode}`);
            console.log(`   📊 Message: ${messageResult?.StatusMessage}`);

            // Log common failure reasons
            if (messageResult?.StatusCode === 400) {
                console.log(`   💡 Likely cause: Invalid token format or expired token`);
            } else if (messageResult?.StatusCode === 401) {
                console.log(`   💡 Likely cause: Invalid FCM server key or APNS certificate`);
            } else if (messageResult?.StatusCode === 404) {
                console.log(`   💡 Likely cause: Token not registered or app uninstalled`);
            }

            return false;
        }
    } catch (error) {
        console.error(`❌ Error sending push notification for post ${post.id}:`, error);
        return false;
    }
};

// Send SMS via AWS End User Messaging SMS v2 API (worldwide)
const sendSMS = async (post: any): Promise<boolean> => {
    try {
        if (!post.phone_number) {
            console.log(`No phone number for post ${post.id}`);
            return false;
        }

        // Format phone number (ensure it starts with +)
        let formattedPhoneNumber = post.phone_number;
        if (!formattedPhoneNumber.startsWith('+')) {
            formattedPhoneNumber = `+${formattedPhoneNumber}`;
        }

        const smsText = getLocalizedText(post.language, 'sms', post);

        const command = new SendTextMessageCommand({
            DestinationPhoneNumber: formattedPhoneNumber,
            MessageBody: smsText,
            OriginationIdentity: process.env.SMS_ORIGINATION_IDENTITY,
            ConfigurationSetName: process.env.SMS_CONFIGURATION_SET_NAME,
            Context: {
                post_id: post.id.toString(),
                priority: post.priority,
                language: post.language
            }
        });

        const result = await smsClient.send(command);

        if (result.MessageId) {
            console.log(`✅ SMS sent successfully for post ${post.id} to ${formattedPhoneNumber}. MessageId: ${result.MessageId}`);
            return true;
        } else {
            console.log(`❌ SMS failed for post ${post.id} to ${formattedPhoneNumber}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error sending SMS for post ${post.id}:`, error);
        return false;
    }
};

// Send Telegram notification
const sendTelegramNotification = async (post: any): Promise<boolean> => {
    try {
        if (!post.chat_id) {
            return false;
        }

        let text = '', buttonText = '';
        if (post.language === 'jp') {
            text = `新しい投稿: ${post.title} に ${post.given_name} ${post.family_name}`;
            buttonText = '見る';
        } else if (post.language === 'ru') {
            text = `Новый пост: ${post.title} для ${post.given_name} ${post.family_name}`;
            buttonText = 'Посмотреть';
        } else {
            text = `Yangi post: ${post.title} uchun ${post.given_name} ${post.family_name}`;
            buttonText = 'Ko\'rish';
        }

        const button = Markup.inlineKeyboard([
            Markup.button.url(buttonText, "https://appuri-hogosha.vercel.app/parentnotification")
        ]);

        await bot.telegram.sendMessage(post.chat_id, text, button);
        console.log(`✅ Telegram notification sent for post ${post.id}`);
        return true;
    } catch (error) {
        console.error(`❌ Telegram error for post ${post.id}:`, error);
        return false;
    }
};

// Process notifications with AWS End User Messaging
const sendNotifications = async (posts: any[]) => {
    if (!posts.length) return [];

    const notificationPromises = posts.map(async (post) => {
        try {
            let hasSuccessfulNotification = false;

            // Send Telegram notification
            const telegramSuccess = await sendTelegramNotification(post);
            if (telegramSuccess) {
                hasSuccessfulNotification = true;
            }

            // Send SMS via AWS End User Messaging SMS v2 (if enabled for this priority level)
            if (post.sms) {
                const smsSuccess = await sendSMS(post);
                if (smsSuccess) {
                    hasSuccessfulNotification = true;
                }
            }

            // Send Push notification via AWS End User Messaging
            const pushSuccess = await sendPushNotification(post);
            if (pushSuccess) {
                hasSuccessfulNotification = true;
            }

            // Return post ID if at least one notification was successful
            if (hasSuccessfulNotification) {
                return post.id;
            } else {
                console.log(`❌ All notifications failed for post ${post.id}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error processing post ${post.id}:`, error);
            return null;
        }
    });

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notificationPromises);

    // Filter out successful notifications
    return results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => (result as PromiseFulfilledResult<any>).value)
        .filter(Boolean);
};

// Update database for successful notifications
const updateDatabase = async (ids: any[]) => {
    if (!ids.length) return;

    await DB.execute(`UPDATE PostParent SET push = true WHERE id IN (${ids.join(',')});`);
};

// Main notification function
const pushNotifications = async () => {
    console.time('total-execution');

    try {
        console.time('db-fetch');
        const posts = await fetchPosts();
        console.timeEnd('db-fetch');

        if (!posts.length) {
            console.log("No posts found to process");
            return { message: "no posts found", count: 0 };
        }

        console.log(`Processing ${posts.length} notifications...`);

        console.time('send-notifications');
        const successNotifications = await sendNotifications(posts);
        console.timeEnd('send-notifications');

        if (successNotifications.length) {
            console.time('db-update');
            await updateDatabase(successNotifications);
            console.timeEnd('db-update');
        }

        console.log(`✅ Successfully processed ${successNotifications.length}/${posts.length} notifications`);
        return {
            message: "success",
            count: successNotifications.length,
            total: posts.length
        };
    } catch (e) {
        console.error("❌ Error in pushNotifications:", e);
        return { message: "error", error: String(e) };
    } finally {
        console.timeEnd('total-execution');
    }
};

// Lambda handler
export const handler = async () => {
    console.log("🚀 Starting AWS End User Messaging notification handler");

    try {
        const result = await pushNotifications();
        await DB.closeConnection();
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (e) {
        console.error("❌ Handler error:", e);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "error", error: String(e) })
        };
    }
};

// For local development - run directly
if (isLocal) {
    console.log('🚀 Running locally...');
    handler().then(result => {
        console.log('📊 Result:', result);
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error:', error);
        process.exit(1);
    });
}