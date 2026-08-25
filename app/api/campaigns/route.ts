import { z } from 'zod';
import { apiUser, fail, ok, requestIp } from '../../../lib/api';
import { writeAudit } from '../../../lib/audit';
import { decryptSecret } from '../../../lib/encryption';
import { CampaignService, GoogleAdsClient, GoogleAdsError, refreshGoogleAccessToken } from '../../../services/google-ads';
import { prisma } from '../../../lib/prisma';

const updateSchema = z.object({ id: z.string().min(1).max(80), status: z.enum(['ENABLED','PAUSED']), campaignId: z.string().regex(/^\d+$/).optional(), customerId: z.string().optional(), loginCustomerId: z.string().optional(), connectionId: z.string().uuid().optional() });

export async function PATCH(request: Request) {
  const user = await apiUser(); if (!user) return fail('UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục.', 401);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Dữ liệu chiến dịch không hợp lệ.', 422);
  if (!user.demo) {
    if (!parsed.data.campaignId || !parsed.data.customerId || !parsed.data.connectionId) return fail('INVALID_ARGUMENT', 'Thiếu thông tin tài khoản Google Ads.', 422);
    const row = await prisma.googleConnection.findFirst({ where: { id: parsed.data.connectionId, userId: user.id }, select: { refreshTokenEncrypted: true } });
    if (!row) return fail('CONNECTION_REQUIRED', 'Không tìm thấy kết nối Google Ads.', 409);
    try {
      const token = await refreshGoogleAccessToken(await decryptSecret(row.refreshTokenEncrypted));
      const service = new CampaignService(new GoogleAdsClient({ accessToken: token.access_token, developerToken: process.env.GOOGLE_DEVELOPER_TOKEN!, loginCustomerId: parsed.data.loginCustomerId }));
      await service.updateStatus(parsed.data.customerId, parsed.data.campaignId, parsed.data.status);
    } catch (error) {
      if (error instanceof GoogleAdsError) return fail(error.code, error.message, error.status >= 500 ? 503 : error.status);
      return fail('GOOGLE_ADS_API_ERROR', 'Không thể cập nhật Google Ads lúc này.', 502);
    }
  }
  await writeAudit({ userId: user.id, userEmail: user.email, userName: user.name, action: parsed.data.status === 'PAUSED' ? 'CAMPAIGN_PAUSED' : 'CAMPAIGN_ENABLED', entityType: 'Campaign', entityId: parsed.data.id, metadata: { status: parsed.data.status, demo: user.demo }, ipAddress: requestIp(request) });
  return ok({ id: parsed.data.id, status: parsed.data.status, demo: user.demo });
}
