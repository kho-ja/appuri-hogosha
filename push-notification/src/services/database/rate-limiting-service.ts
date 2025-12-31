/**
 * Rate Limiting Service for SMS
 * Supports both in-memory (development) and Redis (production) backends
 */

import { SMS_RATE_LIMIT } from '../../config/rate-limits';

export type RateLimitBackend = 'memory' | 'redis';

export interface RateLimitQuota {
    daily: number;
    hourly: number;
}

export interface RateLimitStatus {
    canSend: boolean;
    remaining: RateLimitQuota;
    current: {
        daily: number;
        hourly: number;
    };
    resetTime: {
        daily: string;
        hourly: string;
    };
}

/**
 * In-memory rate limit counter (for development and testing)
 * Not suitable for multi-process/Lambda environments
 */
class InMemoryCounter {
    private daily = new Map<string, number>();
    private hourly = new Map<string, number>();

    private getDailyKey(): string {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    }

    private getHourlyKey(): string {
        const now = new Date();
        return `${now.toISOString().split('T')[0]}_${now.getHours()}`; // YYYY-MM-DD_HH
    }

    private getNextDailyReset(): string {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    }

    private getNextHourlyReset(): string {
        const next = new Date();
        next.setHours(next.getHours() + 1);
        next.setMinutes(0, 0, 0);
        return next.toISOString();
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
        return (
            this.getDailyCount() < SMS_RATE_LIMIT.DAILY_LIMIT &&
            this.getHourlyCount() < SMS_RATE_LIMIT.HOURLY_LIMIT
        );
    }

    getRemainingQuota(): RateLimitQuota {
        return {
            daily: SMS_RATE_LIMIT.DAILY_LIMIT - this.getDailyCount(),
            hourly: SMS_RATE_LIMIT.HOURLY_LIMIT - this.getHourlyCount(),
        };
    }

    getStatus(): RateLimitStatus {
        const remaining = this.getRemainingQuota();
        return {
            canSend: this.canSend(),
            remaining,
            current: {
                daily: this.getDailyCount(),
                hourly: this.getHourlyCount(),
            },
            resetTime: {
                daily: this.getNextDailyReset(),
                hourly: this.getNextHourlyReset(),
            },
        };
    }

    reset(): void {
        this.daily.clear();
        this.hourly.clear();
    }

    cleanup(): void {
        // Clean up old entries (keep only last 7 days and 24 hours)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        // Remove old daily entries
        for (const [key] of this.daily) {
            if (key < dayAgo) {
                this.daily.delete(key);
            }
        }

        // Remove old hourly entries (keep 24 hours)
        const hourAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .substring(0, 13);
        for (const [key] of this.hourly) {
            if (key.substring(0, 13) < hourAgo) {
                this.hourly.delete(key);
            }
        }
    }
}

/**
 * Rate Limiting Service
 * Manages SMS quota with pluggable backend
 */
export class RateLimitingService {
    private counter: InMemoryCounter;
    private backend: RateLimitBackend = 'memory';
    private redisClient?: any; // Can be configured to use Redis

    constructor(backend: RateLimitBackend = 'memory', redisClient?: any) {
        this.backend = backend;
        this.counter = new InMemoryCounter();

        if (backend === 'redis' && redisClient) {
            this.redisClient = redisClient;
            console.log('⚙️  Rate limiting initialized with Redis backend');
        } else {
            console.log('⚙️  Rate limiting initialized with in-memory backend');
            console.log(
                '   ⚠️  In-memory backend is not suitable for production!'
            );
            console.log(
                '   💡 Use Redis backend for multi-process/Lambda environments'
            );
        }
    }

    /**
     * Check if SMS can be sent
     */
    async canSend(): Promise<boolean> {
        if (this.backend === 'memory') {
            return this.counter.canSend();
        }

        // Redis implementation would go here
        return this.counter.canSend();
    }

    /**
     * Increment the counter after sending SMS
     */
    async increment(): Promise<void> {
        this.counter.increment();

        if (this.backend === 'redis' && this.redisClient) {
            // Redis increment would go here
            try {
                const today = new Date().toISOString().split('T')[0];
                const hour = `${today}_${new Date().getHours()}`;

                await this.redisClient.incr(`sms:daily:${today}`);
                await this.redisClient.incr(`sms:hourly:${hour}`);
                await this.redisClient.expire(
                    `sms:daily:${today}`,
                    24 * 60 * 60
                );
                await this.redisClient.expire(`sms:hourly:${hour}`, 60 * 60);
            } catch (error) {
                console.warn(
                    '⚠️  Redis increment failed, falling back to in-memory counter',
                    error
                );
            }
        }
    }

    /**
     * Get remaining quota
     */
    async getRemainingQuota(): Promise<RateLimitQuota> {
        if (this.backend === 'memory') {
            return this.counter.getRemainingQuota();
        }

        // Redis implementation would go here
        return this.counter.getRemainingQuota();
    }

    /**
     * Get detailed status
     */
    async getStatus(): Promise<RateLimitStatus> {
        if (this.backend === 'memory') {
            return this.counter.getStatus();
        }

        // Redis implementation would go here
        return this.counter.getStatus();
    }

    /**
     * Reset quotas (for testing or manual reset)
     */
    async reset(): Promise<void> {
        this.counter.reset();

        if (this.backend === 'redis' && this.redisClient) {
            // Redis reset would go here
            const today = new Date().toISOString().split('T')[0];
            const hour = `${today}_${new Date().getHours()}`;

            try {
                await this.redisClient.del(`sms:daily:${today}`);
                await this.redisClient.del(`sms:hourly:${hour}`);
            } catch (error) {
                console.warn('⚠️  Redis reset failed', error);
            }
        }
    }

    /**
     * Cleanup old entries
     */
    cleanup(): void {
        this.counter.cleanup();
    }

    /**
     * Set custom rate limit (for testing)
     */
    setLimits(_dailyLimit: number, _hourlyLimit: number): void {
        // Would need to modify SMS_RATE_LIMIT or extend implementation
        console.log(
            '💡 Custom limits not fully implemented. Modify SMS_RATE_LIMIT in config.'
        );
    }
}

/**
 * Create a rate limiting service instance
 * Use this singleton across your application
 */
let rateLimitingServiceInstance: RateLimitingService | null = null;

export const getRateLimitingService = (
    backend: RateLimitBackend = 'memory',
    redisClient?: any
): RateLimitingService => {
    if (!rateLimitingServiceInstance) {
        rateLimitingServiceInstance = new RateLimitingService(
            backend,
            redisClient
        );
    }
    return rateLimitingServiceInstance;
};

/**
 * Helper middleware for Express/API Gateway
 * Returns error if rate limit exceeded
 */
export const rateLimitMiddleware = async (
    service: RateLimitingService
): Promise<{ canProceed: boolean; status?: RateLimitStatus }> => {
    const canSend = await service.canSend();

    if (!canSend) {
        const status = await service.getStatus();
        return {
            canProceed: false,
            status,
        };
    }

    return { canProceed: true };
};
