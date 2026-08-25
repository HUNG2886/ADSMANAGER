import { ok } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';

export async function GET() {
  const access=await requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS);if(access.error)return access.error;
  return ok(await prisma.auditLog.findMany({where:access.user.role==='ADMIN'?{}:{userId:access.user.id},orderBy:{createdAt:'desc'},take:100}));
}
