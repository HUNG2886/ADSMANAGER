import { z } from 'zod';
import { apiUser, fail, ok, requestIp } from '../../../lib/api';
import { writeAudit } from '../../../lib/audit';
import { env } from 'cloudflare:workers';
import { decryptSecret } from '../../../lib/encryption';
import { CampaignService, GoogleAdsClient, GoogleAdsError, refreshGoogleAccessToken } from '../../../services/google-ads';

const updateSchema = z.object({ id: z.string().min(1).max(80), status: z.enum(['ENABLED','PAUSED']), campaignId: z.string().regex(/^\d+$/).optional(), customerId: z.string().optional(), loginCustomerId: z.string().optional(), connectionId: z.string().uuid().optional() });

export async function PATCH(request: Request) {
  const user = await apiUser(); if (!user) return fail('UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục.', 401);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Dữ liệu chiến dịch không hợp lệ.', 422);
  if (!user.demo) {
    if (!parsed.data.campaignId || !parsed.data.customerId || !parsed.data.connectionId) return fail('INVALID_ARGUMENT', 'Thiếu thông tin tài khoản Google Ads.', 422);
    const row = await env.DB.prepare('SELECT refresh_token_encrypted FROM google_connections WHERE id = ? AND user_id = ? LIMIT 1').bind(parsed.data.connectionId, user.id).first<{refresh_token_encrypted:string}>();
    if (!row) return fail('CONNECTION_REQUIRED', 'Không tìm thấy kết nối Google Ads.', 409);
    try {
      const token = await refreshGoogleAccessToken(await decryptSecret(row.refresh_token_encrypted));
      const service = new CampaignService(new GoogleAdsClient({ accessToken: token.access_token, developerToken: process.env.GOOGLE_DEVELOPER_TOKEN!, loginCustomerId: parsed.data.loginCustomerId }));
      await service.updateStatus(parsed.data.customerId, parsed.data.campaignId, parsed.data.status);
    } catch (error) {
      if (error instanceof GoogleAdsError) return fail(error.code, error.message, error.status >= 500 ? 503 : error.status);
      return fail('GOOGLE_ADS_API_ERROR', 'Không thể cập nhật Google Ads lúc này.', 502);
    }
  }
  await writeAudit({ userId: user.id, action: parsed.data.status === 'PAUSED' ? 'CAMPAIGN_PAUSED' : 'CAMPAIGN_ENABLED', entityType: 'Campaign', entityId: parsed.data.id, metadata: { status: parsed.data.status, demo: true }, ipAddress: requestIp(request) });
  return ok({ id: parsed.data.id, status: parsed.data.status, demo: user.demo });
}
