import { accounts } from '@/lib/demo-data';
import { canAccessMcc } from '@/lib/data-access';
import { fail,ok } from '@/lib/api';
import { requireReadAccess } from '@/lib/rbac';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const access=await requireReadAccess();if(access.error)return access.error;const{id}=await params;const item=accounts.find(value=>value.id===id);if(!item)return fail('NOT_FOUND','Không tìm thấy tài khoản.',404);if(!await canAccessMcc(access.user,item.mccId))return fail('FORBIDDEN','Bạn không có quyền xem tài khoản này.',403);return ok(item)}
