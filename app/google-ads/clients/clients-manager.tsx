'use client';

import { Archive, Building2, Link2, Pencil, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Assignment = { customerAccount: { id: string; name: string; customerId: string; status: string; mcc: { name: string } } };
type ClientRow = { id: string; name: string; company: string | null; email: string | null; phone: string | null; website: string | null; status: 'ACTIVE' | 'ARCHIVED'; notes: string | null; createdAt: string; updatedAt: string; accountAssignments: Assignment[] };
type AccountOption = { id: string; name: string; customerId: string; status: string; mccName: string; assignedClientId: string | null; assignedClientName: string | null };
type FormState = { name: string; company: string; email: string; phone: string; website: string; notes: string };
const EMPTY_FORM: FormState = { name: '', company: '', email: '', phone: '', website: '', notes: '' };

export function ClientsManager({ initialClients, accounts, canManage }: { initialClients: ClientRow[]; accounts: AccountOption[]; canManage: boolean }) {
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ClientRow | 'new' | null>(null);
  const [assigning, setAssigning] = useState<ClientRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const visible = useMemo(() => clients.filter(client => `${client.name} ${client.company || ''} ${client.email || ''}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);

  function openEditor(client?: ClientRow) {
    setError(''); setEditing(client || 'new');
    setForm(client ? { name: client.name, company: client.company || '', email: client.email || '', phone: client.phone || '', website: client.website || '', notes: client.notes || '' } : EMPTY_FORM);
  }
  function openAssignments(client: ClientRow) { setError(''); setAssigning(client); setSelected(client.accountAssignments.map(item => item.customerAccount.id)); }
  async function payload(response: Response) { return response.json() as Promise<{ data?: ClientRow; error?: { message?: string } }>; }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return; setBusy(true); setError('');
    const response = await fetch(editing === 'new' ? '/api/clients' : `/api/clients/${editing.id}`, { method: editing === 'new' ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const result = await payload(response); setBusy(false);
    if (!response.ok || !result.data) return setError(result.error?.message || 'Không thể lưu khách hàng.');
    setClients(current => editing === 'new' ? [...current, result.data!] : current.map(item => item.id === result.data!.id ? result.data! : item)); setEditing(null);
  }
  async function archive(client: ClientRow) {
    if (!window.confirm(`Lưu trữ khách hàng ${client.name}?`)) return;
    const response = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' }); const result = await payload(response);
    if (!response.ok || !result.data) return setError(result.error?.message || 'Không thể lưu trữ khách hàng.');
    setClients(current => current.map(item => item.id === client.id ? result.data! : item));
  }
  async function saveAssignments() {
    if (!assigning) return; setBusy(true); setError('');
    const response = await fetch(`/api/clients/${assigning.id}/assignments`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountIds: selected }) });
    const result = await response.json() as { error?: { message?: string } }; setBusy(false);
    if (!response.ok) return setError(result.error?.message || 'Không thể gán tài khoản.');
    window.location.reload();
  }
  return <>
    <div className="crm-toolbar"><label><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên, công ty hoặc email"/></label>{canManage && <button className="ga-primary" onClick={() => openEditor()}><Plus size={15}/> Thêm khách hàng</button>}</div>
    {error && !editing && !assigning && <div className="ga-alert danger"><div><strong>Không thể hoàn tất thao tác</strong><p>{error}</p></div></div>}
    {visible.length === 0 ? <section className="ga-empty"><Building2 size={28}/><h2>Chưa có khách hàng</h2><p>Thêm hồ sơ CRM rồi gán các tài khoản Google Ads đã đồng bộ.</p></section> : <section className="ga-panel ga-table-panel"><div className="ga-table-wrap"><table className="ga-table crm-table"><thead><tr><th>Khách hàng</th><th>Liên hệ</th><th>Google Ads accounts</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visible.map(client => <tr key={client.id}><td><strong>{client.name}</strong><small>{client.company || 'Không có công ty'}</small></td><td><strong>{client.email || '—'}</strong><small>{client.phone || client.website || '—'}</small></td><td><button className="crm-account-button" disabled={!canManage} onClick={() => openAssignments(client)}><Link2 size={13}/>{client.accountAssignments.length} account</button><small>{client.accountAssignments.slice(0, 2).map(item => item.customerAccount.name).join(', ') || 'Chưa gán'}</small></td><td><span className={`ga-status ${client.status === 'ACTIVE' ? 'connected' : 'disconnected'}`}>{client.status}</span></td><td>{canManage ? <div className="crm-actions"><button onClick={() => openEditor(client)} title="Chỉnh sửa"><Pencil size={14}/></button>{client.status === 'ACTIVE' && <button onClick={() => void archive(client)} title="Lưu trữ"><Archive size={14}/></button>}</div> : <span className="ga-readonly">Read only</span>}</td></tr>)}</tbody></table></div></section>}
    {editing && <div className="modal-backdrop"><div className="confirm-modal member-modal crm-modal"><button className="modal-close" onClick={() => setEditing(null)}><X size={17}/></button><span className="modal-icon"><Building2 size={20}/></span><h2>{editing === 'new' ? 'Thêm khách hàng' : 'Chỉnh sửa khách hàng'}</h2><p>Dữ liệu CRM nội bộ, tách biệt với Google Ads.</p><form onSubmit={save}><div className="crm-form-grid"><label>Tên khách hàng<input value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} required minLength={2}/></label><label>Công ty<input value={form.company} onChange={event => setForm(value => ({ ...value, company: event.target.value }))}/></label><label>Email<input type="email" value={form.email} onChange={event => setForm(value => ({ ...value, email: event.target.value }))}/></label><label>Số điện thoại<input value={form.phone} onChange={event => setForm(value => ({ ...value, phone: event.target.value }))}/></label><label className="crm-wide">Website<input type="url" value={form.website} onChange={event => setForm(value => ({ ...value, website: event.target.value }))} placeholder="https://..."/></label><label className="crm-wide">Ghi chú<textarea value={form.notes} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} maxLength={2000}/></label></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" onClick={() => setEditing(null)}>Huỷ</button><button className="primary-action" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu'}</button></div></form></div></div>}
    {assigning && <div className="modal-backdrop"><div className="confirm-modal member-modal crm-modal assignment-modal"><button className="modal-close" onClick={() => setAssigning(null)}><X size={17}/></button><span className="modal-icon"><Link2 size={20}/></span><h2>Gán Google Ads accounts</h2><p>{assigning.name} · account đã gán cho khách khác sẽ được chuyển sang khách này.</p><div className="assignment-list">{accounts.map(account => <label key={account.id}><input type="checkbox" checked={selected.includes(account.id)} onChange={() => setSelected(current => current.includes(account.id) ? current.filter(id => id !== account.id) : [...current, account.id])}/><span><strong>{account.name}</strong><small>{account.customerId} · {account.mccName}{account.assignedClientId && account.assignedClientId !== assigning.id ? ` · Đang thuộc ${account.assignedClientName}` : ''}</small></span></label>)}</div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button onClick={() => setAssigning(null)}>Huỷ</button><button className="primary-action" disabled={busy} onClick={() => void saveAssignments()}>{busy ? 'Đang lưu...' : 'Lưu gán account'}</button></div></div></div>}
  </>;
}
