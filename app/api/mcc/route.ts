import { mccs } from '../../../lib/demo-data'; import { apiUser, fail, ok } from '../../../lib/api';
export async function GET(){const user=await apiUser();return user?ok(mccs):fail('UNAUTHORIZED','Vui lòng đăng nhập.',401)}
