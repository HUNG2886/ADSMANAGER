'use client';

import { usePathname } from 'next/navigation';
import { BarChart3,Building2,ChevronRight,LayoutDashboard,Link2,LogOut,Network,PanelLeft,Rows3,ShieldCheck,Users,X } from 'lucide-react';
import { useState } from 'react';

type FrameUser={name:string;email:string;role:'ADMIN'|'STAFF'};
const links=[
  {href:'/dashboard',label:'Dashboard',icon:LayoutDashboard},
  {href:'/google-ads',label:'Connections',icon:Link2},
  {href:'/google-ads/mcc',label:'MCC',icon:Network},
  {href:'/google-ads/accounts',label:'Accounts',icon:Rows3},
  {href:'/google-ads/campaigns',label:'Campaigns',icon:BarChart3},
  {href:'/google-ads/analytics',label:'Analytics',icon:BarChart3},
  {href:'/google-ads/clients',label:'Clients CRM',icon:Building2},
];

export function GoogleAdsFrame({user,children}:{user:FrameUser;children:React.ReactNode}){
  const pathname=usePathname();const[open,setOpen]=useState(false);
  async function logout(){await fetch('/api/auth/logout',{method:'POST'});window.location.assign('/login')}
  return <main className="ga-shell">
    {open&&<button className="ga-nav-backdrop" aria-label="Đóng menu" onClick={()=>setOpen(false)}/>} 
    <aside className={`ga-sidebar ${open?'open':''}`}>
      <div className="ga-brand"><span>A</span><strong>Ads Manager <b>Pro</b></strong><button onClick={()=>setOpen(false)} aria-label="Đóng"><X size={18}/></button></div>
      <p className="ga-nav-label">GOOGLE ADS</p>
      <nav>{links.map(item=>{const active=item.href==='/google-ads'?pathname===item.href:pathname.startsWith(item.href);return <a key={item.href} href={item.href} className={active?'active':''} onClick={()=>setOpen(false)}><item.icon size={17}/><span>{item.label}</span>{active&&<ChevronRight size={14}/>}</a>})}</nav>
      {user.role==='ADMIN'&&<><p className="ga-nav-label">QUẢN TRỊ</p><nav><a href="/admin/users"><Users size={17}/><span>Staff permissions</span></a></nav></>}
      <div className="ga-security"><ShieldCheck size={16}/><div><strong>{user.role==='ADMIN'?'Full access':'Read only'}</strong><small>Website role</small></div></div>
    </aside>
    <section className="ga-workspace">
      <header className="ga-topbar"><button className="ga-menu" onClick={()=>setOpen(true)} aria-label="Mở menu"><PanelLeft size={20}/></button><a href="/dashboard" className="ga-mobile-brand">Ads Manager Pro</a><div className="ga-user"><span>{user.name.slice(0,2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><button onClick={logout} aria-label="Đăng xuất"><LogOut size={16}/></button></div></header>
      <div className="ga-content">{children}</div>
    </section>
  </main>
}
