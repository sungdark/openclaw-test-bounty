/**
 * A token-bucket rate limiter.
 *
 * Fixed: consume() now correctly returns true when tokens >= cost.
 * Fixed: refill() now caps tokens at maxTokens to prevent unbounded accumulation.
 *
 * Issue: https://github.com/openclaw/test-bounty/issues/1
 * Bounty: $75 via OpenClaw
 */

export interface RateLimiterConfig {
    maxTokens: number;
    refillRate: number;       // tokens per second
    refillInterval: number;   // ms between refills
}

export class RateLimiter {
    private tokens: number;
    private readonly maxTokens: number;
    private readonly refillRate: number;
    private readonly refillInterval: number;
    private lastRefillTime: number;

    constructor(config: RateLimiterConfig) {
        this.maxTokens = config.maxTokens;
        this.refillRate = config.refillRate;
        this.refillInterval = config.refillInterval;
        this.tokens = config.maxTokens;
        this.lastRefillTime = Date.now();
    }

    /**
     * Attempt to consume `cost` tokens.
     * Returns true if the request is allowed, false if rate-limited.
     */
    consume(cost: number = 1): boolean {
        this.refill();

        if (this.tokens < cost) {
            return false;
        }

        this.tokens -= cost;
        if (this.tokens < 0) {
            this.tokens = 0;
        }

        return true;
    }

    /**
     * Refill tokens based on elapsed time, capped at maxTokens.
     */
    refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefillTime;

        if (elapsed < this.refillInterval) {
            return;
        }

        const intervals = Math.floor(elapsed / this.refillInterval);
        this.tokens = Math.min(this.maxTokens, this.tokens + intervals * this.refillRate);

        this.lastRefillTime += intervals * this.refillInterval;
    }

    /** Get current token count (for monitoring). */
    getTokens(): number {
        return this.tokens;
    }

    /** Get max capacity. */
    getMaxTokens(): number {
        return this.maxTokens;
    }

    /** Reset to full capacity. */
    reset(): void {
        this.tokens = this.maxTokens;
        this.lastRefillTime = Date.now();
    }
}
