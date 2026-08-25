import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { buildGoogleSignInUrl, googleSignInConfigured, safeReturnTo } from '@/lib/google-sign-in';

const STATE_COOKIE = 'google_login_oauth_state';
const RETURN_COOKIE = 'google_login_return_to';

export async function GET(request: Request) {
  if (await getCurrentUser()) return NextResponse.redirect(new URL('/dashboard', request.url));
  if (!googleSignInConfigured()) return NextResponse.redirect(new URL('/login?googleError=GOOGLE_LOGIN_NOT_CONFIGURED', request.url));

  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const secure = url.protocol === 'https:';
  const response = NextResponse.redirect(buildGoogleSignInUrl({ state, requestUrl: request.url }));
  response.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth/google/callback', maxAge: 600, priority: 'high' });
  response.cookies.set(RETURN_COOKIE, safeReturnTo(url.searchParams.get('returnTo')), { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth/google/callback', maxAge: 600, priority: 'high' });
  return response;
}
