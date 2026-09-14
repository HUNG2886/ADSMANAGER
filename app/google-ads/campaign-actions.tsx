'use client';
import { CircleDollarSign,Pause,Play } from 'lucide-react';
import { useState } from 'react';
import {formatGoogleAdsApiError,type GoogleAdsApiErrorPayload} from '@/lib/google-ads-format';
import { dateLocale, tr } from '@/lib/i18n';
import { useAppLocale } from '@/app/locale-provider';

export function CampaignActions({id,status,budget}:{id:string;status:'ENABLED'|'PAUSED'|'REMOVED';budget:number}){
  const locale=useAppLocale();
  const[busy,setBusy]=useState(false);const[error,setError]=useState('');
  async function mutate(body:object,question:string){if(!window.confirm(question))return;setBusy(true);setError('');const response=await fetch('/api/campaigns',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,...body})});const payload=await response.json() as {error?:GoogleAdsApiErrorPayload};if(!response.ok){setError(formatGoogleAdsApiError(payload.error,tr(locale,'Google Ads không thể xử lý yêu cầu.','Google Ads could not process the request.')));setBusy(false);return}window.location.reload()}
  function budgetUpdate(){const raw=window.prompt(tr(locale,'Ngân sách mới (đơn vị tiền tệ của tài khoản):','New budget (in the account currency):'),String(budget));if(!raw)return;const amount=Number(raw);if(!Number.isFinite(amount)||amount<=0){setError(tr(locale,'Ngân sách không hợp lệ.','Invalid budget.'));return}void mutate({action:'BUDGET',amount},tr(locale,`Xác nhận cập nhật ngân sách thành ${amount.toLocaleString(dateLocale(locale))}?`,`Update the budget to ${amount.toLocaleString(dateLocale(locale))}?`))}
  return <div className="ga-campaign-actions"><button disabled={busy||status==='REMOVED'} onClick={()=>void mutate({action:'STATUS',status:status==='ENABLED'?'PAUSED':'ENABLED'},status==='ENABLED'?tr(locale,'Xác nhận tạm dừng chiến dịch trên Google Ads?','Pause this campaign on Google Ads?'):tr(locale,'Xác nhận bật chiến dịch trên Google Ads?','Enable this campaign on Google Ads?'))}>{status==='ENABLED'?<Pause size={13}/>:<Play size={13}/>} {status==='ENABLED'?tr(locale,'Tạm dừng','Pause'):tr(locale,'Bật','Enable')}</button><button disabled={busy||status==='REMOVED'} onClick={budgetUpdate}><CircleDollarSign size={13}/>{tr(locale,'Ngân sách','Budget')}</button>{error&&<span>{error}</span>}</div>
}
