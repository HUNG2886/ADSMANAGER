'use client';

import { AlertTriangle, KeyRound, Pencil, Search, ShieldCheck, Trash2, UserCheck, UserPlus, Users, UserX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppLocale } from '@/app/locale-provider';
import { dateLocale, tr } from '@/lib/i18n';
import { StaffPermissions } from './staff-permissions';
import styles from './user-administration.module.css';

type Role = 'ADMIN' | 'STAFF';
type Status = 'ACTIVE' | 'SUSPENDED';
type Member = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  status: Status;
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
  mccIds: string[];
};
type UsersData = { items: Member[]; databaseConfigured: boolean };
type ApiEnvelope<T> = { data?: T; error?: { message?: string } };
type Editor = 'new' | Member | null;
type FormState = { name: string; email: string; password: string; confirmPassword: string; role: Role; status: Status };

const emptyForm: FormState = { name: '', email: '', password: '', confirmPassword: '', role: 'STAFF', status: 'ACTIVE' };

export function UserAdministration({ currentUserId }: { currentUserId: string }) {
  const locale = useAppLocale();
  const [tab, setTab] = useState<'accounts' | 'permissions'>('accounts');
  const [revision, setRevision] = useState(0);

  return <>
    <div className={styles.tabs} role="tablist" aria-label={tr(locale, 'Quản trị tài khoản', 'Account administration')}>
      <button className={tab === 'accounts' ? styles.activeTab : ''} onClick={() => setTab('accounts')} role="tab" aria-selected={tab === 'accounts'}>
        <Users size={15}/>{tr(locale, 'Tài khoản đăng nhập', 'Sign-in accounts')}
      </button>
      <button className={tab === 'permissions' ? styles.activeTab : ''} onClick={() => setTab('permissions')} role="tab" aria-selected={tab === 'permissions'}>
        <ShieldCheck size={15}/>{tr(locale, 'Phân quyền MCC', 'MCC permissions')}
      </button>
    </div>
    {tab === 'accounts'
      ? <UserManagement currentUserId={currentUserId} onChanged={() => setRevision(value => value + 1)}/>
      : <StaffPermissions refreshKey={revision}/>
    }
  </>;
}

