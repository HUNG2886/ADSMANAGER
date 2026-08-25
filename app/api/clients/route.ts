import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { clientInclude, clientSchema } from '@/lib/crm';
import { allowedMccIds } from '@/lib/data-access';
import { PERMISSIONS } from '@/lib/permissions';
import { hasPostgres, prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET(request: Request) {
  const access = await requirePermission(PERMISSIONS.VIEW_CLIENTS);
  if (access.error) return access.error;
  if (!hasPostgres()) return fail('DATABASE_REQUIRED', 'CRM khách hàng cần PostgreSQL.', 503);
  const allowed = await allowedMccIds(access.user);
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();
  const status = url.searchParams.get('status');
  const items = await prisma.client.findMany({
    where: {
      AND: [
        allowed === null ? {} : { accountAssignments: { some: { customerAccount: { mccId: { in: allowed } } } } },
        status && status !== 'ALL' ? { status: status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE' } : {},
        query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { company: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }] } : {},
      ],
    },
    include: { accountAssignments: { where: allowed === null ? {} : { customerAccount: { mccId: { in: allowed } } }, orderBy: { createdAt: 'asc' }, select: { customerAccount: { select: { id: true, name: true, customerId: true, status: true, mcc: { select: { id: true, name: true } } } } } } },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
  return ok(items);
}

export async function POST(request: Request) {
  const access = await requirePermission(PERMISSIONS.MANAGE_CLIENTS);
  if (access.error) return access.error;
  if (!hasPostgres()) return fail('DATABASE_REQUIRED', 'CRM khách hàng cần PostgreSQL.', 503);
  const parsed = clientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Thông tin khách hàng chưa hợp lệ.', 422);
  const client = await prisma.client.create({ data: parsed.data, include: clientInclude });
  await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: 'CREATE_CLIENT', entityType: 'Client', entityId: client.id, metadata: { name: client.name }, ipAddress: requestIp(request) });
  return ok(client, 201);
}
