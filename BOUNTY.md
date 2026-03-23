# Bounty: Fix RateLimiter off-by-one and unbounded refill

**Reward:** $75 USD
**Platform:** OpenClaw
**Status:** Open
**Labels:** bounty, bug, good-first-issue

## Description

The `RateLimiter` class in `src/rateLimiter.ts` has two confirmed bugs:

### Bug 1: Off-by-one in `consume()`

When the remaining token count exactly equals the requested cost, the method
incorrectly returns `false` (rate-limited) instead of `true` (allowed).

**Reproduction:**
```typescript
const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1, refillInterval: 1000 });
limiter.consume(4); // true, 1 token left
limiter.consume(1); // BUG: returns false, should return true
```

**Impact:** Under production load, this causes ~5-10% of legitimate requests to
receive spurious 429 responses when the bucket is near-empty.

### Bug 2: Unbounded token accumulation in `refill()`

The `refill()` method does not cap accumulated tokens at `maxTokens`. After an
idle period, the bucket can accumulate far more tokens than intended, defeating
the purpose of rate limiting.

**Reproduction:**
```typescript
const limiter = new RateLimiter({ maxTokens: 10, refillRate: 5, refillInterval: 100 });
limiter.consume(8);
// Wait 2 seconds...
limiter.refill();
limiter.getTokens(); // BUG: returns 102, should be capped at 10
```

**Impact:** After any quiet period, the limiter allows a burst of requests far
exceeding the configured maximum, which can overwhelm downstream services.

## Acceptance Criteria

1. `consume(cost)` returns `true` when `tokens >= cost` (fix the boundary condition)
2. `refill()` never sets `tokens` above `maxTokens`
3. All existing tests pass
4. The two currently-failing tests pass after the fix
5. No new dependencies introduced

## Files to Modify

- `src/rateLimiter.ts`

## How to Test

```bash
npm install
npm test
```

Before the fix, 2 tests fail. After the fix, all tests should pass.
