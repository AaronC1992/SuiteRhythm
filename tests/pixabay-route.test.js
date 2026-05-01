import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadPixabayRoute({ pixabayKey = 'pixabay-test-key' } = {}) {
  vi.resetModules();
  process.env.API_AUTH_SECRET = 'test-secret-that-is-long-enough-for-hmac';
  if (pixabayKey) process.env.PIXABAY_API_KEY = pixabayKey;
  else delete process.env.PIXABAY_API_KEY;
  const [{ GET }, { generateToken }] = await Promise.all([
    import('../app/api/pixabay/route.js'),
    import('../lib/api-auth.js'),
  ]);
  return { GET, token: generateToken() };
}

function pixabayRequest(token, query = 'magic whoosh') {
  return new Request(`https://example.test/api/pixabay?q=${encodeURIComponent(query)}`, {
    headers: {
      authorization: `Bearer ${token}`,
      'x-forwarded-for': `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
    },
  });
}

describe('/api/pixabay', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it('maps upstream forbidden responses to an empty provider-unavailable result', async () => {
    const { GET, token } = await loadPixabayRoute();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })));

    const response = await GET(pixabayRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Pixabay-Upstream-Status')).toBe('403');
    expect(body).toMatchObject({ hits: [], providerUnavailable: true, reason: 'upstream_unavailable', upstreamStatus: 403 });
  });

  it('returns an empty result when Pixabay is not configured', async () => {
    const { GET, token } = await loadPixabayRoute({ pixabayKey: '' });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const response = await GET(pixabayRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ hits: [], providerUnavailable: true, reason: 'missing_key' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});