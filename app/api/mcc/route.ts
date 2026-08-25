import { mccs } from '@/lib/demo-data';
import { allowedMccIds } from '@/lib/data-access';
import { ok } from '@/lib/api';
import { requireReadAccess } from '@/lib/rbac';

export async function GET(){const access=await requireReadAccess();if(access.error)return access.error;const allowed=await allowedMccIds(access.user);return ok(allowed===null?mccs:mccs.filter(item=>allowed.includes(item.id)))}
