import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { allowedMccIds } from '@/lib/data-access';
import { mapWithConcurrency } from '@/lib/concurrency';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import {
  googleAdsErrorDetails,
  GoogleAdsError,
  syncGoogleAdsAccount,
} from '@/services/google-ads';

const requestSchema = z
  .object({
    after: z.string().trim().min(1).max(100).optional(),
    connectionId: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

const BATCH_SIZE = 2;

export async function POST(request: Request) {
  const access = await requirePermission(PERMISSIONS.SYNC_DATA);
  if (access.error) return access.error;

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail('INVALID_ARGUMENT', 'Yêu cầu đồng bộ chiến dịch không hợp lệ.', 422);
  }

  const { after, connectionId } = parsed.data;
  if (connectionId) {
    const connection = await prisma.googleConnection.findFirst({
      where: { id: connectionId, userId: access.user.id, status: { not: 'DISCONNECTED' } },
      select: { id: true },
    });
    if (!connection) {
      return fail('CONNECTION_NOT_FOUND', 'Không tìm thấy kết nối Google Ads.', 404);
    }
  }

  const allowed = await allowedMccIds(access.user);
  const scope = {
    AND: [
      allowed === null ? {} : { mccId: { in: allowed } },
      connectionId ? { mcc: { connectionId } } : {},
    ],
  };
  const cursorWhere = after ? { id: { gt: after } } : {};
  const [total, candidates] = await Promise.all([
    prisma.customerAccount.count({ where: scope }),
    prisma.customerAccount.findMany({
      where: { AND: [scope, cursorWhere] },
      select: { id: true, customerId: true, name: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE + 1,
    }),
  ]);
  const batch = candidates.slice(0, BATCH_SIZE);
  const hasMore = candidates.length > BATCH_SIZE;

  const results = await mapWithConcurrency(batch, BATCH_SIZE, async (account) => {
    try {
      const synced = await syncGoogleAdsAccount(account.id);
      return { account, synced, error: null };
    } catch (error) {
      const details =
        error instanceof GoogleAdsError
          ? googleAdsErrorDetails(error)
          : {
              code: 'ACCOUNT_SYNC_FAILED',
              type: 'localError',
              message: error instanceof Error ? error.message : 'Không thể đồng bộ tài khoản.',
              requestId: null,
              rootStatus: 'LOCAL_ERROR',
            };
      return { account, synced: null, error: details };
    }
  });

  const failures = results
    .filter((result) => result.error)
    .map((result) => ({
      accountId: result.account.id,
      customerId: result.account.customerId,
      accountName: result.account.name,
      ...result.error!,
    }));

  return ok({
    total,
    processed: batch.length,
    succeeded: results.length - failures.length,
    failed: failures.length,
    campaignCount: results.reduce((sum, result) => sum + (result.synced?.campaignCount ?? 0), 0),
    metricRows: results.reduce((sum, result) => sum + (result.synced?.metricDays ?? 0), 0),
    failures,
    nextCursor: hasMore && batch.length ? batch[batch.length - 1].id : null,
  });
}
