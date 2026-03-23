import { RateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
    it('should allow requests when tokens are available', () => {
        const limiter = new RateLimiter({
            maxTokens: 10,
            refillRate: 1,
            refillInterval: 1000,
        });

        expect(limiter.consume(1)).toBe(true);
        expect(limiter.getTokens()).toBe(9);
    });

    it('should reject requests when tokens are exhausted', () => {
        const limiter = new RateLimiter({
            maxTokens: 2,
            refillRate: 1,
            refillInterval: 1000,
        });

        expect(limiter.consume(1)).toBe(true);
        expect(limiter.consume(1)).toBe(true);
        expect(limiter.consume(1)).toBe(false);
    });

    /**
     * FAILING TEST — demonstrates the off-by-one bug.
     * When cost exactly equals remaining tokens, consume() should
     * return true but currently returns false.
     */
    it('should allow consumption when cost exactly equals remaining tokens', () => {
        const limiter = new RateLimiter({
            maxTokens: 5,
            refillRate: 1,
            refillInterval: 1000,
        });

        // Consume 4, leaving exactly 1
        expect(limiter.consume(4)).toBe(true);
        expect(limiter.getTokens()).toBe(1);

        // BUG: This should return true (1 token left, cost is 1)
        // but the implementation returns false due to the post-subtract check
        expect(limiter.consume(1)).toBe(true);
    });

    /**
     * FAILING TEST — demonstrates the unbounded refill bug.
     * After a long idle period, tokens should cap at maxTokens.
     */
    it('should cap tokens at maxTokens after refill', () => {
        const limiter = new RateLimiter({
            maxTokens: 10,
            refillRate: 5,
            refillInterval: 100,
        });

        // Consume some tokens
        limiter.consume(8);
        expect(limiter.getTokens()).toBe(2);

        // Simulate passage of time (enough for 20 refill intervals)
        // @ts-ignore — accessing private for test
        limiter.lastRefillTime = Date.now() - 2000;

        limiter.refill();

        // BUG: tokens should be capped at 10, but will be 2 + (20 * 5) = 102
        expect(limiter.getTokens()).toBeLessThanOrEqual(10);
    });

    it('should not refill before interval has elapsed', () => {
        const limiter = new RateLimiter({
            maxTokens: 10,
            refillRate: 5,
            refillInterval: 1000,
        });

        limiter.consume(5);
        limiter.refill();
        expect(limiter.getTokens()).toBe(5); // No refill yet
    });

    it('should reset to full capacity', () => {
        const limiter = new RateLimiter({
            maxTokens: 10,
            refillRate: 1,
            refillInterval: 1000,
        });

        limiter.consume(7);
        expect(limiter.getTokens()).toBe(3);

        limiter.reset();
        expect(limiter.getTokens()).toBe(10);
    });

    it('should handle multi-token consumption', () => {
        const limiter = new RateLimiter({
            maxTokens: 100,
            refillRate: 10,
            refillInterval: 1000,
        });

        expect(limiter.consume(50)).toBe(true);
        expect(limiter.getTokens()).toBe(50);
        expect(limiter.consume(50)).toBe(true);
        // After consuming exactly 100 tokens from 100, should have 0
        expect(limiter.getTokens()).toBe(0);
    });
});
