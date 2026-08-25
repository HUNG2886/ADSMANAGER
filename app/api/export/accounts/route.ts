import { accounts } from '@/lib/demo-data';
import { writeAudit } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';

export async function GET(){
  const access=await requirePermission(PERMISSIONS.EXPORT_DATA);if(access.error)return access.error;
  const rows=[['Account','Customer ID','Status','Spend','Clicks','Conversions'],...accounts.map(item=>[item.name,item.customerId,item.status,String(item.spend),String(item.clicks),String(item.conversions)])];
  const csv='\ufeff'+rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
  await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'EXPORT_DATA',entityType:'Account',entityId:'all'});
  return new Response(csv,{headers:{'content-type':'text/csv;charset=utf-8','content-disposition':'attachment; filename="ads-manager-accounts.csv"'}});
}
