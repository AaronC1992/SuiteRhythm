const buckets = new Map();

export function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || request.headers.get('fly-client-ip')
    || null;
}

// Build a stable per-request key. When no client IP can be derived (e.g. local
// dev, header-stripping proxy), fall back to a per-request token instead of a
// shared "unknown" bucket — otherwise one misbehaving caller would lock out
// every other anonymous client.
function buildBucketKey(request, namespace) {
  const ip = getClientIp(request);
  if (ip) return `${namespace}:ip:${ip}`;

  const ua = request.headers.get('user-agent') || '';
  const lang = request.headers.get('accept-language') || '';
  return `${namespace}:anon:${ua}|${lang}`;
}

export function checkRateLimit(request, { namespace, limit, windowMs }) {
  const now = Date.now();
  const key = buildBucketKey(request, namespace);
  let entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }

  entry.count += 1;
  buckets.set(key, entry);

  if (buckets.size > 10000) {
    for (const [bucketKey, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(bucketKey);
    }
  }

  const remaining = Math.max(0, limit - entry.count);
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return {
    allowed: entry.count <= limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfter,
  };
}

export function rateLimitHeaders(result) {
  return {
    'Retry-After': String(result.retryAfter),
    'X-RateLimit-Remaining': String(result.remaining),
  };
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
