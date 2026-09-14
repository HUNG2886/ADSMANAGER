'use client';

import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAppLocale } from '@/app/locale-provider';
import { tr } from '@/lib/i18n';
import {
  syncAllGoogleAdsAccounts,
  type CampaignSyncProgress,
  type CampaignSyncResult,
} from '@/lib/google-ads-bulk-sync-client';

export function CampaignSyncButton() {
  const locale = useAppLocale();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<CampaignSyncProgress | null>(null);
  const [result, setResult] = useState<CampaignSyncResult | null>(null);
  const [error, setError] = useState('');

  async function synchronize() {
    setRunning(true);
    setProgress(null);
    setResult(null);
    setError('');
    try {
      const nextResult = await syncAllGoogleAdsAccounts({ onProgress: setProgress });
      setResult(nextResult);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : tr(locale, 'Không thể đồng bộ toàn bộ chiến dịch.', 'Unable to synchronize all campaigns.'),
      );
    } finally {
      setRunning(false);
    }
  }

  const firstFailure = result?.failures[0];
  return (
    <div className="ga-bulk-sync">
      <button className="ga-primary" disabled={running} onClick={synchronize}>
        <RefreshCw className={running ? 'spin' : ''} size={15} />
        {running
          ? tr(
              locale,
              `Đang đồng bộ ${progress?.processed ?? 0}/${progress?.total ?? '…'} tài khoản`,
              `Syncing ${progress?.processed ?? 0}/${progress?.total ?? '…'} accounts`,
            )
          : tr(locale, 'Đồng bộ tất cả chiến dịch', 'Sync all campaigns')}
      </button>
      {result && result.failed === 0 && (
        <small className="success">
          <CheckCircle2 size={13} />
          {tr(
            locale,
            `Đã đồng bộ ${result.succeeded}/${result.total} tài khoản và ${result.campaignCount} chiến dịch.`,
            `Synchronized ${result.succeeded}/${result.total} accounts and ${result.campaignCount} campaigns.`,
          )}
        </small>
      )}
      {firstFailure && (
        <small className="danger">
          <AlertTriangle size={13} />
          {tr(
            locale,
            `${result!.succeeded}/${result!.total} tài khoản thành công; ${result!.failed} lỗi.`,
            `${result!.succeeded}/${result!.total} accounts succeeded; ${result!.failed} failed.`,
          )}{' '}
          {firstFailure.accountName}: {firstFailure.code} · {firstFailure.message}
          {firstFailure.requestId ? ` · Request ID: ${firstFailure.requestId}` : ''}
        </small>
      )}
      {error && (
        <small className="danger">
          <AlertTriangle size={13} /> {error}
        </small>
      )}
    </div>
  );
}
