'use client';

import { AlertTriangle, CheckCircle2, Clipboard, ExternalLink, FileCheck2, FilePlus2, Search, Send, ShieldAlert, X, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GOOGLE_ADS_SUSPENSION_APPEAL_URL, type AccountAppealStatus } from '@/lib/account-appeals';
import { formatCustomerId } from '@/lib/google-ads-format';
import { tr } from '@/lib/i18n';
import { useAppLocale } from '@/app/locale-provider';
import styles from './appeal-center.module.css';

type AppealReason = 'DISPUTE_DECISION' | 'MADE_CHANGES_TO_COMPLY';
type Appeal = {
  id: string;
  customerAccountId: string;
  status: AccountAppealStatus;
  reason: AppealReason | null;
  suspensionReason: string | null;
  correctiveActions: string | null;
  appealStatement: string | null;
  evidenceNotes: string | null;
  contactEmail: string | null;
  googleCaseId: string | null;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  submittedAt: string | null;
  lastSubmittedAt: string | null;
  outcomeAt: string | null;
};
type AppealRow = {
  accountId: string;
  accountName: string;
  customerId: string;
  accountStatus: string;
  mccName: string;
  mccCustomerId: string;
  appeal: Appeal | null;
};
type DraftForm = {
  reason: AppealReason | '';
  suspensionReason: string;
  correctiveActions: string;
  appealStatement: string;
  evidenceNotes: string;
  contactEmail: string;
  googleCaseId: string;
};

const EMPTY_FORM: DraftForm = { reason: '', suspensionReason: '', correctiveActions: '', appealStatement: '', evidenceNotes: '', contactEmail: '', googleCaseId: '' };

function statusLabel(status: AccountAppealStatus, locale: 'vi' | 'en') {
  const labels: Record<AccountAppealStatus, [string, string]> = {
    DRAFT: ['Bản nháp', 'Draft'],
    READY_TO_SUBMIT: ['Đã duyệt nội bộ', 'Internally approved'],
    SUBMITTED: ['Đã gửi', 'Submitted'],
    UNDER_REVIEW: ['Google đang xét', 'Under Google review'],
    APPROVED: ['Kháng nghị thành công', 'Reinstated'],
    REJECTED: ['Bị từ chối', 'Rejected'],
  };
  return locale === 'vi' ? labels[status][0] : labels[status][1];
}

function formFromAppeal(appeal: Appeal): DraftForm {
  return {
    reason: appeal.reason ?? '',
    suspensionReason: appeal.suspensionReason ?? '',
    correctiveActions: appeal.correctiveActions ?? '',
    appealStatement: appeal.appealStatement ?? '',
    evidenceNotes: appeal.evidenceNotes ?? '',
    contactEmail: appeal.contactEmail ?? '',
    googleCaseId: appeal.googleCaseId ?? '',
  };
}

