import { mccs } from '@/lib/demo-data';
import { canAccessMcc } from '@/lib/data-access';
import { fail,ok } from '@/lib/api';
import { requireReadAccess } from '@/lib/rbac';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const access=await requireReadAccess();if(access.error)return access.error;const{id}=await params;if(!await canAccessMcc(access.user,id))return fail('FORBIDDEN','Bạn không có quyền xem MCC này.',403);const item=mccs.find(value=>value.id===id);return item?ok(item):fail('NOT_FOUND','Không tìm thấy MCC.',404)}
