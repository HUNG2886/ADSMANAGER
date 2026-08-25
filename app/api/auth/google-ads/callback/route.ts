import { NextResponse } from 'next/server';
import { apiUser, fail } from '../../../../../lib/api';
import { encryptSecret } from '../../../../../lib/encryption';
import { GoogleAdsClient, MccService } from '../../../../../services/google-ads';
import { prisma } from '../../../../../lib/prisma';

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
  await prisma.user.upsert({ where: { id: user.id }, update: { email: user.email, name: user.name }, create: { id: user.id, email: user.email, name: user.name } });
  await prisma.googleConnection.create({ data: { userId:user.id, googleEmail:profile.email||user.email, refreshTokenEncrypted:await encryptSecret(token.refresh_token), accessTokenEncrypted:await encryptSecret(token.access_token), expiresAt:new Date(Date.now()+token.expires_in*1000) } });
  const response = NextResponse.redirect(`${origin}/?connected=1&customers=${accessible.resourceNames?.length||0}`); response.cookies.delete('google_ads_oauth_state'); return response;
}
