import { NextResponse } from 'next/server';
import { fail } from '../../../../lib/api';
import { PERMISSIONS } from '../../../../lib/permissions';
import { requirePermission } from '../../../../lib/rbac';
import { buildGoogleAuthorizationUrl, googleAdsConfigStatus } from '../../../../services/google-ads';

export async function GET(request: Request) {
  const access=await requirePermission(PERMISSIONS.CONNECT_MCC);if(access.error)return access.error;
  const config=googleAdsConfigStatus();if(!config.configured)return fail('OAUTH_NOT_CONFIGURED',`Thiếu cấu hình: ${config.missing.join(', ')}.`,503);
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildGoogleAuthorizationUrl({state,requestUrl:request.url}));
  response.cookies.set('google_ads_oauth_state', state, { httpOnly: true, secure: new URL(request.url).protocol==='https:', sameSite: 'lax', path: '/api/auth/google-ads/callback', maxAge: 600, priority:'high' });
  return response;
}
