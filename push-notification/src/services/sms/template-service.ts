/**
 * SMS Template Service
 * Provides localized SMS templates with message shortening for cost optimization
 */

export type SmsLanguage = 'ja' | 'uz';
export type SmsType = 'auth' | 'notification' | 'account_creation' | 'login_code' | 'password_reset';

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

export interface AccountCreationData {
    login: string;
    tempPassword: string;
    appLink: string;
}

export interface LoginCodeData {
    code: string;
    expiryMinutes: number;
}

export interface PasswordResetData {
    code: string;
    expiryMinutes: number;
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
     * Generate account creation SMS (login, password, link)
     */
    generateAccountCreationSms(data: AccountCreationData, options?: SmsTemplateOptions): string {
        const language = options?.language || this.defaultLanguage;
        const maxLength = options?.maxLength;

        const templates: Record<SmsLanguage, string> = {
            ja: `Parent Notificationアカウントが作成されました。ログイン: ${data.login} 一時パスワード: ${data.tempPassword} アクセス: ${data.appLink}`,
            uz: `Parent Notification tizimiga kirish uchun hisob ochildi. Login: ${data.login} Vaqtinchalik parol: ${data.tempPassword} Kirish: ${data.appLink}`,
        };

        let message = templates[language] || templates[this.defaultLanguage];

        if (maxLength) {
            message = this.shortenMessage(message, maxLength, language);
        }

        return message;
    }

    /**
     * Generate login code SMS (verification code with expiry)
     */
    generateLoginCodeSms(data: LoginCodeData, options?: SmsTemplateOptions): string {
        const language = options?.language || this.defaultLanguage;
        const maxLength = options?.maxLength;

        const templates: Record<SmsLanguage, string> = {
            ja: `${data.code} — Parent Notificationログインコード。コードを共有しないでください。${data.expiryMinutes}分間有効です。`,
            uz: `${data.code} — Parent Notification kirish kodi. Kodni hech kimga bermang. ${data.expiryMinutes} daqiqa amal qiladi.`,
        };

        let message = templates[language] || templates[this.defaultLanguage];

        if (maxLength) {
            message = this.shortenMessage(message, maxLength, language);
        }

        return message;
    }

    /**
     * Generate password reset SMS (reset code with expiry)
     */
    generatePasswordResetSms(data: PasswordResetData, options?: SmsTemplateOptions): string {
        const language = options?.language || this.defaultLanguage;
        const maxLength = options?.maxLength;

        const templates: Record<SmsLanguage, string> = {
            ja: `${data.code} — Parent Notificationパスワードリセットコード。コードを共有しないでください。${data.expiryMinutes}分間有効です。`,
            uz: `${data.code} — Parent Notification parolni tiklash kodi. Kodni hech kimga bermang. ${data.expiryMinutes} daqiqa amal qiladi.`,
        };

        let message = templates[language] || templates[this.defaultLanguage];

        if (maxLength) {
            message = this.shortenMessage(message, maxLength, language);
        }

        return message;
    }

    /**
     * Generate authentication SMS (verification codes, passwords)
     * @deprecated Use generateLoginCodeSms or generatePasswordResetSms for better templates
     */
    generateAuthSms(data: AuthData, options?: SmsTemplateOptions): string {
        const language = options?.language || this.defaultLanguage;
        const maxLength = options?.maxLength;

        const templates: Record<SmsLanguage, string> = {
            ja: `確認コード: ${data.code}${data.appLink ? ` ${data.appLink}` : ''}`,
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
            ja: (d) => `Parent Notification: 新しいメッセージがあります${d.title ? `${d.title}` : ''}${d.description ? `${d.description}` : ''}生徒: ${d.studentName}${d.link ? `詳細: ${d.link}` : ''}`,
            uz: (d) => `Parent Notification: sizga yangi xabar bor${d.title ? `${d.title}` : ''}${d.description ? `${d.description}` : ''}O'quvchi: ${d.studentName}${d.link ? `Batafsil: ${d.link}` : ''}`,
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
        // Unicode for ja; GSM for uz
        return language === 'ja'
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
        const ellipsis = '...';
        
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
            // Define language-specific separators for description removal
            // Remove text between title and student name marker
            const descriptionPatterns: Record<SmsLanguage, RegExp> = {
                ja: /(.+?)(生徒:)/,         // Match text before "生徒:"
                uz: /(.+?)(O'quvchi:)/,     // Match text before "O'quvchi:"
            };
            
            const pattern = descriptionPatterns[language] || descriptionPatterns.uz;
            const descMatch = contentWithoutLink.match(pattern);
            
            if (descMatch) {
                // Remove description (keep the separator after description like "生徒:" or "O'quvchi:")
                const withoutDesc = contentWithoutLink.replace(descMatch[0], descMatch[2]);
                
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
