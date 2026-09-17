import { z } from 'zod';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { formatCustomerId } from '@/lib/google-ads-format';
import { mapWithConcurrency } from '@/lib/concurrency';
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
  sourceMccId: z.string().trim().min(1).max(100),
  targetMccId: z.string().trim().min(1).max(100),
  customerIds: z.array(z.string().trim().min(1).max(30)).min(1).max(25),
});

function googleError(error: unknown) {
  if (error instanceof GoogleAdsError) return googleAdsErrorDetails(error);
  return {
    code: 'MANAGER_LINK_FAILED',
    type: 'LOCAL_ERROR',
    message: error instanceof Error ? error.message : 'Không thể liên kết tài khoản với MCC.',
    requestId: null,
    status: 500,
    rootStatus: null,
  };
}

async function storeActiveTargetAccount(
  targetMcc: { id: string; customerId: string; loginCustomerId: string },
  source: {
    customerId: string;
    name: string;
    currency: string | null;
    timezone: string | null;
    status: 'ENABLED' | 'SUSPENDED' | 'CANCELED' | 'CLOSED' | 'UNKNOWN';
    testAccount: boolean;
  },
) {
  await prisma.customerAccount.upsert({
    where: { mccId_customerId: { mccId: targetMcc.id, customerId: source.customerId } },
    create: {
      mccId: targetMcc.id,
      customerId: source.customerId,
      parentCustomerId: targetMcc.customerId,
      loginCustomerId: targetMcc.loginCustomerId,
      manager: false,
      level: 1,
      testAccount: source.testAccount,
      name: source.name,
      currency: source.currency,
      timezone: source.timezone,
      status: source.status,
      mccHasOwnership: false,
      lastSyncAt: new Date(),
    },
    update: {
      parentCustomerId: targetMcc.customerId,
      loginCustomerId: targetMcc.loginCustomerId,
      name: source.name,
      currency: source.currency,
      timezone: source.timezone,
      status: source.status,
      lastSyncAt: new Date(),
    },
  });
}

export async function GET(request: Request) {
  const access = await requirePermission(PERMISSIONS.SHARE_ACCOUNT_ACCESS);
  if (access.error) return access.error;
  const url = new URL(request.url);
  const sourceMccId = url.searchParams.get('sourceMccId')?.trim() ?? '';
  const query = url.searchParams.get('q')?.trim().slice(0, 100) ?? '';
  const mccs = await prisma.mCC.findMany({
    where: { manager: true, connection: { status: 'CONNECTED' } },
    select: {
      id: true,
      customerId: true,
      name: true,
      loginCustomerId: true,
      connection: { select: { googleEmail: true } },
      _count: { select: { accounts: true } },
    },
    orderBy: [{ name: 'asc' }, { customerId: 'asc' }],
  });
  if (!sourceMccId) return ok({ mccs, accounts: [] });
  if (!mccs.some(item => item.id === sourceMccId)) return fail('SOURCE_MCC_NOT_FOUND', 'Không tìm thấy MCC nguồn đang hoạt động.', 404);
  const normalizedQuery = normalizeCustomerId(query);
  const searchFilter = query
    ? { OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        ...(normalizedQuery ? [{ customerId: { contains: normalizedQuery } }] : []),
      ] }
    : {};
  const accounts = await prisma.customerAccount.findMany({
    where: { mccId: sourceMccId, manager: false, ...searchFilter },
    select: { id: true, customerId: true, name: true, status: true, mccHasOwnership: true },
    orderBy: [{ name: 'asc' }, { customerId: 'asc' }],
    take: 100,
  });
  return ok({ mccs, accounts });
}

