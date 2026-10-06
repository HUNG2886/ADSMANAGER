import { z } from 'zod';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { mapWithConcurrency } from '@/lib/concurrency';
import { allowedMccIds } from '@/lib/data-access';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import {
  googleAdsClientForConnection,
  googleAdsErrorDetails,
  GoogleAdsError,
  IdentityVerificationService,
  type IdentityVerificationResult,
} from '@/services/google-ads';

export const maxDuration = 60;

const requestSchema = z.object({
  action: z.enum(['CHECK', 'START']),
  accountIds: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
});

type AccountTarget = {
  id: string;
  customerId: string;
  name: string;
  loginCustomerId: string;
  mcc: { id: string; name: string; connectionId: string };
};

async function storeVerification(accountId: string, verification: IdentityVerificationResult) {
  await prisma.customerAccount.update({
    where: { id: accountId },
    data: {
      verificationStatus: verification.status,
      verificationStartDeadline: verification.startDeadline,
      verificationCompletionDeadline: verification.completionDeadline,
      verificationCheckedAt: new Date(),
      verificationErrorCode: null,
      verificationErrorMessage: null,
      verificationRequestId: null,
    },
  });
}

async function storeVerificationError(accountId: string, error: ReturnType<typeof googleAdsErrorDetails>) {
  await prisma.customerAccount.update({
    where: { id: accountId },
    data: {
      verificationStatus: 'ERROR',
      verificationCheckedAt: new Date(),
      verificationErrorCode: error.code,
      verificationErrorMessage: error.message,
      verificationRequestId: error.requestId,
    },
  });
}

export async function POST(request: Request) {
  const access = await requirePermission(PERMISSIONS.MANAGE_IDENTITY_VERIFICATION);
  if (access.error) return access.error;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_INPUT', 'Hành động hoặc danh sách tài khoản không hợp lệ.', 400);

  const accountIds = [...new Set(parsed.data.accountIds)];
  const allowed = await allowedMccIds(access.user);
  const accounts = await prisma.customerAccount.findMany({
    where: {
      id: { in: accountIds },
      manager: false,
      ...(allowed === null ? {} : { mccId: { in: allowed } }),
      mcc: { connection: { status: 'CONNECTED' } },
    },
    select: {
      id: true,
      customerId: true,
      name: true,
      loginCustomerId: true,
      mcc: { select: { id: true, name: true, connectionId: true } },
    },
  });
  const accountById = new Map(accounts.map(account => [account.id, account]));
  const clientPromises = new Map<string, ReturnType<typeof googleAdsClientForConnection>>();

  async function serviceFor(account: AccountTarget) {
    const key = `${account.mcc.connectionId}:${account.loginCustomerId}`;
    let clientPromise = clientPromises.get(key);
    if (!clientPromise) {
      clientPromise = googleAdsClientForConnection(account.mcc.connectionId, account.loginCustomerId);
      clientPromises.set(key, clientPromise);
    }
    const { client } = await clientPromise;
    return new IdentityVerificationService(client);
  }

  const results = await mapWithConcurrency(accountIds, 2, async accountId => {
    const account = accountById.get(accountId);
    if (!account) return {
      accountId,
      customerId: null,
      name: null,
      mccName: null,
      success: false as const,
      error: { code: 'ACCOUNT_NOT_FOUND', type: 'ACCESS_ERROR', message: 'Không tìm thấy tài khoản hoặc bạn không có quyền truy cập.', requestId: null },
    };
    try {
      const service = await serviceFor(account);
      const verification = parsed.data.action === 'START'
        ? await service.start(account.customerId)
        : { ...(await service.get(account.customerId)), started: false };
      await storeVerification(account.id, verification);
      return {
        accountId: account.id,
        customerId: account.customerId,
        name: account.name,
        mccName: account.mcc.name,
        success: true as const,
        verification,
      };
    } catch (cause) {
      const error = cause instanceof GoogleAdsError
        ? googleAdsErrorDetails(cause)
        : { code: 'IDENTITY_VERIFICATION_FAILED', type: 'LOCAL_ERROR', message: cause instanceof Error ? cause.message : 'Không thể xử lý xác minh.', requestId: null, status: 500, rootStatus: null };
      await storeVerificationError(account.id, error).catch(() => null);
      return {
        accountId: account.id,
        customerId: account.customerId,
        name: account.name,
        mccName: account.mcc.name,
        success: false as const,
        error,
      };
    }
  });

  await writeAudit({
    userId: access.user.id,
    userEmail: access.user.email,
    userName: access.user.name,
    action: parsed.data.action === 'START' ? 'GOOGLE_ADS_IDENTITY_VERIFICATION_STARTED' : 'GOOGLE_ADS_IDENTITY_VERIFICATION_CHECKED',
    entityType: 'CustomerAccount',
    entityId: accountIds.length === 1 ? accountIds[0] : 'batch',
    metadata: {
      accountCount: accountIds.length,
      results: results.map(result => ({
        customerId: result.customerId,
        success: result.success,
        status: result.success ? result.verification.status : null,
        started: result.success ? result.verification.started : false,
        errorCode: result.success ? null : result.error.code,
      })),
    },
    ipAddress: requestIp(request),
  });

  return ok({ action: parsed.data.action, results });
}
