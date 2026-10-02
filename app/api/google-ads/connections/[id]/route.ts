import { fail,ok,requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { canAccessConnection } from '@/lib/data-access';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';
import { disconnectGoogleConnection,GoogleAdsError } from '@/services/google-ads';

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const access=await requirePermission(PERMISSIONS.DISCONNECT_MCC);if(access.error)return access.error;const{id}=await params;
  if(!await canAccessConnection(access.user,id))return fail('CONNECTION_NOT_FOUND','Không tìm thấy kết nối Google Ads.',404);
  const connection=await prisma.googleConnection.findUnique({where:{id},select:{userId:true}});if(!connection)return fail('CONNECTION_NOT_FOUND','Không tìm thấy kết nối Google Ads.',404);
  try{const deleted=await disconnectGoogleConnection(id,connection.userId);await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'GOOGLE_CONNECTION_DELETED',entityType:'GoogleConnection',entityId:id,metadata:{googleEmail:deleted.googleEmail},ipAddress:requestIp(request)});return ok({id,status:'DELETED'})}catch(error){return error instanceof GoogleAdsError?fail(error.code,error.message,error.status):fail('DISCONNECT_FAILED','Không thể ngắt kết nối và xóa dữ liệu Google Ads.',502)}
}
