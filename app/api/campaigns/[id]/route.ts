import { fail,ok } from '@/lib/api';
import { canAccessAccount } from '@/lib/data-access';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const access=await requirePermission(PERMISSIONS.VIEW_CAMPAIGN);if(access.error)return access.error;
  const{id}=await params;
  const item=await prisma.campaign.findUnique({where:{id},include:{customerAccount:{include:{mcc:{select:{id:true,name:true,customerId:true}}}}}});
  if(!item)return fail('NOT_FOUND','Không tìm thấy chiến dịch.',404);
  if(!await canAccessAccount(access.user,item.customerAccountId))return fail('FORBIDDEN','Bạn không có quyền xem chiến dịch này.',403);
  return ok({...item,budget:Number(item.budget)});
}
