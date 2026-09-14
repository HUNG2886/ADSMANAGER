'use client';

import { Send, Share2, X } from 'lucide-react';
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
  data?: { multiPartyAuthReview?: string | null };
  error?: GoogleAdsApiErrorPayload;
};

export function ShareAccountButton({ targetType, targetId, targetName, customerId }: Props) {
  const locale = useAppLocale();
  const [open, setOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [accessRole, setAccessRole] = useState<'READ_ONLY' | 'STANDARD'>('READ_ONLY');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function close() {
    if (busy) return;
    setOpen(false);
    setError('');
    setSuccess('');
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

  return <>
    <button className="ga-share-trigger" type="button" onClick={() => setOpen(true)} title={tr(locale, 'Chia sẻ tài khoản', 'Share account')}>
      <Share2 size={13}/><span>{tr(locale, 'Chia sẻ', 'Share')}</span>
    </button>
    {open && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <form className="confirm-modal ga-share-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={tr(locale, 'Chia sẻ tài khoản Google Ads', 'Share Google Ads account')}>
        <button className="modal-close" type="button" onClick={close} aria-label={tr(locale, 'Đóng', 'Close')}><X size={17}/></button>
        <span className="modal-icon"><Share2 size={20}/></span>
        <h2>{tr(locale, 'Chia sẻ tài khoản', 'Share account')}</h2>
        <p>{targetName} · {customerId}</p>
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
          {!success && <button className="primary-action" type="submit" disabled={busy}><Send size={13}/>{busy ? tr(locale, 'Đang gửi...', 'Sending...') : tr(locale, 'Gửi lời mời', 'Send invitation')}</button>}
        </div>
      </form>
    </div>}
  </>;
}
