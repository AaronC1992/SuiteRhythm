/**
 * GET /api/auth/token
 * Issues a short-lived HMAC-signed token for authenticating API calls.
 * Requires a signed-in beta account session.
 */

import { NextResponse } from 'next/server';
import { generateToken } from '../../../../lib/api-auth.js';
import { getAuthState } from '../../../../lib/auth.js';
import { checkRateLimit, rateLimitHeaders } from '../../../../lib/rate-limit.js';

export async function GET(request) {
  const rate = checkRateLimit(request, {
    namespace: 'auth-token',
    limit: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  const authState = await getAuthState();
  if (authState.needsRefresh) {
    return NextResponse.json(
      { error: 'Session expired. Sign in again.', refreshRequired: true },
      { status: 401 }
    );
  }
  if (!authState.user) {
    return NextResponse.json(
      { error: authState.error || 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const token = generateToken();
    return NextResponse.json({ token, expiresIn: 3600 });
  } catch {
    const localDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      { token: null, expiresIn: 0, error: 'API auth is not configured' },
      { status: localDev ? 200 : 503 }
    );
  }
}
