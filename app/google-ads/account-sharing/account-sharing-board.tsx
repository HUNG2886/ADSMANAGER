'use client';

import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardPaste, GripVertical, LoaderCircle, Plus, Search, Share2, Trash2 } from 'lucide-react';
import { DragEvent, useEffect, useMemo, useState } from 'react';
import { formatCustomerId, formatGoogleAdsApiError, type GoogleAdsApiErrorPayload } from '@/lib/google-ads-format';
import { tr } from '@/lib/i18n';
import { useAppLocale } from '@/app/locale-provider';
import styles from './account-sharing.module.css';

type MccOption = {
  id: string;
  customerId: string;
  name: string;
  loginCustomerId: string;
  connection: { googleEmail: string };
  _count: { accounts: number };
};

type AccountOption = {
  id: string;
  customerId: string;
  name: string;
  status: string;
  mccHasOwnership: boolean;
};

type ShareResult = {
  customerId: string;
  name: string;
  status: 'ACTIVE' | 'PENDING' | 'ALREADY_LINKED' | 'FAILED';
  invitationCreated?: boolean;
  error?: GoogleAdsApiErrorPayload;
};

type ApiPayload = {
  data?: { mccs?: MccOption[]; accounts?: AccountOption[]; results?: ShareResult[] };
  error?: GoogleAdsApiErrorPayload;
};

function parseCustomerIds(value: string) {
  return [...new Set((value.match(/\d(?:[\s-]*\d){9}/g) ?? []).map(item => item.replace(/\D/g, '')).filter(item => item.length === 10))];
}

const MAX_ACCOUNTS_PER_BATCH = 25;

