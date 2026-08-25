'use client';
import { AlertTriangle,RefreshCw,Unplug } from 'lucide-react';
import { useState } from 'react';
import {formatGoogleAdsApiError,type GoogleAdsApiErrorPayload} from '@/lib/google-ads-format';

type ActionError={message:string;technical?:string};

function readableError(error:GoogleAdsApiErrorPayload|undefined,fallback:string):ActionError{
  const technical=formatGoogleAdsApiError(error,fallback);
  if(error?.code==='DEVELOPER_TOKEN_NOT_APPROVED')return{message:'Developer Token đang ở mức Test nên chưa thể đọc tài khoản Google Ads production.',technical};
  return{message:error?.message||fallback,technical:error?technical:undefined};
}

export function ConnectionActions({id,status}:{id:string;status:string}){
  const[busy,setBusy]=useState<'refresh'|'disconnect'|null>(null);const[error,setError]=useState<ActionError|null>(null);
  async function refresh(){setBusy('refresh');setError(null);const response=await fetch(`/api/google-ads/connections/${id}/refresh`,{method:'POST'});const payload=await response.json() as {error?:GoogleAdsApiErrorPayload};if(!response.ok){setError(readableError(payload.error,'Không thể đồng bộ.'));setBusy(null);return}window.location.reload()}
  async function disconnect(){if(!window.confirm('Bạn có chắc muốn ngắt kết nối Google account này? Dữ liệu lịch sử vẫn được giữ lại.'))return;setBusy('disconnect');setError(null);const response=await fetch(`/api/google-ads/connections/${id}`,{method:'DELETE'});const payload=await response.json() as {error?:{message?:string}};if(!response.ok){setError({message:payload.error?.message||'Không thể ngắt kết nối.'});setBusy(null);return}window.location.reload()}
  return <div className="ga-connection-controls"><div className="ga-connection-actions">{status==='REAUTH_REQUIRED'?<a className="ga-primary" href="/api/auth/google-ads">Đăng nhập lại</a>:<button disabled={Boolean(busy)||status==='DISCONNECTED'} onClick={refresh}><RefreshCw size={14}/>{busy==='refresh'?'Đang đồng bộ...':'Refresh'}</button>}<button className="danger" disabled={Boolean(busy)||status==='DISCONNECTED'} onClick={disconnect}><Unplug size={14}/>{busy==='disconnect'?'Đang ngắt...':'Disconnect'}</button></div>{error&&<div className="ga-action-feedback" role="alert"><AlertTriangle size={16}/><div><strong>Không thể hoàn tất yêu cầu</strong><p>{error.message}</p>{error.technical&&<details><summary>Chi tiết kỹ thuật</summary><code>{error.technical}</code></details>}</div></div>}</div>
}
