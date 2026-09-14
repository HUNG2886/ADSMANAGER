export type CampaignSyncFailure = {
  accountId: string;
  customerId: string;
  accountName: string;
  code: string;
  type: string;
  message: string;
  requestId: string | null;
  rootStatus: string;
};

type BatchResponse = {
  success: boolean;
  data?: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    campaignCount: number;
    metricRows: number;
    failures: CampaignSyncFailure[];
    nextCursor: string | null;
  };
  error?: { code?: string; message?: string };
};

export type CampaignSyncProgress = {
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
};

export type CampaignSyncResult = CampaignSyncProgress & {
  campaignCount: number;
  metricRows: number;
  failures: CampaignSyncFailure[];
};

export async function syncAllGoogleAdsAccounts(input: {
  connectionId?: string;
  onProgress?: (progress: CampaignSyncProgress) => void;
} = {}): Promise<CampaignSyncResult> {
  let after: string | undefined;
  let previousCursor: string | undefined;
  const result: CampaignSyncResult = {
    processed: 0,
    total: 0,
    succeeded: 0,
    failed: 0,
    campaignCount: 0,
    metricRows: 0,
    failures: [],
  };

  do {
    const response = await fetch('/api/google-ads/campaigns/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(after ? { after } : {}),
        ...(input.connectionId ? { connectionId: input.connectionId } : {}),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as BatchResponse;
    if (!response.ok || !payload.data) {
      throw new Error(payload.error?.message || 'Không thể đồng bộ toàn bộ chiến dịch.');
    }

    result.total = payload.data.total;
    result.processed += payload.data.processed;
    result.succeeded += payload.data.succeeded;
    result.failed += payload.data.failed;
    result.campaignCount += payload.data.campaignCount;
    result.metricRows += payload.data.metricRows;
    result.failures.push(...payload.data.failures);
    input.onProgress?.({
      processed: result.processed,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
    });

    previousCursor = after;
    after = payload.data.nextCursor || undefined;
    if (after && after === previousCursor) throw new Error('Tiến trình đồng bộ không thể tiếp tục.');
  } while (after);

  return result;
}
