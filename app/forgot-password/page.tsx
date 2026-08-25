'use client';

import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage(){
  const[email,setEmail]=useState('');const[message,setMessage]=useState('');const[loading,setLoading]=useState(false);
  async function submit(event:React.FormEvent){event.preventDefault();setLoading(true);const response=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});const payload=await response.json() as {data?:{message?:string}};setMessage(payload.data?.message||'Nếu email tồn tại, hướng dẫn khôi phục sẽ được gửi.');setLoading(false)}
  return <main className="login-shell compact-login"><section className="login-story"><div className="login-brand"><span className="brand-mark">A</span><span>Ads Manager <b>Pro</b></span></div><div className="login-copy"><p className="login-eyebrow">KHÔI PHỤC TÀI KHOẢN</p><h1>Lấy lại quyền truy cập an toàn.</h1><p>Yêu cầu khôi phục không tiết lộ tài khoản có tồn tại hay không.</p></div></section><section className="login-panel"><div className="login-card"><span className="login-lock"><Mail size={21}/></span><p className="login-eyebrow">QUÊN MẬT KHẨU</p><h2>Khôi phục mật khẩu</h2><p className="login-intro">Nhập email đã được quản trị viên cấp.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={event=>setEmail(event.target.value)} required placeholder="name@company.com"/></label>{message&&<div className="login-success">{message}</div>}<button className="login-submit" disabled={loading}>{loading?'Đang gửi...':'Gửi yêu cầu'}</button></form><a className="back-login" href="/login"><ArrowLeft size={14}/> Quay lại đăng nhập</a></div></section></main>
}
