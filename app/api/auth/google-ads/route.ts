import { NextResponse } from 'next/server';
import { apiUser, fail } from '../../../../lib/api';

export async function GET(request: Request) {
  const user = await apiUser(); if (!user || user.demo) return fail('AUTH_REQUIRED', 'Hãy đăng nhập trước khi kết nối Google Ads.', 401);
  const clientId = process.env.GOOGLE_CLIENT_ID; if (!clientId) return fail('OAUTH_NOT_CONFIGURED', 'Google OAuth chưa được cấu hình.', 503);
  const origin = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const state = crypto.randomUUID();
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.search = new URLSearchParams({ client_id: clientId, redirect_uri: `${origin}/api/auth/google-ads/callback`, response_type: 'code', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', scope: 'openid email https://www.googleapis.com/auth/adwords', state }).toString();
  const response = NextResponse.redirect(authorize);
  response.cookies.set('google_ads_oauth_state', state, { httpOnly: true, secure: origin.startsWith('https://'), sameSite: 'lax', path: '/api/auth/google-ads/callback', maxAge: 600 });
  return response;
}