function UserManagement({ currentUserId, onChanged }: { currentUserId: string; onChanged: () => void }) {
  const locale = useAppLocale();
  const [members, setMembers] = useState<Member[]>([]);
  const [databaseConfigured, setDatabaseConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL');
  const [editor, setEditor] = useState<Editor>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/users', { cache: 'no-store' });
      const payload = await response.json() as ApiEnvelope<UsersData>;
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || tr(locale, 'Không thể tải danh sách tài khoản.', 'Unable to load accounts.'));
      setMembers(payload.data.items);
      setDatabaseConfigured(payload.data.databaseConfigured);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr(locale, 'Không thể tải danh sách tài khoản.', 'Unable to load accounts.'));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users', { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json() as ApiEnvelope<UsersData>;
        if (!response.ok || !payload.data) throw new Error(payload.error?.message || tr(locale, 'Không thể tải danh sách tài khoản.', 'Unable to load accounts.'));
        return payload.data;
      })
      .then(data => {
        if (cancelled) return;
        setMembers(data.items);
        setDatabaseConfigured(data.databaseConfigured);
      })
      .catch(cause => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : tr(locale, 'Không thể tải danh sách tài khoản.', 'Unable to load accounts.'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [locale]);

  const visibleMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter(member => {
      const matchesQuery = !needle || `${member.name || ''} ${member.email}`.toLowerCase().includes(needle);
      return matchesQuery && (roleFilter === 'ALL' || member.role === roleFilter) && (statusFilter === 'ALL' || member.status === statusFilter);
    });
  }, [members, query, roleFilter, statusFilter]);

  const counts = useMemo(() => ({
    total: members.length,
    active: members.filter(member => member.status === 'ACTIVE').length,
    admins: members.filter(member => member.role === 'ADMIN').length,
    suspended: members.filter(member => member.status === 'SUSPENDED').length,
  }), [members]);

  function openCreate() {
    setEditor('new');
    setForm(emptyForm);
    setError('');
  }

  function openEdit(member: Member) {
    setEditor(member);
    setForm({ name: member.name || '', email: member.email, password: '', confirmPassword: '', role: member.role, status: member.status });
    setError('');
  }

  function closeEditor() {
    if (busy) return;
    setEditor(null);
    setForm(emptyForm);
    setError('');
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setError('');
    setNotice('');
    if (form.password !== form.confirmPassword) {
      setError(tr(locale, 'Xác nhận mật khẩu không khớp.', 'Password confirmation does not match.'));
      return;
    }
    if (editor === 'new' && !form.password) {
      setError(tr(locale, 'Mật khẩu là bắt buộc khi tạo tài khoản.', 'A password is required for a new account.'));
      return;
    }
    setBusy(true);
    try {
      const editingMember = editor === 'new' ? null : editor;
      const body = editor === 'new'
        ? { name: form.name, email: form.email, password: form.password, role: form.role, status: form.status }
        : { id: editor.id, name: form.name, email: form.email, role: form.role, status: form.status, ...(form.password ? { password: form.password } : {}) };
      const response = await fetch('/api/users', { method: editor === 'new' ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json() as ApiEnvelope<Member>;
      if (!response.ok) throw new Error(payload.error?.message || tr(locale, 'Không thể lưu tài khoản.', 'Unable to save the account.'));
      const invalidatedCurrentSession = editingMember?.id === currentUserId && Boolean(form.password || form.email !== editingMember.email || form.role !== editingMember.role || form.status !== editingMember.status);
      setEditor(null);
      setForm(emptyForm);
      setNotice(editor === 'new' ? tr(locale, 'Đã tạo tài khoản đăng nhập.', 'Sign-in account created.') : tr(locale, 'Đã cập nhật tài khoản.', 'Account updated.'));
      onChanged();
      if (invalidatedCurrentSession) {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.assign('/login');
        return;
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr(locale, 'Không thể lưu tài khoản.', 'Unable to save the account.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: Member) {
    const confirmed = window.confirm(tr(locale, `Xóa tài khoản “${member.name || member.email}”? Người dùng sẽ không thể đăng nhập lại.`, `Delete “${member.name || member.email}”? This user will no longer be able to sign in.`));
    if (!confirmed) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/users?id=${encodeURIComponent(member.id)}`, { method: 'DELETE' });
      const payload = await response.json() as ApiEnvelope<{ id: string }>;
      if (!response.ok) throw new Error(payload.error?.message || tr(locale, 'Không thể xóa tài khoản.', 'Unable to delete the account.'));
      setNotice(tr(locale, 'Đã xóa tài khoản đăng nhập.', 'Sign-in account deleted.'));
      onChanged();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr(locale, 'Không thể xóa tài khoản.', 'Unable to delete the account.'));
    } finally {
      setBusy(false);
    }
  }

  return <section className={styles.manager}>
    <div className={styles.stats}>
      <article><Users size={18}/><span>{tr(locale, 'Tổng tài khoản', 'Total accounts')}</span><strong>{counts.total}</strong></article>
      <article><UserCheck size={18}/><span>{tr(locale, 'Đang hoạt động', 'Active')}</span><strong>{counts.active}</strong></article>
      <article><ShieldCheck size={18}/><span>ADMIN</span><strong>{counts.admins}</strong></article>
      <article><UserX size={18}/><span>{tr(locale, 'Đã đình chỉ', 'Suspended')}</span><strong>{counts.suspended}</strong></article>
    </div>

    {!databaseConfigured && <div className="ga-alert warning"><AlertTriangle size={18}/><div><strong>{tr(locale, 'Chưa kết nối cơ sở dữ liệu', 'Database is not connected')}</strong><p>{tr(locale, 'Cần cấu hình DATABASE_URL để thêm, sửa hoặc xóa tài khoản.', 'DATABASE_URL is required to add, edit, or delete accounts.')}</p></div></div>}
    {notice && <div className="ga-alert success"><ShieldCheck size={18}/><div><strong>{notice}</strong></div></div>}
    {error && !editor && <div className="ga-alert danger"><AlertTriangle size={18}/><div><strong>{error}</strong></div></div>}

    <div className={styles.toolbar}>
      <label className={styles.search}><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={tr(locale, 'Tìm tên, email hoặc tên đăng nhập', 'Search name, email, or username')}/></label>
      <select value={roleFilter} onChange={event => setRoleFilter(event.target.value as 'ALL' | Role)} aria-label={tr(locale, 'Lọc vai trò', 'Filter by role')}>
        <option value="ALL">{tr(locale, 'Tất cả vai trò', 'All roles')}</option><option value="ADMIN">ADMIN</option><option value="STAFF">STAFF</option>
      </select>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'ALL' | Status)} aria-label={tr(locale, 'Lọc trạng thái', 'Filter by status')}>
        <option value="ALL">{tr(locale, 'Tất cả trạng thái', 'All statuses')}</option><option value="ACTIVE">{tr(locale, 'Hoạt động', 'Active')}</option><option value="SUSPENDED">{tr(locale, 'Đình chỉ', 'Suspended')}</option>
      </select>
      <button className="ga-primary" onClick={openCreate} disabled={!databaseConfigured}><UserPlus size={15}/>{tr(locale, 'Thêm tài khoản', 'Add account')}</button>
    </div>

    <div className={`ga-panel ${styles.tablePanel}`}>
      <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>{tr(locale, 'Tài khoản', 'Account')}</th><th>{tr(locale, 'Vai trò', 'Role')}</th><th>{tr(locale, 'Trạng thái', 'Status')}</th><th>{tr(locale, 'Bảo mật', 'Security')}</th><th>{tr(locale, 'Đăng nhập gần nhất', 'Last sign-in')}</th><th>{tr(locale, 'Thao tác', 'Actions')}</th></tr></thead>
        <tbody>
          {loading && <tr><td colSpan={6} className={styles.empty}>{tr(locale, 'Đang tải tài khoản...', 'Loading accounts...')}</td></tr>}
          {!loading && visibleMembers.map((member, index) => <tr key={member.id}>
            <td><div className={styles.identity}><span data-tone={index % 4}>{(member.name || member.email).slice(0, 2).toUpperCase()}</span><div><strong>{member.name || tr(locale, 'Chưa đặt tên', 'Unnamed')}{member.id === currentUserId && <em>{tr(locale, 'Bạn', 'You')}</em>}</strong><small>{member.email}</small></div></div></td>
            <td><b className={`${styles.role} ${member.role === 'ADMIN' ? styles.admin : styles.staff}`}>{member.role === 'ADMIN' ? tr(locale, 'Quản trị viên', 'Administrator') : tr(locale, 'Cộng tác viên', 'Staff')}</b></td>
            <td><b className={`${styles.status} ${member.status === 'ACTIVE' ? styles.active : styles.suspended}`}><i/>{member.status === 'ACTIVE' ? tr(locale, 'Hoạt động', 'Active') : tr(locale, 'Đình chỉ', 'Suspended')}</b></td>
            <td><span className={styles.security}><KeyRound size={13}/>{member.hasPassword ? tr(locale, 'Mật khẩu', 'Password') : tr(locale, 'Chưa có mật khẩu', 'No password')}</span></td>
            <td><span className={styles.date}>{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString(dateLocale(locale)) : tr(locale, 'Chưa đăng nhập', 'Never')}</span></td>
            <td><div className={styles.actions}><button onClick={() => openEdit(member)} aria-label={tr(locale, 'Sửa tài khoản', 'Edit account')}><Pencil size={14}/><span>{tr(locale, 'Sửa', 'Edit')}</span></button><button className={styles.delete} onClick={() => void remove(member)} disabled={busy || member.id === currentUserId} title={member.id === currentUserId ? tr(locale, 'Không thể xóa tài khoản đang đăng nhập', 'You cannot delete the current account') : undefined}><Trash2 size={14}/><span>{tr(locale, 'Xóa', 'Delete')}</span></button></div></td>
          </tr>)}
          {!loading && visibleMembers.length === 0 && <tr><td colSpan={6} className={styles.empty}>{tr(locale, 'Không tìm thấy tài khoản phù hợp.', 'No matching account found.')}</td></tr>}
        </tbody>
      </table></div>
    </div>

    {editor && <div className={styles.backdrop} onMouseDown={event => { if (event.target === event.currentTarget) closeEditor(); }}>
      <form className={styles.dialog} onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="account-editor-title">
        <button className={styles.close} type="button" onClick={closeEditor} aria-label={tr(locale, 'Đóng', 'Close')}><X size={18}/></button>
        <span className={styles.dialogIcon}>{editor === 'new' ? <UserPlus size={20}/> : <Pencil size={20}/>}</span>
        <h2 id="account-editor-title">{editor === 'new' ? tr(locale, 'Thêm tài khoản đăng nhập', 'Add sign-in account') : tr(locale, 'Chỉnh sửa tài khoản', 'Edit account')}</h2>
        <p>{tr(locale, 'Tài khoản này dùng để đăng nhập trực tiếp vào website bằng mật khẩu.', 'This account signs in to the website directly with a password.')}</p>
        <div className={styles.formGrid}>
          <label>{tr(locale, 'Tên hiển thị', 'Display name')}<input value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} minLength={2} maxLength={100} required autoFocus/></label>
          <label>{tr(locale, 'Email hoặc tên đăng nhập', 'Email or username')}<input value={form.email} onChange={event => setForm(value => ({ ...value, email: event.target.value }))} minLength={3} maxLength={180} autoComplete="username" required/></label>
          <label>{tr(locale, 'Vai trò', 'Role')}<select value={form.role} onChange={event => setForm(value => ({ ...value, role: event.target.value as Role }))}><option value="STAFF">{tr(locale, 'Cộng tác viên — chỉ xem', 'Staff — read only')}</option><option value="ADMIN">{tr(locale, 'Quản trị viên — toàn quyền', 'Administrator — full access')}</option></select></label>
          <label>{tr(locale, 'Trạng thái', 'Status')}<select value={form.status} onChange={event => setForm(value => ({ ...value, status: event.target.value as Status }))}><option value="ACTIVE">{tr(locale, 'Đang hoạt động', 'Active')}</option><option value="SUSPENDED">{tr(locale, 'Đình chỉ truy cập', 'Suspend access')}</option></select></label>
          <label>{editor === 'new' ? tr(locale, 'Mật khẩu', 'Password') : tr(locale, 'Mật khẩu mới (không bắt buộc)', 'New password (optional)')}<input type="password" value={form.password} onChange={event => setForm(value => ({ ...value, password: event.target.value }))} minLength={10} maxLength={128} autoComplete="new-password" required={editor === 'new'} placeholder={tr(locale, 'Ít nhất 10 ký tự, có chữ và số', 'At least 10 characters with letters and numbers')}/></label>
          <label>{tr(locale, 'Xác nhận mật khẩu', 'Confirm password')}<input type="password" value={form.confirmPassword} onChange={event => setForm(value => ({ ...value, confirmPassword: event.target.value }))} minLength={form.password ? 10 : undefined} maxLength={128} autoComplete="new-password" required={editor === 'new' || Boolean(form.password)}/></label>
        </div>
        {editor !== 'new' && <div className={styles.sessionWarning}><AlertTriangle size={15}/><span>{tr(locale, 'Đổi email, mật khẩu, vai trò hoặc trạng thái sẽ đăng xuất các phiên hiện tại của người dùng.', 'Changing email, password, role, or status signs out the user’s current sessions.')}</span></div>}
        {error && <div className={styles.formError}>{error}</div>}
        <div className={styles.dialogActions}><button type="button" onClick={closeEditor} disabled={busy}>{tr(locale, 'Hủy', 'Cancel')}</button><button className="ga-primary" disabled={busy}>{busy ? tr(locale, 'Đang lưu...', 'Saving...') : editor === 'new' ? tr(locale, 'Tạo tài khoản', 'Create account') : tr(locale, 'Lưu thay đổi', 'Save changes')}</button></div>
      </form>
    </div>}
  </section>;
}
