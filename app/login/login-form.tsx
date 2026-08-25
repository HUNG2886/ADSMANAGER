'use client';

import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck, Users } from 'lucide-react';

const GOOGLE_ERRORS:Record<string,string>={
  GOOGLE_LOGIN_NOT_CONFIGURED:'Google Sign-In chưa được cấu hình.',AUTH_NOT_CONFIGURED:'Hệ thống phiên đăng nhập chưa được cấu hình.',DATABASE_REQUIRED:'Google Sign-In cần kết nối PostgreSQL.',GOOGLE_LOGIN_CANCELLED:'Bạn đã huỷ đăng nhập Google.',GOOGLE_LOGIN_STATE_INVALID:'Phiên xác thực Google không hợp lệ. Vui lòng thử lại.',GOOGLE_EMAIL_NOT_VERIFIED:'Email Google chưa được xác minh.',GOOGLE_ACCOUNT_NOT_ALLOWED:'Email Google này chưa được ADMIN cấp tài khoản hoặc đang bị đình chỉ.',GOOGLE_ACCOUNT_LINK_MISMATCH:'Tài khoản này đã liên kết với một danh tính Google khác.',GOOGLE_LOGIN_FAILED:'Không thể hoàn tất đăng nhập Google.'
};

export function LoginForm({googleEnabled,returnTo,googleError}:{googleEnabled:boolean;returnTo:string;googleError:string}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(GOOGLE_ERRORS[googleError]||'');

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, remember }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || 'Không thể đăng nhập.');
      window.location.assign(returnTo);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đăng nhập.'); }
    finally { setLoading(false); }
  }

  return <main className="login-shell">
    <section className="login-story">
      <div className="login-brand"><span className="brand-mark">A</span><span>Ads Manager <b>Pro</b></span></div>
      <div className="login-copy"><p className="login-eyebrow">MULTI-MCC CONTROL CENTER</p><h1>Một nơi để vận hành toàn bộ hệ thống quảng cáo.</h1><p>Đăng nhập để quản lý MCC, theo dõi hiệu suất và phối hợp cùng đội ngũ theo đúng quyền được cấp.</p></div>
      <div className="role-preview"><article><span><ShieldCheck size={18}/></span><div><strong>Quản trị viên</strong><p>Toàn quyền hệ thống, kết nối MCC và quản lý thành viên.</p></div></article><article><span><Users size={18}/></span><div><strong>Cộng tác viên</strong><p>Chỉ xem dữ liệu, báo cáo và nhật ký trong phạm vi được cấp.</p></div></article></div>
      <small className="login-footnote">Bảo vệ phiên bằng cookie HttpOnly · Tự động hết hạn sau 12 giờ</small>
    </section>
    <section className="login-panel"><div className="login-card"><span className="login-lock"><LockKeyhole size={21}/></span><p className="login-eyebrow">TRUY CẬP BẢO MẬT</p><h2>Đăng nhập hệ thống</h2><p className="login-intro">Sử dụng tài khoản do quản trị viên cấp.</p>
      <form onSubmit={submit}><label>Email hoặc tên đăng nhập<input type="text" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="davidagency hoặc name@company.com" required /></label><label>Mật khẩu<div className="password-field"><input type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required minLength={8} maxLength={128}/><button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label><div className="login-options"><label><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/> Ghi nhớ đăng nhập</label><a href="/forgot-password">Quên mật khẩu?</a></div>{error && <div className="login-error" role="alert">{error}</div>}<button className="login-submit" disabled={loading}>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</button></form>
      {googleEnabled&&<><div className="login-divider"><span>hoặc</span></div><a className="google-login" href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}><b>G</b><span>Đăng nhập bằng Google</span></a></>}
      <p className="login-help">Bạn chưa có tài khoản? Liên hệ quản trị viên để được cấp quyền.</p>
    </div></section>
  </main>;
}
