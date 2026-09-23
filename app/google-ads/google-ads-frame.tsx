'use client';

import { usePathname } from 'next/navigation';
import { BarChart3,Building2,ChevronRight,LayoutDashboard,Link2,LogOut,Network,PanelLeft,Rows3,Share2,ShieldCheck,Users,X } from 'lucide-react';
import { useState } from 'react';
import { tr } from '@/lib/i18n';
import { BrandLogo } from '../brand-logo';
import { AppLanguageSwitcher } from '../language-switcher';
import { useAppLocale } from '../locale-provider';

type FrameUser={name:string;email:string;role:'ADMIN'|'STAFF'};
const links=[
  {href:'/dashboard',vi:'Tổng quan',en:'Dashboard',icon:LayoutDashboard},
  {href:'/google-ads',vi:'Kết nối',en:'Connections',icon:Link2},
  {href:'/google-ads/mcc',label:'MCC',icon:Network},
  {href:'/google-ads/account-sharing',vi:'Chia sẻ tài khoản',en:'Account sharing',icon:Share2,adminOnly:true},
  {href:'/google-ads/accounts',vi:'Tài khoản',en:'Accounts',icon:Rows3},
  {href:'/google-ads/campaigns',vi:'Chiến dịch',en:'Campaigns',icon:BarChart3},
  {href:'/google-ads/analytics',vi:'Phân tích',en:'Analytics',icon:BarChart3},
  {href:'/google-ads/clients',vi:'Khách hàng CRM',en:'Clients CRM',icon:Building2},
];

export function GoogleAdsFrame({user,children}:{user:FrameUser;children:React.ReactNode}){
  const pathname=usePathname();const[open,setOpen]=useState(false);const locale=useAppLocale();
  async function logout(){await fetch('/api/auth/logout',{method:'POST'});window.location.assign('/login')}
  return <main className="ga-shell">
    {open&&<button className="ga-nav-backdrop" aria-label={tr(locale,'Đóng menu','Close menu')} onClick={()=>setOpen(false)}/>}
    <aside className={`ga-sidebar ${open?'open':''}`}>
      <div className="ga-brand"><BrandLogo decorative /><strong>David Agency MCC Manager</strong><button onClick={()=>setOpen(false)} aria-label={tr(locale,'Đóng','Close')}><X size={18}/></button></div>
      <p className="ga-nav-label">GOOGLE ADS</p>
      <nav>{links.filter(item=>!('adminOnly' in item)||!item.adminOnly||user.role==='ADMIN').map(item=>{const active=item.href==='/google-ads'?pathname===item.href:pathname.startsWith(item.href);const label='label' in item?item.label:tr(locale,item.vi,item.en);return <a key={item.href} href={item.href} className={active?'active':''} onClick={()=>setOpen(false)}><item.icon size={17}/><span>{label}</span>{active&&<ChevronRight size={14}/>}</a>})}</nav>
      {user.role==='ADMIN'&&<><p className="ga-nav-label">{tr(locale,'QUẢN TRỊ','ADMINISTRATION')}</p><nav><a href="/admin/users"><Users size={17}/><span>{tr(locale,'Quyền nhân viên','Staff permissions')}</span></a></nav></>}
      <div className="ga-security"><ShieldCheck size={16}/><div><strong>{user.role==='ADMIN'?tr(locale,'Toàn quyền','Full access'):tr(locale,'Chỉ đọc','Read only')}</strong><small>{tr(locale,'Vai trò website','Website role')}</small></div></div>
    </aside>
    <section className="ga-workspace">
      <header className="ga-topbar"><button className="ga-menu" onClick={()=>setOpen(true)} aria-label={tr(locale,'Mở menu','Open menu')}><PanelLeft size={20}/></button><a href="/dashboard" className="ga-mobile-brand"><BrandLogo decorative /> <span>David Agency MCC Manager</span></a><AppLanguageSwitcher/><div className="ga-user"><span>{user.name.slice(0,2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><button onClick={logout} aria-label={tr(locale,'Đăng xuất','Sign out')}><LogOut size={16}/></button></div></header>
      <div className="ga-content">{children}</div>
    </section>
  </main>
}
