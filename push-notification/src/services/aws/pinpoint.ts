import { PinpointClient, SendMessagesCommand, DirectMessageConfiguration } from '@aws-sdk/client-pinpoint';
import { getAwsConfig } from '../../config/aws';
import { ENVIRONMENT } from '../../config/environment';
import { detectTokenType } from '../../utils/token-detection';
import { NotificationPost } from '../../types/events';
import { getLocalizedText } from '../../utils/localization';

export class PinpointService {
    private pinpointClient: PinpointClient;

    constructor() {
        this.pinpointClient = new PinpointClient(getAwsConfig());
    }

    async sendPushNotification(post: NotificationPost): Promise<boolean> {
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

            if (channelType === 'APNS') {
                // iOS Configuration
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
                // Android Configuration
                messageConfiguration = {
                    GCMMessage: {
                        Title: title,
                        Body: body,
                        Priority: 'high',
                        Data: messageData,
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
                                title: title,
                                body: body,
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
                ApplicationId: ENVIRONMENT.PINPOINT_APP_ID,
                MessageRequest: {
                    Addresses: {
                        [post.arn]: {
                            ChannelType: channelType
                        }
                    },
                    MessageConfiguration: messageConfiguration
                }
            });

            const result = await this.pinpointClient.send(command);
            const messageResult = result.MessageResponse?.Result?.[post.arn];

            if (messageResult?.DeliveryStatus === 'SUCCESSFUL') {
                console.log(`✅ Push notification sent successfully for post ${post.id} via ${platform}`);
                return true;
            } else {
                console.log(`❌ Push notification failed for post ${post.id} via ${platform}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Error sending push notification for post ${post.id}:`, error);
            return false;
        }
    }
}