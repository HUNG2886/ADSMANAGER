'use client';

import { Archive, Building2, Link2, Pencil, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { tr } from '@/lib/i18n';
import { formatCustomerId } from '@/lib/google-ads-format';
import { useAppLocale } from '@/app/locale-provider';

type Assignment = { customerAccount: { id: string; name: string; customerId: string; status: string; mcc: { name: string } } };
type ClientRow = { id: string; name: string; email: string | null; rentalAccount: string | null; status: 'ACTIVE' | 'ARCHIVED'; notes: string | null; createdAt: string; updatedAt: string; accountAssignments: Assignment[] };
type AccountOption = { id: string; name: string; customerId: string; status: string; mccName: string; mccCustomerId: string; managedByMcc: boolean; assignedClientId: string | null; assignedClientName: string | null };
type FormState = { name: string; email: string; rentalAccount: string; notes: string };
const EMPTY_FORM: FormState = { name: '', email: '', rentalAccount: '', notes: '' };

export function ClientsManager({ initialClients, accounts, canManage }: { initialClients: ClientRow[]; accounts: AccountOption[]; canManage: boolean }) {
  const locale = useAppLocale();
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ClientRow | 'new' | null>(null);
  const [assigning, setAssigning] = useState<ClientRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignmentQuery, setAssignmentQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const visible = useMemo(() => clients.filter(client => `${client.name} ${client.email || ''} ${client.rentalAccount || ''}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);
  const visibleAccounts = useMemo(() => {
    const normalized = assignmentQuery.trim().toLowerCase();
    const idQuery = assignmentQuery.replace(/\D/g, '');
    if (!normalized) return accounts;
    return accounts.filter(account => {
      const idMatches = idQuery.length > 0 && (account.customerId.includes(idQuery) || account.mccCustomerId.includes(idQuery));
      return account.name.toLowerCase().includes(normalized) || account.mccName.toLowerCase().includes(normalized) || idMatches;
    });
  }, [accounts, assignmentQuery]);

  function openEditor(client?: ClientRow) {
    setError(''); setEditing(client || 'new');
    setForm(client ? { name: client.name, email: client.email || '', rentalAccount: client.rentalAccount || '', notes: client.notes || '' } : EMPTY_FORM);
  }
  function openAssignments(client: ClientRow) { setError(''); setAssignmentQuery(''); setAssigning(client); setSelected(client.accountAssignments.map(item => item.customerAccount.id)); }
  async function payload(response: Response) { return response.json() as Promise<{ data?: ClientRow; error?: { message?: string } }>; }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return; setBusy(true); setError('');
    const response = await fetch(editing === 'new' ? '/api/clients' : `/api/clients/${editing.id}`, { method: editing === 'new' ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const result = await payload(response); setBusy(false);
    if (!response.ok || !result.data) return setError(result.error?.message || tr(locale,'Không thể lưu khách hàng.','Unable to save client.'));
    setClients(current => editing === 'new' ? [...current, result.data!] : current.map(item => item.id === result.data!.id ? result.data! : item)); setEditing(null);
  }
  async function archive(client: ClientRow) {
    if (!window.confirm(tr(locale,`Lưu trữ khách hàng ${client.name}?`,`Archive client ${client.name}?`))) return;
    const response = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' }); const result = await payload(response);
    if (!response.ok || !result.data) return setError(result.error?.message || tr(locale,'Không thể lưu trữ khách hàng.','Unable to archive client.'));
    setClients(current => current.map(item => item.id === client.id ? result.data! : item));
  }
  async function saveAssignments() {
    if (!assigning) return; setBusy(true); setError('');
    const response = await fetch(`/api/clients/${assigning.id}/assignments`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountIds: selected }) });
    const result = await response.json() as { error?: { message?: string } }; setBusy(false);
    if (!response.ok) return setError(result.error?.message || tr(locale,'Không thể gán tài khoản.','Unable to assign accounts.'));
    window.location.reload();
  }
  return <>
    <div className="crm-toolbar"><label><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={tr(locale,'Tìm tên, email hoặc tài khoản thuê','Search name, email, or rental account')}/></label>{canManage && <button className="ga-primary" onClick={() => openEditor()}><Plus size={15}/> {tr(locale,'Thêm khách hàng','Add client')}</button>}</div>
    {error && !editing && !assigning && <div className="ga-alert danger"><div><strong>{tr(locale,'Không thể hoàn tất thao tác','Unable to complete action')}</strong><p>{error}</p></div></div>}
    {visible.length === 0 ? <section className="ga-empty"><Building2 size={28}/><h2>{tr(locale,'Chưa có khách hàng','No clients yet')}</h2><p>{tr(locale,'Thêm hồ sơ CRM rồi gán các tài khoản Google Ads đã đồng bộ.','Add a CRM client and assign synchronized Google Ads accounts.')}</p></section> : <section className="ga-panel ga-table-panel"><div className="ga-table-wrap"><table className="ga-table crm-table"><thead><tr><th>{tr(locale,'Khách hàng','Client')}</th><th>{tr(locale,'Tài khoản thuê','Rental account')}</th><th>{tr(locale,'Tài khoản Google Ads','Google Ads accounts')}</th><th>{tr(locale,'Trạng thái','Status')}</th><th>{tr(locale,'Thao tác','Actions')}</th></tr></thead><tbody>{visible.map(client => <tr key={client.id}><td><strong>{client.name}</strong><small>{client.email || tr(locale,'Chưa có email','No email')}</small></td><td><strong>{client.rentalAccount || '—'}</strong></td><td><button className="crm-account-button" disabled={!canManage} onClick={() => openAssignments(client)}><Link2 size={13}/>{client.accountAssignments.length} {tr(locale,'tài khoản','accounts')}</button><small>{client.accountAssignments.slice(0, 2).map(item => item.customerAccount.name).join(', ') || tr(locale,'Chưa gán','Unassigned')}</small></td><td><span className={`ga-status ${client.status === 'ACTIVE' ? 'connected' : 'disconnected'}`}>{client.status === 'ACTIVE' ? tr(locale,'HOẠT ĐỘNG','ACTIVE') : tr(locale,'LƯU TRỮ','ARCHIVED')}</span></td><td>{canManage ? <div className="crm-actions"><button onClick={() => openEditor(client)} title={tr(locale,'Chỉnh sửa','Edit')}><Pencil size={14}/></button>{client.status === 'ACTIVE' && <button onClick={() => void archive(client)} title={tr(locale,'Lưu trữ','Archive')}><Archive size={14}/></button>}</div> : <span className="ga-readonly">{tr(locale,'Chỉ đọc','Read only')}</span>}</td></tr>)}</tbody></table></div></section>}
    {editing && <div className="modal-backdrop"><div className="confirm-modal member-modal crm-modal"><button className="modal-close" onClick={() => setEditing(null)} aria-label={tr(locale,'Đóng','Close')}><X size={17}/></button><span className="modal-icon"><Building2 size={20}/></span><h2>{editing === 'new' ? tr(locale,'Thêm khách hàng','Add client') : tr(locale,'Chỉnh sửa khách hàng','Edit client')}</h2><p>{tr(locale,'Dữ liệu CRM nội bộ, tách biệt với Google Ads.','Internal CRM data, separate from Google Ads.')}</p><form onSubmit={save}><div className="crm-form-grid"><label>{tr(locale,'Tên khách hàng','Client name')}<input value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} required minLength={2}/></label><label>Email<input type="email" value={form.email} onChange={event => setForm(value => ({ ...value, email: event.target.value }))}/></label><label className="crm-wide">{tr(locale,'Tài khoản thuê','Rental account')}<input value={form.rentalAccount} onChange={event => setForm(value => ({ ...value, rentalAccount: event.target.value }))} placeholder={tr(locale,'Tên hoặc Customer ID tài khoản thuê','Rental account name or Customer ID')} maxLength={300}/></label><label className="crm-wide">{tr(locale,'Ghi chú','Notes')}<textarea value={form.notes} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} maxLength={2000}/></label></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" onClick={() => setEditing(null)}>{tr(locale,'Huỷ','Cancel')}</button><button className="primary-action" disabled={busy}>{busy ? tr(locale,'Đang lưu...','Saving...') : tr(locale,'Lưu','Save')}</button></div></form></div></div>}
    {assigning && <div className="modal-backdrop"><div className="confirm-modal member-modal crm-modal assignment-modal"><button className="modal-close" onClick={() => setAssigning(null)} aria-label={tr(locale,'Đóng','Close')}><X size={17}/></button><span className="modal-icon"><Link2 size={20}/></span><h2>{tr(locale,'Gán tài khoản Google Ads','Assign Google Ads accounts')}</h2><p>{assigning.name} · {tr(locale,'tài khoản đã gán cho khách khác sẽ được chuyển sang khách này.','accounts assigned to another client will be moved to this client.')}</p><label className="assignment-search"><Search size={15}/><input value={assignmentQuery} onChange={event=>setAssignmentQuery(event.target.value)} placeholder={tr(locale,'Tìm theo tên hoặc Customer ID','Search by name or Customer ID')}/></label><div className="assignment-list"><div className="assignment-list-head"><span>{tr(locale,'Chọn','Select')}</span><span>{tr(locale,'Tài khoản','Account')}</span><span>{tr(locale,'MCC quản lý','Managing MCC')}</span><span>{tr(locale,'Quyền','Access')}</span></div>{visibleAccounts.map(account => <label className="assignment-account-row" key={account.id}><input type="checkbox" checked={selected.includes(account.id)} onChange={() => setSelected(current => current.includes(account.id) ? current.filter(id => id !== account.id) : [...current, account.id])}/><span><strong>{account.name}</strong><small>{formatCustomerId(account.customerId)}</small>{account.assignedClientId && account.assignedClientId !== assigning.id && <small>{tr(locale,'Đang thuộc','Assigned to')} {account.assignedClientName}</small>}</span><span><strong>{account.mccName}</strong><small>{formatCustomerId(account.mccCustomerId)}</small></span><em className={account.managedByMcc?'yes':'no'}>{account.managedByMcc?tr(locale,'Có','Yes'):tr(locale,'Không','No')}</em></label>)}{visibleAccounts.length===0&&<p className="assignment-empty">{tr(locale,'Không tìm thấy tài khoản phù hợp.','No matching account found.')}</p>}</div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button onClick={() => setAssigning(null)}>{tr(locale,'Huỷ','Cancel')}</button><button className="primary-action" disabled={busy} onClick={() => void saveAssignments()}>{busy ? tr(locale,'Đang lưu...','Saving...') : tr(locale,'Lưu gán tài khoản','Save assignments')}</button></div></div></div>}
  </>;
}
