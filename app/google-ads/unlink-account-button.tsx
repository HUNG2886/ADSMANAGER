'use client';

import { AlertTriangle, Link2Off, X } from 'lucide-react';
import { useState } from 'react';
import { useAppLocale } from '@/app/locale-provider';
import { formatGoogleAdsApiError, type GoogleAdsApiErrorPayload } from '@/lib/google-ads-format';
import { tr } from '@/lib/i18n';
import styles from './unlink-account-button.module.css';

type Props = {
  accountId: string;
  accountName: string;
  customerId: string;
  mccName: string;
  mccCustomerId: string;
  successRedirect?: string;
};

type ApiResponse = {
  error?: GoogleAdsApiErrorPayload;
};

export function UnlinkAccountButton({ accountId, accountName, customerId, mccName, mccCustomerId, successRedirect }: Props) {
  const locale = useAppLocale();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const normalizedConfirmation = confirmation.replace(/\D/g, '');
  const normalizedCustomerId = customerId.replace(/\D/g, '');
  const confirmed = normalizedConfirmation === normalizedCustomerId;

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirmation('');
    setError('');
  }

  async function unlink() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/google-ads/accounts/${accountId}/manager-link`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmationCustomerId: confirmation }),
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok) {
        setError(formatGoogleAdsApiError(payload.error, tr(locale, 'Không thể gỡ tài khoản khỏi MCC.', 'Unable to unlink the account from the MCC.')));
        return;
      }
      window.location.assign(successRedirect ?? '/google-ads/accounts');
    } catch {
      setError(tr(locale, 'Không thể kết nối máy chủ để gỡ tài khoản.', 'Could not reach the server to unlink the account.'));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button className={styles.trigger} type="button" onClick={() => setOpen(true)} title={tr(locale, 'Gỡ tài khoản khỏi MCC', 'Unlink account from MCC')}>
      <Link2Off size={13}/><span>{tr(locale, 'Gỡ khỏi MCC', 'Unlink from MCC')}</span>
    </button>
    {open && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <section className={`confirm-modal ${styles.modal}`} role="dialog" aria-modal="true" aria-labelledby={`unlink-account-${accountId}`}>
        <button className="modal-close" type="button" onClick={close} aria-label={tr(locale, 'Đóng', 'Close')}><X size={17}/></button>
        <span className="modal-icon pause"><Link2Off size={20}/></span>
        <h2 id={`unlink-account-${accountId}`}>{tr(locale, 'Gỡ tài khoản khỏi MCC?', 'Unlink account from MCC?')}</h2>
        <p className={styles.intro}>{tr(locale, 'Yêu cầu sẽ được gửi trực tiếp tới Google Ads.', 'This request will be sent directly to Google Ads.')}</p>
        <div className={styles.warning}>
          <AlertTriangle size={18}/>
          <div><strong>{tr(locale, 'Thao tác có ảnh hưởng thật', 'This is a live destructive action')}</strong><p>{tr(locale, 'Liên kết MCC sẽ bị chấm dứt và dữ liệu đồng bộ của liên kết này sẽ bị xóa khỏi website. Tài khoản Google Ads, chiến dịch và dữ liệu trên Google không bị xóa.', 'The MCC link and its synchronized website data will be removed. The Google Ads account, campaigns, and data stored by Google will not be deleted.')}</p></div>
        </div>
        <div className={styles.details}>
          <div><span>{tr(locale, 'Tài khoản sẽ gỡ', 'Account to unlink')}</span><strong>{accountName}<br/>{customerId}</strong></div>
          <div><span>MCC</span><strong>{mccName}<br/>{mccCustomerId}</strong></div>
        </div>
        <label className={styles.field}>
          <span>{tr(locale, `Nhập Customer ID ${customerId} để xác nhận`, `Enter Customer ID ${customerId} to confirm`)}</span>
          <input value={confirmation} onChange={event => setConfirmation(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void unlink(); } }} inputMode="numeric" autoComplete="off" placeholder={customerId} autoFocus/>
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <div className={`modal-actions ${styles.actions}`}>
          <button type="button" onClick={close}>{tr(locale, 'Huỷ', 'Cancel')}</button>
          <button className={styles.danger} type="button" disabled={!confirmed || busy} onClick={() => void unlink()}><Link2Off size={13}/>{busy ? tr(locale, 'Đang gỡ...', 'Unlinking...') : tr(locale, 'Xác nhận gỡ', 'Confirm unlink')}</button>
        </div>
      </section>
    </div>}
  </>;
}
