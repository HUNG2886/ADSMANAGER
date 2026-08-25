import { metrics } from '../../../lib/demo-data'; import { ok } from '../../../lib/api';
import { PERMISSIONS } from '../../../lib/permissions'; import { requirePermission } from '../../../lib/rbac';
export async function GET(){const access=await requirePermission(PERMISSIONS.VIEW_ANALYTICS);return access.error?access.error:ok(metrics)}
