# SMS Template Service Usage Guide

The `SmsTemplateService` provides a flexible and type-safe way to generate SMS messages with language support and automatic message shortening for cost optimization.

## Features

- ✅ **Language support**:
    - **Uzbek (uz)** - For Uzbekistan numbers
    - **Japanese (ja)** - For international numbers
- ✅ **Multiple template types**: Account creation, login codes, password reset, notifications
- ✅ **Automatic message shortening**: Reduces SMS costs by keeping messages within single-SMS limits
- ✅ **Cost analysis**: Analyzes message encoding, length, and parts
- ✅ **Type-safe**: Full TypeScript support with interfaces

## Template Types

### 1. Account Creation SMS

Used when creating a new user account with login credentials.

```typescript
import { SmsTemplateService } from './template-service';

const smsService = new SmsTemplateService();

const message = smsService.generateAccountCreationSms(
    {
        login: '+998901234567',
        tempPassword: 'qwerty123',
        appLink: 'https://parents.jdu.uz/parentnotification',
    },
    { language: 'uz' }
);

// Output (Uzbek):
// "Parent Notification tizimiga kirish uchun hisob ochildi. Login: +998901234567 Vaqtinchalik parol: qwerty123 Kirish: https://parents.jdu.uz/parentnotification"
```

### 2. Login Code SMS

Used for OTP-based login with expiration time.

```typescript
const message = smsService.generateLoginCodeSms(
    {
        code: '123456',
        expiryMinutes: 5,
    },
    { language: 'uz' }
);

// Output (Uzbek):
// "123456 — Parent Notification kirish kodi. Kodni hech kimga bermang. 5 daqiqa amal qiladi."
```

### 3. Password Reset SMS

Used for password reset verification with expiration time.

```typescript
const message = smsService.generatePasswordResetSms(
    {
        code: '123456',
        expiryMinutes: 5,
    },
    { language: 'uz' }
);

// Output (Uzbek):
// "123456 — Parent Notification parolni tiklash kodi. Kodni hech kimga bermang. 5 daqiqa amal qiladi."
```

### 4. Notification SMS

Used for sending notifications about new messages/posts.

```typescript
const message = smsService.generateNotificationSms(
    {
        title: 'Maktabdan yangi xabar',
        description: "Ertaga dars bo'lmaydi",
        studentName: 'Abdulla Abdullayev',
        link: 'https://parents.jdu.uz/parentnotification/student/1/message/1',
    },
    { language: 'uz' }
);

// Output (Uzbek):
// "Parent Notification: sizga yangi xabar bor Maktabdan yangi xabar Ertaga dars bo'lmaydi O'quvchi: Abdulla Abdullayev Batafsil: https://..."
```

## Language Support

All templates support 4 languages:

| Language | Code | Example |
| Language | Code | Example |
|----------|------|---------|
| Japanese | `ja` | "Parent Notificationアカウントが作成されました..." |
| Uzbek | `uz` | "Parent Notification tizimiga kirish uchun hisob ochildi..." |

## Message Shortening

The service automatically shortens messages to avoid multi-part SMS charges:

```typescript
// Long message
const longMessage = smsService.generateNotificationSms(
    {
        title: 'Very long title that exceeds the character limit',
        description:
            'Even longer description that would cause the message to be split into multiple SMS parts which increases costs significantly',
        studentName: 'Student Full Name',
        link: 'https://parents.jdu.uz/parentnotification/student/123/message/456',
    },
    { language: 'uz' }
);

// Automatic shortening:
// 1. Removes description first
// 2. Truncates title if still too long
// 3. Always preserves: student name and link
```

### Shortening Strategy

1. **First**: Remove description
2. **Then**: Truncate title with ellipsis (...)
3. **Always preserve**: Student name and link

## Cost Analysis

Analyze message cost before sending:

```typescript
const message = smsService.generateLoginCodeSms(
    {
        code: '123456',
        expiryMinutes: 5,
    },
    { language: 'uz' }
);

const analysis = smsService.analyzeMessage(message);
console.log(analysis);

// Output:
// {
//   length: 89,
//   encoding: 'GSM-7',
//   parts: 1,
//   withinSingleSmsLimit: true
// }
```

### SMS Length Limits

| Encoding                           | Single SMS | Multi-part SMS     |
| ---------------------------------- | ---------- | ------------------ |
| GSM-7 (Latin)                      | 160 chars  | 153 chars per part |
| Unicode (Cyrillic, Japanese, etc.) | 70 chars   | 67 chars per part  |

## Integration Examples

### With Cognito Authentication

```typescript
// In auth-challenges.ts or sms-handler.ts
const smsService = new SmsTemplateService();

// For login verification
const message = smsService.generateLoginCodeSms(
    {
        code: decryptedCode,
        expiryMinutes: 5,
    },
    { language: userLanguage }
);

await playMobileService.sendSms(phoneNumber, message);
```

### With Notification System

```typescript
// In push-notifications.ts
const smsService = new SmsTemplateService();

const message = smsService.generateNotificationSms(
    {
        title: post.title,
        description: post.description,
        studentName: `${post.given_name} ${post.family_name}`,
        link: `https://parents.jdu.uz/parentnotification/student/${post.student_id}/message/${post.id}`,
    },
    {
        language: (post.language as SmsLanguage) || 'uz',
    }
);

const analysis = smsService.analyzeMessage(message);
console.log(
    `📊 SMS: ${analysis.length} chars, ${analysis.encoding}, ${analysis.parts} part(s)`
);

await playMobileService.sendSms(phoneNumber, message);
```

## Template Mapping

Templates match the format specified in the requirements:

| Template Type    | Format                                        | Variables                             |
| ---------------- | --------------------------------------------- | ------------------------------------- |
| Account Creation | `Login: %w Temporary password: %w Access: %w` | login, tempPassword, appLink          |
| Login Code       | `%d{1,6} — ... %d{1,2} minutes`               | code (6 digits), expiryMinutes        |
| Password Reset   | `%d{1,6} — ... %d{1,2} minutes`               | code (6 digits), expiryMinutes        |
| Notification     | `...message... Student: %w Details: %w`       | title, description, studentName, link |

## Best Practices

1. **Always specify language** based on user preference
2. **Use cost analysis** before sending to optimize message length
3. **Use specific templates** (loginCode, passwordReset) instead of generic auth template
4. **Monitor encoding** - Unicode messages are shorter (70 vs 160 chars)
5. **Preserve links** - Important for user navigation

## Migration from Old System

### Before (old localization.ts):

```typescript
const text = generateSmsText(post);
```

### After (new template-service.ts):

```typescript
const smsService = new SmsTemplateService();
const text = smsService.generateNotificationSms(
    {
        title: post.title,
        description: post.description,
        studentName: `${post.given_name} ${post.family_name}`,
        link: `https://...`,
    },
    { language: post.language }
);
```

## Testing

```typescript
// Test all languages
const languages: SmsLanguage[] = ['ja', 'uz'];
const smsService = new SmsTemplateService();

languages.forEach(lang => {
    const message = smsService.generateLoginCodeSms(
        {
            code: '123456',
            expiryMinutes: 5,
        },
        { language: lang }
    );

    const analysis = smsService.analyzeMessage(message);
    console.log(`${lang}: ${analysis.length} chars, ${analysis.parts} part(s)`);
});
```
