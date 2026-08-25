import { writeAudit } from '@/lib/audit';
import { allowedMccIds } from '@/lib/data-access';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';

function csvCell(value:unknown){return `"${String(value??'').replaceAll('"','""')}"`}

export async function GET(){
  const access=await requirePermission(PERMISSIONS.EXPORT_DATA);if(access.error)return access.error;
  const allowed=await allowedMccIds(access.user);
  const accounts=await prisma.customerAccount.findMany({where:{mcc:allowed===null?{}:{id:{in:allowed}}},include:{mcc:{select:{name:true,customerId:true}},metrics:{select:{cost:true,clicks:true,impressions:true,conversions:true}}},orderBy:{name:'asc'}});
  const rows=[['Account','Customer ID','MCC','MCC Customer ID','Status','Currency','Timezone','Spend','Clicks','Impressions','Conversions'],...accounts.map(item=>{
    const totals=item.metrics.reduce((sum,metric)=>({cost:sum.cost+Number(metric.cost),clicks:sum.clicks+metric.clicks,impressions:sum.impressions+metric.impressions,conversions:sum.conversions+Number(metric.conversions)}),{cost:0,clicks:BigInt(0),impressions:BigInt(0),conversions:0});
    return[item.name,item.customerId,item.mcc.name,item.mcc.customerId,item.status,item.currency,item.timezone,totals.cost,totals.clicks,totals.impressions,totals.conversions];
  })];
  const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\n');
  await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'EXPORT_DATA',entityType:'Account',entityId:'all',metadata:{rowCount:accounts.length}});
  return new Response(csv,{headers:{'content-type':'text/csv;charset=utf-8','content-disposition':'attachment; filename="ads-manager-accounts.csv"'}});
}
