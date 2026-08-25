'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, Bell, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, Download, FileClock, Gauge, KeyRound, Layers3, LayoutDashboard, LogOut, Menu, Network, Pause, Play, Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, UserPlus, Users, X, Zap } from 'lucide-react';
import { accounts as initialAccounts, auditLogs, campaigns as sourceCampaigns, formatVnd, jobs, mccs, metrics, type CampaignStatus } from '../lib/demo-data';

type Section = 'overview' | 'mcc' | 'accounts' | 'campaigns' | 'analytics' | 'jobs' | 'team' | 'audit' | 'settings';
type Campaign = typeof sourceCampaigns[number];
type DashboardUser = { id: string; name: string; email: string; role: 'ADMIN' | 'COLLABORATOR' };

const navGroups: { label: string; items: { id: Section; label: string; icon: typeof LayoutDashboard; badge?: string; adminOnly?: boolean }[] }[] = [
  { label: 'KHÔNG GIAN LÀM VIỆC', items: [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard }, { id: 'mcc', label: 'Tài khoản MCC', icon: Network, badge: '4' }, { id: 'accounts', label: 'Google Ads', icon: Layers3 }, { id: 'campaigns', label: 'Chiến dịch', icon: Zap }, { id: 'analytics', label: 'Phân tích', icon: BarChart3 },
  ]},
  { label: 'VẬN HÀNH', items: [
    { id: 'jobs', label: 'Tiến trình đồng bộ', icon: RefreshCw, badge: '3' }, { id: 'team', label: 'Thành viên', icon: Users, adminOnly: true }, { id: 'audit', label: 'Nhật ký hoạt động', icon: FileClock, adminOnly: true }, { id: 'settings', label: 'Cài đặt', icon: Settings, adminOnly: true },
  ]},
];

const sectionTitles: Record<Section, [string, string]> = {
  overview: ['Tổng quan', 'Hiệu suất hợp nhất từ tất cả MCC và tài khoản.'],
  mcc: ['Tài khoản MCC', 'Quản lý kết nối và cấu trúc tài khoản quản lý.'],
  accounts: ['Tài khoản Google Ads', 'Theo dõi và thao tác trên 20 tài khoản con.'],
  campaigns: ['Chiến dịch', 'Quản lý trạng thái, ngân sách và hiệu suất.'],
  analytics: ['Phân tích', 'So sánh hiệu suất và phát hiện xu hướng.'],
  jobs: ['Tiến trình đồng bộ', 'Giám sát queue, retry và trạng thái xử lý nền.'],
  team: ['Thành viên & phân quyền', 'Cấp tài khoản và kiểm soát quyền truy cập hệ thống.'],
  audit: ['Nhật ký hoạt động', 'Lịch sử bất biến của các thao tác quan trọng.'],
  settings: ['Cài đặt', 'Quản lý kết nối, đồng bộ và chính sách bảo mật.'],
};

