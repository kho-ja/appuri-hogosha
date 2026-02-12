import { Telegraf, Markup } from 'telegraf';
import { ENVIRONMENT } from '../../config/environment';
import { NotificationPost } from '../../types/events';
import { buildParentNotificationMessageUrl } from '../../utils/parent-app-links';

export class TelegramService {
    private bot: Telegraf;

    constructor() {
        this.bot = new Telegraf(ENVIRONMENT.BOT_TOKEN);
    }

    async sendNotification(post: NotificationPost): Promise<boolean> {
        try {
            if (!post.chat_id) {
                return false;
            }

            let text = '',
                buttonText = '';
            if (post.language === 'jp') {
                text = `新しい投稿: ${post.title} に ${post.given_name} ${post.family_name}`;
                buttonText = '見る';
            } else if (post.language === 'ru') {
                text = `Новый пост: ${post.title} для ${post.given_name} ${post.family_name}`;
                buttonText = 'Посмотреть';
            } else {
                text = `Yangi post: ${post.title} uchun ${post.given_name} ${post.family_name}`;
                buttonText = "Ko'rish";
            }

            const link = buildParentNotificationMessageUrl(
                post.student_id,
                post.id
            );
            const button = Markup.inlineKeyboard([
                Markup.button.url(buttonText, link),
            ]);

            await this.bot.telegram.sendMessage(post.chat_id, text, button);
            console.log(`✅ Telegram notification sent for post ${post.id}`);
            return true;
        } catch (error) {
            console.error(`❌ Telegram error for post ${post.id}:`, error);
            return false;
        }
    }
}
