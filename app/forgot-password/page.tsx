'use client';

import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { BrandLogo } from '../brand-logo';
import { AppLanguageSwitcher } from '../language-switcher';
import { useAppLocale } from '../locale-provider';

export default function ForgotPasswordPage(){
  const locale=useAppLocale();const[email,setEmail]=useState('');const[message,setMessage]=useState('');const[loading,setLoading]=useState(false);
  async function submit(event:React.FormEvent){event.preventDefault();setLoading(true);const response=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});const payload=await response.json() as {data?:{message?:string}};setMessage(payload.data?.message||tr(locale,'Nếu email tồn tại, hướng dẫn khôi phục sẽ được gửi.','If the email exists, recovery instructions will be sent.'));setLoading(false)}
  return <main className="login-shell compact-login"><section className="login-story"><div className="login-brand"><BrandLogo decorative /><span>David Agency MCC Manager</span><AppLanguageSwitcher/></div><div className="login-copy"><p className="login-eyebrow">{tr(locale,'KHÔI PHỤC TÀI KHOẢN','ACCOUNT RECOVERY')}</p><h1>{tr(locale,'Lấy lại quyền truy cập an toàn.','Recover access securely.')}</h1><p>{tr(locale,'Yêu cầu khôi phục không tiết lộ tài khoản có tồn tại hay không.','Recovery requests never reveal whether an account exists.')}</p></div></section><section className="login-panel"><div className="login-card"><span className="login-lock"><Mail size={21}/></span><p className="login-eyebrow">{tr(locale,'QUÊN MẬT KHẨU','FORGOT PASSWORD')}</p><h2>{tr(locale,'Khôi phục mật khẩu','Recover password')}</h2><p className="login-intro">{tr(locale,'Nhập email đã được quản trị viên cấp.','Enter the email provided by your administrator.')}</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={event=>setEmail(event.target.value)} required placeholder="name@company.com"/></label>{message&&<div className="login-success">{message}</div>}<button className="login-submit" disabled={loading}>{loading?tr(locale,'Đang gửi...','Sending...'):tr(locale,'Gửi yêu cầu','Send request')}</button></form><a className="back-login" href="/login"><ArrowLeft size={14}/> {tr(locale,'Quay lại đăng nhập','Back to sign in')}</a></div></section></main>
}
