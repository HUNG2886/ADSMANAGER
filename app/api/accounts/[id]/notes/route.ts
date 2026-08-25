import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { noteSchema } from '@/lib/crm';
import { canAccessAccount } from '@/lib/data-access';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission(PERMISSIONS.VIEW_ACCOUNT_NOTES);
  if (access.error) return access.error;
  const { id } = await params;
  if (!await canAccessAccount(access.user, id)) return fail('FORBIDDEN', 'Bạn không có quyền xem ghi chú của account này.', 403);
  const notes = await prisma.accountNote.findMany({ where: { customerAccountId: id }, include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  return ok(notes);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission(PERMISSIONS.MANAGE_ACCOUNT_NOTES);
  if (access.error) return access.error;
  const { id } = await params;
  if (!await canAccessAccount(access.user, id)) return fail('FORBIDDEN', 'Bạn không có quyền ghi chú account này.', 403);
  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Ghi chú phải từ 1 đến 2.000 ký tự.', 422);
  const account = await prisma.customerAccount.findUnique({ where: { id }, select: { id: true } });
  if (!account) return fail('NOT_FOUND', 'Không tìm thấy Google Ads account.', 404);
  const note = await prisma.accountNote.create({ data: { customerAccountId: id, authorId: access.user.id, content: parsed.data.content }, include: { author: { select: { id: true, name: true, email: true } } } });
  await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: 'CREATE_ACCOUNT_NOTE', entityType: 'CustomerAccount', entityId: id, metadata: { noteId: note.id }, ipAddress: requestIp(request) });
  return ok(note, 201);
}
