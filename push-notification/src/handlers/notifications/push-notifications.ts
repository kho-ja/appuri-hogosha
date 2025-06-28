import { DatabaseQueries } from '../../services/database/queries';
import { PinpointService } from '../../services/aws/pinpoint';
import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';
import { TelegramService } from '../../services/telegram/bot';
import { getUzbekistanOperatorRouting } from '../../utils/validation';
import { generateSmsText } from '../../utils/localization';
import { NotificationPost } from '../../types/events';
import { NotificationResult } from '../../types/responses';

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
            const posts = await this.dbQueries.fetchPosts();
            console.timeEnd('db-fetch');

            if (!posts.length) {
                console.log("No posts found to process");
                return { message: "no posts found", count: 0 };
            }

            console.log(`Processing ${posts.length} notifications...`);

            console.time('send-notifications');
            const successNotifications = await this.sendNotifications(posts);
            console.timeEnd('send-notifications');

            if (successNotifications.length) {
                console.time('db-update');
                await this.dbQueries.updateProcessedPosts(successNotifications);
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
            return { message: "error", count: 0, error: String(e) };
        } finally {
            console.timeEnd('total-execution');
        }
    }

    private async sendNotifications(posts: NotificationPost[]): Promise<number[]> {
        if (!posts.length) return [];

        const notificationPromises = posts.map(async (post) => {
            try {
                let hasSuccessfulNotification = false;

                // Send Telegram notification
                const telegramSuccess = await this.telegramService.sendNotification(post);
                if (telegramSuccess) {
                    hasSuccessfulNotification = true;
                }

                // Send SMS with smart routing (if enabled for this priority level)
                if (post.sms) {
                    const smsSuccess = await this.sendSMS(post);
                    if (smsSuccess) {
                        hasSuccessfulNotification = true;
                    }
                }

                // Send Push notification
                const pushSuccess = await this.pinpointService.sendPushNotification(post);
                if (pushSuccess) {
                    hasSuccessfulNotification = true;
                }

                // Return post ID if at least one notification was successful
                if (hasSuccessfulNotification) {
                    return parseInt(post.id);
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
    }

    private async sendSMS(post: NotificationPost): Promise<boolean> {
        try {
            if (!post.phone_number) {
                console.log(`No phone number for post ${post.id}`);
                return false;
            }

            // Get operator routing information
            const routing = getUzbekistanOperatorRouting(post.phone_number);

            if (routing.isUzbekistan) {
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
            } else {
                // For non-Uzbekistan numbers, format and use AWS
                let formattedPhoneNumber = post.phone_number;
                if (!formattedPhoneNumber.startsWith('+')) {
                    formattedPhoneNumber = `+${formattedPhoneNumber}`;
                }

                console.log(`🌍 Routing international number via AWS: ${formattedPhoneNumber}`);
                const smsText = generateSmsText(post);
                return await this.awsSmsService.sendSms(formattedPhoneNumber, smsText);
            }

        } catch (error) {
            console.error(`❌ Error sending SMS for post ${post.id}:`, error);
            return false;
        }
    }
}