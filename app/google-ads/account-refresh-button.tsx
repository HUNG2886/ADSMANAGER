'use client';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import {formatGoogleAdsApiError,type GoogleAdsApiErrorPayload} from '@/lib/google-ads-format';
import { tr } from '@/lib/i18n';
import { useAppLocale } from '@/app/locale-provider';
export function AccountRefreshButton({id}:{id:string}){const locale=useAppLocale();const[busy,setBusy]=useState(false);const[error,setError]=useState('');async function refresh(){setBusy(true);setError('');const response=await fetch(`/api/google-ads/accounts/${id}/refresh`,{method:'POST'});const payload=await response.json() as {error?:GoogleAdsApiErrorPayload};if(!response.ok){setError(formatGoogleAdsApiError(payload.error,tr(locale,'Không thể đồng bộ.','Unable to synchronize.')));setBusy(false);return}window.location.reload()}return <div className="ga-inline-action"><button className="ga-secondary" disabled={busy} onClick={refresh}><RefreshCw size={14}/>{busy?tr(locale,'Đang đồng bộ...','Syncing...'):tr(locale,'Làm mới tài khoản','Refresh account')}</button>{error&&<span>{error}</span>}</div>}
