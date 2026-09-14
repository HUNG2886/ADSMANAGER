import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncAllGoogleAdsAccounts } from '../lib/google-ads-bulk-sync-client';

afterEach(() => vi.restoreAllMocks());

describe('syncAllGoogleAdsAccounts', () => {
  it('continues through every server batch and aggregates the result', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              total: 3,
              processed: 2,
              succeeded: 2,
              failed: 0,
              campaignCount: 12,
              metricRows: 25,
              failures: [],
              nextCursor: 'account-2',
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              total: 3,
              processed: 1,
              succeeded: 1,
              failed: 0,
              campaignCount: 7,
              metricRows: 10,
              failures: [],
              nextCursor: null,
            },
          }),
          { status: 200 },
        ),
      );
    const progress = vi.fn();

    await expect(
      syncAllGoogleAdsAccounts({ connectionId: 'connection-1', onProgress: progress }),
    ).resolves.toEqual({
      total: 3,
      processed: 3,
      succeeded: 3,
      failed: 0,
      campaignCount: 19,
      metricRows: 35,
      failures: [],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      after: 'account-2',
      connectionId: 'connection-1',
    });
    expect(progress).toHaveBeenLastCalledWith({
      processed: 3,
      total: 3,
      succeeded: 3,
      failed: 0,
    });
  });

  it('stops and reports a failed batch request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { message: 'Connection expired.' } }),
        { status: 401 },
      ),
    );

    await expect(syncAllGoogleAdsAccounts()).rejects.toThrow('Connection expired.');
  });
});
