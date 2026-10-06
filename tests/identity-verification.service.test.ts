import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleAdsClient } from '../services/google-ads/client';
import { IdentityVerificationService } from '../services/google-ads/identity-verification.service';

afterEach(() => vi.restoreAllMocks());

describe('IdentityVerificationService', () => {
  it('maps the Google verification status and action URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      identityVerification: [{
        verificationProgram: 'ADVERTISER_IDENTITY_VERIFICATION',
        identityVerificationRequirement: {
          verificationStartDeadlineTime: '2026-10-10 00:00:00',
          verificationCompletionDeadlineTime: '2026-10-30 00:00:00',
        },
        verificationProgress: {
          programStatus: 'PENDING_USER_ACTION',
          actionUrl: 'https://ads.google.com/aw/policy/account?ocid=123',
          invitationLinkExpirationTime: '2026-10-07 00:00:00',
        },
      }],
    }), { status: 200 }));
    const service = new IdentityVerificationService(new GoogleAdsClient({ accessToken: 'access', developerToken: 'developer', loginCustomerId: '111-222-3333' }));

    await expect(service.get('123-456-7890')).resolves.toEqual({
      status: 'PENDING_USER_ACTION',
      startDeadline: '2026-10-10 00:00:00',
      completionDeadline: '2026-10-30 00:00:00',
      actionUrl: 'https://ads.google.com/aw/policy/account?ocid=123',
      actionUrlExpiration: '2026-10-07 00:00:00',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v25/customers/1234567890/getIdentityVerification'),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('reports an empty response as not required', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const service = new IdentityVerificationService(new GoogleAdsClient({ accessToken: 'access', developerToken: 'developer' }));
    await expect(service.get('1234567890')).resolves.toMatchObject({ status: 'NOT_REQUIRED', actionUrl: null });
  });

  it('starts a required session and reloads the Google action URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ identityVerification: [{ verificationProgram: 'ADVERTISER_IDENTITY_VERIFICATION' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ identityVerification: [{ verificationProgram: 'ADVERTISER_IDENTITY_VERIFICATION', verificationProgress: { programStatus: 'PENDING_USER_ACTION', actionUrl: 'https://ads.google.com/verify' } }] }), { status: 200 }));
    const service = new IdentityVerificationService(new GoogleAdsClient({ accessToken: 'access', developerToken: 'developer' }));

    await expect(service.start('1234567890')).resolves.toMatchObject({
      status: 'PENDING_USER_ACTION',
      actionUrl: 'https://ads.google.com/verify',
      started: true,
    });
    expect(fetchMock.mock.calls[1][0]).toContain('/v25/customers/1234567890:startIdentityVerification');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ verificationProgram: 'ADVERTISER_IDENTITY_VERIFICATION' }),
    });
  });
});
