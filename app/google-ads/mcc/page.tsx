import { Network } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { allowedMccIds } from '@/lib/data-access';
import { formatCustomerId } from '@/lib/google-ads-format';
import { prisma } from '@/lib/prisma';

export default async function MccPage(){
  const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/google-ads/mcc');const allowed=await allowedMccIds(user);
  const mccs=await prisma.mCC.findMany({where:allowed===null?{}:{id:{in:allowed}},include:{connection:{select:{googleEmail:true,status:true}},_count:{select:{accounts:true}}},orderBy:[{connectionId:'asc'},{level:'asc'},{name:'asc'}]});
  const groups=Map.groupBy(mccs,item=>item.connection.googleEmail);
  return <><div className="ga-page-head"><div><p>GOOGLE ADS</p><h1>MCC hierarchy</h1><span>Cấu trúc manager và client được lấy từ resource customer_client.</span></div></div>{mccs.length===0?<section className="ga-empty"><Network size={28}/><h2>Chưa có MCC được cấp</h2><p>Kết nối Google Ads hoặc nhờ ADMIN gán MCC cho tài khoản STAFF.</p></section>:<div className="ga-hierarchy">{[...groups].map(([email,items])=><section className="ga-panel" key={email}><div className="ga-panel-head"><div><h2>{email}</h2><p>{items.filter(item=>item.manager).length} manager accounts</p></div><span className="ga-status connected">● Connected</span></div><div className="ga-tree">{items.map(item=><a href={`/google-ads/accounts?mcc=${item.id}`} key={item.id} style={{'--tree-level':Math.min(item.level,6)} as React.CSSProperties}><span><Network size={16}/></span><div><strong>{item.name}</strong><small>{formatCustomerId(item.customerId)} · {item.manager?'Manager account':'Direct account'} · level {item.level}</small></div><em>{item._count.accounts} accounts</em></a>)}</div></section>)}</div>}
  </>
}
