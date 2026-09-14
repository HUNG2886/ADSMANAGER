import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BarChart3,Link2,Network,Rows3,ShieldAlert } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { allowedMccIds } from '@/lib/data-access';
import { formatMoney,formatNumber } from '@/lib/google-ads-format';
import { dateLocale,tr } from '@/lib/i18n';
import { getAppLocale } from '@/lib/i18n-server';
import { prisma } from '@/lib/prisma';
import { googleAdsConfigStatus } from '@/services/google-ads';
import { GoogleAdsFrame } from '../google-ads/google-ads-frame';

export const dynamic='force-dynamic';
export default async function DashboardPage(){
  const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/dashboard');
  const locale=await getAppLocale();const numberLocale=dateLocale(locale);
  const allowed=await allowedMccIds(user);const mccWhere=allowed===null?{}:{id:{in:allowed}};
  const[mccRows,accountCount,totals]=await Promise.all([
    prisma.mCC.findMany({where:mccWhere,select:{id:true,manager:true,connectionId:true}}),
    prisma.customerAccount.count({where:{mcc:mccWhere}}),
    prisma.dailyMetric.aggregate({where:{customerAccount:{mcc:mccWhere}},_sum:{cost:true,clicks:true,impressions:true,conversions:true}}),
  ]);
  const config=googleAdsConfigStatus();const connectionCount=new Set(mccRows.map(item=>item.connectionId)).size;const mccCount=mccRows.filter(item=>item.manager).length;
  const hasConnection=connectionCount>0;
  return <GoogleAdsFrame user={user}><div className="ga-page-head"><div><p>DAVID AGENCY MCC MANAGER</p><h1>{tr(locale,'Tổng quan','Dashboard')}</h1><span>{tr(locale,'Dữ liệu hợp nhất từ các tài khoản Google đã kết nối.','Unified data from connected Google accounts.')}</span></div>{user.role==='ADMIN'&&config.configured&&<a className="ga-primary" href="/api/auth/google-ads">{tr(locale,'Đăng nhập Google Ads','Sign in to Google Ads')}</a>}</div>
    {!config.configured&&<section className="ga-alert warning"><ShieldAlert size={20}/><div><strong>{tr(locale,'Google Ads chưa được cấu hình','Google Ads is not configured')}</strong><p>{tr(locale,'Thiếu','Missing')}: {config.missing.join(', ')}. {tr(locale,'Hãy thêm các biến backend trong Vercel rồi triển khai lại.','Add the backend variables in Vercel, then redeploy.')}</p></div></section>}
    {!hasConnection&&<section className="ga-empty"><Link2 size={28}/><h2>{tr(locale,'Chưa kết nối Google Ads','Google Ads is not connected')}</h2><p>{tr(locale,'Tài khoản website và tài khoản Google Ads là hai lớp đăng nhập riêng biệt.','Website and Google Ads accounts use separate authentication layers.')}</p>{user.role==='ADMIN'&&config.configured?<a className="ga-primary" href="/api/auth/google-ads">{tr(locale,'Đăng nhập Google Ads','Sign in to Google Ads')}</a>:<span>{tr(locale,'Liên hệ ADMIN để được cấp MCC.','Contact an ADMIN for MCC access.')}</span>}</section>}
    {hasConnection&&<><div className="ga-kpis"><article><Link2 size={18}/><span>{tr(locale,'Tài khoản Google','Google accounts')}</span><strong>{connectionCount}</strong></article><article><Network size={18}/><span>MCC</span><strong>{mccCount}</strong></article><article><Rows3 size={18}/><span>{tr(locale,'Tài khoản quảng cáo','Ads accounts')}</span><strong>{accountCount}</strong></article><article><BarChart3 size={18}/><span>{tr(locale,'Chi tiêu (bộ nhớ đệm 30 ngày)','Spend (30-day cache)')}</span><strong>{formatMoney(Number(totals._sum.cost||0),'VND',numberLocale)}</strong></article></div><section className="ga-panel"><div className="ga-panel-head"><div><h2>{tr(locale,'Hiệu suất đã đồng bộ','Synchronized performance')}</h2><p>{tr(locale,'Nguồn: Google Ads API, không sử dụng dữ liệu giả.','Source: Google Ads API; no mock data is used.')}</p></div><Link href="/google-ads/accounts">{tr(locale,'Xem tài khoản','View accounts')}</Link></div><div className="ga-summary-grid"><div><span>{tr(locale,'Lượt hiển thị','Impressions')}</span><strong>{formatNumber(totals._sum.impressions||BigInt(0),numberLocale)}</strong></div><div><span>{tr(locale,'Lượt nhấp','Clicks')}</span><strong>{formatNumber(totals._sum.clicks||BigInt(0),numberLocale)}</strong></div><div><span>{tr(locale,'Lượt chuyển đổi','Conversions')}</span><strong>{formatNumber(Number(totals._sum.conversions||0),numberLocale)}</strong></div></div></section></>}
  </GoogleAdsFrame>
}
