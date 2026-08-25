import { z } from 'zod';
import { fail,ok,requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';
import { BudgetService,CampaignService,googleAdsErrorDetails,GoogleAdsError,googleAdsClientForConnection,logGoogleAds } from '@/services/google-ads';

const schema=z.union([
  z.object({id:z.string().min(1),action:z.literal('STATUS').optional(),status:z.enum(['ENABLED','PAUSED'])}),
  z.object({id:z.string().min(1),action:z.literal('BUDGET'),amount:z.number().positive().max(1_000_000_000_000)}),
]);

export async function PATCH(request:Request){
  const access=await requirePermission(PERMISSIONS.UPDATE_CAMPAIGN);if(access.error)return access.error;
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return fail('INVALID_ARGUMENT','Dữ liệu chiến dịch không hợp lệ.',422);
  const campaign=await prisma.campaign.findUnique({where:{id:parsed.data.id},include:{customerAccount:{include:{mcc:true}}}});if(!campaign)return fail('NOT_FOUND','Không tìm thấy chiến dịch.',404);
  try{
    const login=campaign.customerAccount.mcc.manager?campaign.customerAccount.loginCustomerId:undefined;
    logGoogleAds('campaign_mutation_requested',{mccCustomerId:campaign.customerAccount.mcc.customerId,clientCustomerId:campaign.customerAccount.customerId,loginCustomerId:login});
    const{client}=await googleAdsClientForConnection(campaign.customerAccount.mcc.connectionId,login);
    if(parsed.data.action==='BUDGET'){
      if(!campaign.budgetId)return fail('BUDGET_NOT_FOUND','Chiến dịch chưa có ngân sách có thể cập nhật.',409);
      await new BudgetService(client).update(campaign.customerAccount.customerId,campaign.budgetId,Math.round(parsed.data.amount*1_000_000));
      await prisma.campaign.update({where:{id:campaign.id},data:{budget:parsed.data.amount}});
      await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'CAMPAIGN_BUDGET_UPDATED',entityType:'Campaign',entityId:campaign.id,metadata:{amount:parsed.data.amount},ipAddress:requestIp(request)});
      return ok({id:campaign.id,budget:parsed.data.amount});
    }
    await new CampaignService(client).updateStatus(campaign.customerAccount.customerId,campaign.campaignId,parsed.data.status);
    await prisma.campaign.update({where:{id:campaign.id},data:{status:parsed.data.status}});
    await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:parsed.data.status==='PAUSED'?'CAMPAIGN_PAUSED':'CAMPAIGN_ENABLED',entityType:'Campaign',entityId:campaign.id,metadata:{status:parsed.data.status},ipAddress:requestIp(request)});
    return ok({id:campaign.id,status:parsed.data.status});
  }catch(error){if(error instanceof GoogleAdsError){const details=googleAdsErrorDetails(error);return fail(details.code,details.message,error.status>=500?503:error.status,{type:details.type,requestId:details.requestId,rootStatus:details.rootStatus})}return fail('GOOGLE_ADS_API_ERROR','Không thể cập nhật Google Ads lúc này.',502)}
}
