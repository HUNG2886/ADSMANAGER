import { GoogleAdsError } from './errors';
import { logGoogleAds } from './safe-logger';

const REQUIRED_GOOGLE_ADS_ENV = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_DEVELOPER_TOKEN', 'ENCRYPTION_KEY'] as const;

export function googleAdsConfigStatus() {
  const missing = REQUIRED_GOOGLE_ADS_ENV.filter(name => !process.env[name]?.trim());
  if ((process.env.ENCRYPTION_KEY?.length ?? 0) > 0 && (process.env.ENCRYPTION_KEY?.length ?? 0) < 32) missing.push('ENCRYPTION_KEY');
  return { configured: missing.length === 0, missing: [...new Set(missing)] };
}

function requiredGoogleEnv(name: typeof REQUIRED_GOOGLE_ADS_ENV[number]) {
  const value = process.env[name]?.trim();
  if (!value) throw new GoogleAdsError('OAUTH_NOT_CONFIGURED', `Thiếu cấu hình ${name}.`, 503);
  return value;
}

export function googleOAuthRedirectUri(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configuredOrigin = process.env.NEXTAUTH_URL?.trim();
  const origin = configuredOrigin ? new URL(configuredOrigin).origin : requestOrigin;
  return `${origin}/api/auth/google-ads/callback`;
}

export function buildGoogleAuthorizationUrl(input: { state: string; requestUrl: string }) {
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.search = new URLSearchParams({
    client_id: requiredGoogleEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: googleOAuthRedirectUri(input.requestUrl),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: 'true',
    scope: 'openid email https://www.googleapis.com/auth/adwords',
    state: input.state,
  }).toString();
  return authorize;
}

export type GoogleOAuthToken = { access_token: string; refresh_token?: string; expires_in: number; token_type: string; scope?: string };

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as GoogleOAuthToken & { error?: string;error_description?:string };
  if (!response.ok) {
    const expired = payload.error === 'invalid_grant';
    const error=new GoogleAdsError(expired?'CONNECTION_EXPIRED':payload.error||'OAUTH_EXCHANGE_FAILED',payload.error_description|| (expired?'Kết nối Google đã hết hạn. Vui lòng đăng nhập lại Google Ads.':'Không thể hoàn tất xác thực Google.'),expired?401:400,null,'OAUTH_ERROR');
    logGoogleAds('oauth_token_request_failed',{oauthResult:'failure',error},'error');throw error;
  }
  return payload;
}

export function exchangeGoogleAuthorizationCode(code: string, requestUrl: string) {
  return tokenRequest(new URLSearchParams({
    code,
    client_id: requiredGoogleEnv('GOOGLE_CLIENT_ID'),
    client_secret: requiredGoogleEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: googleOAuthRedirectUri(requestUrl),
    grant_type: 'authorization_code',
  }));
}

export function refreshGoogleAccessToken(refreshToken: string) {
  return tokenRequest(new URLSearchParams({
    client_id: requiredGoogleEnv('GOOGLE_CLIENT_ID'),
    client_secret: requiredGoogleEnv('GOOGLE_CLIENT_SECRET'),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }));
}

export async function getGoogleProfile(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new GoogleAdsError('GOOGLE_PROFILE_FAILED', 'Không thể đọc tài khoản Google vừa đăng nhập.', 400);
  return response.json() as Promise<{ sub: string; email: string; email_verified?: boolean; name?: string }>;
}

export async function revokeGoogleToken(token: string) {
  await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
    cache: 'no-store',
  }).catch(() => null);
}
