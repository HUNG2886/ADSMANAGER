'use client';

import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { BrandLogo } from '../brand-logo';
import { AppLanguageSwitcher } from '../language-switcher';
import { useAppLocale } from '../locale-provider';

export function LoginForm({returnTo}:{returnTo:string}) {
  const locale=useAppLocale();
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
      if (!response.ok) throw new Error(payload.error?.message || tr(locale,'Không thể đăng nhập.','Unable to sign in.'));
      window.location.assign(returnTo);
    } catch (cause) { setError(cause instanceof Error ? cause.message : tr(locale,'Không thể đăng nhập.','Unable to sign in.')); }
    finally { setLoading(false); }
  }

  return <main className="login-shell">
    <section className="login-story">
      <div className="login-brand"><BrandLogo decorative /><span>David Agency MCC Manager</span><AppLanguageSwitcher/></div>
      <div className="login-copy"><p className="login-eyebrow">MULTI-MCC CONTROL CENTER</p><h1>{tr(locale,'Một nơi để vận hành toàn bộ hệ thống quảng cáo.','One place to operate your entire advertising system.')}</h1><p>{tr(locale,'Đăng nhập để quản lý MCC, theo dõi hiệu suất và phối hợp cùng đội ngũ theo đúng quyền được cấp.','Sign in to manage MCCs, monitor performance, and collaborate within your authorized access.')}</p></div>
      <div className="role-preview"><article><span><ShieldCheck size={18}/></span><div><strong>{tr(locale,'Quản trị viên','Administrator')}</strong><p>{tr(locale,'Toàn quyền hệ thống, kết nối MCC và quản lý thành viên.','Full system access, MCC connections, and staff management.')}</p></div></article><article><span><Users size={18}/></span><div><strong>{tr(locale,'Cộng tác viên','Staff')}</strong><p>{tr(locale,'Chỉ xem dữ liệu, báo cáo và nhật ký trong phạm vi được cấp.','Read-only access to assigned data, reports, and logs.')}</p></div></article></div>
      <small className="login-footnote">{tr(locale,'Bảo vệ phiên bằng cookie HttpOnly · Tự động hết hạn sau 12 giờ','Session protected by an HttpOnly cookie · Automatically expires after 12 hours')}</small>
    </section>
    <section className="login-panel"><div className="login-card"><span className="login-lock"><LockKeyhole size={21}/></span><p className="login-eyebrow">{tr(locale,'TRUY CẬP BẢO MẬT','SECURE ACCESS')}</p><h2>{tr(locale,'Đăng nhập hệ thống','Sign in')}</h2><p className="login-intro">{tr(locale,'Sử dụng tài khoản do quản trị viên cấp.','Use the account provided by your administrator.')}</p>
      <form onSubmit={submit}><label>{tr(locale,'Email hoặc tên đăng nhập','Email or username')}<input type="text" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="davidagency or name@company.com" required /></label><label>{tr(locale,'Mật khẩu','Password')}<div className="password-field"><input type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder={tr(locale,'Nhập mật khẩu','Enter password')} required minLength={8} maxLength={128}/><button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? tr(locale,'Ẩn mật khẩu','Hide password') : tr(locale,'Hiện mật khẩu','Show password')}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label><div className="login-options"><label><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/> {tr(locale,'Ghi nhớ đăng nhập','Remember me')}</label><a href="/forgot-password">{tr(locale,'Quên mật khẩu?','Forgot password?')}</a></div>{error && <div className="login-error" role="alert">{error}</div>}<button className="login-submit" disabled={loading}>{loading ? tr(locale,'Đang xác thực...','Signing in...') : tr(locale,'Đăng nhập','Sign in')}</button></form>
      <p className="login-help">{tr(locale,'Bạn chưa có tài khoản? Liên hệ quản trị viên để được cấp quyền.','Need an account? Contact your administrator for access.')}</p>
    </div></section>
  </main>;
}