export async function POST(request: Request) {
  const access = await requirePermission(PERMISSIONS.SHARE_ACCOUNT_ACCESS);
  if (access.error) return access.error;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_INPUT', 'MCC nguồn, MCC đích hoặc Customer ID không hợp lệ.', 400);
  if (parsed.data.sourceMccId === parsed.data.targetMccId) return fail('SAME_MCC', 'MCC nguồn và MCC đích phải khác nhau.', 400);
  const customerIds = [...new Set(parsed.data.customerIds.map(normalizeCustomerId).filter(id => id.length === 10))];
  if (!customerIds.length) return fail('INVALID_CUSTOMER_IDS', 'Không có Customer ID 10 chữ số hợp lệ.', 400);

  const [sourceMcc, targetMcc] = await Promise.all([
    prisma.mCC.findFirst({
      where: { id: parsed.data.sourceMccId, manager: true, connection: { status: 'CONNECTED' } },
      select: { id: true, customerId: true, loginCustomerId: true, connectionId: true, name: true },
    }),
    prisma.mCC.findFirst({
      where: { id: parsed.data.targetMccId, manager: true, connection: { status: 'CONNECTED' } },
      select: { id: true, customerId: true, loginCustomerId: true, connectionId: true, name: true },
    }),
  ]);
  if (!sourceMcc) return fail('SOURCE_MCC_NOT_FOUND', 'Không tìm thấy MCC nguồn đang hoạt động.', 404);
  if (!targetMcc) return fail('TARGET_MCC_NOT_FOUND', 'Không tìm thấy MCC đích đang hoạt động.', 404);

  const sourceAccounts = await prisma.customerAccount.findMany({
    where: { mccId: sourceMcc.id, customerId: { in: customerIds }, manager: false },
    select: {
      customerId: true,
      name: true,
      currency: true,
      timezone: true,
      status: true,
      testAccount: true,
      loginCustomerId: true,
    },
  });
  const sourceByCustomerId = new Map(sourceAccounts.map(item => [item.customerId, item]));
  const [{ client: targetClient }, { client: sourceClient }] = await Promise.all([
    googleAdsClientForConnection(targetMcc.connectionId, targetMcc.loginCustomerId),
    googleAdsClientForConnection(sourceMcc.connectionId, sourceMcc.loginCustomerId),
  ]);
  const targetLinks = new ManagerLinkService(targetClient);
  const sourceLinks = new ManagerLinkService(sourceClient);

  const results = await mapWithConcurrency(customerIds, 2, async customerId => {
    const account = sourceByCustomerId.get(customerId);
    if (!account) return {
      customerId,
      name: `Customer ${formatCustomerId(customerId)}`,
      status: 'FAILED' as const,
      error: { code: 'ACCOUNT_NOT_IN_SOURCE_MCC', type: 'VALIDATION_ERROR', message: 'Tài khoản không tồn tại trong MCC nguồn đã chọn.', requestId: null },
    };
    try {
      const invitation = await targetLinks.ensureInvitation(targetMcc.customerId, account.customerId);
      if (invitation.status === 'ACTIVE') {
        await storeActiveTargetAccount(targetMcc, account);
        return { customerId, name: account.name, status: 'ALREADY_LINKED' as const, invitationCreated: false };
      }
      try {
        await sourceLinks.acceptInvitation(account.customerId, targetMcc.customerId, invitation.managerLinkId);
        await storeActiveTargetAccount(targetMcc, account);
        return { customerId, name: account.name, status: 'ACTIVE' as const, invitationCreated: invitation.created };
      } catch (error) {
        return { customerId, name: account.name, status: 'PENDING' as const, invitationCreated: invitation.created, error: googleError(error) };
      }
    } catch (error) {
      return { customerId, name: account.name, status: 'FAILED' as const, error: googleError(error) };
    }
  });

  await writeAudit({
    userId: access.user.id,
    userEmail: access.user.email,
    userName: access.user.name,
    action: 'GOOGLE_ADS_ACCOUNTS_SHARED_BETWEEN_MCC',
    entityType: 'MCC',
    entityId: targetMcc.id,
    metadata: {
      sourceMccId: sourceMcc.id,
      sourceCustomerId: sourceMcc.customerId,
      targetMccId: targetMcc.id,
      targetCustomerId: targetMcc.customerId,
      results: results.map(item => ({ customerId: item.customerId, status: item.status, errorCode: item.error?.code ?? null })),
    },
    ipAddress: requestIp(request),
  });

  return ok({
    sourceMcc: { id: sourceMcc.id, name: sourceMcc.name, customerId: sourceMcc.customerId },
    targetMcc: { id: targetMcc.id, name: targetMcc.name, customerId: targetMcc.customerId },
    results,
  });
}
