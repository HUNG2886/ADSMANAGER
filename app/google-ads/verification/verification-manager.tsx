'use client';

import { AlertTriangle, BadgeCheck, CheckCircle2, Clock3, ExternalLink, LoaderCircle, Play, RefreshCw, Search, ShieldAlert, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatCustomerId } from '@/lib/google-ads-format';
import { dateLocale, tr } from '@/lib/i18n';
import { useAppLocale } from '../../locale-provider';
import styles from './verification.module.css';

type VerificationStatus = 'UNCHECKED' | 'NOT_REQUIRED' | 'REQUIRED' | 'UNSPECIFIED' | 'UNKNOWN' | 'PENDING_USER_ACTION' | 'PENDING_REVIEW' | 'SUCCESS' | 'FAILURE' | 'ERROR';

type AccountRow = {
  id: string;
  customerId: string;
  name: string;
  status: string;
  verificationStatus: string | null;
  verificationStartDeadline: string | null;
  verificationCompletionDeadline: string | null;
  verificationCheckedAt: string | null;
  verificationErrorCode: string | null;
  verificationErrorMessage: string | null;
  verificationRequestId: string | null;
  mcc: { id: string; customerId: string; name: string };
};

type VerificationResult = {
  accountId: string;
  customerId: string | null;
  name: string | null;
  mccName: string | null;
  success: boolean;
  verification?: {
    status: VerificationStatus;
    startDeadline: string | null;
    completionDeadline: string | null;
    actionUrl: string | null;
    actionUrlExpiration: string | null;
    started: boolean;
  };
  error?: { code: string; type: string; message: string; requestId: string | null };
};

type ApiPayload = {
  data?: { results?: VerificationResult[] };
  error?: { code?: string; message?: string; requestId?: string | null };
};

const startableStatuses = new Set<VerificationStatus>(['REQUIRED', 'UNSPECIFIED', 'UNKNOWN', 'PENDING_USER_ACTION', 'FAILURE']);

