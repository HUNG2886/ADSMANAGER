'use client';

import { MessageSquareText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { dateLocale, tr } from '@/lib/i18n';
import { useAppLocale } from '@/app/locale-provider';

type Note = { id: string; content: string; createdAt: string; updatedAt: string; author: { id: string; name: string | null; email: string } | null };

export function AccountNotes({ accountId, initialNotes, canManage }: { accountId: string; initialNotes: Note[]; canManage: boolean }) {
  const locale = useAppLocale();
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function parse(response: Response) { return response.json() as Promise<{ data?: Note; error?: { message?: string } }>; }
  async function create(event: React.FormEvent) {
    event.preventDefault(); if (!content.trim()) return; setBusy(true); setError('');
    const response = await fetch(`/api/accounts/${accountId}/notes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content }) }); const result = await parse(response); setBusy(false);
    if (!response.ok || !result.data) return setError(result.error?.message || tr(locale,'Không thể thêm ghi chú.','Unable to add note.'));
    setNotes(current => [result.data!, ...current]); setContent('');
  }
  async function update(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return; setBusy(true); setError('');
    const response = await fetch(`/api/accounts/${accountId}/notes/${editing.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: editing.content }) }); const result = await parse(response); setBusy(false);
    if (!response.ok || !result.data) return setError(result.error?.message || tr(locale,'Không thể sửa ghi chú.','Unable to update note.'));
    setNotes(current => current.map(note => note.id === result.data!.id ? result.data! : note)); setEditing(null);
  }
  async function remove(note: Note) {
    if (!window.confirm(tr(locale,'Xoá ghi chú này?','Delete this note?'))) return; setBusy(true); setError('');
    const response = await fetch(`/api/accounts/${accountId}/notes/${note.id}`, { method: 'DELETE' }); const result = await response.json() as { error?: { message?: string } }; setBusy(false);
    if (!response.ok) return setError(result.error?.message || tr(locale,'Không thể xoá ghi chú.','Unable to delete note.'));
    setNotes(current => current.filter(item => item.id !== note.id));
  }
  return <section className="ga-panel account-notes"><div className="ga-panel-head"><div><h2>{tr(locale,'Ghi chú tài khoản','Account notes')}</h2><p>{notes.length} {tr(locale,'ghi chú nội bộ · được ghi vào nhật ký kiểm toán','internal notes · recorded in the audit log')}</p></div><MessageSquareText size={18}/></div>{canManage && <form className="account-note-form" onSubmit={create}><textarea value={content} onChange={event => setContent(event.target.value)} placeholder={tr(locale,'Thêm ghi chú về tài khoản, khách hàng hoặc chiến dịch...','Add a note about the account, client, or campaign...')} maxLength={2000}/><button className="ga-primary" disabled={busy || !content.trim()}><Plus size={14}/> {tr(locale,'Thêm ghi chú','Add note')}</button></form>}{error && <div className="account-note-error">{error}</div>}<div className="account-note-list">{notes.map(note => <article key={note.id}><header><div><strong>{note.author?.name || note.author?.email || tr(locale,'Tài khoản đã xoá','Deleted account')}</strong><small>{new Date(note.createdAt).toLocaleString(dateLocale(locale))}{note.updatedAt !== note.createdAt ? tr(locale,' · Đã sửa',' · Edited') : ''}</small></div>{canManage && <span><button onClick={() => setEditing(note)} title={tr(locale,'Sửa','Edit')}><Pencil size={13}/></button><button onClick={() => void remove(note)} title={tr(locale,'Xoá','Delete')}><Trash2 size={13}/></button></span>}</header><p>{note.content}</p></article>)}{notes.length === 0 && <div className="account-note-empty">{tr(locale,'Chưa có ghi chú cho tài khoản này.','No notes for this account.')}</div>}</div>{editing && <div className="modal-backdrop"><form className="confirm-modal member-modal account-note-modal" onSubmit={update}><button type="button" className="modal-close" onClick={() => setEditing(null)} aria-label={tr(locale,'Đóng','Close')}><X size={17}/></button><span className="modal-icon"><MessageSquareText size={20}/></span><h2>{tr(locale,'Sửa ghi chú','Edit note')}</h2><textarea value={editing.content} onChange={event => setEditing(value => value ? { ...value, content: event.target.value } : value)} required maxLength={2000}/>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" onClick={() => setEditing(null)}>{tr(locale,'Huỷ','Cancel')}</button><button className="primary-action" disabled={busy}>{tr(locale,'Lưu','Save')}</button></div></form></div>}</section>;
}