export function AppealCenter({ initialRows, canManage }: { initialRows: AppealRow[]; canManage: boolean }) {
  const locale = useAppLocale();
  const [rows] = useState(initialRows);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [editing, setEditing] = useState<AppealRow | null>(null);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const visible = useMemo(() => rows.filter(row => {
    const haystack = `${row.accountName} ${row.customerId} ${row.mccName} ${row.mccCustomerId}`.toLowerCase();
    const idQuery = query.replace(/\D/g, '');
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase()) || (idQuery && `${row.customerId}${row.mccCustomerId}`.includes(idQuery));
    const matchesStatus = status === 'ALL' || (status === 'MISSING' ? !row.appeal : row.appeal?.status === status);
    return matchesQuery && matchesStatus;
  }), [query, rows, status]);
  const suspendedCount = rows.filter(row => row.accountStatus === 'SUSPENDED').length;
  const readyCount = rows.filter(row => row.appeal?.status === 'READY_TO_SUBMIT').length;
  const activeCount = rows.filter(row => row.appeal?.status === 'SUBMITTED' || row.appeal?.status === 'UNDER_REVIEW').length;
  const approvedCount = rows.filter(row => row.appeal?.status === 'APPROVED').length;

  async function readPayload(response: Response) {
    return response.json() as Promise<{ data?: Appeal | { matchedAccounts: number; createdDrafts: number }; error?: { message?: string } }>;
  }

  async function createDrafts(accountId?: string) {
    setBusy(true); setError('');
    const response = await fetch('/api/google-ads/appeals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(accountId ? { accountId } : {}) });
    const payload = await readPayload(response); setBusy(false);
    if (!response.ok) return setError(payload.error?.message || tr(locale, 'Không thể tạo bản nháp.', 'Unable to create appeal drafts.'));
    window.location.reload();
  }

  function openAppeal(row: AppealRow) {
    if (!row.appeal) return;
    setEditing(row); setForm(formFromAppeal(row.appeal)); setError(''); setCopied(false);
  }

  async function patchAppeal(body: object) {
    if (!editing?.appeal) return null;
    setBusy(true); setError('');
    const response = await fetch(`/api/google-ads/appeals/${editing.appeal.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await readPayload(response); setBusy(false);
    if (!response.ok || !payload.data || !('id' in payload.data)) {
      setError(payload.error?.message || tr(locale, 'Không thể cập nhật hồ sơ.', 'Unable to update the appeal.'));
      return null;
    }
    const appeal = payload.data as Appeal;
    setEditing(current => current ? { ...current, appeal } : current);
    return appeal;
  }

  async function saveDraft() {
    const appeal = await patchAppeal({
      action: 'SAVE_DRAFT',
      reason: form.reason || null,
      suspensionReason: form.suspensionReason,
      correctiveActions: form.correctiveActions,
      appealStatement: form.appealStatement,
      evidenceNotes: form.evidenceNotes,
      contactEmail: form.contactEmail,
    });
    return Boolean(appeal);
  }

  async function transition(nextStatus: AccountAppealStatus) {
    if (nextStatus === 'READY_TO_SUBMIT' && !(await saveDraft())) return;
    if (nextStatus === 'SUBMITTED' && !window.confirm(tr(locale, 'Chỉ xác nhận sau khi bạn đã gửi biểu mẫu chính thức trên Google. Tiếp tục?', 'Confirm only after submitting the official Google form. Continue?'))) return;
    if ((nextStatus === 'APPROVED' || nextStatus === 'REJECTED') && !window.confirm(tr(locale, 'Xác nhận kết quả cuối cùng của Google?', 'Confirm Google\'s final outcome?'))) return;
    const appeal = await patchAppeal({ action: 'TRANSITION', nextStatus });
    if (appeal) window.location.reload();
  }

  async function saveReference() {
    const appeal = await patchAppeal({ action: 'SAVE_REFERENCE', googleCaseId: form.googleCaseId });
    if (appeal) setForm(value => ({ ...value, googleCaseId: appeal.googleCaseId ?? '' }));
  }

  async function copyAppeal() {
    if (!editing) return;
    const reason = form.reason === 'DISPUTE_DECISION' ? 'Dispute policy decision' : 'Made changes to comply';
    const text = [
      `Google Ads account: ${editing.accountName}`,
      `Customer ID: ${formatCustomerId(editing.customerId)}`,
      `Appeal reason: ${reason}`,
      '',
      'Suspension reason shown by Google:', form.suspensionReason,
      '',
      'Corrective actions completed:', form.correctiveActions,
      '',
      'Appeal statement:', form.appealStatement,
      '',
      'Evidence and supporting notes:', form.evidenceNotes || 'None',
      '',
      `Contact email: ${form.contactEmail}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return <div className={styles.center}>
    <section className={styles.notice}><ShieldAlert size={22}/><div><strong>{tr(locale, 'Không tự động gửi sang Google', 'No automatic submission to Google')}</strong><p>{tr(locale, 'Hệ thống chuẩn bị và theo dõi hồ sơ. ADMIN phải kiểm tra nội dung, mở biểu mẫu chính thức và tự xác nhận sau khi gửi.', 'The system prepares and tracks cases. An ADMIN must review the content, open the official form, and confirm after submission.')}</p></div><a href={GOOGLE_ADS_SUSPENSION_APPEAL_URL} target="_blank" rel="noreferrer">{tr(locale, 'Hướng dẫn Google', 'Google guidance')} <ExternalLink size={14}/></a></section>

    <section className={styles.stats}>
      <div><span>{tr(locale, 'Tài khoản đình chỉ', 'Suspended accounts')}</span><strong>{suspendedCount}</strong></div>
      <div><span>{tr(locale, 'Đã duyệt nội bộ', 'Internally approved')}</span><strong>{readyCount}</strong></div>
      <div><span>{tr(locale, 'Đang chờ Google', 'Waiting for Google')}</span><strong>{activeCount}</strong></div>
      <div><span>{tr(locale, 'Đã khôi phục', 'Reinstated')}</span><strong>{approvedCount}</strong></div>
    </section>

    <div className={styles.toolbar}><label><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={tr(locale, 'Tìm tên, Customer ID hoặc MCC', 'Search name, Customer ID, or MCC')}/></label><select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">{tr(locale, 'Tất cả trạng thái', 'All statuses')}</option><option value="MISSING">{tr(locale, 'Chưa có bản nháp', 'No draft')}</option>{(['DRAFT','READY_TO_SUBMIT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED'] as AccountAppealStatus[]).map(value => <option key={value} value={value}>{statusLabel(value, locale)}</option>)}</select>{canManage&&<button disabled={busy} onClick={() => void createDrafts()}><FilePlus2 size={15}/>{tr(locale, 'Tạo nháp cho tài khoản đình chỉ', 'Create drafts for suspended accounts')}</button>}</div>
    {error&&!editing&&<div className={styles.error}><AlertTriangle size={17}/>{error}</div>}

    <section className="ga-panel ga-table-panel"><div className="ga-table-wrap"><table className="ga-table"><thead><tr><th>{tr(locale, 'Tài khoản', 'Account')}</th><th>MCC</th><th>{tr(locale, 'Trạng thái Ads', 'Ads status')}</th><th>{tr(locale, 'Hồ sơ kháng nghị', 'Appeal case')}</th><th>{tr(locale, 'Lần gửi', 'Attempts')}</th><th>{tr(locale, 'Cập nhật', 'Updated')}</th><th>{tr(locale, 'Thao tác', 'Action')}</th></tr></thead><tbody>{visible.map(row => <tr key={row.accountId}><td><strong>{row.accountName}</strong><small>{formatCustomerId(row.customerId)}</small></td><td><strong>{row.mccName}</strong><small>{formatCustomerId(row.mccCustomerId)}</small></td><td><span className={`ga-status ${row.accountStatus==='SUSPENDED'?'reauth_required':'connected'}`}>{row.accountStatus}</span></td><td>{row.appeal?<span className={`${styles.status} ${styles[row.appeal.status.toLowerCase()]}`}>{statusLabel(row.appeal.status,locale)}</span>:<span className={styles.missing}>{tr(locale, 'Chưa có', 'Missing')}</span>}</td><td>{row.appeal?.attemptCount??0}</td><td>{row.appeal?new Intl.DateTimeFormat(locale==='vi'?'vi-VN':'en-US',{dateStyle:'short',timeStyle:'short'}).format(new Date(row.appeal.updatedAt)):'—'}</td><td>{row.appeal?<button className={styles.rowAction} onClick={()=>openAppeal(row)}>{canManage?tr(locale, 'Mở hồ sơ', 'Open case'):tr(locale, 'Xem', 'View')}</button>:canManage?<button className={styles.rowAction} disabled={busy} onClick={()=>void createDrafts(row.accountId)}>{tr(locale, 'Tạo nháp', 'Create draft')}</button>:<span className="ga-readonly">{tr(locale, 'Chỉ đọc', 'Read only')}</span>}</td></tr>)}{visible.length===0&&<tr><td colSpan={7}>{tr(locale, 'Không có hồ sơ phù hợp.', 'No matching appeal cases.')}</td></tr>}</tbody></table></div></section>

    {editing?.appeal&&<div className={styles.backdrop}><div className={styles.modal}><button className={styles.close} onClick={()=>setEditing(null)} aria-label={tr(locale, 'Đóng', 'Close')}><X size={18}/></button><div className={styles.modalHead}><span><FileCheck2 size={22}/></span><div><p>{statusLabel(editing.appeal.status,locale)}</p><h2>{editing.accountName}</h2><small>{formatCustomerId(editing.customerId)} · {editing.mccName}</small></div></div>
      <div className={styles.warning}><AlertTriangle size={17}/><p>{tr(locale, 'Chỉ ghi thông tin có thật, nêu rõ thay đổi đã thực hiện và bằng chứng. Mỗi Customer ID phải có hồ sơ riêng.', 'Use truthful information only, explain completed corrections, and provide evidence. Each Customer ID requires its own case.')}</p></div>
      <div className={styles.form}>
        <label>{tr(locale, 'Lý do kháng nghị', 'Appeal reason')}<select disabled={!canManage||editing.appeal.status!=='DRAFT'} value={form.reason} onChange={event=>setForm(value=>({...value,reason:event.target.value as AppealReason}))}><option value="">{tr(locale, 'Chọn lý do', 'Select a reason')}</option><option value="DISPUTE_DECISION">{tr(locale, 'Google đã quyết định nhầm', 'Dispute the decision')}</option><option value="MADE_CHANGES_TO_COMPLY">{tr(locale, 'Đã sửa để tuân thủ', 'Made changes to comply')}</option></select></label>
        <label>{tr(locale, 'Email liên hệ', 'Contact email')}<input type="email" disabled={!canManage||editing.appeal.status!=='DRAFT'} value={form.contactEmail} onChange={event=>setForm(value=>({...value,contactEmail:event.target.value}))}/></label>
        <label className={styles.wide}>{tr(locale, 'Lý do đình chỉ Google hiển thị', 'Suspension reason shown by Google')}<textarea disabled={!canManage||editing.appeal.status!=='DRAFT'} value={form.suspensionReason} onChange={event=>setForm(value=>({...value,suspensionReason:event.target.value}))} maxLength={3000}/></label>
        <label className={styles.wide}>{tr(locale, 'Các thay đổi đã thực hiện', 'Corrective actions completed')}<textarea disabled={!canManage||editing.appeal.status!=='DRAFT'} value={form.correctiveActions} onChange={event=>setForm(value=>({...value,correctiveActions:event.target.value}))} maxLength={5000}/></label>
        <label className={styles.wide}>{tr(locale, 'Nội dung kháng nghị', 'Appeal statement')}<textarea className={styles.statement} disabled={!canManage||editing.appeal.status!=='DRAFT'} value={form.appealStatement} onChange={event=>setForm(value=>({...value,appealStatement:event.target.value}))} maxLength={8000}/></label>
        <label className={styles.wide}>{tr(locale, 'Bằng chứng và ghi chú hỗ trợ', 'Evidence and supporting notes')}<textarea disabled={!canManage||editing.appeal.status!=='DRAFT'} value={form.evidenceNotes} onChange={event=>setForm(value=>({...value,evidenceNotes:event.target.value}))} maxLength={5000}/></label>
        <label className={styles.wide}>{tr(locale, 'Mã hồ sơ Google (nếu có)', 'Google case ID (if available)')}<div className={styles.reference}><input disabled={!canManage} value={form.googleCaseId} onChange={event=>setForm(value=>({...value,googleCaseId:event.target.value}))}/>{canManage&&<button disabled={busy} onClick={()=>void saveReference()}>{tr(locale, 'Lưu mã', 'Save ID')}</button>}</div></label>
      </div>
      {error&&<div className={styles.error}><AlertTriangle size={17}/>{error}</div>}
      <div className={styles.modalActions}><button onClick={()=>void copyAppeal()}><Clipboard size={15}/>{copied?tr(locale, 'Đã sao chép', 'Copied'):tr(locale, 'Sao chép nội dung', 'Copy content')}</button>
        {canManage&&editing.appeal.status==='DRAFT'&&<><button disabled={busy} onClick={()=>void saveDraft()}>{tr(locale, 'Lưu nháp', 'Save draft')}</button><button className={styles.primary} disabled={busy} onClick={()=>void transition('READY_TO_SUBMIT')}><FileCheck2 size={15}/>{tr(locale, 'Duyệt nội bộ', 'Approve internally')}</button></>}
        {canManage&&editing.appeal.status==='READY_TO_SUBMIT'&&<><button onClick={()=>void transition('DRAFT')}>{tr(locale, 'Sửa lại', 'Return to draft')}</button><a className={styles.google} href={GOOGLE_ADS_SUSPENSION_APPEAL_URL} target="_blank" rel="noreferrer"><ExternalLink size={15}/>{tr(locale, 'Mở biểu mẫu Google', 'Open Google form')}</a><button className={styles.primary} disabled={busy} onClick={()=>void transition('SUBMITTED')}><Send size={15}/>{tr(locale, 'Đã gửi trên Google', 'Mark submitted')}</button></>}
        {canManage&&editing.appeal.status==='SUBMITTED'&&<><button disabled={busy} onClick={()=>void transition('UNDER_REVIEW')}>{tr(locale, 'Google đang xét', 'Under review')}</button><button className={styles.success} disabled={busy} onClick={()=>void transition('APPROVED')}><CheckCircle2 size={15}/>{tr(locale, 'Đã khôi phục', 'Reinstated')}</button><button className={styles.danger} disabled={busy} onClick={()=>void transition('REJECTED')}><XCircle size={15}/>{tr(locale, 'Bị từ chối', 'Rejected')}</button></>}
        {canManage&&editing.appeal.status==='UNDER_REVIEW'&&<><button className={styles.success} disabled={busy} onClick={()=>void transition('APPROVED')}><CheckCircle2 size={15}/>{tr(locale, 'Đã khôi phục', 'Reinstated')}</button><button className={styles.danger} disabled={busy} onClick={()=>void transition('REJECTED')}><XCircle size={15}/>{tr(locale, 'Bị từ chối', 'Rejected')}</button></>}
        {canManage&&editing.appeal.status==='REJECTED'&&<button className={styles.primary} disabled={busy} onClick={()=>void transition('DRAFT')}>{tr(locale, 'Tạo bản sửa đổi', 'Create revision')}</button>}
      </div>
    </div></div>}
  </div>;
}
