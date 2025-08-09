import { PinpointService } from '../aws/pinpoint';
import { ExpoPushService } from '../expo/push';
import { detectTokenType, isExpoPushToken } from '../../utils/token-detection';
import { NotificationPost } from '../../types/events';

export class UnifiedPushService {
    private pinpointService: PinpointService;
    private expoPushService: ExpoPushService;

    constructor() {
        this.pinpointService = new PinpointService();
        this.expoPushService = new ExpoPushService();
    }

    /**
     * Send push notification using the appropriate service based on token type
     */
    async sendPushNotification(post: NotificationPost): Promise<boolean> {
        try {
            if (!post.arn) {
                console.log(`No push token for post ${post.id}`);
                return false;
            }

            const tokenAnalysis = detectTokenType(post.arn);
            console.log(`🔍 Token analysis for post ${post.id}: ${tokenAnalysis.platform} (${tokenAnalysis.type || 'unknown'})`);

            // Route to appropriate service based on token type
            if (tokenAnalysis.isExpoToken) {
                console.log(`📱 Routing post ${post.id} to Expo Push Service`);
                return await this.expoPushService.sendExpoPushNotification(post);
            } else {
                console.log(`📱 Routing post ${post.id} to AWS Pinpoint Service (${tokenAnalysis.platform})`);
                return await this.pinpointService.sendPushNotification(post);
            }
        } catch (error) {
            console.error(`❌ Error in unified push service for post ${post.id}:`, error);
            return false;
        }
    }

    /**
     * Send notifications to multiple recipients using the appropriate services
     */
    async sendBulkPushNotifications(
        posts: NotificationPost[]
    ): Promise<{ successful: string[]; failed: string[]; stats: NotificationStats }> {
        const successful: string[] = [];
        const failed: string[] = [];
        const stats: NotificationStats = {
            total: posts.length,
            expo: 0,
            pinpoint_ios: 0,
            pinpoint_android: 0,
            invalid: 0
        };

        // Separate posts by token type
        const expoPosts: NotificationPost[] = [];
        const pinpointPosts: NotificationPost[] = [];
        const invalidPosts: NotificationPost[] = [];

        for (const post of posts) {
            if (!post.arn) {
                invalidPosts.push(post);
                stats.invalid++;
                continue;
            }

            const tokenAnalysis = detectTokenType(post.arn);

            if (tokenAnalysis.isExpoToken) {
                expoPosts.push(post);
                stats.expo++;
            } else if (tokenAnalysis.isValid) {
                pinpointPosts.push(post);
                if (tokenAnalysis.platform === 'iOS') {
                    stats.pinpoint_ios++;
                } else {
                    stats.pinpoint_android++;
                }
            } else {
                invalidPosts.push(post);
                stats.invalid++;
            }
        }

        console.log(`📊 Bulk notification distribution:`);
        console.log(`   📱 Expo: ${expoPosts.length}`);
        console.log(`   🍎 Pinpoint iOS: ${stats.pinpoint_ios}`);
        console.log(`   🤖 Pinpoint Android: ${stats.pinpoint_android}`);
        console.log(`   ❌ Invalid: ${invalidPosts.length}`);

        // Send Expo notifications in bulk
        if (expoPosts.length > 0) {
            try {
                const expoResults = await this.expoPushService.sendBulkExpoPushNotifications(expoPosts);
                successful.push(...expoResults.successful);
                failed.push(...expoResults.failed);
            } catch (error) {
                console.error('❌ Error sending Expo bulk notifications:', error);
                failed.push(...expoPosts.map(post => post.id));
            }
        }

        // Send Pinpoint notifications individually (AWS doesn't have efficient bulk API)
        if (pinpointPosts.length > 0) {
            console.log(`🔄 Processing ${pinpointPosts.length} Pinpoint notifications...`);

            const pinpointPromises = pinpointPosts.map(async (post) => {
                try {
                    const success = await this.pinpointService.sendPushNotification(post);
                    return { postId: post.id, success };
                } catch (error) {
                    console.error(`❌ Error sending Pinpoint notification for post ${post.id}:`, error);
                    return { postId: post.id, success: false };
                }
            });

            const pinpointResults = await Promise.all(pinpointPromises);

            for (const result of pinpointResults) {
                if (result.success) {
                    successful.push(result.postId);
                } else {
                    failed.push(result.postId);
                }
            }
        }

        // Mark invalid tokens as failed
        failed.push(...invalidPosts.map(post => post.id));

        console.log(`📊 Bulk notification results: ${successful.length} successful, ${failed.length} failed`);

        return { successful, failed, stats };
    }

    /**
     * Analyze token distribution in a batch of posts
     */
    analyzeTokenDistribution(posts: NotificationPost[]): TokenDistributionAnalysis {
        const analysis: TokenDistributionAnalysis = {
            total: posts.length,
            expo: 0,
            ios: 0,
            android: 0,
            invalid: 0,
            missing: 0
        };

        for (const post of posts) {
            if (!post.arn) {
                analysis.missing++;
                continue;
            }

            const tokenAnalysis = detectTokenType(post.arn);

            if (tokenAnalysis.isExpoToken) {
                analysis.expo++;
            } else if (tokenAnalysis.isValid) {
                if (tokenAnalysis.platform === 'iOS') {
                    analysis.ios++;
                } else {
                    analysis.android++;
                }
            } else {
                analysis.invalid++;
            }
        }

        return analysis;
    }
}

export interface NotificationStats {
    total: number;
    expo: number;
    pinpoint_ios: number;
    pinpoint_android: number;
    invalid: number;
}

export interface TokenDistributionAnalysis {
    total: number;
    expo: number;
    ios: number;
    android: number;
    invalid: number;
    missing: number;
}
