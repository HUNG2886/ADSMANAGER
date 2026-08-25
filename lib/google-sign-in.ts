import 'server-only';

type GoogleLoginToken = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type GoogleLoginProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function clientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() || '';
}

function clientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
}

export function googleSignInConfigured() {
  return process.env.GOOGLE_SIGN_IN_ENABLED !== 'false' && Boolean(clientId() && clientSecret());
}

export function safeReturnTo(value: string | null | undefined, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

export function googleSignInRedirectUri(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configuredOrigin = process.env.NEXTAUTH_URL?.trim();
  let origin = requestOrigin;
  if (configuredOrigin) {
    try { origin = new URL(configuredOrigin).origin; } catch { origin = requestOrigin; }
  }
  return `${origin}/api/auth/google/callback`;
}

export function buildGoogleSignInUrl(input: { state: string; requestUrl: string }) {
  if (!googleSignInConfigured()) throw new Error('Google Sign-In chưa được cấu hình.');
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.search = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: googleSignInRedirectUri(input.requestUrl),
    response_type: 'code',
    prompt: 'select_account',
    scope: 'openid email profile',
    state: input.state,
  }).toString();
  return authorize;
}

export async function exchangeGoogleSignInCode(code: string, requestUrl: string) {
  if (!googleSignInConfigured()) throw new Error('Google Sign-In chưa được cấu hình.');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: googleSignInRedirectUri(requestUrl),
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as GoogleLoginToken & { error_description?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || 'Không thể xác thực với Google.');
  return payload;
}

export async function getGoogleSignInProfile(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Không thể đọc hồ sơ Google.');
  return response.json() as Promise<GoogleLoginProfile>;
}
