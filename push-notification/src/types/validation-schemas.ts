/**
 * Validation schemas for SMS and push notifications
 * Using TypeScript types with validation functions (no Zod dependency)
 */

// ============================================================================
// PHONE NUMBER VALIDATION
// ============================================================================

export interface PhoneValidationResult {
    isValid: boolean;
    isUzbekistan: boolean;
    operator: string;
    usePlayMobile: boolean;
    normalizedNumber: string;
    error?: string;
}

export const validatePhoneNumber = (
    phoneNumber: string
): PhoneValidationResult => {
    const result: PhoneValidationResult = {
        isValid: false,
        isUzbekistan: false,
        operator: 'Unknown',
        usePlayMobile: false,
        normalizedNumber: '',
        error: undefined,
    };

    // Check if phone is empty
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        result.error = 'Phone number must be a non-empty string';
        return result;
    }

    // Normalize: remove spaces and hyphens
    let normalized = phoneNumber.replace(/[\s\-()]/g, '');

    // Remove + if present for processing
    if (normalized.startsWith('+')) {
        normalized = normalized.substring(1);
    }

    result.normalizedNumber = normalized;

    // Check for Uzbekistan format (12 digits: 998xxxxxxxxx)
    if (normalized.length !== 12 || !normalized.startsWith('998')) {
        // Not Uzbekistan format
        // Allow international numbers
        if (normalized.length >= 10 && normalized.length <= 15) {
            result.isValid = true;
            result.isUzbekistan = false;
            result.operator = 'International';
            result.usePlayMobile = false;
            return result;
        }

        result.error =
            'Invalid phone number format. Expected 998xxxxxxxxx or international format';
        return result;
    }

    // Uzbekistan number validation
    result.isUzbekistan = true;

    const operatorCode = normalized.substring(3, 5);
    const operators: Record<string, { name: string; usePlayMobile: boolean }> =
        {
            '20': { name: 'OQ', usePlayMobile: true },
            '33': { name: 'Humans', usePlayMobile: true },
            '55': { name: 'Ucell', usePlayMobile: false },
            '77': { name: 'UzMobile', usePlayMobile: true },
            '88': { name: 'Mobiuz', usePlayMobile: true },
            '90': { name: 'Beeline', usePlayMobile: true },
            '91': { name: 'Beeline', usePlayMobile: true },
            '93': { name: 'Ucell', usePlayMobile: false },
            '94': { name: 'Ucell', usePlayMobile: false },
            '95': { name: 'UMS', usePlayMobile: true },
            '97': { name: 'Mobiuz', usePlayMobile: true },
            '98': { name: 'Mobiuz', usePlayMobile: true },
            '99': { name: 'Beeline', usePlayMobile: true },
        };

    const operatorInfo = operators[operatorCode];
    if (operatorInfo) {
        result.operator = operatorInfo.name;
        result.usePlayMobile = operatorInfo.usePlayMobile;
        result.isValid = true;
        return result;
    }

    result.error = `Unknown operator code: ${operatorCode}`;
    result.isValid = false;
    return result;
};

// ============================================================================
// SMS MESSAGE VALIDATION
// ============================================================================

export interface SmsMessageValidationResult {
    isValid: boolean;
    length: number;
    encoding: 'GSM-7' | 'Unicode';
    parts: number;
    cost: string;
    withinLimit: boolean;
    error?: string;
    warnings: string[];
}

const hasUnicodeCharacters = (message: string): boolean => {
    return /[^\x00-\x7F]/.test(message);
};

