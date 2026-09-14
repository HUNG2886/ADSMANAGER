'use client';

import { AlertTriangle, RefreshCw, Unplug } from 'lucide-react';
import { useState } from 'react';
import { useAppLocale } from '@/app/locale-provider';
import {
  formatGoogleAdsApiError,
  type GoogleAdsApiErrorPayload,
} from '@/lib/google-ads-format';
import { syncAllGoogleAdsAccounts } from '@/lib/google-ads-bulk-sync-client';
import { tr } from '@/lib/i18n';

type ActionError = { message: string; technical?: string };

function readableError(
  error: GoogleAdsApiErrorPayload | undefined,
  fallback: string,
  testMessage: string,
): ActionError {
  const technical = formatGoogleAdsApiError(error, fallback);
  if (error?.code === 'DEVELOPER_TOKEN_NOT_APPROVED') {
    return { message: testMessage, technical };
  }
  return { message: error?.message || fallback, technical: error ? technical : undefined };
}

export function ConnectionActions({ id, status }: { id: string; status: string }) {
  const locale = useAppLocale();
  const [busy, setBusy] = useState<'refresh' | 'disconnect' | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<ActionError | null>(null);

  async function refresh() {
    setBusy('refresh');
    setProgress('');
    setError(null);
    const response = await fetch(`/api/google-ads/connections/${id}/refresh`, { method: 'POST' });
    const payload = (await response.json()) as { error?: GoogleAdsApiErrorPayload };
    if (!response.ok) {
      setError(
        readableError(
          payload.error,
          tr(locale, 'Không thể đồng bộ.', 'Unable to synchronize.'),
          tr(
            locale,
            'Developer Token đang ở mức Test nên chưa thể đọc tài khoản Google Ads production.',
            'The Developer Token has Test access and cannot read production Google Ads accounts.',
          ),
        ),
      );
      setBusy(null);
      return;
    }

    try {
      const result = await syncAllGoogleAdsAccounts({
        connectionId: id,
        onProgress: (next) =>
          setProgress(
            tr(
              locale,
              `Đang đọc chiến dịch ${next.processed}/${next.total} tài khoản`,
              `Loading campaigns from ${next.processed}/${next.total} accounts`,
            ),
          ),
      });
      if (result.failures.length) {
        const first = result.failures[0];
        setError({
          message: tr(
            locale,
            `${result.succeeded}/${result.total} tài khoản thành công; ${result.failed} lỗi.`,
            `${result.succeeded}/${result.total} accounts succeeded; ${result.failed} failed.`,
          ),
          technical: `${first.accountName} (${first.customerId}) · Code: ${first.code} · Type: ${first.type} · Message: ${first.message}${first.requestId ? ` · Request ID: ${first.requestId}` : ''}`,
        });
        setBusy(null);
        setProgress('');
        return;
      }
      window.location.reload();
    } catch (cause) {
      setError({
        message:
          cause instanceof Error
            ? cause.message
            : tr(locale, 'Không thể đồng bộ chiến dịch.', 'Unable to synchronize campaigns.'),
      });
      setBusy(null);
      setProgress('');
    }
  }

  async function disconnect() {
    if (
      !window.confirm(
        tr(
          locale,
          'Bạn có chắc muốn ngắt kết nối Google account này? Dữ liệu lịch sử vẫn được giữ lại.',
          'Disconnect this Google account? Historical data will be preserved.',
        ),
      )
    )
      return;
    setBusy('disconnect');
    setProgress('');
    setError(null);
    const response = await fetch(`/api/google-ads/connections/${id}`, { method: 'DELETE' });
    const payload = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      setError({
        message:
          payload.error?.message ||
          tr(locale, 'Không thể ngắt kết nối.', 'Unable to disconnect.'),
      });
      setBusy(null);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="ga-connection-controls">
      <div className="ga-connection-actions">
        {status === 'REAUTH_REQUIRED' ? (
          <a className="ga-primary" href="/api/auth/google-ads">
            {tr(locale, 'Đăng nhập lại', 'Reconnect')}
          </a>
        ) : (
          <button disabled={Boolean(busy) || status === 'DISCONNECTED'} onClick={refresh}>
            <RefreshCw className={busy === 'refresh' ? 'spin' : ''} size={14} />
            {busy === 'refresh'
              ? progress || tr(locale, 'Đang đồng bộ MCC...', 'Syncing MCCs...')
              : tr(locale, 'Làm mới toàn bộ', 'Refresh all')}
          </button>
        )}
        <button
          className="danger"
          disabled={Boolean(busy) || status === 'DISCONNECTED'}
          onClick={disconnect}
        >
          <Unplug size={14} />
          {busy === 'disconnect'
            ? tr(locale, 'Đang ngắt...', 'Disconnecting...')
            : tr(locale, 'Ngắt kết nối', 'Disconnect')}
        </button>
      </div>
      {error && (
        <div className="ga-action-feedback" role="alert">
          <AlertTriangle size={16} />
          <div>
            <strong>{tr(locale, 'Không thể hoàn tất yêu cầu', 'Unable to complete request')}</strong>
            <p>{error.message}</p>
            {error.technical && (
              <details>
                <summary>{tr(locale, 'Chi tiết kỹ thuật', 'Technical details')}</summary>
                <code>{error.technical}</code>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
