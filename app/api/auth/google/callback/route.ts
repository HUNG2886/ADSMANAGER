import { NextRequest, NextResponse } from 'next/server';
import { requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { exchangeGoogleSignInCode, getGoogleSignInProfile, safeReturnTo } from '@/lib/google-sign-in';
import { hasPostgres, prisma } from '@/lib/prisma';
import { authConfigured, createSessionToken, SESSION_COOKIE, sessionCookieOptions, type AppRole } from '@/lib/session';

const STATE_COOKIE = 'google_login_oauth_state';
const RETURN_COOKIE = 'google_login_return_to';

function roleOf(role: string): AppRole {
  return role === 'ADMIN' ? 'ADMIN' : 'STAFF';
}

function mappedUserIdentifier(googleEmail: string) {
  const mappings = [
    { googleEmail: process.env.DEFAULT_ADMIN_GOOGLE_EMAIL, identifier: process.env.DEFAULT_ADMIN_EMAIL },
    { googleEmail: process.env.DEFAULT_STAFF_GOOGLE_EMAIL, identifier: process.env.DEFAULT_STAFF_EMAIL },
  ];
  const match = mappings.find(item => item.googleEmail?.trim().toLowerCase() === googleEmail);
  return match?.identifier?.trim().toLowerCase() || googleEmail;
}

function finish(request: NextRequest, destination: string) {
  const response = NextResponse.redirect(new URL(destination, request.url));
  const expired = { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'lax' as const, path: '/api/auth/google/callback', maxAge: 0 };
  response.cookies.set(STATE_COOKIE, '', expired);
  response.cookies.set(RETURN_COOKIE, '', expired);
  return response;
}

function loginError(request: NextRequest, code: string) {
  return finish(request, `/login?googleError=${encodeURIComponent(code)}`);
}

export async function GET(request: NextRequest) {
  if (!authConfigured()) return loginError(request, 'AUTH_NOT_CONFIGURED');
  if (!hasPostgres()) return loginError(request, 'DATABASE_REQUIRED');
  if (request.nextUrl.searchParams.get('error')) return loginError(request, 'GOOGLE_LOGIN_CANCELLED');

  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected || !code) return loginError(request, 'GOOGLE_LOGIN_STATE_INVALID');

  try {
    const token = await exchangeGoogleSignInCode(code, request.url);
    const profile = await getGoogleSignInProfile(token.access_token);
    if (!profile.sub || !profile.email || profile.email_verified !== true) return loginError(request, 'GOOGLE_EMAIL_NOT_VERIFIED');

    const email = profile.email.trim().toLowerCase();
    const linked = await prisma.user.findUnique({ where: { googleSubject: profile.sub } });
    const matchingEmail = linked ?? await prisma.user.findUnique({ where: { email: mappedUserIdentifier(email) } });
    if (!matchingEmail || matchingEmail.status !== 'ACTIVE') return loginError(request, 'GOOGLE_ACCOUNT_NOT_ALLOWED');
    if (matchingEmail.googleSubject && matchingEmail.googleSubject !== profile.sub) return loginError(request, 'GOOGLE_ACCOUNT_LINK_MISMATCH');

    const user = await prisma.user.update({
      where: { id: matchingEmail.id },
      data: {
        googleSubject: profile.sub,
        lastLoginAt: new Date(),
        name: matchingEmail.name || profile.name || email,
        image: profile.picture || matchingEmail.image,
      },
      select: { id: true, email: true, name: true, role: true, sessionVersion: true },
    });
    const sessionUser = { id: user.id, email: user.email, name: user.name || user.email, role: roleOf(user.role), sessionVersion: user.sessionVersion };
    const destination = safeReturnTo(request.cookies.get(RETURN_COOKIE)?.value);
    const response = finish(request, destination);
    response.cookies.set(SESSION_COOKIE, createSessionToken(sessionUser), sessionCookieOptions(false));
    await writeAudit({ userId: user.id, userEmail: user.email, userName: sessionUser.name, action: 'GOOGLE_LOGIN', entityType: 'Session', entityId: user.id, metadata: { provider: 'google' }, ipAddress: requestIp(request) });
    return response;
  } catch (error) {
    console.error('[auth] Google Sign-In failed:', error instanceof Error ? error.message : 'Unknown error');
    return loginError(request, 'GOOGLE_LOGIN_FAILED');
  }
}
