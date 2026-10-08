import { z } from 'zod';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { canAccessAccount } from '@/lib/data-access';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import {
  googleAdsClientForConnection,
  googleAdsErrorDetails,
  GoogleAdsError,
  ManagerLinkService,
  normalizeCustomerId,
} from '@/services/google-ads';

const requestSchema = z.object({
  confirmationCustomerId: z.string().trim().min(1).max(30),
});

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission(PERMISSIONS.SHARE_ACCOUNT_ACCESS);
  if (access.error) return access.error;

  const { id } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_CONFIRMATION', 'Customer ID xác nhận không hợp lệ.', 400);
  if (!await canAccessAccount(access.user, id)) return fail('FORBIDDEN', 'Bạn không có quyền gỡ tài khoản này khỏi MCC.', 403);

  const account = await prisma.customerAccount.findUnique({
    where: { id },
    select: {
      id: true,
      customerId: true,
      name: true,
      manager: true,
      mcc: {
        select: {
          id: true,
          customerId: true,
          name: true,
          loginCustomerId: true,
          connectionId: true,
          connection: { select: { status: true } },
        },
      },
    },
  });
  if (!account) return fail('ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản Google Ads.', 404);
  if (account.manager) return fail('MANAGER_ACCOUNT_NOT_SUPPORTED', 'Không thể gỡ tài khoản MCC bằng thao tác dành cho tài khoản con.', 409);
  if (normalizeCustomerId(parsed.data.confirmationCustomerId) !== normalizeCustomerId(account.customerId)) {
    return fail('CONFIRMATION_MISMATCH', 'Customer ID xác nhận không khớp với tài khoản sẽ gỡ.', 400);
  }
  if (account.mcc.connection.status !== 'CONNECTED') {
    return fail('GOOGLE_CONNECTION_NOT_ACTIVE', 'Kết nối Google Ads của MCC không còn hoạt động.', 409);
  }

  try {
    const { client } = await googleAdsClientForConnection(account.mcc.connectionId, account.mcc.loginCustomerId);
    const terminatedLink = await new ManagerLinkService(client).terminateActiveLink(account.mcc.customerId, account.customerId);
    await prisma.customerAccount.delete({ where: { id: account.id } });
    await writeAudit({
      userId: access.user.id,
      userEmail: access.user.email,
      userName: access.user.name,
      action: 'GOOGLE_ADS_ACCOUNT_UNLINKED_FROM_MCC',
      entityType: 'CustomerAccount',
      entityId: account.id,
      metadata: {
        customerId: account.customerId,
        accountName: account.name,
        mccId: account.mcc.id,
        mccCustomerId: account.mcc.customerId,
        mccName: account.mcc.name,
        managerLinkId: terminatedLink?.managerLinkId ?? null,
        alreadyUnlinkedOnGoogle: !terminatedLink,
      },
      ipAddress: requestIp(request),
    });

    return ok({
      id: account.id,
      customerId: account.customerId,
      mccCustomerId: account.mcc.customerId,
      status: terminatedLink ? 'UNLINKED' : 'ALREADY_UNLINKED_RECONCILED',
    });
  } catch (error) {
    if (error instanceof GoogleAdsError) {
      const details = googleAdsErrorDetails(error);
      return fail(details.code, details.message, error.status >= 500 ? 503 : error.status, {
        type: details.type,
        requestId: details.requestId,
        rootStatus: details.rootStatus,
      });
    }
    return fail(
      'MANAGER_LINK_REMOVE_FAILED',
      error instanceof Error ? error.message : 'Không thể gỡ tài khoản khỏi MCC.',
      502,
      { type: 'LOCAL_ERROR', requestId: null },
    );
  }
}
