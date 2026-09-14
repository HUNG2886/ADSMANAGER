import { NextRequest, NextResponse } from 'next/server';
import { APP_LOCALE_COOKIE, normalizeAppLocale } from '@/lib/i18n';

export function GET(request: NextRequest) {
  const locale = normalizeAppLocale(request.nextUrl.searchParams.get('locale'));
  const requestedPath = request.nextUrl.searchParams.get('returnTo') || '/dashboard';
  const returnTo = requestedPath.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/dashboard';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const response = NextResponse.redirect(new URL(returnTo, `${protocol}://${host}`));
  response.cookies.set(APP_LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
