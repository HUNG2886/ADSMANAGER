import { z } from 'zod';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import {
  googleAdsClientForConnection,
  googleAdsErrorDetails,
  GoogleAdsError,
  normalizeCustomerId,
  UserAccessService,
} from '@/services/google-ads';

const requestSchema = z.object({
  targetType: z.enum(['MCC', 'ACCOUNT']),
  targetId: z.string().trim().min(1).max(100),
  confirmationCustomerId: z.string().trim().min(1).max(30),
});

async function resolveTarget(targetType: 'MCC' | 'ACCOUNT', targetId: string) {
  if (targetType === 'MCC') {
    const target = await prisma.mCC.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        customerId: true,
        loginCustomerId: true,
        connectionId: true,
        name: true,
        connection: { select: { googleEmail: true } },
      },
    });
    return target ? {
      id: target.id,
      customerId: target.customerId,
      loginCustomerId: target.loginCustomerId,
      connectionId: target.connectionId,
      name: target.name,
      googleEmail: target.connection.googleEmail,
    } : null;
  }

  const target = await prisma.customerAccount.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      customerId: true,
      loginCustomerId: true,
      name: true,
      mcc: {
        select: {
          connectionId: true,
          connection: { select: { googleEmail: true } },
        },
      },
    },
  });
  return target ? {
    id: target.id,
    customerId: target.customerId,
    loginCustomerId: target.loginCustomerId,
    connectionId: target.mcc.connectionId,
    name: target.name,
    googleEmail: target.mcc.connection.googleEmail,
  } : null;
}

function googleError(error: unknown) {
  if (error instanceof GoogleAdsError) {
    const details = googleAdsErrorDetails(error);
    return fail(details.code, details.message, error.status >= 500 ? 503 : error.status, {
      type: details.type,
      requestId: details.requestId,
      rootStatus: details.rootStatus,
    });
  }
  return fail(
    'SELF_ACCESS_REMOVE_FAILED',
    error instanceof Error ? error.message : 'Không thể xóa quyền truy cập Google Ads của bạn.',
    502,
  );
}

export async function DELETE(request: Request) {
  const access = await requirePermission(PERMISSIONS.SHARE_ACCOUNT_ACCESS);
  if (access.error) return access.error;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_INPUT', 'Thông tin xác nhận không hợp lệ.', 400);

  const target = await resolveTarget(parsed.data.targetType, parsed.data.targetId);
  if (!target) return fail('NOT_FOUND', 'Không tìm thấy tài khoản Google Ads.', 404);
  if (normalizeCustomerId(parsed.data.confirmationCustomerId) !== normalizeCustomerId(target.customerId)) {
    return fail('CONFIRMATION_MISMATCH', 'Customer ID xác nhận không khớp.', 400);
  }

  const googleEmail = target.googleEmail.trim().toLowerCase();
  try {
    const { client } = await googleAdsClientForConnection(target.connectionId, target.loginCustomerId);
    const service = new UserAccessService(client);
    const ownAccess = (await service.list(target.customerId))
      .find(item => item.emailAddress === googleEmail);
    if (!ownAccess) {
      return fail(
        'DIRECT_SELF_ACCESS_NOT_FOUND',
        'Email OAuth không có quyền trực tiếp trên tài khoản này. Nếu quyền được kế thừa qua MCC, hãy rời MCC đang cấp quyền.',
        409,
      );
    }

    const result = await service.remove(target.customerId, ownAccess.resourceName);
    const multiPartyAuthReview = result.result?.multiPartyAuthReview ?? null;
    if (!multiPartyAuthReview && parsed.data.targetType === 'MCC') {
      await prisma.mCC.update({ where: { id: target.id }, data: { accessRole: null } }).catch(() => null);
    }

    await writeAudit({
      userId: access.user.id,
      userEmail: access.user.email,
      userName: access.user.name,
      action: 'GOOGLE_ADS_SELF_ACCESS_REMOVED',
      entityType: parsed.data.targetType === 'MCC' ? 'MCC' : 'CustomerAccount',
      entityId: target.id,
      metadata: {
        googleEmail,
        accessRole: ownAccess.accessRole,
        customerId: target.customerId,
        targetType: parsed.data.targetType,
        multiPartyAuthReview,
      },
      ipAddress: requestIp(request),
    }).catch(() => null);

    return ok({
      googleEmail,
      accessRole: ownAccess.accessRole,
      customerId: target.customerId,
      multiPartyAuthReview,
    });
  } catch (error) {
    return googleError(error);
  }
}