const hasNonGsmCharacters = (message: string): boolean => {
    return /[''""—`^{}\\[~\]|€]/.test(message);
};

export const validateSmsMessage = (
    message: string,
    maxParts: number = 3
): SmsMessageValidationResult => {
    const result: SmsMessageValidationResult = {
        isValid: false,
        length: 0,
        encoding: 'GSM-7',
        parts: 0,
        cost: '',
        withinLimit: false,
        warnings: [],
    };

    // Validation
    if (!message || typeof message !== 'string') {
        result.error = 'Message must be a non-empty string';
        return result;
    }

    result.length = message.length;
    result.isValid = true;

    // Determine encoding
    const hasUnicode = hasUnicodeCharacters(message);
    const hasNonGsm = hasNonGsmCharacters(message);

    if (hasUnicode || hasNonGsm) {
        result.encoding = 'Unicode';
    } else {
        result.encoding = 'GSM-7';
    }

    // Calculate parts and cost
    const limits =
        result.encoding === 'Unicode'
            ? { single: 70, double: 134, triple: 201 }
            : { single: 160, double: 306, triple: 459 };

    if (result.length <= limits.single) {
        result.parts = 1;
        result.cost = '1 SMS';
        result.withinLimit = true;
    } else if (result.length <= limits.double) {
        result.parts = 2;
        result.cost = '2 SMS (2x cost)';
        result.warnings.push('Message will cost 2 SMS. Consider shortening.');
    } else if (result.length <= limits.triple) {
        result.parts = 3;
        result.cost = '3 SMS (3x cost)';
        result.warnings.push(
            'Message will cost 3 SMS. Consider shortening significantly.'
        );
    } else {
        // Multi-part beyond 3
        const partSize = result.encoding === 'Unicode' ? 67 : 153;
        result.parts = Math.ceil(result.length / partSize);
        result.cost = `${result.parts} SMS (${result.parts}x cost)`;
        result.warnings.push(
            `Message exceeds ${maxParts} parts (${result.parts} parts total). This is very expensive!`
        );
    }

    if (result.parts > maxParts) {
        result.isValid = false;
        result.error = `Message exceeds maximum ${maxParts} parts (${result.parts} parts)`;
    }

    // Additional checks
    if (result.length > 1000) {
        result.warnings.push(
            'Message is very long (>1000 chars). May cause issues with some APIs.'
        );
    }

    if (result.parts > 1 && result.encoding === 'Unicode') {
        result.warnings.push(
            'Multi-part Unicode messages may have formatting issues with some operators.'
        );
    }

    return result;
};

// ============================================================================
// PUSH NOTIFICATION TOKEN VALIDATION
// ============================================================================

export type TokenType = 'APNS' | 'FCM' | 'Expo' | 'Invalid';

export interface TokenValidationResult {
    isValid: boolean;
    type: TokenType;
    platform: 'iOS' | 'Android' | 'Unknown';
    length: number;
    format: string;
    error?: string;
}

export const validatePushToken = (token: string): TokenValidationResult => {
    const result: TokenValidationResult = {
        isValid: false,
        type: 'Invalid',
        platform: 'Unknown',
        length: 0,
        format: '',
    };

    if (!token || typeof token !== 'string') {
        result.error = 'Token must be a non-empty string';
        return result;
    }

    result.length = token.length;

    // Expo Push Token format
    if (
        token.startsWith('ExponentPushToken[') ||
        token.startsWith('ExpoPushToken[')
    ) {
        result.isValid = true;
        result.type = 'Expo';
        result.platform = 'Unknown'; // Expo handles both iOS and Android
        result.format = 'Expo Push Token';
        return result;
    }

    // iOS APNS token: 64+ hex characters
    const apnsPattern = /^[a-fA-F0-9]{64,}$/;
    if (apnsPattern.test(token)) {
        result.isValid = true;
        result.type = 'APNS';
        result.platform = 'iOS';
        result.format = 'iOS APNS Token (hex)';
        return result;
    }

    // Android FCM token: contains colons or is very long alphanumeric
    const fcmPattern = /^[A-Za-z0-9_\-:]+$/;
    if (fcmPattern.test(token) && (token.includes(':') || token.length > 100)) {
        result.isValid = true;
        result.type = 'FCM';
        result.platform = 'Android';
        result.format = 'Android FCM Token';
        return result;
    }

    // Fallback: if it matches FCM pattern but no colon, assume FCM
    if (fcmPattern.test(token) && token.length > 80) {
        result.isValid = true;
        result.type = 'FCM';
        result.platform = 'Android';
        result.format = 'Android FCM Token (assumed)';
        return result;
    }

    result.error = `Token format not recognized. Expected APNS (64+ hex), FCM (with :), or Expo format.`;
    return result;
};

// ============================================================================
// BATCH VALIDATION
// ============================================================================

export interface BatchValidationResult {
    totalItems: number;
    valid: number;
    invalid: number;
    errors: Array<{
        index: number;
        item: string;
        error: string;
    }>;
    summary: string;
}

export const validatePhoneNumberBatch = (
    phoneNumbers: string[]
): BatchValidationResult => {
    const result: BatchValidationResult = {
        totalItems: phoneNumbers.length,
        valid: 0,
        invalid: 0,
        errors: [],
        summary: '',
    };

    phoneNumbers.forEach((phone, index) => {
        const validation = validatePhoneNumber(phone);
        if (validation.isValid) {
            result.valid++;
        } else {
            result.invalid++;
            result.errors.push({
                index,
                item: phone,
                error: validation.error || 'Invalid phone number',
            });
        }
    });

    result.summary = `${result.valid}/${result.totalItems} valid (${((result.valid / result.totalItems) * 100).toFixed(1)}%)`;

    return result;
};

export const validatePushTokenBatch = (
    tokens: string[]
): BatchValidationResult => {
    const result: BatchValidationResult = {
        totalItems: tokens.length,
        valid: 0,
        invalid: 0,
        errors: [],
        summary: '',
    };

    tokens.forEach((token, index) => {
        const validation = validatePushToken(token);
        if (validation.isValid) {
            result.valid++;
        } else {
            result.invalid++;
            result.errors.push({
                index,
                item: token.substring(0, 30) + '...',
                error: validation.error || 'Invalid token format',
            });
        }
    });

    result.summary = `${result.valid}/${result.totalItems} valid (${((result.valid / result.totalItems) * 100).toFixed(1)}%)`;

    return result;
};

// ============================================================================
// RATE LIMIT VALIDATION
// ============================================================================

export interface RateLimitValidationResult {
    canSend: boolean;
    dailyRemaining: number;
    hourlyRemaining: number;
    reason?: string;
}

export const validateRateLimit = (
    currentDaily: number,
    currentHourly: number,
    dailyLimit: number = 1000,
    hourlyLimit: number = 100
): RateLimitValidationResult => {
    const result: RateLimitValidationResult = {
        canSend: true,
        dailyRemaining: dailyLimit - currentDaily,
        hourlyRemaining: hourlyLimit - currentHourly,
    };

    if (currentDaily >= dailyLimit) {
        result.canSend = false;
        result.reason = `Daily limit (${dailyLimit}) exceeded`;
    } else if (currentHourly >= hourlyLimit) {
        result.canSend = false;
        result.reason = `Hourly limit (${hourlyLimit}) exceeded`;
    }

    return result;
};

// ============================================================================
// SCHEMA DEFINITIONS (For API validation)
// ============================================================================

/**
 * Use these to validate incoming API requests
 * Example: validateSmsRequest(req.body)
 */

export interface SmsRequest {
    phone: string;
    message: string;
    postId?: string;
}

export interface PushNotificationRequest {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}

export interface BulkSmsRequest {
    phones: string[];
    message: string;
    postId?: string;
}

export const validateSmsRequest = (
    data: unknown
): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: ['Request body must be an object'] };
    }

    const body = data as any;

    // Validate phone
    if (!body.phone) {
        errors.push('Missing required field: phone');
    } else {
        const phoneValidation = validatePhoneNumber(body.phone);
        if (!phoneValidation.isValid) {
            errors.push(`Invalid phone: ${phoneValidation.error}`);
        }
    }

    // Validate message
    if (!body.message) {
        errors.push('Missing required field: message');
    } else {
        const messageValidation = validateSmsMessage(body.message);
        if (!messageValidation.isValid) {
            errors.push(`Invalid message: ${messageValidation.error}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

export const validatePushNotificationRequest = (
    data: unknown
): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: ['Request body must be an object'] };
    }

    const body = data as any;

    // Validate token
    if (!body.token) {
        errors.push('Missing required field: token');
    } else {
        const tokenValidation = validatePushToken(body.token);
        if (!tokenValidation.isValid) {
            errors.push(`Invalid token: ${tokenValidation.error}`);
        }
    }

    // Validate title and body
    if (!body.title) {
        errors.push('Missing required field: title');
    } else if (typeof body.title !== 'string' || body.title.length === 0) {
        errors.push('Title must be a non-empty string');
    }

    if (!body.body) {
        errors.push('Missing required field: body');
    } else if (typeof body.body !== 'string' || body.body.length === 0) {
        errors.push('Body must be a non-empty string');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};
