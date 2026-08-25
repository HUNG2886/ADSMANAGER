import { AlertTriangle,CheckCircle2,Link2,Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { googleAdsConfigStatus } from '@/services/google-ads';
import { ConnectionActions } from './connection-actions';

const errorMessages:Record<string,string>={OAUTH_CANCELLED:'Bạn đã hủy đăng nhập Google.',OAUTH_FAILED:'Google OAuth không thể hoàn tất.',OAUTH_STATE_INVALID:'Phiên OAuth không hợp lệ hoặc đã hết hạn.',OAUTH_EXCHANGE_FAILED:'Không thể đổi mã OAuth.',REFRESH_TOKEN_MISSING:'Google không trả refresh token. Hãy thu hồi quyền ứng dụng và thử lại.',PERMISSION_DENIED:'Google account không có quyền Google Ads cần thiết.',GOOGLE_CONNECTION_FAILED:'Không thể đồng bộ Google Ads.'};

export default async function ConnectionsPage({searchParams}:{searchParams:Promise<{connected?:string;error?:string;mcc?:string;accounts?:string}>}){
  const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/google-ads');const query=await searchParams;
  const config=googleAdsConfigStatus();
  const connections=await prisma.googleConnection.findMany({where:user.role==='ADMIN'?{userId:user.id}:{mccs:{some:{userPermissions:{some:{userId:user.id}}}}},include:{mccs:{where:user.role==='ADMIN'?{}:{userPermissions:{some:{userId:user.id}}},select:{manager:true,_count:{select:{accounts:true}}}}},orderBy:{createdAt:'desc'}});
  return <><div className="ga-page-head"><div><p>GOOGLE ADS</p><h1>Connections</h1><span>Kết nối Gmail thực tế bằng OAuth; không nhập mật khẩu Google vào website.</span></div>{user.role==='ADMIN'&&config.configured&&<a className="ga-primary" href="/api/auth/google-ads"><Plus size={15}/>Đăng nhập Google Ads</a>}</div>
    {query.connected==='1'&&<div className="ga-alert success"><CheckCircle2 size={19}/><div><strong>Kết nối thành công</strong><p>Đã đồng bộ {query.mcc||0} MCC và {query.accounts||0} tài khoản quảng cáo.</p></div></div>}
    {query.error&&<div className="ga-alert danger"><AlertTriangle size={19}/><div><strong>Kết nối chưa hoàn tất</strong><p>{errorMessages[query.error]||`Lỗi: ${query.error}`}</p></div></div>}
    {!config.configured&&<section className="ga-config"><AlertTriangle size={22}/><div><h2>Cần cấu hình Google OAuth</h2><p>Thêm các biến backend sau trong Vercel, không dùng tiền tố NEXT_PUBLIC:</p><code>{config.missing.join('\n')}</code><small>Redirect URI: {(process.env.NEXTAUTH_URL||'https://your-domain.com')}/api/auth/google-ads/callback</small></div></section>}
    {connections.length===0?<section className="ga-empty"><Link2 size={28}/><h2>Kết nối tài khoản Google Ads</h2><p>Đăng nhập bằng Gmail có quyền truy cập MCC hoặc Google Ads account.</p>{user.role==='ADMIN'&&config.configured&&<a className="ga-primary" href="/api/auth/google-ads">Đăng nhập Google Ads</a>}</section>:<div className="ga-connection-list">{connections.map(connection=>{const mccCount=connection.mccs.filter(item=>item.manager).length;const accountCount=connection.mccs.reduce((sum,item)=>sum+item._count.accounts,0);return <article className="ga-connection" key={connection.id}><div className="ga-connection-icon"><Link2 size={19}/></div><div className="ga-connection-info"><div><h2>{connection.googleEmail}</h2><span className={`ga-status ${connection.status.toLowerCase()}`}>{connection.status==='CONNECTED'?'● Connected':connection.status==='REAUTH_REQUIRED'?'Cần đăng nhập lại':'Đã ngắt kết nối'}</span></div><p>{mccCount} MCC · {accountCount} accounts</p><small>Đồng bộ: {connection.lastSyncAt?connection.lastSyncAt.toLocaleString('vi-VN'):'Chưa đồng bộ'}{connection.lastError?` · ${connection.lastError}`:''}</small></div>{user.role==='ADMIN'&&<ConnectionActions id={connection.id} status={connection.status}/>}</article>})}</div>}
  </>
}