function normalizedStatus(value: string | null): VerificationStatus {
  return (value || 'UNCHECKED') as VerificationStatus;
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export function VerificationManager({ initialAccounts }: { initialAccounts: AccountRow[] }) {
  const locale = useAppLocale();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [query, setQuery] = useState('');
  const [mccId, setMccId] = useState('ALL');
  const [status, setStatus] = useState<VerificationStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<string[]>([]);
  const [actionUrls, setActionUrls] = useState<Record<string, { url: string; expiration: string | null }>>({});
  const [busy, setBusy] = useState<'CHECK' | 'START' | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const mccs = useMemo(() => [...new Map(accounts.map(account => [account.mcc.id, account.mcc])).values()], [accounts]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const digits = query.replace(/\D/g, '');
    return accounts.filter(account => {
      const matchesQuery = !term
        || account.name.toLowerCase().includes(term)
        || account.mcc.name.toLowerCase().includes(term)
        || (digits && account.customerId.includes(digits));
      return matchesQuery
        && (mccId === 'ALL' || account.mcc.id === mccId)
        && (status === 'ALL' || normalizedStatus(account.verificationStatus) === status);
    });
  }, [accounts, mccId, query, status]);

  const selectedVisible = visible.filter(account => selected.includes(account.id));
  const allVisibleSelected = visible.length > 0 && selectedVisible.length === visible.length;
  const startableVisible = visible.filter(account => startableStatuses.has(normalizedStatus(account.verificationStatus)));
  const counts = useMemo(() => accounts.reduce((result, account) => {
    const value = normalizedStatus(account.verificationStatus);
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {} as Record<string, number>), [accounts]);

  function toggle(accountId: string) {
    setSelected(current => current.includes(accountId) ? current.filter(id => id !== accountId) : [...current, accountId]);
  }

  function toggleVisible() {
    const visibleIds = new Set(visible.map(account => account.id));
    setSelected(current => allVisibleSelected
      ? current.filter(id => !visibleIds.has(id))
      : [...new Set([...current, ...visibleIds])]);
  }

  function applyResults(results: VerificationResult[]) {
    const now = new Date().toISOString();
    setAccounts(current => current.map(account => {
      const result = results.find(item => item.accountId === account.id);
      if (!result) return account;
      if (!result.success || !result.verification) return {
        ...account,
        verificationStatus: 'ERROR',
        verificationCheckedAt: now,
        verificationErrorCode: result.error?.code || 'IDENTITY_VERIFICATION_FAILED',
        verificationErrorMessage: result.error?.message || tr(locale, 'Không thể xử lý xác minh.', 'Unable to process verification.'),
        verificationRequestId: result.error?.requestId || null,
      };
      return {
        ...account,
        verificationStatus: result.verification.status,
        verificationStartDeadline: result.verification.startDeadline,
        verificationCompletionDeadline: result.verification.completionDeadline,
        verificationCheckedAt: now,
        verificationErrorCode: null,
        verificationErrorMessage: null,
        verificationRequestId: null,
      };
    }));
    setActionUrls(current => {
      const next = { ...current };
      for (const result of results) {
        if (result.success && result.verification?.actionUrl) next[result.accountId] = {
          url: result.verification.actionUrl,
          expiration: result.verification.actionUrlExpiration,
        };
      }
      return next;
    });
  }

  async function run(action: 'CHECK' | 'START', accountIds: string[]) {
    const uniqueIds = [...new Set(accountIds)];
    if (!uniqueIds.length || busy) return;
    if (action === 'START' && !window.confirm(tr(
      locale,
      `Khởi tạo xác minh cho ${uniqueIds.length} tài khoản? Google vẫn yêu cầu người có thẩm quyền trả lời và nộp tài liệu riêng cho từng tài khoản.`,
      `Start verification for ${uniqueIds.length} accounts? An authorized person must still answer Google’s questions and submit documents for each account.`,
    ))) return;
    setBusy(action);
    setProgress({ completed: 0, total: uniqueIds.length });
    setError('');
    setNotice('');
    let failures = 0;
    try {
      for (const batch of chunks(uniqueIds, 10)) {
        const response = await fetch('/api/google-ads/identity-verification', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, accountIds: batch }),
        });
        const payload = await response.json() as ApiPayload;
        if (!response.ok) throw new Error(payload.error?.message || tr(locale, 'Không thể gọi Google Ads API.', 'Unable to call the Google Ads API.'));
        const results = payload.data?.results || [];
        failures += results.filter(result => !result.success).length;
        applyResults(results);
        setProgress(current => ({ ...current, completed: Math.min(current.total, current.completed + batch.length) }));
      }
      setNotice(action === 'CHECK'
        ? tr(locale, `Đã kiểm tra ${uniqueIds.length} tài khoản${failures ? `; ${failures} tài khoản lỗi` : ''}.`, `Checked ${uniqueIds.length} accounts${failures ? `; ${failures} failed` : ''}.`)
        : tr(locale, `Đã xử lý ${uniqueIds.length} tài khoản${failures ? `; ${failures} tài khoản lỗi` : ''}. Hãy bấm “Tiếp tục trên Google” để hoàn tất.`, `Processed ${uniqueIds.length} accounts${failures ? `; ${failures} failed` : ''}. Use “Continue on Google” to finish.`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr(locale, 'Không thể xử lý xác minh.', 'Unable to process verification.'));
    } finally {
      setBusy(null);
    }
  }

  function statusText(value: VerificationStatus) {
    const labels: Record<VerificationStatus, [string, string]> = {
      UNCHECKED: ['Chưa kiểm tra', 'Not checked'],
      NOT_REQUIRED: ['Không bắt buộc', 'Not required'],
      REQUIRED: ['Cần bắt đầu', 'Start required'],
      UNSPECIFIED: ['Cần bắt đầu', 'Start required'],
      UNKNOWN: ['Chưa xác định', 'Unknown'],
      PENDING_USER_ACTION: ['Chờ bạn hoàn tất', 'User action required'],
      PENDING_REVIEW: ['Google đang xét duyệt', 'Pending review'],
      SUCCESS: ['Đã xác minh', 'Verified'],
      FAILURE: ['Xác minh thất bại', 'Verification failed'],
      ERROR: ['Lỗi kiểm tra', 'Check failed'],
    };
    return tr(locale, ...labels[value]);
  }

  function statusIcon(value: VerificationStatus) {
    if (value === 'SUCCESS' || value === 'NOT_REQUIRED') return <CheckCircle2 size={14}/>;
    if (value === 'PENDING_REVIEW' || value === 'PENDING_USER_ACTION') return <Clock3 size={14}/>;
    if (value === 'FAILURE' || value === 'ERROR') return <XCircle size={14}/>;
    return <ShieldAlert size={14}/>;
  }

  return <section className={styles.manager}>
    <div className={styles.guidance}>
      <AlertTriangle size={18}/>
      <div><strong>{tr(locale, 'Google không cho API tự nộp câu trả lời hoặc tài liệu pháp lý', 'Google does not let the API submit legal answers or documents')}</strong><p>{tr(locale, 'Trang này kiểm tra trạng thái, khởi tạo phiên và đưa bạn tới biểu mẫu chính thức. Không đóng hoặc chia sẻ liên kết xác minh.', 'This page checks status, starts a session, and sends you to the official form. Do not close or share verification links.')}</p></div>
    </div>

    <div className={styles.summary}>
      <article><span>{accounts.length}</span><small>{tr(locale, 'Tổng tài khoản', 'Total accounts')}</small></article>
      <article><span>{counts.SUCCESS || 0}</span><small>{tr(locale, 'Đã xác minh', 'Verified')}</small></article>
      <article><span>{(counts.PENDING_USER_ACTION || 0) + (counts.PENDING_REVIEW || 0)}</span><small>{tr(locale, 'Đang xử lý', 'In progress')}</small></article>
      <article><span>{(counts.REQUIRED || 0) + (counts.UNSPECIFIED || 0) + (counts.FAILURE || 0)}</span><small>{tr(locale, 'Cần hành động', 'Action required')}</small></article>
    </div>

    <div className={styles.filters}>
      <label><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={tr(locale, 'Tên tài khoản, Customer ID hoặc MCC', 'Account name, Customer ID, or MCC')}/></label>
      <select value={mccId} onChange={event => setMccId(event.target.value)}><option value="ALL">{tr(locale, 'Tất cả MCC', 'All MCCs')}</option>{mccs.map(mcc => <option key={mcc.id} value={mcc.id}>{mcc.name} · {formatCustomerId(mcc.customerId)}</option>)}</select>
      <select value={status} onChange={event => setStatus(event.target.value as VerificationStatus | 'ALL')}><option value="ALL">{tr(locale, 'Tất cả trạng thái xác minh', 'All verification statuses')}</option>{(['UNCHECKED','REQUIRED','PENDING_USER_ACTION','PENDING_REVIEW','SUCCESS','FAILURE','NOT_REQUIRED','ERROR'] as VerificationStatus[]).map(value => <option key={value} value={value}>{statusText(value)}</option>)}</select>
    </div>

    <div className={styles.actions}>
      <div><strong>{selected.length} {tr(locale, 'tài khoản đã chọn', 'accounts selected')}</strong><small>{visible.length} {tr(locale, 'tài khoản đang hiển thị', 'accounts shown')}</small></div>
      <button type="button" disabled={Boolean(busy) || selected.length === 0} onClick={() => void run('CHECK', selected)}><RefreshCw size={14}/>{tr(locale, 'Kiểm tra đã chọn', 'Check selected')}</button>
      <button type="button" disabled={Boolean(busy) || visible.length === 0} onClick={() => void run('CHECK', visible.map(account => account.id))}><BadgeCheck size={14}/>{tr(locale, 'Kiểm tra tất cả đang hiển thị', 'Check all shown')}</button>
      <button className={styles.primary} type="button" disabled={Boolean(busy) || selected.filter(id => startableStatuses.has(normalizedStatus(accounts.find(account => account.id === id)?.verificationStatus || null))).length === 0} onClick={() => void run('START', selected.filter(id => startableStatuses.has(normalizedStatus(accounts.find(account => account.id === id)?.verificationStatus || null))))}><Play size={14}/>{tr(locale, 'Bắt đầu xác minh đã chọn', 'Start selected')}</button>
      <button className={styles.primary} type="button" disabled={Boolean(busy) || startableVisible.length === 0} onClick={() => void run('START', startableVisible.map(account => account.id))}><Play size={14}/>{tr(locale, 'Bắt đầu tất cả cần xác minh', 'Start all requiring action')}</button>
    </div>

    {busy && <div className={styles.progress}><span style={{ width: `${progress.total ? Math.round(progress.completed / progress.total * 100) : 0}%` }}/><div><LoaderCircle className={styles.spin} size={14}/>{busy === 'CHECK' ? tr(locale, 'Đang kiểm tra', 'Checking') : tr(locale, 'Đang khởi tạo', 'Starting')} {progress.completed}/{progress.total}</div></div>}
    {error && <div className={styles.error}><XCircle size={16}/>{error}</div>}
    {notice && <div className={styles.notice}><CheckCircle2 size={16}/>{notice}</div>}

    <div className={styles.tableWrap}><table>
      <thead><tr><th><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label={tr(locale, 'Chọn tất cả đang hiển thị', 'Select all shown')}/></th><th>{tr(locale, 'Tài khoản', 'Account')}</th><th>MCC</th><th>{tr(locale, 'Trạng thái xác minh', 'Verification status')}</th><th>{tr(locale, 'Hạn hoàn tất', 'Completion deadline')}</th><th>{tr(locale, 'Lần kiểm tra cuối', 'Last checked')}</th><th>{tr(locale, 'Thao tác', 'Action')}</th></tr></thead>
      <tbody>{visible.map(account => {
        const verificationStatus = normalizedStatus(account.verificationStatus);
        const action = actionUrls[account.id];
        return <tr key={account.id}>
          <td><input type="checkbox" checked={selected.includes(account.id)} onChange={() => toggle(account.id)} aria-label={`${tr(locale,'Chọn','Select')} ${account.name}`}/></td>
          <td><strong>{account.name}</strong><small>{formatCustomerId(account.customerId)} · {account.status}</small></td>
          <td><strong>{account.mcc.name}</strong><small>{formatCustomerId(account.mcc.customerId)}</small></td>
          <td><span className={`${styles.status} ${styles[verificationStatus.toLowerCase()]}`}>{statusIcon(verificationStatus)}{statusText(verificationStatus)}</span>{account.verificationErrorMessage && <small className={styles.rowError}>{account.verificationErrorCode}: {account.verificationErrorMessage}{account.verificationRequestId ? ` · Request ID: ${account.verificationRequestId}` : ''}</small>}</td>
          <td>{account.verificationCompletionDeadline || '—'}{account.verificationStartDeadline && <small>{tr(locale,'Bắt đầu trước','Start by')}: {account.verificationStartDeadline}</small>}</td>
          <td>{account.verificationCheckedAt ? new Date(account.verificationCheckedAt).toLocaleString(dateLocale(locale)) : '—'}</td>
          <td>{action ? <a href={action.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/>{tr(locale, 'Tiếp tục trên Google', 'Continue on Google')}</a> : <button type="button" disabled={Boolean(busy)} onClick={() => void run(startableStatuses.has(verificationStatus) ? 'START' : 'CHECK', [account.id])}>{startableStatuses.has(verificationStatus) ? <Play size={13}/> : <RefreshCw size={13}/>} {startableStatuses.has(verificationStatus) ? tr(locale,'Bắt đầu','Start') : tr(locale,'Kiểm tra','Check')}</button>}{action?.expiration && <small>{tr(locale,'Link hết hạn','Link expires')}: {action.expiration}</small>}</td>
        </tr>;
      })}</tbody>
    </table>{visible.length === 0 && <div className={styles.empty}><BadgeCheck size={24}/><p>{tr(locale, 'Không có tài khoản phù hợp với bộ lọc.', 'No accounts match the filters.')}</p></div>}</div>
  </section>;
}
