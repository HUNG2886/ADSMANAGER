'use client';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import {formatGoogleAdsApiError,type GoogleAdsApiErrorPayload} from '@/lib/google-ads-format';
export function AccountRefreshButton({id}:{id:string}){const[busy,setBusy]=useState(false);const[error,setError]=useState('');async function refresh(){setBusy(true);setError('');const response=await fetch(`/api/google-ads/accounts/${id}/refresh`,{method:'POST'});const payload=await response.json() as {error?:GoogleAdsApiErrorPayload};if(!response.ok){setError(formatGoogleAdsApiError(payload.error,'Không thể đồng bộ.'));setBusy(false);return}window.location.reload()}return <div className="ga-inline-action"><button className="ga-secondary" disabled={busy} onClick={refresh}><RefreshCw size={14}/>{busy?'Đang đồng bộ...':'Refresh account'}</button>{error&&<span>{error}</span>}</div>}
