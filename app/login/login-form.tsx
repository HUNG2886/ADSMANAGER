'use client';

import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck, Users } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, remember }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || 'Không thể đăng nhập.');
      window.location.assign('/dashboard');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đăng nhập.'); }
    finally { setLoading(false); }
  }

  return <main className="login-shell">
    <section className="login-story">
      <div className="login-brand"><span className="brand-mark">A</span><span>Ads Manager <b>Pro</b></span></div>
      <div className="login-copy"><p className="login-eyebrow">MULTI-MCC CONTROL CENTER</p><h1>Một nơi để vận hành toàn bộ hệ thống quảng cáo.</h1><p>Đăng nhập để quản lý MCC, theo dõi hiệu suất và phối hợp cùng đội ngũ theo đúng quyền được cấp.</p></div>
      <div className="role-preview"><article><span><ShieldCheck size={18}/></span><div><strong>Quản trị viên</strong><p>Toàn quyền hệ thống, kết nối MCC và quản lý thành viên.</p></div></article><article><span><Users size={18}/></span><div><strong>Cộng tác viên</strong><p>Theo dõi dữ liệu và vận hành chiến dịch trong phạm vi được phép.</p></div></article></div>
      <small className="login-footnote">Bảo vệ phiên bằng cookie HttpOnly · Tự động hết hạn sau 12 giờ</small>
    </section>
    <section className="login-panel"><div className="login-card"><span className="login-lock"><LockKeyhole size={21}/></span><p className="login-eyebrow">TRUY CẬP BẢO MẬT</p><h2>Đăng nhập hệ thống</h2><p className="login-intro">Sử dụng tài khoản do quản trị viên cấp.</p>
      <form onSubmit={submit}><label>Email<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@company.com" required /></label><label>Mật khẩu<div className="password-field"><input type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required minLength={8} maxLength={72}/><button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label><div className="login-options"><label><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/> Ghi nhớ đăng nhập</label><a href="/forgot-password">Quên mật khẩu?</a></div>{error && <div className="login-error" role="alert">{error}</div>}<button className="login-submit" disabled={loading}>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</button></form>
      <p className="login-help">Bạn chưa có tài khoản? Liên hệ quản trị viên để được cấp quyền.</p>
    </div></section>
  </main>;
}
