'use client';

import { MessageSquareText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

type Note = { id: string; content: string; createdAt: string; updatedAt: string; author: { id: string; name: string | null; email: string } | null };

export function AccountNotes({ accountId, initialNotes, canManage }: { accountId: string; initialNotes: Note[]; canManage: boolean }) {
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function parse(response: Response) { return response.json() as Promise<{ data?: Note; error?: { message?: string } }>; }
  async function create(event: React.FormEvent) {
    event.preventDefault(); if (!content.trim()) return; setBusy(true); setError('');
    const response = await fetch(`/api/accounts/${accountId}/notes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content }) }); const result = await parse(response); setBusy(false);
    if (!response.ok || !result.data) return setError(result.error?.message || 'Không thể thêm ghi chú.');
    setNotes(current => [result.data!, ...current]); setContent('');
  }
  async function update(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return; setBusy(true); setError('');
    const response = await fetch(`/api/accounts/${accountId}/notes/${editing.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: editing.content }) }); const result = await parse(response); setBusy(false);
    if (!response.ok || !result.data) return setError(result.error?.message || 'Không thể sửa ghi chú.');
    setNotes(current => current.map(note => note.id === result.data!.id ? result.data! : note)); setEditing(null);
  }
  async function remove(note: Note) {
    if (!window.confirm('Xoá ghi chú này?')) return; setBusy(true); setError('');
    const response = await fetch(`/api/accounts/${accountId}/notes/${note.id}`, { method: 'DELETE' }); const result = await response.json() as { error?: { message?: string } }; setBusy(false);
    if (!response.ok) return setError(result.error?.message || 'Không thể xoá ghi chú.');
    setNotes(current => current.filter(item => item.id !== note.id));
  }
  return <section className="ga-panel account-notes"><div className="ga-panel-head"><div><h2>Ghi chú account</h2><p>{notes.length} ghi chú nội bộ · được ghi vào audit log</p></div><MessageSquareText size={18}/></div>{canManage && <form className="account-note-form" onSubmit={create}><textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Thêm ghi chú về account, khách hàng hoặc chiến dịch..." maxLength={2000}/><button className="ga-primary" disabled={busy || !content.trim()}><Plus size={14}/> Thêm ghi chú</button></form>}{error && <div className="account-note-error">{error}</div>}<div className="account-note-list">{notes.map(note => <article key={note.id}><header><div><strong>{note.author?.name || note.author?.email || 'Tài khoản đã xoá'}</strong><small>{new Date(note.createdAt).toLocaleString('vi-VN')}{note.updatedAt !== note.createdAt ? ' · Đã sửa' : ''}</small></div>{canManage && <span><button onClick={() => setEditing(note)} title="Sửa"><Pencil size={13}/></button><button onClick={() => void remove(note)} title="Xoá"><Trash2 size={13}/></button></span>}</header><p>{note.content}</p></article>)}{notes.length === 0 && <div className="account-note-empty">Chưa có ghi chú cho account này.</div>}</div>{editing && <div className="modal-backdrop"><form className="confirm-modal member-modal account-note-modal" onSubmit={update}><button type="button" className="modal-close" onClick={() => setEditing(null)}><X size={17}/></button><span className="modal-icon"><MessageSquareText size={20}/></span><h2>Sửa ghi chú</h2><textarea value={editing.content} onChange={event => setEditing(value => value ? { ...value, content: event.target.value } : value)} required maxLength={2000}/>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" onClick={() => setEditing(null)}>Huỷ</button><button className="primary-action" disabled={busy}>Lưu</button></div></form></div>}</section>;
}
