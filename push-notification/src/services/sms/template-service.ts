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

        const templates: Record<SmsLanguage, string> = {
            ja: `Parent Notificationアカウントが作成されました。\nログイン: ${data.login}\n一時パスワード: ${data.tempPassword}\nアクセス: ${data.appLink}`,
            uz: `Parent Notification tizimiga kirish uchun hisob ochildi. \nLogin: ${data.login} \nVaqtinchalik parol: ${data.tempPassword} \nKirish: ${data.appLink}`,
        };

        const message = templates[language] || templates[this.defaultLanguage];

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

        const templates: Record<SmsLanguage, string> = {
            ja: `${data.code} — Parent Notificationログインコード。コードを共有しないでください。${data.expiryMinutes}分間有効です。`,
            uz: `${data.code} — Parent Notification kirish kodi. Kodni hech kimga bermang. ${data.expiryMinutes} daqiqa amal qiladi.`,
        };

        const message = templates[language] || templates[this.defaultLanguage];

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

        const templates: Record<SmsLanguage, string> = {
            ja: `${data.code} — Parent Notificationパスワードリセットコード。コードを共有しないでください。${data.expiryMinutes}分間有効です。`,
            uz: `${data.code} — Parent Notification parolni tiklash kodi. Kodni hech kimga bermang. ${data.expiryMinutes} daqiqa amal qiladi.`,
        };

        const message = templates[language] || templates[this.defaultLanguage];

        return message;
    }

    /**
     * Generate authentication SMS (verification codes, passwords)
     * @deprecated Use generateLoginCodeSms or generatePasswordResetSms for better templates
     */
    generateAuthSms(data: AuthData, options?: SmsTemplateOptions): string {
        const language = options?.language || this.defaultLanguage;

        const templates: Record<SmsLanguage, string> = {
            ja: `確認コード: ${data.code}${data.appLink ? ` ${data.appLink}` : ''}`,
            uz: `Tasdiqlash kodi: ${data.code}${data.appLink ? ` ${data.appLink}` : ''}`,
        };

        const message = templates[language] || templates[this.defaultLanguage];

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
        const message = template(data);

        return message;
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
