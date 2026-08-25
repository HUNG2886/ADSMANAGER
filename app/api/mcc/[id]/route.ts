import { mccs } from '../../../../lib/demo-data'; import { apiUser, fail, ok } from '../../../../lib/api';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){if(!await apiUser())return fail('UNAUTHORIZED','Vui lòng đăng nhập.',401);const {id}=await params;const item=mccs.find(x=>x.id===id);return item?ok(item):fail('NOT_FOUND','Không tìm thấy MCC.',404)}
