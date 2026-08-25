import { fail,ok,requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';
import { googleAdsErrorDetails,GoogleAdsError,syncGoogleConnection } from '@/services/google-ads';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const access=await requirePermission(PERMISSIONS.SYNC_DATA);if(access.error)return access.error;const{id}=await params;
  const connection=await prisma.googleConnection.findFirst({where:{id,userId:access.user.id},select:{id:true}});if(!connection)return fail('CONNECTION_NOT_FOUND','Không tìm thấy kết nối Google Ads.',404);
  try{const result=await syncGoogleConnection(id);await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'GOOGLE_CONNECTION_REFRESHED',entityType:'GoogleConnection',entityId:id,metadata:result,ipAddress:requestIp(request)});return ok(result)}catch(error){if(error instanceof GoogleAdsError){const details=googleAdsErrorDetails(error);return fail(details.code,details.message,error.status>=500?503:error.status,{type:details.type,requestId:details.requestId,rootStatus:details.rootStatus})}return fail('GOOGLE_SYNC_FAILED','Không thể đồng bộ Google Ads.',502)}
}
