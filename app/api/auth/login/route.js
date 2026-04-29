import { NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '../../../../lib/rate-limit.js';
import {
  authenticateTester,
  isAuthConfigured,
  publicUser,
  setTesterAuthCookie,
  testerUser,
} from '../../../../lib/auth.js';

export async function POST(request) {
  const rate = checkRateLimit(request, {
    namespace: 'account-login',
    limit: 8,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  if (!isAuthConfigured()) {
    return NextResponse.json({ error: 'Tester login is not configured yet.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const username = String(body?.username || body?.email || '').trim();
  const password = String(body?.password || '');

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  try {
    if (!authenticateTester(username, password)) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const response = NextResponse.json({ user: publicUser(testerUser()) });
    setTesterAuthCookie(response.cookies);
    return response;
  } catch (error) {
    console.error('[/api/auth/login]', error);
    return NextResponse.json({ error: 'Login failed. Try again shortly.' }, { status: 500 });
  }
}
