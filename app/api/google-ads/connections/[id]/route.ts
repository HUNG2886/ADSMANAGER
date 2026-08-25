import { fail,ok,requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';
import { disconnectGoogleConnection,GoogleAdsError } from '@/services/google-ads';

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const access=await requirePermission(PERMISSIONS.DISCONNECT_MCC);if(access.error)return access.error;const{id}=await params;
  try{await disconnectGoogleConnection(id,access.user.id);await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'GOOGLE_CONNECTION_DISCONNECTED',entityType:'GoogleConnection',entityId:id,ipAddress:requestIp(request)});return ok({id,status:'DISCONNECTED'})}catch(error){return error instanceof GoogleAdsError?fail(error.code,error.message,error.status):fail('DISCONNECT_FAILED','Không thể ngắt kết nối Google Ads.',502)}
}
