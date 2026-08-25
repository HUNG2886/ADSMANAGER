import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { canAccessAccount } from '@/lib/data-access';
import { noteSchema } from '@/lib/crm';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const access = await requirePermission(PERMISSIONS.MANAGE_ACCOUNT_NOTES);
  if (access.error) return access.error;
  const { id, noteId } = await params;
  if (!await canAccessAccount(access.user, id)) return fail('FORBIDDEN', 'Bạn không có quyền sửa ghi chú account này.', 403);
  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Ghi chú phải từ 1 đến 2.000 ký tự.', 422);
  const existing = await prisma.accountNote.findFirst({ where: { id: noteId, customerAccountId: id }, select: { id: true } });
  if (!existing) return fail('NOT_FOUND', 'Không tìm thấy ghi chú.', 404);
  const note = await prisma.accountNote.update({ where: { id: noteId }, data: { content: parsed.data.content }, include: { author: { select: { id: true, name: true, email: true } } } });
  await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: 'UPDATE_ACCOUNT_NOTE', entityType: 'CustomerAccount', entityId: id, metadata: { noteId }, ipAddress: requestIp(request) });
  return ok(note);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const access = await requirePermission(PERMISSIONS.MANAGE_ACCOUNT_NOTES);
  if (access.error) return access.error;
  const { id, noteId } = await params;
  if (!await canAccessAccount(access.user, id)) return fail('FORBIDDEN', 'Bạn không có quyền xoá ghi chú account này.', 403);
  const existing = await prisma.accountNote.findFirst({ where: { id: noteId, customerAccountId: id }, select: { id: true } });
  if (!existing) return fail('NOT_FOUND', 'Không tìm thấy ghi chú.', 404);
  await prisma.accountNote.delete({ where: { id: noteId } });
  await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: 'DELETE_ACCOUNT_NOTE', entityType: 'CustomerAccount', entityId: id, metadata: { noteId }, ipAddress: requestIp(request) });
  return ok({ id: noteId });
}
