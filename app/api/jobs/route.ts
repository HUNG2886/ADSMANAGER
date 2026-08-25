import { ok } from '@/lib/api';
import { allowedMccIds } from '@/lib/data-access';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';

export async function GET(){
  const access=await requirePermission(PERMISSIONS.VIEW_SYNC_JOBS);if(access.error)return access.error;
  const allowed=await allowedMccIds(access.user);
  return ok(await prisma.syncJob.findMany({where:allowed===null?{}:{OR:[{mccId:{in:allowed}},{customerAccount:{mccId:{in:allowed}}}]},orderBy:{createdAt:'desc'},take:100}));
}
