'use client';

import { AlertTriangle, LogOut, RefreshCw, Send, Trash2, UsersRound, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useAppLocale } from '@/app/locale-provider';
import { formatGoogleAdsApiError, type GoogleAdsApiErrorPayload } from '@/lib/google-ads-format';
import { tr } from '@/lib/i18n';
import leaveStyles from './leave-access.module.css';

type Props = {
  targetType: 'MCC' | 'ACCOUNT';
  targetId: string;
  targetName: string;
  customerId: string;
};

type ApiResponse = {
  data?: {
    multiPartyAuthReview?: string | null;
    users?: AccessUser[];
  };
  error?: GoogleAdsApiErrorPayload;
};

type AccessUser = {
  userId: string;
  emailAddress: string;
  accessRole: 'ADMIN' | 'STANDARD' | 'READ_ONLY' | 'EMAIL_ONLY' | 'UNKNOWN';
  protected: boolean;
};

export function ShareAccountButton({ targetType, targetId, targetName, customerId }: Props) {
  const locale = useAppLocale();
  const [open, setOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [accessRole, setAccessRole] = useState<'READ_ONLY' | 'STANDARD'>('READ_ONLY');
  const [busy, setBusy] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [removingEmail, setRemovingEmail] = useState('');
  const [leaveCandidate, setLeaveCandidate] = useState<AccessUser | null>(null);
  const [leaveConfirmation, setLeaveConfirmation] = useState('');
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function close() {
    if (busy || removingEmail) return;
    setOpen(false);
    setError('');
    setSuccess('');
    setLeaveCandidate(null);
    setLeaveConfirmation('');
  }

  async function loadUsers() {
    setLoadingUsers(true);
    setError('');
    try {
      const query = new URLSearchParams({ targetType, targetId });
      const response = await fetch(`/api/google-ads/user-access?${query}`);
      const payload = await response.json() as ApiResponse;
      if (!response.ok) {
        setUsers([]);
        setError(formatGoogleAdsApiError(payload.error, tr(locale, 'Không thể tải danh sách quyền.', 'Unable to load access list.')));
        return;
      }
      setUsers(payload.data?.users ?? []);
    } catch {
      setUsers([]);
      setError(tr(locale, 'Không thể kết nối máy chủ để tải danh sách quyền.', 'Could not reach the server to load the access list.'));
    } finally {
      setLoadingUsers(false);
    }
  }

  function openModal() {
    setOpen(true);
    setUsers([]);
    setError('');
    setSuccess('');
    void loadUsers();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (leaveCandidate) return;
    setBusy(true);
    setError('');
    setSuccess('');
    const response = await fetch('/api/google-ads/access-invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetType, targetId, emailAddress, accessRole }),
    });
    const payload = await response.json() as ApiResponse;
    setBusy(false);
    if (!response.ok) {
      setError(formatGoogleAdsApiError(payload.error, tr(locale, 'Không thể gửi lời mời.', 'Unable to send the invitation.')));
      return;
    }
    setSuccess(payload.data?.multiPartyAuthReview
      ? tr(locale, 'Yêu cầu đang chờ một quản trị viên Google Ads khác phê duyệt.', 'The request is waiting for approval from another Google Ads administrator.')
      : tr(locale, 'Đã gửi lời mời chia sẻ tài khoản.', 'The account invitation was sent.'));
  }

  async function removeAccess(user: AccessUser) {
    if (user.protected) return;
    if (!window.confirm(tr(
      locale,
      `Xóa toàn bộ quyền Google Ads của ${user.emailAddress} khỏi ${targetName}?`,
      `Remove all Google Ads access for ${user.emailAddress} from ${targetName}?`,
    ))) return;
    setRemovingEmail(user.emailAddress);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/google-ads/user-access', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, emailAddress: user.emailAddress }),
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok) {
        setError(formatGoogleAdsApiError(payload.error, tr(locale, 'Không thể xóa quyền truy cập.', 'Unable to remove access.')));
        return;
      }
      if (payload.data?.multiPartyAuthReview) {
        setSuccess(tr(
          locale,
          'Yêu cầu xóa đang chờ một quản trị viên Google Ads khác phê duyệt.',
          'The removal request is waiting for approval from another Google Ads administrator.',
        ));
        return;
      }
      setUsers(current => current.filter(item => item.userId !== user.userId));
      setSuccess(tr(locale, `Đã xóa quyền của ${user.emailAddress}.`, `Removed access for ${user.emailAddress}.`));
    } catch {
      setError(tr(locale, 'Không thể kết nối máy chủ để xóa quyền truy cập.', 'Could not reach the server to remove access.'));
    } finally {
      setRemovingEmail('');
    }
  }

  function requestLeaveAccess(user: AccessUser) {
    setLeaveCandidate(user);
    setLeaveConfirmation('');
    setError('');
    setSuccess('');
  }

  async function leaveAccess() {
    if (!leaveCandidate || leaveConfirmation.replace(/\D/g, '') !== customerId.replace(/\D/g, '')) return;
    setRemovingEmail(leaveCandidate.emailAddress);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/google-ads/self-access', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, confirmationCustomerId: leaveConfirmation }),
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok) {
        setError(formatGoogleAdsApiError(payload.error, tr(locale, 'Không thể xóa quyền của bạn.', 'Unable to remove your access.')));
        return;
      }
      setLeaveCandidate(null);
      setLeaveConfirmation('');
      if (payload.data?.multiPartyAuthReview) {
        setSuccess(tr(
          locale,
          'Yêu cầu rời tài khoản đang chờ một quản trị viên Google Ads khác phê duyệt.',
          'Your request to leave the account is waiting for approval from another Google Ads administrator.',
        ));
        return;
      }
      setUsers(current => current.filter(item => item.userId !== leaveCandidate.userId));
      setSuccess(tr(
        locale,
        `Đã xóa quyền của ${leaveCandidate.emailAddress} khỏi tài khoản Google Ads.`,
        `Removed ${leaveCandidate.emailAddress} from the Google Ads account.`,
      ));
    } catch {
      setError(tr(locale, 'Không thể kết nối máy chủ để xóa quyền của bạn.', 'Could not reach the server to remove your access.'));
    } finally {
      setRemovingEmail('');
    }
  }

  function roleLabel(role: AccessUser['accessRole']) {
    if (role === 'ADMIN') return tr(locale, 'Quản trị', 'Admin');
    if (role === 'STANDARD') return tr(locale, 'Quyền chuẩn', 'Standard');
    if (role === 'READ_ONLY') return tr(locale, 'Chỉ đọc', 'Read only');
    if (role === 'EMAIL_ONLY') return tr(locale, 'Chỉ email', 'Email only');
    return role;
  }

  return <>
    <button className="ga-share-trigger" type="button" onClick={openModal} title={tr(locale, 'Quản lý quyền truy cập', 'Manage access')}>
      <UsersRound size={13}/><span>{tr(locale, 'Quản lý quyền', 'Manage access')}</span>
    </button>
    {open && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <form className="confirm-modal ga-share-modal ga-access-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={tr(locale, 'Quản lý quyền Google Ads', 'Manage Google Ads access')}>
        <button className="modal-close" type="button" onClick={close} aria-label={tr(locale, 'Đóng', 'Close')}><X size={17}/></button>
        <span className="modal-icon"><UsersRound size={20}/></span>
        <h2>{tr(locale, 'Quản lý quyền truy cập', 'Manage access')}</h2>
        <p>{targetName} · {customerId}</p>
        <section className="ga-user-access-list">
          <header>
            <div><strong>{tr(locale, 'Email đang có quyền', 'Users with access')}</strong><small>{tr(locale, `${users.length} người dùng`, `${users.length} users`)}</small></div>
            <button type="button" onClick={() => void loadUsers()} disabled={loadingUsers || Boolean(removingEmail)}><RefreshCw className={loadingUsers ? 'spin' : ''} size={13}/>{tr(locale, 'Làm mới', 'Refresh')}</button>
          </header>
          {loadingUsers
            ? <p className="ga-access-empty">{tr(locale, 'Đang tải danh sách...', 'Loading access list...')}</p>
            : users.length === 0
              ? <p className="ga-access-empty">{tr(locale, 'Không có email trực tiếp hoặc MCC không có quyền quản lý.', 'No direct users, or the MCC cannot manage access.')}</p>
              : <div className="ga-access-users">{users.map(user => <article key={user.userId}>
                  <div><strong>{user.emailAddress}</strong><small>{roleLabel(user.accessRole)}{user.protected ? ` · ${tr(locale, 'Kết nối OAuth', 'OAuth connection')}` : ''}</small></div>
                  <button type="button" className={`danger ${user.protected ? leaveStyles.leaveButton : ''}`} disabled={Boolean(removingEmail)} onClick={() => user.protected ? requestLeaveAccess(user) : void removeAccess(user)} title={user.protected ? tr(locale, 'Xóa quyền của chính bạn', 'Remove your own access') : tr(locale, 'Xóa quyền truy cập', 'Remove access')}>
                    {user.protected ? <LogOut size={13}/> : <Trash2 size={13}/>} {removingEmail === user.emailAddress ? tr(locale, 'Đang xóa...', 'Removing...') : user.protected ? tr(locale, 'Rời tài khoản', 'Leave account') : tr(locale, 'Xóa quyền', 'Remove')}
                  </button>
                </article>)}</div>}
        </section>
        {leaveCandidate && <section className={leaveStyles.confirm} aria-label={tr(locale, 'Xác nhận rời tài khoản', 'Confirm leaving account')}>
          <div className={leaveStyles.confirmHeader}><AlertTriangle size={18}/><div><strong>{tr(locale, 'Xóa quyền Google Ads của chính bạn?', 'Remove your own Google Ads access?')}</strong><p>{tr(locale, 'Thao tác này thực hiện trực tiếp trên Google Ads và không thể hoàn tác từ website.', 'This action is performed directly in Google Ads and cannot be undone from this website.')}</p></div></div>
          <div className={leaveStyles.details}><div><span>{tr(locale, 'Email sẽ bị xóa', 'Email to remove')}</span><strong>{leaveCandidate.emailAddress}</strong></div><div><span>{tr(locale, 'Tài khoản đích', 'Target account')}</span><strong>{targetName} · {customerId}</strong></div></div>
          <p className={leaveStyles.warning}>{targetType === 'MCC'
            ? tr(locale, 'Bạn có thể mất quyền truy cập toàn bộ tài khoản con được quản lý bởi MCC này. Google sẽ từ chối nếu bạn là quản trị viên cuối cùng.', 'You may lose access to all child accounts managed by this MCC. Google will reject the request if you are the last administrator.')
            : tr(locale, 'Chức năng này chỉ xóa quyền trực tiếp. Nếu quyền được kế thừa từ MCC, bạn vẫn có thể truy cập tài khoản qua MCC đó.', 'This removes direct access only. If access is inherited from an MCC, you may still access this account through that MCC.')}</p>
          <label className={leaveStyles.field}><span>{tr(locale, `Nhập Customer ID ${customerId} để xác nhận`, `Enter Customer ID ${customerId} to confirm`)}</span><input value={leaveConfirmation} onChange={event => setLeaveConfirmation(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (leaveConfirmation.replace(/\D/g, '') === customerId.replace(/\D/g, '') && !removingEmail) void leaveAccess(); } }} inputMode="numeric" autoComplete="off" placeholder={customerId}/></label>
          <div className={leaveStyles.actions}><button type="button" onClick={() => { setLeaveCandidate(null); setLeaveConfirmation(''); }}>{tr(locale, 'Hủy', 'Cancel')}</button><button type="button" disabled={leaveConfirmation.replace(/\D/g, '') !== customerId.replace(/\D/g, '') || Boolean(removingEmail)} onClick={() => void leaveAccess()}><LogOut size={13}/>{removingEmail ? tr(locale, 'Đang xử lý...', 'Processing...') : tr(locale, 'Xóa quyền của tôi', 'Remove my access')}</button></div>
        </section>}
        <div className="ga-access-divider"><span>{tr(locale, 'Mời email mới', 'Invite a new user')}</span></div>
        <label className="ga-share-field">
          <span>Email Google</span>
          <input type="email" required maxLength={254} autoFocus value={emailAddress} onChange={event => setEmailAddress(event.target.value)} placeholder="name@gmail.com"/>
        </label>
        <fieldset className="ga-share-roles">
          <legend>{tr(locale, 'Quyền truy cập', 'Access level')}</legend>
          <label><input type="radio" name="accessRole" value="READ_ONLY" checked={accessRole === 'READ_ONLY'} onChange={() => setAccessRole('READ_ONLY')}/><span><strong>{tr(locale, 'Chỉ đọc', 'Read only')}</strong><small>{tr(locale, 'Xem tài khoản nhưng không thể chỉnh sửa.', 'Can view the account but cannot make changes.')}</small></span></label>
          <label><input type="radio" name="accessRole" value="STANDARD" checked={accessRole === 'STANDARD'} onChange={() => setAccessRole('STANDARD')}/><span><strong>{tr(locale, 'Quyền chuẩn', 'Standard')}</strong><small>{tr(locale, 'Có thể xem và chỉnh sửa chiến dịch.', 'Can view and edit campaigns.')}</small></span></label>
        </fieldset>
        {error && <p className="form-error ga-share-message">{error}</p>}
        {success && <p className="ga-share-success">{success}</p>}
        <div className="modal-actions">
          <button type="button" onClick={close}>{success ? tr(locale, 'Đóng', 'Close') : tr(locale, 'Huỷ', 'Cancel')}</button>
          <button className="primary-action" type="submit" disabled={busy || Boolean(removingEmail)}><Send size={13}/>{busy ? tr(locale, 'Đang gửi...', 'Sending...') : tr(locale, 'Gửi lời mời', 'Send invitation')}</button>
        </div>
      </form>
    </div>}
  </>;
}
