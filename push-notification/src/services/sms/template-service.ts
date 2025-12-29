/**
 * SMS Template Service
 * Provides localized SMS templates with message shortening for cost optimization
 */

export type SmsLanguage = 'ja' | 'ru' | 'uz' | 'en';
export type SmsType = 'auth' | 'notification';

export interface SmsTemplateOptions {
    language?: SmsLanguage;
    maxLength?: number;
}

export interface NotificationData {
    title: string;
    description?: string;
    studentName: string;
    link?: string;
}

export interface AuthData {
    code: string;
    username?: string;
    appLink?: string;
}

/**
 * SMS Template Service
 * Creates localized SMS messages with automatic shortening
 */
export class SmsTemplateService {
    private readonly defaultLanguage: SmsLanguage = 'uz';
    
    // SMS length limits (to avoid multi-part SMS charges)
    private readonly SMS_SINGLE_GSM = 160;
    private readonly SMS_SINGLE_UNICODE = 70;

    /**
     * Generate authentication SMS (verification codes, passwords)
     */
    generateAuthSms(data: AuthData, options?: SmsTemplateOptions): string {
        const language = options?.language || this.defaultLanguage;
        const maxLength = options?.maxLength;

        const templates: Record<SmsLanguage, string> = {
            en: `Your verification code is ${data.code}${data.appLink ? ` ${data.appLink}` : ''}`,
            ja: `確認コード: ${data.code}${data.appLink ? ` ${data.appLink}` : ''}`,
            ru: `Код подтверждения: ${data.code}${data.appLink ? ` ${data.appLink}` : ''}`,
            uz: `Tasdiqlash kodi: ${data.code}${data.appLink ? ` ${data.appLink}` : ''}`,
        };

        let message = templates[language] || templates[this.defaultLanguage];

        if (maxLength) {
            message = this.shortenMessage(message, maxLength, language);
        }

        return message;
    }

    /**
     * Generate notification SMS (posts, announcements)
     */
    generateNotificationSms(data: NotificationData, options?: SmsTemplateOptions): string {
        const language = options?.language || this.defaultLanguage;
        const maxLength = options?.maxLength || this.getRecommendedMaxLength(language);

        const templates: Record<SmsLanguage, (data: NotificationData) => string> = {
            en: (d) => `New post: ${d.title}${d.description ? ` - ${d.description}` : ''} for ${d.studentName}${d.link ? ` ${d.link}` : ''}`,
            ja: (d) => `新しい投稿: ${d.title}${d.description ? ` - ${d.description}` : ''} ${d.studentName}宛${d.link ? ` ${d.link}` : ''}`,
            ru: (d) => `Новый пост: ${d.title}${d.description ? ` - ${d.description}` : ''} для ${d.studentName}${d.link ? ` ${d.link}` : ''}`,
            uz: (d) => `Yangi post: ${d.title}${d.description ? ` - ${d.description}` : ''} ${d.studentName} uchun${d.link ? ` ${d.link}` : ''}`,
        };

        const template = templates[language] || templates[this.defaultLanguage];
        let message = template(data);

        // Shorten if needed
        message = this.shortenMessage(message, maxLength, language);

        return message;
    }

    /**
     * Get recommended max length based on language
     */
    private getRecommendedMaxLength(language: SmsLanguage): number {
        // Unicode for ja, ru; GSM for en, uz
        return ['ja', 'ru'].includes(language) 
            ? this.SMS_SINGLE_UNICODE 
            : this.SMS_SINGLE_GSM;
    }

    /**
     * Shorten message to fit within length limit
     */
    private shortenMessage(message: string, maxLength: number, language: SmsLanguage): string {
        if (message.length <= maxLength) {
            return message;
        }

        console.log(`⚠️ Shortening SMS from ${message.length} to ${maxLength} chars`);

        // Strategy: Remove description first, then truncate title if needed
        const ellipsis = language === 'en' ? '...' : '...';
        
        // Find link at the end
        const linkMatch = message.match(/(https?:\/\/[^\s]+)$/);
        const link = linkMatch ? linkMatch[1] : '';
        const linkLength = link.length + 1; // +1 for space

        // Calculate available space
        const availableSpace = maxLength - linkLength - ellipsis.length;

        if (availableSpace <= 0) {
            // If even link doesn't fit, just return truncated message
            return message.substring(0, maxLength - ellipsis.length) + ellipsis;
        }

        // Extract main content without link
        const contentWithoutLink = link ? message.substring(0, message.length - linkLength) : message;

        // Try to preserve the structure: "New post: [title] - [description] for [name]"
        // Priority: title > name > description
        
        if (contentWithoutLink.length > availableSpace) {
            // Find description part (between " - " and " for " or " uchun" or "宛")
            const descMatch = contentWithoutLink.match(/( - )(.+?)( для | uchun |宛| for )/);
            
            if (descMatch) {
                // Remove description
                const withoutDesc = contentWithoutLink.replace(descMatch[0], descMatch[3]);
                
                if (withoutDesc.length <= availableSpace) {
                    return withoutDesc + (link ? ` ${link}` : '');
                }
                
                // Still too long, truncate title
                const truncated = withoutDesc.substring(0, availableSpace - ellipsis.length) + ellipsis;
                return truncated + (link ? ` ${link}` : '');
            }
            
            // No description found, just truncate
            const truncated = contentWithoutLink.substring(0, availableSpace - ellipsis.length) + ellipsis;
            return truncated + (link ? ` ${link}` : '');
        }

        return contentWithoutLink + (link ? ` ${link}` : '');
    }

    /**
     * Analyze message cost and encoding
     */
    analyzeMessage(message: string): {
        length: number;
        encoding: 'GSM-7' | 'Unicode';
        parts: number;
        withinSingleSmsLimit: boolean;
    } {
        const hasUnicode = /[^\x00-\x7F]/.test(message);
        const encoding = hasUnicode ? 'Unicode' : 'GSM-7';
        
        const singleLimit = encoding === 'Unicode' ? this.SMS_SINGLE_UNICODE : this.SMS_SINGLE_GSM;
        const multipartLimit = encoding === 'Unicode' ? 67 : 153;
        
        const length = message.length;
        let parts: number;
        
        if (length <= singleLimit) {
            parts = 1;
        } else {
            parts = Math.ceil(length / multipartLimit);
        }
        
        return {
            length,
            encoding,
            parts,
            withinSingleSmsLimit: parts === 1,
        };
    }
}
