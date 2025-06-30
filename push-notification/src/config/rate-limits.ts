// Enhanced cost protection and rate limiting
export const SMS_RATE_LIMIT = {
    MAX_BATCH_SIZE: 50,           // Max messages per batch (to avoid error 105)
    BATCH_DELAY_MS: 1000,         // Delay between batches
    MAX_RETRIES: 2,               // Max retry attempts
    RETRY_DELAY_MS: 5000,         // Delay before retry
    DAILY_LIMIT: 1000,            // Daily SMS limit
    HOURLY_LIMIT: 100,            // Hourly SMS limit
    MESSAGE_TTL: 3600             // 1 hour TTL
} as const;

// SMS counter for rate limiting (in-memory, use Redis in production)
export class SmsCounter {
    private daily = new Map<string, number>();
    private hourly = new Map<string, number>();

    private getDailyKey(): string {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    }

    private getHourlyKey(): string {
        const now = new Date();
        return `${now.toISOString().split('T')[0]}_${now.getHours()}`; // YYYY-MM-DD_HH
    }

    getDailyCount(): number {
        return this.daily.get(this.getDailyKey()) || 0;
    }

    getHourlyCount(): number {
        return this.hourly.get(this.getHourlyKey()) || 0;
    }

    increment(): void {
        const dailyKey = this.getDailyKey();
        const hourlyKey = this.getHourlyKey();

        this.daily.set(dailyKey, (this.daily.get(dailyKey) || 0) + 1);
        this.hourly.set(hourlyKey, (this.hourly.get(hourlyKey) || 0) + 1);
    }

    canSend(): boolean {
        return this.getDailyCount() < SMS_RATE_LIMIT.DAILY_LIMIT &&
            this.getHourlyCount() < SMS_RATE_LIMIT.HOURLY_LIMIT;
    }

    getRemainingQuota(): { daily: number; hourly: number } {
        return {
            daily: SMS_RATE_LIMIT.DAILY_LIMIT - this.getDailyCount(),
            hourly: SMS_RATE_LIMIT.HOURLY_LIMIT - this.getHourlyCount()
        };
    }
}

// Global instance
export const smsCounter = new SmsCounter();