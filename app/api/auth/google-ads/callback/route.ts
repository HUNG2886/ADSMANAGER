import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { apiUser, fail } from '../../../../../lib/api';
import { encryptSecret } from '../../../../../lib/encryption';
import { GoogleAdsClient, MccService } from '../../../../../services/google-ads';

async function ensureTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS google_connections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, google_email TEXT NOT NULL, refresh_token_encrypted TEXT NOT NULL, access_token_encrypted TEXT, expires_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_google_connections_user_id ON google_connections(user_id)`).run();
}

export async function GET(request: Request) {
  const url = new URL(request.url); const user = await apiUser();
  if (!user || user.demo) return fail('AUTH_REQUIRED', 'Phiên đăng nhập không hợp lệ.', 401);
  const cookieState = request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('google_ads_oauth_state='))?.split('=')[1];
  const state = url.searchParams.get('state'); const code = url.searchParams.get('code');
  if (!state || state !== cookieState || !code) return fail('OAUTH_STATE_INVALID', 'Yêu cầu OAuth không hợp lệ hoặc đã hết hạn.', 400);
  const origin = process.env.NEXTAUTH_URL || url.origin;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({ code, client_id:process.env.GOOGLE_CLIENT_ID!, client_secret:process.env.GOOGLE_CLIENT_SECRET!, redirect_uri:`${origin}/api/auth/google-ads/callback`, grant_type:'authorization_code' }) });
  if (!tokenResponse.ok) return fail('OAUTH_EXCHANGE_FAILED', 'Không thể hoàn tất kết nối Google.', 400);
  const token = await tokenResponse.json() as { access_token:string;refresh_token?:string;expires_in:number };
  if (!token.refresh_token) return fail('REFRESH_TOKEN_MISSING', 'Google không trả về refresh token. Hãy thu hồi quyền và kết nối lại.', 400);
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:`Bearer ${token.access_token}`}});
  const profile = await profileResponse.json() as {email?:string};
  const accessible = await new MccService(new GoogleAdsClient({accessToken:token.access_token,developerToken:process.env.GOOGLE_DEVELOPER_TOKEN!})).listAccessibleCustomers();
  await ensureTable(); const now=Date.now(); const id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO google_connections (id,user_id,google_email,refresh_token_encrypted,access_token_encrypted,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).bind(id,user.id,profile.email||user.email,await encryptSecret(token.refresh_token),await encryptSecret(token.access_token),now+token.expires_in*1000,now,now).run();
  const response = NextResponse.redirect(`${origin}/?connected=1&customers=${accessible.resourceNames?.length||0}`); response.cookies.delete('google_ads_oauth_state'); return response;
}
