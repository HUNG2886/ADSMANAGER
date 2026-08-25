import { z } from 'zod';
import { fail, ok } from '../../../lib/api';
import { rateLimit } from '../../../lib/rate-limit';
import { prisma } from '../../../lib/prisma';
import { PERMISSIONS } from '../../../lib/permissions';
import { requirePermission } from '../../../lib/rbac';

const schema=z.object({type:z.enum(['SYNC_MCC','SYNC_CUSTOMER_ACCOUNT','SYNC_CAMPAIGNS','SYNC_AD_GROUPS','SYNC_KEYWORDS','SYNC_METRICS']),targetIds:z.array(z.string()).min(1).max(100)});

export async function POST(request:Request){
  const access=await requirePermission(PERMISSIONS.SYNC_DATA);if(access.error)return access.error;const user=access.user;
  if(!rateLimit(user.id,10,60_000))return fail('RATE_LIMITED','Bạn thao tác quá nhanh. Vui lòng thử lại sau.',429);
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return fail('INVALID_ARGUMENT','Yêu cầu đồng bộ không hợp lệ.',422);
  const isMcc=parsed.data.type==='SYNC_MCC';
  const existing=isMcc
    ?await prisma.mCC.findMany({where:{id:{in:parsed.data.targetIds}},select:{id:true}})
    :await prisma.customerAccount.findMany({where:{id:{in:parsed.data.targetIds}},select:{id:true}});
  if(existing.length!==new Set(parsed.data.targetIds).size)return fail('TARGET_NOT_FOUND','Một hoặc nhiều đối tượng đồng bộ không tồn tại.',404);
  const ids=existing.map(()=>crypto.randomUUID());
  await prisma.syncJob.createMany({data:existing.map((target,index)=>({id:ids[index],type:parsed.data.type,status:'PENDING',mccId:isMcc?target.id:null,customerAccountId:isMcc?null:target.id,progress:0}))});
  return ok({jobIds:ids,status:'PENDING'},202);
}
