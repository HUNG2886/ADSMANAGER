import { metrics } from '../../../lib/demo-data'; import { apiUser, fail, ok } from '../../../lib/api';
export async function GET(){return await apiUser()?ok(metrics):fail('UNAUTHORIZED','Vui lòng đăng nhập.',401)}
