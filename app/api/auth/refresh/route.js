import { NextResponse } from 'next/server';
import { clearAuthCookies, loginPath, safeRedirectPath } from '../../../../lib/auth.js';

export async function GET(request) {
  const url = new URL(request.url);
  const redirectTo = safeRedirectPath(url.searchParams.get('redirect'));
  const response = NextResponse.redirect(new URL(`${loginPath(redirectTo)}&expired=1`, request.url));
  clearAuthCookies(response.cookies);
  return response;
}
