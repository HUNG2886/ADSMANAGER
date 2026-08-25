import { auditLogs } from '../../../lib/demo-data';
import { apiUser, fail, ok } from '../../../lib/api';
import { hasPostgres, prisma } from '../../../lib/prisma';

export async function GET() {
  const user = await apiUser();
  if (!user) return fail('UNAUTHORIZED', 'Vui lòng đăng nhập.', 401);
  if (user.role !== 'ADMIN') return fail('FORBIDDEN', 'Chỉ quản trị viên được xem nhật ký hệ thống.', 403);
  if (user.demo || !hasPostgres()) return ok(auditLogs);
  return ok(await prisma.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }));
}
