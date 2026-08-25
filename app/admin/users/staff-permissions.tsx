'use client';
import { Save,ShieldCheck } from 'lucide-react';
import { useEffect,useState } from 'react';

type Member={id:string;name:string|null;email:string;role:'ADMIN'|'STAFF';status:string;mccIds:string[]};
type Mcc={id:string;name:string;customerId:string;connection:{id:string;googleEmail:string}};
type UsersResponse={data?:{items?:Member[]}};
type MccResponse={data?:Mcc[]};

export function StaffPermissions(){
  const[members,setMembers]=useState<Member[]>([]);const[mccs,setMccs]=useState<Mcc[]>([]);const[selected,setSelected]=useState<Record<string,string[]>>({});const[connectionId,setConnectionId]=useState('');const[busy,setBusy]=useState('');const[message,setMessage]=useState('');
  useEffect(()=>{Promise.all([
    fetch('/api/users').then(async response=>await response.json() as UsersResponse),
    fetch('/api/mcc').then(async response=>await response.json() as MccResponse),
  ]).then(([users,mcc])=>{const rows=users.data?.items??[];const mccRows=mcc.data??[];setMembers(rows);setMccs(mccRows);setConnectionId(mccRows[0]?.connection.id??'');setSelected(Object.fromEntries(rows.map(item=>[item.id,item.mccIds??[]])))})},[]);
  function toggle(userId:string,mccId:string){setSelected(current=>({...current,[userId]:(current[userId]||[]).includes(mccId)?current[userId].filter(id=>id!==mccId):[...(current[userId]||[]),mccId]}))}
  async function save(userId:string){setBusy(userId);setMessage('');const response=await fetch('/api/users',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:userId,mccIds:selected[userId]||[]})});const payload=await response.json() as {error?:{message?:string}};setBusy('');setMessage(response.ok?'Đã lưu quyền MCC.':payload.error?.message||'Không thể lưu quyền.')}
  const staff=members.filter(item=>item.role==='STAFF');const connections=[...new Map(mccs.map(item=>[item.connection.id,item.connection])).values()];const visibleMccs=mccs.filter(item=>!connectionId||item.connection.id===connectionId);
  return <section className="ga-permission-list">{connections.length>0&&<div className="ga-connection-filter"><label>Google Connection<select value={connectionId} onChange={event=>setConnectionId(event.target.value)}>{connections.map(connection=><option value={connection.id} key={connection.id}>{connection.googleEmail}</option>)}</select></label><span>{visibleMccs.length} MCC khả dụng</span></div>}{message&&<div className="ga-alert success"><ShieldCheck size={18}/><div><strong>{message}</strong></div></div>}{staff.map(member=><article className="ga-panel" key={member.id}><div className="ga-panel-head"><div><h2>{member.name||member.email}</h2><p>{member.email} · {member.status}</p></div><button className="ga-primary" disabled={busy===member.id} onClick={()=>void save(member.id)}><Save size={14}/>{busy===member.id?'Đang lưu...':'Save'}</button></div><div className="ga-permission-grid">{visibleMccs.map(mcc=><label key={mcc.id}><input type="checkbox" checked={(selected[member.id]||[]).includes(mcc.id)} onChange={()=>toggle(member.id,mcc.id)}/><span><strong>{mcc.name}</strong><small>{mcc.customerId} · {mcc.connection.googleEmail}</small></span></label>)}</div></article>)}{staff.length===0&&<div className="ga-empty"><ShieldCheck size={28}/><h2>Chưa có STAFF</h2><p>Tạo tài khoản STAFF qua API quản trị trước khi gán MCC.</p></div>}</section>
}
