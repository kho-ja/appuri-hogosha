import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceiptId } from 'expo-server-sdk';
import { NotificationPost } from '../../types/events';
import { getLocalizedText } from '../../utils/localization';

export class ExpoPushService {
    private expo: Expo;

    constructor() {
        // Create a new Expo SDK client
        this.expo = new Expo({
            accessToken: process.env.EXPO_ACCESS_TOKEN, // Optional: for analytics
            useFcmV1: true // Use FCM v1 API (recommended)
        });
    }

    /**
     * Check if a push token is a valid Expo push token
     */
    isExpoPushToken(token: string): boolean {
        return Expo.isExpoPushToken(token);
    }

    /**
     * Send push notification via Expo Push Service
     */
    async sendExpoPushNotification(post: NotificationPost): Promise<boolean> {
        try {
            if (!post.arn) {
                console.log(`No push token for post ${post.id}`);
                return false;
            }

            // Check if this is a valid Expo push token
            if (!this.isExpoPushToken(post.arn)) {
                console.log(`Invalid Expo push token for post ${post.id}: ${post.arn}`);
                return false;
            }

            const title = getLocalizedText(post.language, 'title', post);
            const body = getLocalizedText(post.language, 'body', post);

            // Construct the push message
            const message: ExpoPushMessage = {
                to: post.arn,
                title: title,
                body: body,
                data: {
                    url: `jduapp://(tabs)/(home)/message/${post.id}`, // TODO: Implement deep linking for every other variant of app
                    post_id: post.id.toString(),
                    priority: post.priority,
                    student_name: `${post.given_name} ${post.family_name}`,
                    click_action: 'OPEN_APP'
                },
                priority: 'high',
                sound: 'default',
                badge: 1,
                channelId: 'default', // For Android notification channels
                categoryId: 'message', // For iOS notification categories
                ttl: 86400, // Time to live in seconds (24 hours)
                mutableContent: true, // Allow content modifications on iOS
                _contentAvailable: true, // Wake up the app in background on iOS
            };

            console.log(`📱 Sending Expo push notification for post ${post.id}`);

            // Send the notification
            const chunks = this.expo.chunkPushNotifications([message]);
            const tickets: ExpoPushTicket[] = [];

            for (const chunk of chunks) {
                try {
                    const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                    tickets.push(...ticketChunk);
                } catch (error) {
                    console.error(`❌ Error sending push notification chunk for post ${post.id}:`, error);
                    return false;
                }
            }

            // Check if the notification was accepted
            const ticket = tickets[0];
            if (ticket.status === 'ok') {
                console.log(`✅ Expo push notification sent successfully for post ${post.id}`);

                // Optionally, you can store the receipt ID to check delivery status later
                if (ticket.id) {
                    console.log(`📋 Receipt ID for post ${post.id}: ${ticket.id}`);
                    // You could store this receipt ID in the database for later verification
                }

                return true;
            } else {
                console.log(`❌ Expo push notification failed for post ${post.id}:`, ticket.message);

                // Handle specific error cases
                if (ticket.details?.error === 'DeviceNotRegistered') {
                    console.log(`📱 Device not registered for post ${post.id} - token may be invalid`);
                    // You might want to mark this token as invalid in your database
                } else if (ticket.details?.error === 'MessageTooBig') {
                    console.log(`📏 Message too big for post ${post.id}`);
                } else if (ticket.details?.error === 'MessageRateExceeded') {
                    console.log(`⏱️ Message rate exceeded for post ${post.id}`);
                }

                return false;
            }
        } catch (error) {
            console.error(`❌ Error sending Expo push notification for post ${post.id}:`, error);
            return false;
        }
    }

    /**
     * Check delivery receipts for sent notifications
     * This method can be called periodically to verify delivery status
     */
    async checkDeliveryReceipts(receiptIds: ExpoPushReceiptId[]): Promise<void> {
        try {
            const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);

            for (const chunk of receiptIdChunks) {
                try {
                    const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

                    for (const receiptId in receipts) {
                        const receipt = receipts[receiptId];

                        if (receipt.status === 'ok') {
                            console.log(`✅ Receipt ${receiptId}: delivered successfully`);
                        } else if (receipt.status === 'error') {
                            console.error(`❌ Receipt ${receiptId}: delivery failed`, receipt.message);

                            // Handle specific delivery errors
                            if (receipt.details?.error === 'DeviceNotRegistered') {
                                console.log(`📱 Device not registered for receipt ${receiptId}`);
                                // Mark the push token as invalid
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Error checking receipt chunk:', error);
                }
            }
        } catch (error) {
            console.error('❌ Error checking delivery receipts:', error);
        }
    }

    /**
     * Validate multiple Expo push tokens
     */
    validatePushTokens(tokens: string[]): { valid: string[]; invalid: string[] } {
        const valid: string[] = [];
        const invalid: string[] = [];

        for (const token of tokens) {
            if (this.isExpoPushToken(token)) {
                valid.push(token);
            } else {
                invalid.push(token);
            }
        }

        return { valid, invalid };
    }

    /**
     * Send notifications to multiple recipients
     */
    async sendBulkExpoPushNotifications(
        posts: NotificationPost[]
    ): Promise<{ successful: string[]; failed: string[] }> {
        const successful: string[] = [];
        const failed: string[] = [];

        // Filter only posts with valid Expo tokens
        const validPosts = posts.filter(post =>
            post.arn && this.isExpoPushToken(post.arn)
        );

        if (validPosts.length === 0) {
            console.log('📭 No valid Expo push tokens found');
            return { successful, failed };
        }

        console.log(`📤 Sending ${validPosts.length} Expo push notifications...`);

        // Create messages for all valid posts
        const messages: ExpoPushMessage[] = validPosts.map(post => {
            const title = getLocalizedText(post.language, 'title', post);
            const body = getLocalizedText(post.language, 'body', post);

            return {
                to: post.arn!,
                title: title,
                body: body,
                data: {
                    url: `jduapp://(tabs)/(home)/message/${post.id}`,
                    post_id: post.id.toString(),
                    priority: post.priority,
                    student_name: `${post.given_name} ${post.family_name}`,
                    click_action: 'OPEN_APP'
                },
                priority: 'high',
                sound: 'default',
                badge: 1,
                channelId: 'default',
                categoryId: 'message',
                ttl: 86400,
                mutableContent: true,
                _contentAvailable: true,
            };
        });

        // Send in chunks
        const chunks = this.expo.chunkPushNotifications(messages);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            try {
                const tickets = await this.expo.sendPushNotificationsAsync(chunk);

                // Process results
                for (let j = 0; j < tickets.length; j++) {
                    const ticket = tickets[j];
                    const post = validPosts[i * 100 + j]; // Expo chunks at 100 by default

                    if (ticket.status === 'ok') {
                        successful.push(post.id);
                        console.log(`✅ Expo notification sent for post ${post.id}`);
                    } else {
                        failed.push(post.id);
                        console.log(`❌ Expo notification failed for post ${post.id}:`, ticket.message);
                    }
                }
            } catch (error) {
                console.error(`❌ Error sending chunk ${i + 1}:`, error);
                // Mark all posts in this chunk as failed
                const chunkPosts = validPosts.slice(i * 100, (i + 1) * 100);
                failed.push(...chunkPosts.map(post => post.id));
            }
        }

        console.log(`📊 Expo bulk send complete: ${successful.length} successful, ${failed.length} failed`);
        return { successful, failed };
    }
}
