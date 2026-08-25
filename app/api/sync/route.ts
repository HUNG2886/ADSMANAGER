import { z } from 'zod';
import { fail, ok } from '../../../lib/api';
import { rateLimit } from '../../../lib/rate-limit';
import { hasPostgres, prisma } from '../../../lib/prisma';
import { PERMISSIONS } from '../../../lib/permissions';
import { requirePermission } from '../../../lib/rbac';

const schema=z.object({type:z.enum(['SYNC_MCC','SYNC_CUSTOMER_ACCOUNT','SYNC_CAMPAIGNS','SYNC_AD_GROUPS','SYNC_KEYWORDS','SYNC_METRICS']),targetIds:z.array(z.string()).min(1).max(100)});

export async function POST(request:Request){
  const access=await requirePermission(PERMISSIONS.SYNC_DATA);if(access.error)return access.error;const user=access.user;
  if(!rateLimit(user.id,10,60_000))return fail('RATE_LIMITED','Bạn thao tác quá nhanh. Vui lòng thử lại sau.',429);
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return fail('INVALID_ARGUMENT','Yêu cầu đồng bộ không hợp lệ.',422);
  const ids=parsed.data.targetIds.map(()=>crypto.randomUUID());
  if(user.demo||!hasPostgres())return ok({jobIds:ids,status:'PENDING',demo:true},202);
  await prisma.syncJob.createMany({data:ids.map((id,index)=>({id,type:parsed.data.type,status:'PENDING',customerAccountId:parsed.data.targetIds[index],progress:0}))});
  return ok({jobIds:ids,status:'PENDING'},202);
}
