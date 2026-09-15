'use client';

import { RefreshCw, Send, Trash2, UsersRound, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useAppLocale } from '@/app/locale-provider';
import { formatGoogleAdsApiError, type GoogleAdsApiErrorPayload } from '@/lib/google-ads-format';
import { tr } from '@/lib/i18n';

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
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function close() {
    if (busy || removingEmail) return;
    setOpen(false);
    setError('');
    setSuccess('');
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
                  <button type="button" className="danger" disabled={user.protected || Boolean(removingEmail)} onClick={() => void removeAccess(user)} title={user.protected ? tr(locale, 'Không thể xóa Gmail đang đồng bộ', 'The syncing Google account cannot be removed') : tr(locale, 'Xóa quyền truy cập', 'Remove access')}>
                    <Trash2 size={13}/>{removingEmail === user.emailAddress ? tr(locale, 'Đang xóa...', 'Removing...') : tr(locale, 'Xóa quyền', 'Remove')}
                  </button>
                </article>)}</div>}
        </section>
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
