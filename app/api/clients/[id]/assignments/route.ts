import { z } from 'zod';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

const schema = z.object({ accountIds: z.array(z.string().min(1)).max(500).transform(values => [...new Set(values)]) });

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission(PERMISSIONS.ASSIGN_ACCOUNTS);
  if (access.error) return access.error;
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Danh sách tài khoản không hợp lệ.', 422);
  const client = await prisma.client.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!client) return fail('NOT_FOUND', 'Không tìm thấy khách hàng.', 404);
  const accounts = parsed.data.accountIds.length ? await prisma.customerAccount.findMany({ where: { id: { in: parsed.data.accountIds } }, select: { id: true } }) : [];
  if (accounts.length !== parsed.data.accountIds.length) return fail('ACCOUNT_NOT_FOUND', 'Một hoặc nhiều tài khoản Google Ads không tồn tại.', 404);

  await prisma.$transaction(async tx => {
    await tx.clientAccountAssignment.deleteMany({ where: { clientId: id } });
    if (parsed.data.accountIds.length) {
      await tx.clientAccountAssignment.deleteMany({ where: { customerAccountId: { in: parsed.data.accountIds } } });
      await tx.clientAccountAssignment.createMany({ data: parsed.data.accountIds.map(customerAccountId => ({ clientId: id, customerAccountId })) });
    }
  });
  await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: 'ASSIGN_CLIENT_ACCOUNTS', entityType: 'Client', entityId: id, metadata: { accountIds: parsed.data.accountIds }, ipAddress: requestIp(request) });
  return ok({ clientId: id, accountIds: parsed.data.accountIds });
}
