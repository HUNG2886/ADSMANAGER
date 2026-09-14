import { Network } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { allowedMccIds } from '@/lib/data-access';
import { formatCustomerId } from '@/lib/google-ads-format';
import { prisma } from '@/lib/prisma';
import { tr } from '@/lib/i18n';
import { getAppLocale } from '@/lib/i18n-server';

export default async function MccPage(){
  const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/google-ads/mcc');const locale=await getAppLocale();const allowed=await allowedMccIds(user);
  const mccs=await prisma.mCC.findMany({where:allowed===null?{}:{id:{in:allowed}},include:{connection:{select:{googleEmail:true,status:true}},_count:{select:{accounts:true}}},orderBy:[{connectionId:'asc'},{level:'asc'},{name:'asc'}]});
  const groups=Map.groupBy(mccs,item=>item.connection.googleEmail);
  return <><div className="ga-page-head"><div><p>GOOGLE ADS</p><h1>{tr(locale,'Phân cấp MCC','MCC hierarchy')}</h1><span>{tr(locale,'Cấu trúc tài khoản quản lý và tài khoản khách hàng được lấy từ tài nguyên customer_client.','Manager and client account structure is loaded from the customer_client resource.')}</span></div></div>{mccs.length===0?<section className="ga-empty"><Network size={28}/><h2>{tr(locale,'Chưa có MCC được cấp','No MCC access assigned')}</h2><p>{tr(locale,'Kết nối Google Ads hoặc nhờ ADMIN gán MCC cho tài khoản STAFF.','Connect Google Ads or ask an ADMIN to assign MCC access to the STAFF account.')}</p></section>:<div className="ga-hierarchy">{[...groups].map(([email,items])=><section className="ga-panel" key={email}><div className="ga-panel-head"><div><h2>{email}</h2><p>{items.filter(item=>item.manager).length} {tr(locale,'tài khoản quản lý','manager accounts')}</p></div><span className="ga-status connected">{tr(locale,'● Đã kết nối','● Connected')}</span></div><div className="ga-tree">{items.map(item=><a href={`/google-ads/accounts?mcc=${item.id}`} key={item.id} style={{'--tree-level':Math.min(item.level,6)} as React.CSSProperties}><span><Network size={16}/></span><div><strong>{item.name}</strong><small>{formatCustomerId(item.customerId)} · {item.manager?tr(locale,'Tài khoản quản lý','Manager account'):tr(locale,'Tài khoản trực tiếp','Direct account')} · {tr(locale,'cấp','level')} {item.level}</small></div><em>{item._count.accounts} {tr(locale,'tài khoản','accounts')}</em></a>)}</div></section>)}</div>}
  </>
}
