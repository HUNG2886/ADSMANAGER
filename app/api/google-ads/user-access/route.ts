import { z } from 'zod';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';
import {
  googleAdsClientForConnection,
  googleAdsErrorDetails,
  GoogleAdsError,
  UserAccessService,
} from '@/services/google-ads';

const targetSchema = z.object({
  targetType: z.enum(['MCC', 'ACCOUNT']),
  targetId: z.string().trim().min(1).max(100),
});
const removeSchema = targetSchema.extend({
  emailAddress: z.email().max(254),
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

function googleError(error: unknown, fallbackCode: string, fallbackMessage: string) {
  if (error instanceof GoogleAdsError) {
    const details = googleAdsErrorDetails(error);
    return fail(details.code, details.message, error.status >= 500 ? 503 : error.status, {
      type: details.type,
      requestId: details.requestId,
      rootStatus: details.rootStatus,
    });
  }
  return fail(fallbackCode, fallbackMessage, 502);
}

export async function GET(request: Request) {
  const access = await requirePermission(PERMISSIONS.SHARE_ACCOUNT_ACCESS);
  if (access.error) return access.error;
  const url = new URL(request.url);
  const parsed = targetSchema.safeParse({
    targetType: url.searchParams.get('targetType'),
    targetId: url.searchParams.get('targetId'),
  });
  if (!parsed.success) return fail('INVALID_INPUT', 'Tài khoản Google Ads không hợp lệ.', 400);
  const target = await resolveTarget(parsed.data.targetType, parsed.data.targetId);
  if (!target) return fail('NOT_FOUND', 'Không tìm thấy tài khoản Google Ads.', 404);

  try {
    const { client } = await googleAdsClientForConnection(target.connectionId, target.loginCustomerId);
    const users = await new UserAccessService(client).list(target.customerId);
    const protectedEmail = target.googleEmail.trim().toLowerCase();
    return ok({
      targetName: target.name,
      users: users
        .map(user => ({ ...user, protected: user.emailAddress === protectedEmail }))
        .sort((a, b) => a.emailAddress.localeCompare(b.emailAddress)),
    });
  } catch (error) {
    return googleError(error, 'USER_ACCESS_LIST_FAILED', 'Không thể tải danh sách quyền Google Ads.');
  }
}

export async function DELETE(request: Request) {
  const access = await requirePermission(PERMISSIONS.SHARE_ACCOUNT_ACCESS);
  if (access.error) return access.error;
  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_INPUT', 'Email hoặc tài khoản Google Ads không hợp lệ.', 400);
  const target = await resolveTarget(parsed.data.targetType, parsed.data.targetId);
  if (!target) return fail('NOT_FOUND', 'Không tìm thấy tài khoản Google Ads.', 404);
  const emailAddress = parsed.data.emailAddress.trim().toLowerCase();
  if (emailAddress === target.googleEmail.trim().toLowerCase()) {
    return fail(
      'CONNECTED_GOOGLE_USER_PROTECTED',
      'Không thể xóa Gmail đang dùng cho kết nối OAuth vì thao tác này sẽ làm mất quyền đồng bộ.',
      409,
    );
  }

  try {
    const { client } = await googleAdsClientForConnection(target.connectionId, target.loginCustomerId);
    const service = new UserAccessService(client);
    const user = (await service.list(target.customerId)).find(item => item.emailAddress === emailAddress);
    if (!user) return fail('USER_ACCESS_NOT_FOUND', 'Email này không còn quyền trực tiếp trên tài khoản.', 404);
    const result = await service.remove(target.customerId, user.resourceName);
    await writeAudit({
      userId: access.user.id,
      userEmail: access.user.email,
      userName: access.user.name,
      action: 'GOOGLE_ADS_USER_ACCESS_REMOVED',
      entityType: parsed.data.targetType === 'MCC' ? 'MCC' : 'CustomerAccount',
      entityId: target.id,
      metadata: {
        emailAddress,
        accessRole: user.accessRole,
        customerId: target.customerId,
        multiPartyAuthReview: result.result?.multiPartyAuthReview ?? null,
      },
      ipAddress: requestIp(request),
    });
    return ok({
      emailAddress,
      multiPartyAuthReview: result.result?.multiPartyAuthReview ?? null,
    });
  } catch (error) {
    return googleError(error, 'USER_ACCESS_REMOVE_FAILED', 'Không thể xóa quyền truy cập Google Ads.');
  }
}
