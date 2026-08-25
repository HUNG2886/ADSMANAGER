import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BarChart3,Link2,Network,Rows3,ShieldAlert } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { allowedMccIds } from '@/lib/data-access';
import { formatMoney,formatNumber } from '@/lib/google-ads-format';
import { prisma } from '@/lib/prisma';
import { googleAdsConfigStatus } from '@/services/google-ads';
import { GoogleAdsFrame } from '../google-ads/google-ads-frame';

export const dynamic='force-dynamic';
export default async function DashboardPage(){
  const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/dashboard');
  const allowed=await allowedMccIds(user);const mccWhere=allowed===null?{}:{id:{in:allowed}};
  const[mccRows,accountCount,totals]=await Promise.all([
    prisma.mCC.findMany({where:mccWhere,select:{id:true,manager:true,connectionId:true}}),
    prisma.customerAccount.count({where:{mcc:mccWhere}}),
    prisma.dailyMetric.aggregate({where:{customerAccount:{mcc:mccWhere}},_sum:{cost:true,clicks:true,impressions:true,conversions:true}}),
  ]);
  const config=googleAdsConfigStatus();const connectionCount=new Set(mccRows.map(item=>item.connectionId)).size;const mccCount=mccRows.filter(item=>item.manager).length;
  const hasConnection=connectionCount>0;
  return <GoogleAdsFrame user={user}><div className="ga-page-head"><div><p>ADS MANAGER PRO</p><h1>Dashboard</h1><span>Dữ liệu hợp nhất từ các Google account đã kết nối.</span></div>{user.role==='ADMIN'&&config.configured&&<a className="ga-primary" href="/api/auth/google-ads">Đăng nhập Google Ads</a>}</div>
    {!config.configured&&<section className="ga-alert warning"><ShieldAlert size={20}/><div><strong>Google Ads chưa được cấu hình</strong><p>Thiếu: {config.missing.join(', ')}. Hãy thêm các biến backend trong Vercel rồi redeploy.</p></div></section>}
    {!hasConnection&&<section className="ga-empty"><Link2 size={28}/><h2>Chưa kết nối Google Ads</h2><p>Tài khoản website và tài khoản Google Ads là hai lớp đăng nhập riêng biệt.</p>{user.role==='ADMIN'&&config.configured?<a className="ga-primary" href="/api/auth/google-ads">Đăng nhập Google Ads</a>:<span>Liên hệ ADMIN để được cấp MCC.</span>}</section>}
    {hasConnection&&<><div className="ga-kpis"><article><Link2 size={18}/><span>Google Accounts</span><strong>{connectionCount}</strong></article><article><Network size={18}/><span>MCC</span><strong>{mccCount}</strong></article><article><Rows3 size={18}/><span>Ads Accounts</span><strong>{accountCount}</strong></article><article><BarChart3 size={18}/><span>Spend (30d cache)</span><strong>{formatMoney(Number(totals._sum.cost||0))}</strong></article></div><section className="ga-panel"><div className="ga-panel-head"><div><h2>Hiệu suất đã đồng bộ</h2><p>Nguồn: Google Ads API, không sử dụng dữ liệu giả.</p></div><Link href="/google-ads/accounts">Xem accounts</Link></div><div className="ga-summary-grid"><div><span>Impressions</span><strong>{formatNumber(totals._sum.impressions||BigInt(0))}</strong></div><div><span>Clicks</span><strong>{formatNumber(totals._sum.clicks||BigInt(0))}</strong></div><div><span>Conversions</span><strong>{formatNumber(Number(totals._sum.conversions||0))}</strong></div></div></section></>}
  </GoogleAdsFrame>
}
