import { auditLogs } from '../../../lib/demo-data';
import { ok } from '../../../lib/api';
import { hasPostgres, prisma } from '../../../lib/prisma';
import { PERMISSIONS } from '../../../lib/permissions';
import { requirePermission } from '../../../lib/rbac';

export async function GET() {
  const access=await requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS);if(access.error)return access.error;const user=access.user;
  if (user.demo || !hasPostgres()) return ok(user.role==='ADMIN'?auditLogs:[]);
  return ok(await prisma.auditLog.findMany({ where: user.role==='ADMIN'?{}:{userId:user.id}, orderBy: { createdAt: 'desc' }, take: 100 }));
}
