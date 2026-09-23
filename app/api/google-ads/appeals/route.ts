import { z } from 'zod';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { allowedMccIds } from '@/lib/data-access';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

const createSchema = z.object({ accountId: z.string().trim().min(1).max(100).optional() }).strict();

export async function POST(request: Request) {
  const access = await requirePermission(PERMISSIONS.MANAGE_APPEALS);
  if (access.error) return access.error;
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Yêu cầu tạo bản nháp không hợp lệ.', 422);

  const allowed = await allowedMccIds(access.user);
  const accounts = await prisma.customerAccount.findMany({
    where: {
      AND: [
        { status: 'SUSPENDED' },
        parsed.data.accountId ? { id: parsed.data.accountId } : {},
        allowed === null ? {} : { mccId: { in: allowed } },
      ],
    },
    select: { id: true },
  });
  if (parsed.data.accountId && accounts.length === 0) {
    return fail('SUSPENDED_ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản bị đình chỉ trong phạm vi được phép.', 404);
  }

  const created = accounts.length
    ? await prisma.accountAppeal.createMany({
        data: accounts.map(account => ({ customerAccountId: account.id, preparedById: access.user.id })),
        skipDuplicates: true,
      })
    : { count: 0 };

  await writeAudit({
    userId: access.user.id,
    userEmail: access.user.email,
    userName: access.user.name,
    action: 'CREATE_ACCOUNT_APPEAL_DRAFTS',
    entityType: 'AccountAppeal',
    entityId: parsed.data.accountId ?? 'all-suspended',
    metadata: { matchedAccounts: accounts.length, createdDrafts: created.count },
    ipAddress: requestIp(request),
  });
  return ok({ matchedAccounts: accounts.length, createdDrafts: created.count }, 201);
}