export function AccountSharingBoard() {
  const locale = useAppLocale();
  const [mccs, setMccs] = useState<MccOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [sourceMccId, setSourceMccId] = useState('');
  const [targetMccId, setTargetMccId] = useState('');
  const [query, setQuery] = useState('');
  const [pasteValue, setPasteValue] = useState('');
  const [selected, setSelected] = useState<AccountOption[]>([]);
  const [results, setResults] = useState<ShareResult[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const sourceMcc = useMemo(() => mccs.find(item => item.id === sourceMccId), [mccs, sourceMccId]);
  const targetMcc = useMemo(() => mccs.find(item => item.id === targetMccId), [mccs, targetMccId]);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const response = await fetch('/api/google-ads/manager-links');
        const payload = await response.json() as ApiPayload;
        if (!response.ok) throw new Error(formatGoogleAdsApiError(payload.error, 'Unable to load MCCs.'));
        if (cancelled) return;
        const items = payload.data?.mccs ?? [];
        setMccs(items);
        setSourceMccId(items[0]?.id ?? '');
        setTargetMccId(items.find(item => item.id !== items[0]?.id)?.id ?? '');
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : tr(locale, 'Không thể tải danh sách MCC.', 'Unable to load MCCs.'));
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }
    void loadOptions();
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    if (!sourceMccId) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingAccounts(true);
      setError('');
      try {
        const params = new URLSearchParams({ sourceMccId, q: query });
        const response = await fetch(`/api/google-ads/manager-links?${params}`);
        const payload = await response.json() as ApiPayload;
        if (!response.ok) throw new Error(formatGoogleAdsApiError(payload.error, 'Unable to load accounts.'));
        if (!cancelled) setAccounts(payload.data?.accounts ?? []);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : tr(locale, 'Không thể tải tài khoản.', 'Unable to load accounts.'));
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [locale, query, sourceMccId]);

  function addAccount(account: AccountOption) {
    if (selected.some(item => item.customerId === account.customerId)) return;
    if (selected.length >= MAX_ACCOUNTS_PER_BATCH) {
      setError(tr(locale, 'Mỗi lần chỉ có thể chia sẻ tối đa 25 tài khoản.', 'You can share up to 25 accounts per batch.'));
      return;
    }
    setSelected(current => [...current, account]);
    setError('');
    setResults([]);
  }

  function dropAccount(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    try {
      const account = JSON.parse(event.dataTransfer.getData('application/json')) as AccountOption;
      if (account.customerId) addAccount(account);
    } catch {
      setError(tr(locale, 'Dữ liệu kéo thả không hợp lệ.', 'Invalid drag-and-drop data.'));
    }
  }

  function addPastedIds() {
    const ids = parseCustomerIds(pasteValue);
    if (!ids.length) {
      setError(tr(locale, 'Không tìm thấy Customer ID gồm 10 chữ số.', 'No valid 10-digit Customer ID was found.'));
      return;
    }
    const availableSlots = MAX_ACCOUNTS_PER_BATCH - selected.length;
    if (availableSlots <= 0) {
      setError(tr(locale, 'Mỗi lần chỉ có thể chia sẻ tối đa 25 tài khoản.', 'You can share up to 25 accounts per batch.'));
      return;
    }
    const newIds = ids.filter(customerId => !selected.some(item => item.customerId === customerId));
    const idsToAdd = newIds.slice(0, availableSlots);
    setSelected(current => {
      const next = [...current];
      for (const customerId of idsToAdd) {
        const known = accounts.find(item => item.customerId === customerId);
        next.push(known ?? { id: customerId, customerId, name: `Customer ${formatCustomerId(customerId)}`, status: 'UNKNOWN', mccHasOwnership: false });
      }
      return next;
    });
    setPasteValue('');
    setError(newIds.length > idsToAdd.length
      ? tr(locale, 'Đã thêm đến giới hạn 25 tài khoản; các ID còn lại chưa được thêm.', 'Added up to the 25-account limit; remaining IDs were not added.')
      : '');
    setResults([]);
  }

  async function shareAccounts() {
    if (!sourceMcc || !targetMcc || !selected.length || sharing) return;
    const confirmed = window.confirm(tr(
      locale,
      `Liên kết ${selected.length} tài khoản từ “${sourceMcc.name}” sang “${targetMcc.name}”? Tài khoản sẽ không bị xóa khỏi MCC nguồn.`,
      `Link ${selected.length} accounts from “${sourceMcc.name}” to “${targetMcc.name}”? Accounts will remain linked to the source MCC.`,
    ));
    if (!confirmed) return;
    setSharing(true);
    setError('');
    setResults([]);
    try {
      const response = await fetch('/api/google-ads/manager-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceMccId, targetMccId, customerIds: selected.map(item => item.customerId) }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok) {
        setError(formatGoogleAdsApiError(payload.error, tr(locale, 'Không thể chia sẻ tài khoản.', 'Unable to share accounts.')));
        return;
      }
      setResults(payload.data?.results ?? []);
      if ((payload.data?.results ?? []).every(item => item.status === 'ACTIVE' || item.status === 'ALREADY_LINKED')) setSelected([]);
    } catch {
      setError(tr(locale, 'Không thể kết nối máy chủ để chia sẻ tài khoản.', 'Could not reach the server to share accounts.'));
    } finally {
      setSharing(false);
    }
  }

  if (loadingOptions) return <section className={styles.loading}><LoaderCircle className={styles.spin} size={24}/>{tr(locale, 'Đang tải MCC...', 'Loading MCCs...')}</section>;

  return <section className={styles.board}>
    {mccs.length < 2 && <div className={styles.notice}><AlertTriangle size={18}/><div><strong>{tr(locale, 'Cần ít nhất hai MCC đang kết nối', 'At least two connected MCCs are required')}</strong><p>{tr(locale, 'Hãy kết nối hoặc làm mới thêm một MCC trước khi chia sẻ tài khoản.', 'Connect or refresh another MCC before sharing accounts.')}</p></div></div>}
    <div className={styles.flow}>
      <article className={styles.column}>
        <header><span>1</span><div><strong>{tr(locale, 'MCC nguồn', 'Source MCC')}</strong><small>{tr(locale, 'Chọn tài khoản cần chia sẻ', 'Choose accounts to share')}</small></div></header>
        <select value={sourceMccId} onChange={event => { const nextSource = event.target.value; setSourceMccId(nextSource); setTargetMccId(current => current === nextSource ? (mccs.find(item => item.id !== nextSource)?.id ?? '') : current); setAccounts([]); setSelected([]); setResults([]); }}>
          <option value="">{tr(locale, 'Chọn MCC nguồn', 'Select source MCC')}</option>
          {mccs.map(item => <option value={item.id} key={item.id}>{item.name} · {formatCustomerId(item.customerId)} · {item.connection.googleEmail}</option>)}
        </select>
        <label className={styles.search}><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={tr(locale, 'Tìm tên hoặc Customer ID', 'Search name or Customer ID')}/></label>
        <div className={styles.accountList} aria-busy={loadingAccounts}>
          {loadingAccounts ? <p className={styles.empty}><LoaderCircle className={styles.spin} size={17}/>{tr(locale, 'Đang tải...', 'Loading...')}</p> : accounts.length === 0 ? <p className={styles.empty}>{tr(locale, 'Không tìm thấy tài khoản.', 'No accounts found.')}</p> : accounts.map(account => <div className={styles.account} draggable onDragStart={event => { event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('application/json', JSON.stringify(account)); }} key={account.id}>
            <GripVertical size={16}/><div><strong>{account.name}</strong><small>{formatCustomerId(account.customerId)} · {account.status}</small></div><span className={account.mccHasOwnership ? styles.owner : styles.noOwner}>{account.mccHasOwnership ? tr(locale, 'Có quyền', 'Managed') : tr(locale, 'Không', 'No')}</span><button type="button" onClick={() => addAccount(account)} aria-label={tr(locale, 'Thêm tài khoản', 'Add account')}><Plus size={15}/></button>
          </div>)}
        </div>
      </article>

      <ArrowRight className={styles.flowArrow} size={22}/>

      <article className={`${styles.column} ${styles.destination}`} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }} onDrop={dropAccount}>
        <header><span>2</span><div><strong>{tr(locale, 'MCC đích', 'Target MCC')}</strong><small>{tr(locale, 'Thả tài khoản vào đây', 'Drop accounts here')}</small></div></header>
        <select value={targetMccId} onChange={event => { setTargetMccId(event.target.value); setResults([]); }}>
          <option value="">{tr(locale, 'Chọn MCC đích', 'Select target MCC')}</option>
          {mccs.filter(item => item.id !== sourceMccId).map(item => <option value={item.id} key={item.id}>{item.name} · {formatCustomerId(item.customerId)} · {item.connection.googleEmail}</option>)}
        </select>
        <div className={styles.dropzone}><Share2 size={24}/><strong>{targetMcc ? targetMcc.name : tr(locale, 'Chọn MCC đích', 'Select target MCC')}</strong><span>{tr(locale, 'Kéo tài khoản từ cột bên trái và thả vào đây', 'Drag an account from the left and drop it here')}</span></div>
        <div className={styles.selectedList}>
          {selected.length === 0 ? <p className={styles.empty}>{tr(locale, 'Chưa chọn tài khoản.', 'No accounts selected.')}</p> : selected.map(account => <div className={styles.selected} key={account.customerId}><div><strong>{account.name}</strong><small>{formatCustomerId(account.customerId)}</small></div><button type="button" onClick={() => setSelected(current => current.filter(item => item.customerId !== account.customerId))} aria-label={tr(locale, 'Bỏ tài khoản', 'Remove account')}><Trash2 size={14}/></button></div>)}
        </div>
      </article>
    </div>

    <article className={styles.pasteBox}>
      <span><ClipboardPaste size={19}/></span><div><strong>{tr(locale, 'Hoặc dán Customer ID', 'Or paste Customer IDs')}</strong><small>{tr(locale, 'Dán một hoặc nhiều ID, có thể có dấu gạch ngang.', 'Paste one or more IDs, with or without hyphens.')}</small></div><textarea value={pasteValue} onChange={event => setPasteValue(event.target.value)} placeholder={'123-456-7890\n987-654-3210'}/><button type="button" onClick={addPastedIds}>{tr(locale, 'Thêm vào danh sách', 'Add to list')}</button>
    </article>

    {error && <div className={styles.error}><AlertTriangle size={17}/><span>{error}</span></div>}
    {results.length > 0 && <div className={styles.results}>{results.map(result => <article key={result.customerId} className={styles[result.status.toLowerCase()]}>{result.status === 'ACTIVE' || result.status === 'ALREADY_LINKED' ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}<div><strong>{result.name} · {formatCustomerId(result.customerId)}</strong><span>{result.status === 'ACTIVE' ? tr(locale, 'Đã liên kết và chấp nhận thành công.', 'Linked and accepted successfully.') : result.status === 'ALREADY_LINKED' ? tr(locale, 'Tài khoản đã được liên kết với MCC đích.', 'The account is already linked to the target MCC.') : result.status === 'PENDING' ? tr(locale, 'Đã gửi lời mời nhưng Google chưa cho phép tự động chấp nhận.', 'Invitation sent, but Google did not allow automatic acceptance.') : tr(locale, 'Không thể tạo liên kết.', 'The link could not be created.')}</span>{result.error && <code>{formatGoogleAdsApiError(result.error, '')}</code>}</div></article>)}</div>}

    <footer className={styles.actions}><p><AlertTriangle size={15}/>{tr(locale, 'Thao tác tạo liên kết quản lý thật trên Google Ads và không gỡ MCC nguồn.', 'This creates a real Google Ads manager link and does not unlink the source MCC.')}</p><button type="button" disabled={!sourceMccId || !targetMccId || selected.length === 0 || sharing} onClick={() => void shareAccounts()}>{sharing ? <LoaderCircle className={styles.spin} size={16}/> : <Share2 size={16}/>} {sharing ? tr(locale, 'Đang chia sẻ...', 'Sharing...') : tr(locale, `Chia sẻ ${selected.length} tài khoản`, `Share ${selected.length} accounts`)}</button></footer>
  </section>;
}
