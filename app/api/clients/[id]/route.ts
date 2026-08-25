import { z } from 'zod';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { clientInclude, clientSchema } from '@/lib/crm';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

const updateSchema = clientSchema.partial().extend({ status: z.enum(['ACTIVE', 'ARCHIVED']).optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission(PERMISSIONS.MANAGE_CLIENTS);
  if (access.error) return access.error;
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Thông tin khách hàng chưa hợp lệ.', 422);
  const existing = await prisma.client.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!existing) return fail('NOT_FOUND', 'Không tìm thấy khách hàng.', 404);
  const client = await prisma.client.update({ where: { id }, data: parsed.data, include: clientInclude });
  await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: parsed.data.status === 'ARCHIVED' ? 'ARCHIVE_CLIENT' : 'UPDATE_CLIENT', entityType: 'Client', entityId: id, metadata: { name: client.name }, ipAddress: requestIp(request) });
  return ok(client);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission(PERMISSIONS.MANAGE_CLIENTS);
  if (access.error) return access.error;
  const { id } = await params;
  const existing = await prisma.client.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!existing) return fail('NOT_FOUND', 'Không tìm thấy khách hàng.', 404);
  const client = await prisma.client.update({ where: { id }, data: { status: 'ARCHIVED' }, include: clientInclude });
  await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: 'ARCHIVE_CLIENT', entityType: 'Client', entityId: id, metadata: { name: client.name }, ipAddress: requestIp(request) });
  return ok(client);
}
