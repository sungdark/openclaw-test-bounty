/**
 * A token-bucket rate limiter.
 *
 * BUG (bounty-eligible): The `consume()` method has an off-by-one error
 * when tokens are exactly equal to the cost. It rejects requests that
 * should be allowed, causing intermittent 429 responses under load.
 *
 * Additionally, `refill()` does not cap tokens at maxTokens, so a long
 * idle period can accumulate unbounded burst capacity.
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
     *
     * BUG: Uses `<` instead of `<=`, so when tokens === cost the request
     * is rejected even though there are exactly enough tokens.
     */
    consume(cost: number = 1): boolean {
        this.refill();

        // BUG: off-by-one — should be `< cost`, not `< cost` with wrong comparison
        if (this.tokens < cost) {   // Should be: this.tokens < cost is correct logic, but see below
            return false;
        }

        // BUG: The actual off-by-one is here — we subtract BEFORE checking,
        // which means we allow going negative
        this.tokens -= cost;

        // BUG: We return false when tokens drop to exactly 0, but that's
        // actually a valid consumption
        if (this.tokens < 0) {
            this.tokens = 0;
            return false;           // Should return true — the consumption already happened
        }

        return true;
    }

    /**
     * Refill tokens based on elapsed time.
     *
     * BUG: Does not cap at maxTokens, allowing unbounded accumulation.
     */
    refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefillTime;

        if (elapsed < this.refillInterval) {
            return;
        }

        const intervals = Math.floor(elapsed / this.refillInterval);
        // BUG: no cap at maxTokens
        this.tokens += intervals * this.refillRate;

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
