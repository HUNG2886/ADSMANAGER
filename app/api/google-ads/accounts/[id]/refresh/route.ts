import { canAccessAccount } from '@/lib/data-access';
import { fail,ok } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';
import { GoogleAdsError,syncGoogleAdsAccount } from '@/services/google-ads';

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const access=await requirePermission(PERMISSIONS.SYNC_DATA);if(access.error)return access.error;const{id}=await params;
  if(!await canAccessAccount(access.user,id))return fail('FORBIDDEN','Bạn không có quyền truy cập tài khoản này.',403);
  try{return ok(await syncGoogleAdsAccount(id))}catch(error){return error instanceof GoogleAdsError?fail(error.code,error.message,error.status>=500?503:error.status):fail('ACCOUNT_SYNC_FAILED','Không thể đồng bộ tài khoản Google Ads.',502)}
}
