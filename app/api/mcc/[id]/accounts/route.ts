import { accounts } from '../../../../../lib/demo-data'; import { apiUser, fail, ok } from '../../../../../lib/api';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){if(!await apiUser())return fail('UNAUTHORIZED','Vui lòng đăng nhập.',401);const {id}=await params;return ok(accounts.filter(x=>x.mccId===id))}
