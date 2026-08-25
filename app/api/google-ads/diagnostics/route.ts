import {ok} from '@/lib/api';
import {prisma} from '@/lib/prisma';
import {requireAdmin} from '@/lib/rbac';
import {diagnoseGoogleAdsConnection,googleAdsEnvironmentDiagnostics} from '@/services/google-ads';

export async function POST(request:Request){
  const access=await requireAdmin();if(access.error)return access.error;
  const connections=await prisma.googleConnection.findMany({where:{userId:access.user.id,status:{not:'DISCONNECTED'}},select:{id:true},orderBy:{createdAt:'asc'}});
  const results=[];for(const connection of connections)results.push(await diagnoseGoogleAdsConnection(connection.id,access.user.id));
  return ok({environment:googleAdsEnvironmentDiagnostics(request.url),connections:results,checkedAt:new Date().toISOString()});
}
