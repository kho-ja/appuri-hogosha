export interface ApiResponse {
    statusCode: number;
    body: string;
}

export interface SmsResult {
    success: boolean;
    reason?: string;
    messageId?: string;
}

export interface BulkSmsResult {
    phone: string;
    success: boolean;
    provider?: string;
    operator?: string;
    routing?: string;
    error?: string;
}

export interface NotificationResult {
    message: string;
    count: number;
    total: number;
    push_count?: number;
    sms_only_count?: number;
    error?: string
}

export interface DiagnosticsResult {
    pendingMessages: number;
    oldestPendingMinutes: number;
    rateLimitStatus: {
        daily: number;
        hourly: number;
    };
}

export interface CredentialTestResult {
    valid: boolean;
    reason: string;
}