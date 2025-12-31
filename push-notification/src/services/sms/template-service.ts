/**
 * SMS Template Service
 * Provides localized SMS templates with message shortening for cost optimization
 */

export type SmsLanguage = 'ja' | 'uz';
export type SmsType =
    | 'auth'
    | 'notification'
    | 'account_creation'
    | 'login_code'
    | 'password_reset';

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
    generateAccountCreationSms(
        data: AccountCreationData,
        options?: SmsTemplateOptions
    ): string {
        const language = options?.language || this.defaultLanguage;
        const maxLength = options?.maxLength;

        const templates: Record<SmsLanguage, string> = {
            ja: `Parent Notificationアカウントが作成されました。\nログイン: ${data.login}\n一時パスワード: ${data.tempPassword}\nアクセス: ${data.appLink}`,
            uz: `Parent Notification tizimiga kirish uchun hisob ochildi. \nLogin: ${data.login} \nVaqtinchalik parol: ${data.tempPassword} \nKirish: ${data.appLink}`,
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
    generateLoginCodeSms(
        data: LoginCodeData,
        options?: SmsTemplateOptions
    ): string {
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
    generatePasswordResetSms(
        data: PasswordResetData,
        options?: SmsTemplateOptions
    ): string {
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
    generateNotificationSms(
        data: NotificationData,
        options?: SmsTemplateOptions
    ): string {
        const language = options?.language || this.defaultLanguage;
        const maxLength =
            options?.maxLength || this.getRecommendedMaxLength(language);

        const templates: Record<
            SmsLanguage,
            (data: NotificationData) => string
        > = {
            ja: d =>
                `Parent Notification: 新しいメッセージがあります\n${d.title}\n生徒: ${d.studentName}\n詳細: ${d.link}`,
            uz: d =>
                `Parent Notification: sizga yangi xabar bor\n${d.title}\nO'quvchi: ${d.studentName}\nBatafsil: ${d.link}`,
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
    private shortenMessage(
        message: string,
        maxLength: number,
        _language: SmsLanguage
    ): string {
        if (message.length <= maxLength) {
            return message;
        }

        console.log(
            `⚠️ Shortening SMS from ${message.length} to ${maxLength} chars`
        );

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
        const contentWithoutLink = link
            ? message.substring(0, message.length - linkLength)
            : message;

        // Strategy: Preserve student name and link, shorten ONLY the title
        // Split message into parts and only shorten the title line

        if (contentWithoutLink.length > availableSpace) {
            // Split by newlines: [header, title, student_info]
            const lines = contentWithoutLink.split('\n');

            if (lines.length >= 3) {
                // Structure: "Parent Notification: ...\n[TITLE]\nO'quvchi: ..."
                const header = lines[0];
                const title = lines[1];
                const studentInfo = lines.slice(2).join('\n');

                // Calculate space for fixed parts
                // header + newline + student_info + newline
                const fixedLength = header.length + 1 + studentInfo.length + 1;
                const maxTitleLength = availableSpace - fixedLength;

                if (maxTitleLength > 0 && title.length > maxTitleLength) {
                    // Only shorten the title, keep student name intact
                    const shortenedTitle = title.substring(0, maxTitleLength);
                    return `${header}\n${shortenedTitle}\n${studentInfo}${link ? ` ${link}` : ''}`;
                }
            }

            // Fallback: just truncate from the start if parsing fails
            const truncated = contentWithoutLink.substring(0, availableSpace);
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

        const singleLimit =
            encoding === 'Unicode'
                ? this.SMS_SINGLE_UNICODE
                : this.SMS_SINGLE_GSM;
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
