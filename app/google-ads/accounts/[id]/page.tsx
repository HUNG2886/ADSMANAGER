import { AlertTriangle,BarChart3,Building2,MousePointerClick,RefreshCw,Target } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { canAccessAccount } from '@/lib/data-access';
import { formatCustomerId,formatMoney,formatNumber } from '@/lib/google-ads-format';
import { metricDate,metricPeriodBounds } from '@/lib/metric-periods';
import { hasPermission,PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatGoogleAdsError,GoogleAdsError,googleAdsConfigStatus,syncGoogleAdsAccount } from '@/services/google-ads';
import { AccountRefreshButton } from '../../account-refresh-button';
import { AccountNotes } from '../../account-notes';
import { CampaignActions } from '../../campaign-actions';
import { SpendPeriodCards } from '../../spend-period-cards';

export default async function AccountDetailPage({params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();const{id}=await params;if(!user)redirect(`/login?returnTo=/google-ads/accounts/${id}`);if(!await canAccessAccount(user,id))redirect('/403');
  let account=await prisma.customerAccount.findUnique({where:{id},include:{mcc:{include:{connection:{select:{googleEmail:true,status:true}}}},clientAssignment:{include:{client:true}},notes:{include:{author:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'desc'},take:200},_count:{select:{campaigns:true}}}});if(!account)redirect('/google-ads/accounts');
  let syncError='';const stale=!account.lastSyncAt;
  if(stale&&googleAdsConfigStatus().configured&&account.mcc.connection.status==='CONNECTED')try{await syncGoogleAdsAccount(account.id);account=await prisma.customerAccount.findUnique({where:{id},include:{mcc:{include:{connection:{select:{googleEmail:true,status:true}}}},clientAssignment:{include:{client:true}},notes:{include:{author:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'desc'},take:200},_count:{select:{campaigns:true}}}})||account}catch(error){syncError=error instanceof GoogleAdsError?formatGoogleAdsError(error):error instanceof Error?error.message:'Không thể đọc Google Ads.'}
  const periodDefinitions=metricPeriodBounds(account.timezone||'UTC');const earliest=periodDefinitions.reduce((value,period)=>period.start<value?period.start:value,periodDefinitions[0].start);
  const[campaigns,totals,campaignTotals,dailyTotals,periodTotals]=await Promise.all([
    prisma.campaign.findMany({where:{customerAccountId:id},orderBy:{name:'asc'}}),
    prisma.dailyMetric.aggregate({where:{customerAccountId:id},_sum:{cost:true,clicks:true,impressions:true,conversions:true},_avg:{averageCpc:true,ctr:true}}),
    prisma.dailyMetric.groupBy({by:['campaignId'],where:{customerAccountId:id,campaignId:{not:null}},_sum:{cost:true,clicks:true,impressions:true,conversions:true}}),
    prisma.dailyMetric.groupBy({by:['date'],where:{customerAccountId:id,date:{gte:metricDate(earliest),lte:metricDate(periodDefinitions[0].end)}},_sum:{cost:true,clicks:true,impressions:true,conversions:true},orderBy:{date:'desc'}}),
    Promise.all(periodDefinitions.map(period=>prisma.dailyMetric.aggregate({where:{customerAccountId:id,date:{gte:metricDate(period.start),lte:metricDate(period.end)}},_sum:{cost:true}}))),
  ]);
  const campaignMetricMap=new Map(campaignTotals.map(item=>[item.campaignId,item._sum]));
  const spend=Number(totals._sum.cost||0),clicks=Number(totals._sum.clicks||BigInt(0)),impressions=Number(totals._sum.impressions||BigInt(0)),conversions=Number(totals._sum.conversions||0);const ctr=impressions?clicks/impressions:0;const cpc=clicks?spend/clicks:0;const cpa=conversions?spend/conversions:0;
  const spendPeriods=periodDefinitions.map((period,index)=>({...period,total:Number(periodTotals[index]._sum.cost||0)}));const spendDays=dailyTotals.map(day=>({date:day.date.toISOString().slice(0,10),cost:Number(day._sum.cost||0),clicks:Number(day._sum.clicks||BigInt(0)),impressions:Number(day._sum.impressions||BigInt(0)),conversions:Number(day._sum.conversions||0)}));const noteRows=account.notes.map(note=>({...note,createdAt:note.createdAt.toISOString(),updatedAt:note.updatedAt.toISOString()}));
  return <><div className="ga-page-head"><div><p>ACCOUNT OVERVIEW</p><h1>{account.name}</h1><span>{formatCustomerId(account.customerId)} · {account.mcc.name} · {account.mcc.connection.googleEmail}</span></div>{user.role==='ADMIN'&&<AccountRefreshButton id={account.id}/>}</div>{syncError&&<div className="ga-alert danger"><AlertTriangle size={18}/><div><strong>Google Ads không thể làm mới dữ liệu</strong><p>{syncError}</p></div></div>}
    <SpendPeriodCards periods={spendPeriods} days={spendDays} currency={account.currency||'VND'} timezone={account.timezone||'UTC'}/>
    <div className="ga-kpis ga-kpis-4"><article><BarChart3 size={18}/><span>Spend</span><strong>{formatMoney(spend,account.currency||'VND')}</strong></article><article><MousePointerClick size={18}/><span>Clicks</span><strong>{formatNumber(clicks)}</strong></article><article><Target size={18}/><span>Conversions</span><strong>{formatNumber(conversions)}</strong></article><article><RefreshCw size={18}/><span>CPA</span><strong>{formatMoney(cpa,account.currency||'VND')}</strong></article></div>
    <section className="ga-panel"><div className="ga-summary-grid ga-summary-4"><div><span>Impressions</span><strong>{formatNumber(impressions)}</strong></div><div><span>CTR</span><strong>{(ctr*100).toFixed(2)}%</strong></div><div><span>CPC</span><strong>{formatMoney(cpc,account.currency||'VND')}</strong></div><div><span>Timezone</span><strong>{account.timezone||'—'}</strong></div></div></section>
    <section className="ga-panel account-client"><span><Building2 size={18}/></span><div><small>CRM customer</small><strong>{account.clientAssignment?.client.name||'Chưa gán khách hàng'}</strong><p>{account.clientAssignment?.client.company||'Quản lý gán account trong Clients CRM.'}</p></div><a href="/google-ads/clients">Mở CRM</a></section>
    <AccountNotes accountId={account.id} initialNotes={noteRows} canManage={hasPermission(user.role,PERMISSIONS.MANAGE_ACCOUNT_NOTES)}/>
    <section className="ga-panel ga-table-panel"><div className="ga-panel-head"><div><h2>Campaigns</h2><p>{campaigns.length} chiến dịch từ Google Ads API</p></div></div><div className="ga-table-wrap"><table className="ga-table"><thead><tr><th>Campaign</th><th>Status</th><th>Budget</th><th>Spend</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Conversions</th><th>Actions</th></tr></thead><tbody>{campaigns.length?campaigns.map(campaign=>{const metric=campaignMetricMap.get(campaign.id);const campaignClicks=Number(metric?.clicks||BigInt(0));const campaignImpressions=Number(metric?.impressions||BigInt(0));return <tr key={campaign.id}><td><strong>{campaign.name}</strong><small>{campaign.type} · ID {campaign.campaignId}</small></td><td><span className={`ga-status ${campaign.status==='ENABLED'?'connected':'reauth_required'}`}>{campaign.status}</span></td><td>{formatMoney(Number(campaign.budget),account.currency||'VND')}</td><td>{formatMoney(Number(metric?.cost||0),account.currency||'VND')}</td><td>{formatNumber(campaignClicks)}</td><td>{formatNumber(campaignImpressions)}</td><td>{campaignImpressions?`${(campaignClicks/campaignImpressions*100).toFixed(2)}%`:'0%'}</td><td>{formatNumber(Number(metric?.conversions||0))}</td><td>{user.role==='ADMIN'?<CampaignActions id={campaign.id} status={campaign.status} budget={Number(campaign.budget)}/>:<span className="ga-readonly">Read only</span>}</td></tr>}):<tr><td colSpan={9}>Chưa có campaign hoặc Google account không có quyền đọc.</td></tr>}</tbody></table></div></section>
  </>
}
