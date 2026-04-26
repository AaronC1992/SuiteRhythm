import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimitsForTests } from '../lib/rate-limit.js';

function requestFor(ip) {
    return new Request('https://example.test/api', {
        headers: { 'x-forwarded-for': ip },
    });
}

describe('rate-limit', () => {
    beforeEach(() => resetRateLimitsForTests());

    it('allows requests up to the configured limit', () => {
        const options = { namespace: 'test', limit: 2, windowMs: 60_000 };

        expect(checkRateLimit(requestFor('1.2.3.4'), options).allowed).toBe(true);
        expect(checkRateLimit(requestFor('1.2.3.4'), options).allowed).toBe(true);
        expect(checkRateLimit(requestFor('1.2.3.4'), options).allowed).toBe(false);
    });

    it('isolates buckets by namespace and IP', () => {
        const options = { namespace: 'a', limit: 1, windowMs: 60_000 };

        expect(checkRateLimit(requestFor('1.2.3.4'), options).allowed).toBe(true);
        expect(checkRateLimit(requestFor('5.6.7.8'), options).allowed).toBe(true);
        expect(checkRateLimit(requestFor('1.2.3.4'), { ...options, namespace: 'b' }).allowed).toBe(true);
    });
});
