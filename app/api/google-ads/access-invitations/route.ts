import { z } from 'zod';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';
import { googleAdsClientForConnection, googleAdsErrorDetails, GoogleAdsError, UserAccessService } from '@/services/google-ads';

const schema = z.object({
  targetType: z.enum(['MCC', 'ACCOUNT']),
  targetId: z.string().min(1),
  emailAddress: z.email().max(254),
  accessRole: z.enum(['READ_ONLY', 'STANDARD']),
});

export async function POST(request: Request) {
  const access = await requirePermission(PERMISSIONS.SHARE_ACCOUNT_ACCESS);
  if (access.error) return access.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_INPUT', 'Email hoặc quyền chia sẻ không hợp lệ.', 400);

  const target = parsed.data.targetType === 'MCC'
    ? await prisma.mCC.findUnique({
        where: { id: parsed.data.targetId },
        select: { id: true, customerId: true, loginCustomerId: true, connectionId: true, name: true },
      })
    : await prisma.customerAccount.findUnique({
        where: { id: parsed.data.targetId },
        select: { id: true, customerId: true, loginCustomerId: true, name: true, mcc: { select: { connectionId: true } } },
      });
  if (!target) return fail('NOT_FOUND', 'Không tìm thấy tài khoản Google Ads.', 404);

  const connectionId = 'connectionId' in target ? target.connectionId : target.mcc.connectionId;
  try {
    const { client } = await googleAdsClientForConnection(connectionId, target.loginCustomerId);
    const result = await new UserAccessService(client).invite(target.customerId, parsed.data.emailAddress, parsed.data.accessRole);
    await writeAudit({
      userId: access.user.id,
      userEmail: access.user.email,
      userName: access.user.name,
      action: 'GOOGLE_ADS_ACCESS_INVITATION_SENT',
      entityType: parsed.data.targetType === 'MCC' ? 'MCC' : 'CustomerAccount',
      entityId: target.id,
      metadata: { emailAddress: parsed.data.emailAddress.toLowerCase(), accessRole: parsed.data.accessRole, customerId: target.customerId },
      ipAddress: requestIp(request),
    });
    return ok({
      targetName: target.name,
      accessRole: parsed.data.accessRole,
      resourceName: result.result?.resourceName ?? null,
      multiPartyAuthReview: result.result?.multiPartyAuthReview ?? null,
    }, 201);
  } catch (error) {
    if (error instanceof GoogleAdsError) {
      const details = googleAdsErrorDetails(error);
      return fail(details.code, details.message, error.status >= 500 ? 503 : error.status, {
        type: details.type,
        requestId: details.requestId,
        rootStatus: details.rootStatus,
      });
    }
    return fail('ACCESS_INVITATION_FAILED', 'Không thể gửi lời mời chia sẻ tài khoản Google Ads.', 502);
  }
}
