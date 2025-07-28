import { DatabaseQueries } from '../../services/database/queries';
import { PinpointService } from '../../services/aws/pinpoint';
import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';
import { TelegramService } from '../../services/telegram/bot';
import { getUzbekistanOperatorRouting } from '../../utils/validation';
import { generateSmsText } from '../../utils/localization';
import { NotificationPost } from '../../types/events';
import { NotificationResult } from 'types/responses';

export class NotificationProcessor {
    private telegramService: TelegramService;

    constructor(
        private dbQueries: DatabaseQueries,
        private pinpointService: PinpointService,
        private playMobileService: PlayMobileService,
        private awsSmsService: AwsSmsService
    ) {
        this.telegramService = new TelegramService();
    }

    async processNotifications(): Promise<NotificationResult> {
        console.time('total-execution');

        try {
            console.time('db-fetch');
            // Use the new method that gets both ARN and non-ARN users
            const posts = await this.dbQueries.fetchAllNotificationPosts();
            console.timeEnd('db-fetch');

            if (!posts.length) {
                console.log("📭 No notifications to process");
                return { message: "no notifications", count: 0, total: 0 };
            }

            // Separate posts into push-enabled and SMS-only
            const pushPosts = posts.filter(post => post.arn && post.arn.trim() !== '');
            const smsOnlyPosts = posts.filter(post => (!post.arn || post.arn.trim() === '') && post.sms);

            console.log(`📋 Processing ${posts.length} total notifications:`);
            console.log(`   📱 ${pushPosts.length} with push tokens (ARN)`);
            console.log(`   📧 ${smsOnlyPosts.length} SMS-only (no ARN)`);

            console.time('send-notifications');
            const results = await this.sendMixedNotifications(pushPosts, smsOnlyPosts);
            console.timeEnd('send-notifications');

            const successfulIds = results.successful.map(id => parseInt(id, 10));

            if (successfulIds.length) {
                console.time('db-update');
                await this.dbQueries.updateProcessedPosts(successfulIds);
                console.timeEnd('db-update');
            }

            console.log(`✅ Successfully processed ${successfulIds.length}/${posts.length} notifications`);
            console.log(`   📱 Push notifications: ${results.pushCount}`);
            console.log(`   📧 SMS notifications: ${results.smsCount}`);

            return {
                message: "success",
                count: successfulIds.length,
                total: posts.length,
                push_count: results.pushCount,
                sms_only_count: results.smsOnlyCount
            };

        } catch (e) {
            console.error("❌ Error in processNotifications:", e);
            return { message: "error", count: 0, total: 0, error: String(e) };
        } finally {
            console.timeEnd('total-execution');
        }
    }

    private async sendMixedNotifications(
        pushPosts: NotificationPost[],
        smsOnlyPosts: NotificationPost[]
    ): Promise<{
        successful: string[];
        pushCount: number;
        smsCount: number;
        smsOnlyCount: number;
    }> {
        const results = {
            successful: [] as string[],
            pushCount: 0,
            smsCount: 0,
            smsOnlyCount: 0
        };

        // Process push-enabled posts (can have both push + SMS)
        if (pushPosts.length > 0) {
            console.log(`🔄 Processing ${pushPosts.length} push-enabled notifications...`);

            const pushPromises = pushPosts.map(async (post) => {
                try {
                    let hasSuccessfulNotification = false;

                    // Send Telegram notification
                    const telegramSuccess = await this.telegramService.sendNotification(post);
                    if (telegramSuccess) {
                        hasSuccessfulNotification = true;
                    }

                    // Send push notification (these have ARN)
                    const pushSuccess = await this.pinpointService.sendPushNotification(post);
                    if (pushSuccess) {
                        hasSuccessfulNotification = true;
                        results.pushCount++;
                        console.log(`📱 Push sent to post ${post.id}`);
                    }

                    // Send SMS if enabled for this priority level
                    if (post.sms && post.phone_number) {
                        const smsSuccess = await this.sendSMS(post);
                        if (smsSuccess) {
                            hasSuccessfulNotification = true;
                            results.smsCount++;
                            console.log(`📧 SMS sent to post ${post.id} (with ARN)`);
                        }
                    }

                    return hasSuccessfulNotification ? post.id : null;
                } catch (error) {
                    console.error(`❌ Error processing push post ${post.id}:`, error);
                    return null;
                }
            });

            const pushResults = await Promise.all(pushPromises);
            const successfulPushIds = pushResults.filter(id => id !== null) as string[];
            results.successful.push(...successfulPushIds);
        }

        // Process SMS-only posts (no ARN, SMS only)
        if (smsOnlyPosts.length > 0) {
            console.log(`🔄 Processing ${smsOnlyPosts.length} SMS-only notifications...`);

            const smsOnlyPromises = smsOnlyPosts.map(async (post) => {
                try {
                    let hasSuccessfulNotification = false;

                    // Send Telegram notification
                    const telegramSuccess = await this.telegramService.sendNotification(post);
                    if (telegramSuccess) {
                        hasSuccessfulNotification = true;
                    }

                    // Send SMS (these don't have ARN, so SMS only)
                    if (post.phone_number) {
                        const smsSuccess = await this.sendSMS(post);
                        if (smsSuccess) {
                            hasSuccessfulNotification = true;
                            results.smsOnlyCount++;
                            console.log(`📧 SMS-only sent to post ${post.id} (no ARN)`);
                        }
                    }

                    return hasSuccessfulNotification ? post.id : null;
                } catch (error) {
                    console.error(`❌ Error processing SMS-only post ${post.id}:`, error);
                    return null;
                }
            });

            const smsOnlyResults = await Promise.all(smsOnlyPromises);
            const successfulSmsOnlyIds = smsOnlyResults.filter(id => id !== null) as string[];
            results.successful.push(...successfulSmsOnlyIds);
        }

        return results;
    }

    private async sendSMS(post: NotificationPost): Promise<boolean> {
        if (!post.phone_number) {
            console.log(`❌ No phone number for post ${post.id}`);
            return false;
        }

        try {
            const routing = getUzbekistanOperatorRouting(post.phone_number);

            // Send with AWS SMS for non-Uzbekistan numbers
            if (!routing.isUzbekistan) {
                console.log(`🌍 Non-Uzbekistan number detected: ${post.phone_number}`);
                let formattedPhoneNumber = post.phone_number;
                if (!formattedPhoneNumber.startsWith('+')) {
                    formattedPhoneNumber = `+${formattedPhoneNumber}`;
                }
                const text = generateSmsText(post);
                return await this.awsSmsService.sendSms(formattedPhoneNumber, text);
            }

            console.log(`🇺🇿 Uzbekistan number detected: ${post.phone_number} (${routing.operator})`);

            const text = generateSmsText(post);

            if (routing.usePlayMobile) {
                console.log(`📤 Routing ${routing.operator} via PlayMobile API`);
                return await this.playMobileService.sendSms(post.phone_number, text, post.id);
            } else {
                console.log(`📤 Routing ${routing.operator} via AWS SMS (PlayMobile bypass)`);
                let formattedPhoneNumber = post.phone_number;
                if (!formattedPhoneNumber.startsWith('+')) {
                    formattedPhoneNumber = `+${formattedPhoneNumber}`;
                }
                return await this.awsSmsService.sendSms(formattedPhoneNumber, text);
            }

        } catch (error) {
            console.error(`❌ Error sending SMS for post ${post.id}:`, error);
            return false;
        }
    }
}