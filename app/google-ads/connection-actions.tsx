'use client';
import { RefreshCw,Unplug } from 'lucide-react';
import { useState } from 'react';
import {formatGoogleAdsApiError,type GoogleAdsApiErrorPayload} from '@/lib/google-ads-format';

export function ConnectionActions({id,status}:{id:string;status:string}){
  const[busy,setBusy]=useState<'refresh'|'disconnect'|null>(null);const[error,setError]=useState('');
  async function refresh(){setBusy('refresh');setError('');const response=await fetch(`/api/google-ads/connections/${id}/refresh`,{method:'POST'});const payload=await response.json() as {error?:GoogleAdsApiErrorPayload};if(!response.ok){setError(formatGoogleAdsApiError(payload.error,'Không thể đồng bộ.'));setBusy(null);return}window.location.reload()}
  async function disconnect(){if(!window.confirm('Bạn có chắc muốn ngắt kết nối Google account này? Dữ liệu lịch sử vẫn được giữ lại.'))return;setBusy('disconnect');setError('');const response=await fetch(`/api/google-ads/connections/${id}`,{method:'DELETE'});const payload=await response.json() as {error?:{message?:string}};if(!response.ok){setError(payload.error?.message||'Không thể ngắt kết nối.');setBusy(null);return}window.location.reload()}
  return <div className="ga-connection-actions">{status==='REAUTH_REQUIRED'?<a className="ga-primary" href="/api/auth/google-ads">Đăng nhập lại</a>:<button disabled={Boolean(busy)||status==='DISCONNECTED'} onClick={refresh}><RefreshCw size={14}/>{busy==='refresh'?'Đang đồng bộ...':'Refresh'}</button>}<button className="danger" disabled={Boolean(busy)||status==='DISCONNECTED'} onClick={disconnect}><Unplug size={14}/>{busy==='disconnect'?'Đang ngắt...':'Disconnect'}</button>{error&&<p>{error}</p>}</div>
}
