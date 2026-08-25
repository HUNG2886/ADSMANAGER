import { jobs } from '../../../lib/demo-data'; import { ok } from '../../../lib/api';
import { PERMISSIONS } from '../../../lib/permissions'; import { requirePermission } from '../../../lib/rbac';
export async function GET(){const access=await requirePermission(PERMISSIONS.VIEW_SYNC_JOBS);return access.error?access.error:ok(jobs)}
