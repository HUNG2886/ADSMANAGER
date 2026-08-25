import { allowedMccIds } from '@/lib/data-access';
import { ok } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireReadAccess } from '@/lib/rbac';

export async function GET(){const access=await requireReadAccess();if(access.error)return access.error;const allowed=await allowedMccIds(access.user);const items=await prisma.mCC.findMany({where:allowed===null?{}:{id:{in:allowed}},include:{connection:{select:{id:true,googleEmail:true,status:true}},_count:{select:{accounts:true}}},orderBy:[{level:'asc'},{name:'asc'}]});return ok(items)}