export function DashboardApp({ user }: { user: DashboardUser }) {
  const [section, setSection] = useState<Section>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('30 ngày qua');
  const [campaigns, setCampaigns] = useState(sourceCampaigns);
  const [accountFilter, setAccountFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedMcc, setExpandedMcc] = useState<string[]>(['mcc-1']);
  const [confirm, setConfirm] = useState<{ campaign: Campaign; next: CampaignStatus } | null>(null);
  const [toast, setToast] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const searchResults = useMemo(() => {
    if (search.trim().length < 2) return [];
    const needle = search.toLowerCase().replaceAll('-', '');
    return [
      ...mccs.map(x => ({ type: 'MCC', id: x.id, title: x.name, subtitle: x.customerId, section: 'mcc' as Section })),
      ...initialAccounts.map(x => ({ type: 'Account', id: x.id, title: x.name, subtitle: x.customerId, section: 'accounts' as Section })),
      ...campaigns.map(x => ({ type: 'Campaign', id: x.id, title: x.name, subtitle: x.campaignId, section: 'campaigns' as Section })),
    ].filter(x => `${x.title}${x.subtitle}`.toLowerCase().replaceAll('-', '').includes(needle)).slice(0, 7);
  }, [search, campaigns]);

  const filteredAccounts = initialAccounts.filter(item => item.name.toLowerCase().includes(accountFilter.toLowerCase()) && (statusFilter === 'ALL' || item.status === statusFilter));
  const initials = user.name.split(' ').slice(-2).map(x => x[0]).join('').toUpperCase();

  function navigate(next: Section) { setSection(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); window.location.assign('/login'); }
  function exportCsv() {
    const rows = [['Account','Customer ID','Status','Spend','Clicks','Conversions'], ...initialAccounts.map(a => [a.name,a.customerId,a.status,a.spend,a.clicks,a.conversions])];
    const blob = new Blob(['\ufeff' + rows.map(row => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'ads-manager-accounts.csv'; link.click(); URL.revokeObjectURL(url); setToast('Đã xuất báo cáo CSV.'); setTimeout(() => setToast(''), 3200);
  }
  async function submitCampaign(id: string, status: CampaignStatus) {
    setIsMutating(true); setMutationError('');
    try {
      const response = await fetch('/api/campaigns', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? 'Không thể cập nhật chiến dịch.');
      setCampaigns(current => current.map(item => item.id === id ? { ...item, status } : item));
      setConfirm(null); setToast(status === 'ENABLED' ? 'Đã bật chiến dịch.' : 'Đã tạm dừng chiến dịch.'); setTimeout(() => setToast(''), 3200);
    } catch (error) { setMutationError(error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.'); }
    finally { setIsMutating(false); }
  }

  return <main className="app-shell">
    {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark">A</span><span>Ads Manager <b>Pro</b></span><button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Đóng"><X size={18}/></button></div>
      <nav>{navGroups.map(group => <div key={group.label}><p className="nav-label">{group.label}</p>{group.items.filter(item => !item.adminOnly || user.role === 'ADMIN').map(item => <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}><item.icon size={16}/><span>{item.label}</span>{item.badge && <i>{item.badge}</i>}</button>)}</div>)}</nav>
      <div className="sync-card"><div><span className="pulse"/> Hệ thống ổn định</div><p>Đồng bộ gần nhất</p><strong>2 phút trước</strong></div>
    </aside>

    <section className="workspace">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Mở menu"><Menu size={20}/></button>
        <div className="global-search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm MCC, tài khoản, chiến dịch..." aria-label="Tìm kiếm toàn cục"/><kbd>⌘ K</kbd>{searchResults.length > 0 && <div className="search-results">{searchResults.map(result => <button key={`${result.type}-${result.id}`} onClick={() => { navigate(result.section); setSearch(''); }}><span>{result.type.slice(0,1)}</span><div><strong>{result.title}</strong><small>{result.type} · {result.subtitle}</small></div><ChevronRight size={14}/></button>)}</div>}</div>
        <div className="top-actions"><button className="icon-btn" aria-label="Thông báo"><Bell size={18}/><span/></button><div className="user"><span>{initials}</span><div><strong>{user.name}</strong><small>{user.role === 'ADMIN' ? 'Quản trị viên' : 'Cộng tác viên'}</small></div></div><button className="logout-btn" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={16}/></button></div>
      </header>

      <div className="content">
        <div className="page-heading"><div><p className="eyebrow">ADS MANAGER PRO</p><h1>{sectionTitles[section][0]}</h1><p>{sectionTitles[section][1]}</p></div><div className="heading-actions"><label className="date-select"><CalendarDays size={14}/><select value={range} onChange={e => setRange(e.target.value)}><option>Hôm nay</option><option>7 ngày qua</option><option>14 ngày qua</option><option>30 ngày qua</option><option>Tháng này</option></select><ChevronDown size={12}/></label>{section === 'mcc' && user.role === 'ADMIN' ? <button className="primary-btn" onClick={()=>{window.location.href='/api/auth/google-ads'}}><Plus size={14}/> Kết nối MCC</button> : <button className="secondary-btn" onClick={exportCsv}><Download size={14}/> Xuất dữ liệu</button>}</div></div>
        {section === 'overview' && <Overview onNavigate={navigate}/>} 
        {section === 'mcc' && <MccView expanded={expandedMcc} setExpanded={setExpandedMcc}/>} 
        {section === 'accounts' && <AccountsView accounts={filteredAccounts} filter={accountFilter} setFilter={setAccountFilter} status={statusFilter} setStatus={setStatusFilter} selected={selected} setSelected={setSelected} notify={setToast}/>} 
        {section === 'campaigns' && <CampaignsView campaigns={campaigns} setConfirm={setConfirm}/>} 
        {section === 'analytics' && <AnalyticsView/>} 
        {section === 'jobs' && <JobsView/>} 
        {section === 'team' && user.role === 'ADMIN' && <TeamView currentUser={user}/>}
        {section === 'audit' && user.role === 'ADMIN' && <AuditView/>}
        {section === 'settings' && user.role === 'ADMIN' && <SettingsView user={user} enabled={syncEnabled} setEnabled={setSyncEnabled}/>}
      </div>
    </section>
    {confirm && <div className="modal-backdrop" role="presentation"><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><button className="modal-close" onClick={() => setConfirm(null)}><X size={17}/></button><span className={`modal-icon ${confirm.next === 'PAUSED' ? 'pause' : ''}`}>{confirm.next === 'PAUSED' ? <Pause size={21}/> : <Play size={21}/>}</span><h2 id="confirm-title">{confirm.next === 'PAUSED' ? 'Tạm dừng' : 'Bật'} chiến dịch?</h2><p>Thao tác này sẽ được gửi tới Google Ads và ghi vào nhật ký.</p><div className="confirm-target"><strong>{confirm.campaign.name}</strong><small>ID {confirm.campaign.campaignId}</small></div>{mutationError && <p className="form-error">{mutationError}</p>}<div className="modal-actions"><button onClick={() => setConfirm(null)}>Huỷ</button><button className={confirm.next === 'PAUSED' ? 'danger-action' : 'primary-action'} disabled={isMutating} onClick={() => submitCampaign(confirm.campaign.id, confirm.next)}>{isMutating ? 'Đang xử lý...' : 'Xác nhận'}</button></div></div></div>}
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}<button onClick={() => setToast('')}><X size={14}/></button></div>}
  </main>;
}

function Overview({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const kpis = [
    { label: 'Tổng chi tiêu', value: '1,284,6 tr đ', change: '+12,8%', icon: CircleDollarSign, tone: 'blue' },
    { label: 'Lượt nhấp', value: '458.280', change: '+8,4%', icon: Activity, tone: 'violet' },
    { label: 'Chuyển đổi', value: '18.492', change: '+16,2%', icon: CheckCircle2, tone: 'emerald' },
    { label: 'CPA trung bình', value: '69.466 đ', change: '-3,7%', icon: Gauge, tone: 'orange' },
  ];
  return <><div className="notice"><Sparkles size={15}/><span><strong>3 đề xuất tối ưu mới</strong> có thể giúp giảm 8,2% CPA tuần này.</span><button onClick={() => onNavigate('analytics')}>Xem phân tích <ChevronRight size={13}/></button></div><div className="kpi-grid">{kpis.map(item => <article className={`kpi-card ${item.tone}`} key={item.label}><div className="kpi-top"><span className="metric-icon"><item.icon size={16}/></span><span className="change">{item.change}</span></div><p>{item.label}</p><strong>{item.value}</strong><small>so với kỳ trước</small></article>)}</div><div className="main-grid"><article className="panel chart-panel"><PanelHead title="Chi tiêu & chuyển đổi" subtitle="Xu hướng hiệu suất 30 ngày qua"/><div className="rechart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={metrics}><defs><linearGradient id="spend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3767f6" stopOpacity={.24}/><stop offset="100%" stopColor="#3767f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="date" tick={{fontSize:9,fill:'#9ba3b1'}} tickLine={false} axisLine={false} interval={6}/><YAxis tick={{fontSize:9,fill:'#9ba3b1'}} tickLine={false} axisLine={false}/><Tooltip contentStyle={{border:'1px solid #e8eaf0',borderRadius:10,fontSize:11}}/><Area type="monotone" dataKey="spend" stroke="#3767f6" fill="url(#spend)" strokeWidth={2.5}/><Line type="monotone" dataKey="previous" stroke="#9b6cf7" dot={false} strokeDasharray="4 4"/></AreaChart></ResponsiveContainer></div></article><article className="panel health-panel"><PanelHead title="Sức khoẻ tài khoản" subtitle="20 tài khoản"/><div className="donut"><div><strong>85%</strong><span>Ổn định</span></div></div><div className="health-list"><div><span><i className="healthy"/>Hoạt động</span><b>17</b></div><div><span><i className="warning"/>Cần chú ý</span><b>2</b></div><div><span><i className="danger"/>Tạm ngưng</span><b>1</b></div></div></article></div><article className="panel accounts-panel"><PanelHead title="Tài khoản hàng đầu" subtitle="Xếp hạng theo chi tiêu trong kỳ" action={<button className="text-btn" onClick={() => onNavigate('accounts')}>Xem tất cả <ChevronRight size={13}/></button>}/><SimpleAccounts accounts={initialAccounts.slice(0,5)}/></article></>;
}

function MccView({ expanded, setExpanded }: { expanded: string[]; setExpanded: (value: string[]) => void }) {
  return <div className="mcc-layout"><div className="mcc-list">{mccs.map(mcc => <article className="panel mcc-card" key={mcc.id}><div className="mcc-main"><span className="mcc-logo"><Network size={18}/></span><div><div className="mcc-title"><h2>{mcc.name}</h2><span className={mcc.status === 'CONNECTED' ? 'connected' : 'attention'}>{mcc.status === 'CONNECTED' ? 'Kết nối' : 'Cần xác thực'}</span></div><p>{mcc.customerId} · {mcc.currency} · {mcc.timezone}</p></div><div className="mcc-stats"><strong>{mcc.accounts}</strong><small>tài khoản con</small></div><button className="tree-toggle" onClick={() => setExpanded(expanded.includes(mcc.id) ? expanded.filter(id => id !== mcc.id) : [...expanded, mcc.id])}>{expanded.includes(mcc.id) ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button></div>{expanded.includes(mcc.id) && <div className="account-tree">{initialAccounts.filter(account => account.mccId === mcc.id).map(account => <div key={account.id}><span className={`tree-status ${account.status.toLowerCase()}`}/><div><strong>{account.name}</strong><small>{account.customerId} · {sourceCampaigns.filter(c => c.accountId === account.id).length} chiến dịch</small></div><span>{formatVnd(account.spend)}</span></div>)}</div>}<footer><span>Đồng bộ {mcc.lastSync}</span><div><button><RefreshCw size={13}/> Đồng bộ</button><button>Quản lý <ChevronRight size={13}/></button></div></footer></article>)}</div><aside className="panel mcc-summary"><h2>Tổng quan kết nối</h2><div className="summary-ring"><div><strong>4</strong><span>MCC</span></div></div><div className="summary-row"><span><i className="healthy"/> Đã kết nối</span><b>3</b></div><div className="summary-row"><span><i className="warning"/> Cần xác thực</span><b>1</b></div><hr/><small>20 tài khoản · 100 chiến dịch</small></aside></div>;
}

function AccountsView({ accounts, filter, setFilter, status, setStatus, selected, setSelected, notify }: { accounts: typeof initialAccounts; filter: string; setFilter: (v:string)=>void; status:string; setStatus:(v:string)=>void; selected:string[]; setSelected:(v:string[])=>void; notify:(v:string)=>void }) {
  const allSelected = accounts.length > 0 && accounts.every(item => selected.includes(item.id));
  return <article className="panel data-panel"><div className="table-toolbar"><label><Search size={14}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Tìm tài khoản..."/></label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="ENABLED">Hoạt động</option><option value="SUSPENDED">Tạm ngưng</option><option value="CANCELED">Đã huỷ</option></select>{selected.length > 0 && <div className="bulk-bar"><strong>{selected.length} đã chọn</strong><button onClick={()=>{notify(`Đã đưa ${selected.length} tài khoản vào queue đồng bộ.`);setSelected([])}}><RefreshCw size={13}/> Đồng bộ</button><button onClick={()=>notify('Đang chuẩn bị file xuất trong nền.')}><Download size={13}/> Xuất</button></div>}</div><div className="table-wrap"><table className="data-table"><thead><tr><th><input type="checkbox" checked={allSelected} onChange={()=>setSelected(allSelected ? [] : accounts.map(x=>x.id))}/></th><th>TÀI KHOẢN</th><th>MCC</th><th>TRẠNG THÁI</th><th>CHI TIÊU</th><th>HIỂN THỊ</th><th>NHẤP</th><th>CHUYỂN ĐỔI</th><th/></tr></thead><tbody>{accounts.map((account,index)=><tr key={account.id}><td><input type="checkbox" checked={selected.includes(account.id)} onChange={()=>setSelected(selected.includes(account.id)?selected.filter(id=>id!==account.id):[...selected,account.id])}/></td><td><div className={`account-logo logo-${index%4}`}>{account.name[0]}</div><div><strong>{account.name}</strong><small>{account.customerId}</small></div></td><td>{mccs.find(m=>m.id===account.mccId)?.name}</td><td><Status value={account.status}/></td><td><strong>{formatVnd(account.spend)}</strong></td><td>{account.impressions.toLocaleString('vi-VN')}</td><td>{account.clicks.toLocaleString('vi-VN')}</td><td>{account.conversions.toLocaleString('vi-VN')}</td><td><button className="row-btn"><ChevronRight size={15}/></button></td></tr>)}</tbody></table></div><div className="pagination"><span>Hiển thị {accounts.length} / 20 tài khoản</span><div><button disabled>‹</button><button className="current">1</button><button>2</button><button>›</button></div></div></article>;
}

function CampaignsView({ campaigns, setConfirm }: { campaigns: Campaign[]; setConfirm: (v:{campaign:Campaign;next:CampaignStatus})=>void }) {
  const [query,setQuery]=useState(''); const [filter,setFilter]=useState('ALL'); const visible=campaigns.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())&&(filter==='ALL'||c.status===filter));
  return <article className="panel data-panel"><div className="table-toolbar"><label><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm chiến dịch..."/></label><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="ENABLED">Đang chạy</option><option value="PAUSED">Đã tạm dừng</option></select></div><div className="table-wrap"><table className="data-table"><thead><tr><th>CHIẾN DỊCH</th><th>LOẠI</th><th>TRẠNG THÁI</th><th>NGÂN SÁCH</th><th>CHI TIÊU</th><th>NHẤP</th><th>CTR</th><th>CHUYỂN ĐỔI</th><th>THAO TÁC</th></tr></thead><tbody>{visible.map(campaign=><tr key={campaign.id}><td><div><strong>{campaign.name}</strong><small>ID {campaign.campaignId} · {initialAccounts.find(a=>a.id===campaign.accountId)?.name}</small></div></td><td><span className="type-badge">{campaign.type}</span></td><td><Status value={campaign.status}/></td><td>{formatVnd(campaign.budget)}<small>/ ngày</small></td><td><strong>{formatVnd(campaign.spend)}</strong></td><td>{campaign.clicks.toLocaleString('vi-VN')}</td><td>{((campaign.clicks/campaign.impressions)*100).toFixed(2)}%</td><td>{campaign.conversions.toLocaleString('vi-VN')}</td><td><button className={`action-btn ${campaign.status==='ENABLED'?'pause':''}`} onClick={()=>setConfirm({campaign,next:campaign.status==='ENABLED'?'PAUSED':'ENABLED'})}>{campaign.status==='ENABLED'?<Pause size={13}/>:<Play size={13}/>} {campaign.status==='ENABLED'?'Tạm dừng':'Bật'}</button></td></tr>)}</tbody></table></div></article>;
}

function AnalyticsView() { const [metric,setMetric]=useState<'spend'|'clicks'|'conversions'>('spend'); return <><div className="analytics-kpis"><article className="panel"><span>CTR</span><strong>3,82%</strong><small>+0,34% so với kỳ trước</small></article><article className="panel"><span>CPC trung bình</span><strong>2.803 đ</strong><small>-5,1% so với kỳ trước</small></article><article className="panel"><span>Giá trị chuyển đổi</span><strong>4,82 tỷ đ</strong><small>ROAS 3,75x</small></article></div><article className="panel analytics-chart"><div className="chart-toolbar"><PanelHead title="Xu hướng hiệu suất" subtitle="Kỳ hiện tại so với kỳ trước"/><div>{(['spend','clicks','conversions'] as const).map(k=><button className={metric===k?'active':''} key={k} onClick={()=>setMetric(k)}>{k==='spend'?'Chi tiêu':k==='clicks'?'Lượt nhấp':'Chuyển đổi'}</button>)}</div></div><div className="large-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={metrics}><CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="date" tick={{fontSize:9,fill:'#9ba3b1'}} tickLine={false} axisLine={false} interval={3}/><YAxis tick={{fontSize:9,fill:'#9ba3b1'}} tickLine={false} axisLine={false}/><Tooltip/><Line type="monotone" dataKey={metric} stroke="#3767f6" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="previous" stroke="#a4aab8" strokeWidth={1.8} dot={false} strokeDasharray="5 5"/></LineChart></ResponsiveContainer></div></article><div className="insights"><article className="panel"><span className="insight-icon positive"><Activity size={17}/></span><div><strong>CPA giảm 7,4%</strong><p>Nhóm Search Brand đang tăng hiệu quả rõ rệt.</p></div></article><article className="panel"><span className="insight-icon warn"><Zap size={17}/></span><div><strong>2 campaign chạm ngân sách</strong><p>Có thể bỏ lỡ thêm 132 chuyển đổi.</p></div></article><article className="panel"><span className="insight-icon info"><Users size={17}/></span><div><strong>Tệp khách hàng mới tăng</strong><p>Chiếm 42% tổng chuyển đổi trong kỳ.</p></div></article></div></> }

function JobsView(){return <div className="jobs-layout"><article className="panel data-panel"><div className="jobs-header"><PanelHead title="Queue đồng bộ" subtitle="Concurrency 5 · Exponential backoff · Tự động retry"/><button className="secondary-btn"><RefreshCw size={13}/> Làm mới</button></div><div className="job-list">{jobs.map(job=><div className="job-row" key={job.id}><span className={`job-icon ${job.status.toLowerCase()}`}>{job.status==='SUCCESS'?<CheckCircle2 size={17}/>:job.status==='FAILED'?<X size={17}/>:<RefreshCw size={17}/>}</span><div className="job-info"><strong>{job.type}</strong><small>{job.id} · {job.target} · {job.createdAt}</small></div><div className="job-progress"><div><span style={{width:`${job.progress}%`}}/></div><small>{job.progress}%</small></div><Status value={job.status}/><button className="row-btn"><ChevronRight size={15}/></button></div>)}</div></article><aside className="panel queue-stats"><h2>Hàng đợi hôm nay</h2><div><span>Đã xử lý</span><strong>248</strong></div><div><span>Thành công</span><strong className="green">241</strong></div><div><span>Thất bại</span><strong className="red">7</strong></div><div><span>Thời gian TB</span><strong>42s</strong></div><hr/><small>API quota sử dụng</small><div className="quota"><span style={{width:'63%'}}/></div><b>63% hạn mức trong ngày</b></aside></div>}

function AuditView(){return <article className="panel audit-panel"><div className="audit-header"><PanelHead title="Hoạt động gần đây" subtitle="Mọi thay đổi quan trọng đều được ghi nhận"/><label><Search size={14}/><input placeholder="Tìm trong nhật ký..."/></label></div><div className="audit-timeline">{auditLogs.map((log,index)=><div key={log.id}><span className={`audit-dot dot-${index%4}`}>{index===0?<Pause size={13}/>:index===1?<CircleDollarSign size={13}/>:index===2?<RefreshCw size={13}/>:<Download size={13}/>}</span><div><strong>{log.action.replaceAll('_',' ')}</strong><p><b>{log.user}</b> · {log.entity}</p><small>{log.time} · IP {log.ip}</small></div><button>Chi tiết</button></div>)}</div></article>}

type TeamMember = { id: string; name: string | null; email: string; role: 'ADMIN' | 'COLLABORATOR'; isActive: boolean; lastLoginAt: string | null };

function TeamView({ currentUser }: { currentUser: DashboardUser }) {
  const [members,setMembers]=useState<TeamMember[]>([]); const [databaseConfigured,setDatabaseConfigured]=useState(true); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
  const [form,setForm]=useState({name:'',email:'',password:'',role:'COLLABORATOR' as 'ADMIN'|'COLLABORATOR'});
  useEffect(()=>{
    let cancelled=false;
    fetch('/api/users').then(async response=>{
      const payload=await response.json() as {data?:{items:TeamMember[];databaseConfigured:boolean};error?:{message?:string}};
      if(!response.ok||!payload.data)throw new Error(payload.error?.message||'Không thể tải thành viên.');
      if(!cancelled){setMembers(payload.data.items);setDatabaseConfigured(payload.data.databaseConfigured)}
    }).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:'Không thể tải thành viên.')}).finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[]);
  async function createMember(event:React.FormEvent){event.preventDefault();setSaving(true);setError('');try{const response=await fetch('/api/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(form)});const payload=await response.json() as {data?:TeamMember;error?:{message?:string}};if(!response.ok||!payload.data)throw new Error(payload.error?.message||'Không thể tạo tài khoản.');setMembers(items=>[...items,payload.data!]);setForm({name:'',email:'',password:'',role:'COLLABORATOR'})}catch(cause){setError(cause instanceof Error?cause.message:'Không thể tạo tài khoản.')}finally{setSaving(false)}}
  async function updateMember(id:string,changes:Partial<Pick<TeamMember,'role'|'isActive'>>){setError('');const response=await fetch('/api/users',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,...changes})});const payload=await response.json() as {data?:TeamMember;error?:{message?:string}};if(!response.ok||!payload.data){setError(payload.error?.message||'Không thể cập nhật tài khoản.');return}setMembers(items=>items.map(item=>item.id===id?payload.data!:item))}
  return <div className="team-layout"><article className="panel team-list"><div className="team-head"><PanelHead title="Danh sách thành viên" subtitle={`${members.length} tài khoản có quyền truy cập`}/><span className="permission-note"><ShieldCheck size={13}/> Phân quyền phía máy chủ</span></div>{!databaseConfigured&&<div className="database-notice">Cần cấu hình <b>DATABASE_URL</b> để thêm và lưu tài khoản cộng tác viên.</div>}{error&&<div className="team-error">{error}</div>}<div className="table-wrap"><table className="team-table"><thead><tr><th>THÀNH VIÊN</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>ĐĂNG NHẬP GẦN NHẤT</th><th>THAO TÁC</th></tr></thead><tbody>{loading?<tr><td colSpan={5}>Đang tải thành viên...</td></tr>:members.map((member,index)=><tr key={member.id}><td><div className={`member-avatar logo-${index%4}`}>{(member.name||member.email).slice(0,2).toUpperCase()}</div><div><strong>{member.name||'Chưa đặt tên'}{member.id===currentUser.id&&<em>Bạn</em>}</strong><small>{member.email}</small></div></td><td><select className="role-select" value={member.role} disabled={member.id===currentUser.id} onChange={event=>void updateMember(member.id,{role:event.target.value as TeamMember['role']})}><option value="ADMIN">Quản trị viên</option><option value="COLLABORATOR">Cộng tác viên</option></select></td><td><span className={`member-state ${member.isActive?'active':'locked'}`}><i/>{member.isActive?'Đang hoạt động':'Đã khóa'}</span></td><td>{member.lastLoginAt?new Date(member.lastLoginAt).toLocaleString('vi-VN'):'Chưa đăng nhập'}</td><td><button className="member-toggle" disabled={member.id===currentUser.id} onClick={()=>void updateMember(member.id,{isActive:!member.isActive})}>{member.isActive?'Khóa tài khoản':'Mở khóa'}</button></td></tr>)}</tbody></table></div></article><aside className="panel invite-card"><span className="invite-icon"><UserPlus size={19}/></span><h2>Thêm thành viên</h2><p>Cấp tài khoản đăng nhập và chọn quyền phù hợp.</p><form onSubmit={createMember}><label>Họ và tên<input value={form.name} onChange={event=>setForm(value=>({...value,name:event.target.value}))} placeholder="Nguyễn Văn A" required minLength={2}/></label><label>Email<input type="email" value={form.email} onChange={event=>setForm(value=>({...value,email:event.target.value}))} placeholder="name@company.com" required/></label><label>Mật khẩu tạm thời<input type="password" value={form.password} onChange={event=>setForm(value=>({...value,password:event.target.value}))} placeholder="Tối thiểu 10 ký tự" required minLength={10}/></label><label>Vai trò<select value={form.role} onChange={event=>setForm(value=>({...value,role:event.target.value as typeof value.role}))}><option value="COLLABORATOR">Cộng tác viên</option><option value="ADMIN">Quản trị viên</option></select></label><button disabled={saving||!databaseConfigured}>{saving?'Đang tạo...':'Tạo tài khoản'}</button></form><div className="role-rules"><strong>Quyền cộng tác viên</strong><span>✓ Xem báo cáo và dữ liệu MCC</span><span>✓ Vận hành chiến dịch và đồng bộ</span><span>— Không quản lý người dùng/kết nối</span></div></aside></div>
}

function SettingsView({user,enabled,setEnabled}:{user:DashboardUser;enabled:boolean;setEnabled:(v:boolean)=>void}){return <div className="settings-layout"><article className="panel settings-card"><div className="settings-title"><span><KeyRound size={18}/></span><div><h2>Kết nối Google</h2><p>Tài khoản dùng để truy cập Google Ads API</p></div></div><div className="connection-row"><span className="google-mark">G</span><div><strong>Chưa kết nối Google Ads</strong><small><i/> Sẵn sàng kết nối</small></div><button className="secondary-btn" onClick={()=>{window.location.href='/api/auth/google-ads'}}>Kết nối Google</button></div></article><article className="panel settings-card"><div className="settings-title"><span><RefreshCw size={18}/></span><div><h2>Đồng bộ tự động</h2><p>Lịch lấy dữ liệu từ Google Ads</p></div></div><div className="setting-row"><div><strong>Tự động đồng bộ</strong><small>Cập nhật metrics và campaign theo lịch</small></div><button className={`toggle ${enabled?'on':''}`} onClick={()=>setEnabled(!enabled)}><span/></button></div><div className="setting-row"><div><strong>Chu kỳ đồng bộ</strong><small>Khoảng cách giữa hai lần chạy</small></div><select><option>Mỗi 6 giờ</option><option>Mỗi 12 giờ</option><option>Hàng ngày</option></select></div><div className="setting-row"><div><strong>Concurrency tối đa</strong><small>Số account xử lý cùng lúc</small></div><select defaultValue="5"><option>3</option><option>5</option><option>10</option></select></div></article><article className="panel settings-card"><div className="settings-title"><span><ShieldCheck size={18}/></span><div><h2>Bảo mật</h2><p>Phiên đăng nhập và kiểm soát truy cập</p></div></div><div className="security-user"><span>{user.name.slice(0,2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email} · {user.role}</small></div><b>Phiên đã xác thực</b></div></article></div>}

function PanelHead({title,subtitle,action}:{title:string;subtitle:string;action?:React.ReactNode}){return <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>}
function SimpleAccounts({accounts}:{accounts:typeof initialAccounts}){return <div className="table-wrap"><table><thead><tr><th>TÀI KHOẢN</th><th>TRẠNG THÁI</th><th>CHI TIÊU</th><th>CHUYỂN ĐỔI</th><th>HIỆU SUẤT</th><th/></tr></thead><tbody>{accounts.map((account,index)=><tr key={account.id}><td><div className={`account-logo logo-${index%4}`}>{account.name[0]}</div><div><strong>{account.name}</strong><small>{account.customerId}</small></div></td><td><Status value={account.status}/></td><td><strong>{formatVnd(account.spend)}</strong></td><td>{account.conversions.toLocaleString('vi-VN')}</td><td><div className="progress"><span style={{width:`${88-index*9}%`}}/></div></td><td><button className="row-btn"><ChevronRight size={14}/></button></td></tr>)}</tbody></table></div>}
function Status({value}:{value:string}){const labels:Record<string,string>={ENABLED:'Hoạt động',PAUSED:'Tạm dừng',SUSPENDED:'Tạm ngưng',CANCELED:'Đã huỷ',PROCESSING:'Đang xử lý',SUCCESS:'Thành công',PENDING:'Đang chờ',FAILED:'Thất bại'};return <span className={`status status-${value.toLowerCase()}`}><i/>{labels[value]||value}</span>}
