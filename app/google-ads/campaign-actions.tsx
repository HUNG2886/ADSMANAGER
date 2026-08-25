'use client';
import { CircleDollarSign,Pause,Play } from 'lucide-react';
import { useState } from 'react';

export function CampaignActions({id,status,budget}:{id:string;status:'ENABLED'|'PAUSED'|'REMOVED';budget:number}){
  const[busy,setBusy]=useState(false);const[error,setError]=useState('');
  async function mutate(body:object,question:string){if(!window.confirm(question))return;setBusy(true);setError('');const response=await fetch('/api/campaigns',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,...body})});const payload=await response.json() as {error?:{message?:string}};if(!response.ok){setError(payload.error?.message||'Google Ads không thể xử lý yêu cầu.');setBusy(false);return}window.location.reload()}
  function budgetUpdate(){const raw=window.prompt('Ngân sách mới (đơn vị tiền tệ của account):',String(budget));if(!raw)return;const amount=Number(raw);if(!Number.isFinite(amount)||amount<=0){setError('Ngân sách không hợp lệ.');return}void mutate({action:'BUDGET',amount},`Xác nhận cập nhật ngân sách thành ${amount.toLocaleString('vi-VN')}?`)}
  return <div className="ga-campaign-actions"><button disabled={busy||status==='REMOVED'} onClick={()=>void mutate({action:'STATUS',status:status==='ENABLED'?'PAUSED':'ENABLED'},status==='ENABLED'?'Xác nhận tạm dừng chiến dịch trên Google Ads?':'Xác nhận bật chiến dịch trên Google Ads?')}>{status==='ENABLED'?<Pause size={13}/>:<Play size={13}/>} {status==='ENABLED'?'Pause':'Enable'}</button><button disabled={busy||status==='REMOVED'} onClick={budgetUpdate}><CircleDollarSign size={13}/>Budget</button>{error&&<span>{error}</span>}</div>
}
