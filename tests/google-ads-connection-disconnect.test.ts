import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  deleteConnection: vi.fn(),
  decryptSecret: vi.fn(),
  revokeGoogleToken: vi.fn(),
  logGoogleAds: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    googleConnection: {
      findFirst: mocks.findFirst,
      delete: mocks.deleteConnection,
    },
  },
}));
vi.mock('../lib/encryption', () => ({
  decryptSecret: mocks.decryptSecret,
  encryptSecret: vi.fn(),
}));
vi.mock('../services/google-ads/auth.service', () => ({
  googleAdsConfigStatus: vi.fn(() => ({ configured: true, missing: [] })),
  refreshGoogleAccessToken: vi.fn(),
  revokeGoogleToken: mocks.revokeGoogleToken,
}));
vi.mock('../services/google-ads/safe-logger', () => ({ logGoogleAds: mocks.logGoogleAds }));

import { disconnectGoogleConnection } from '../services/google-ads/connection.service';

afterEach(() => vi.clearAllMocks());

describe('disconnectGoogleConnection', () => {
  it('revokes the refresh token and deletes the connection so descendants cascade', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 'connection-1',
      userId: 'user-1',
      googleEmail: 'owner@example.com',
      refreshTokenEncrypted: 'encrypted-refresh-token',
    });
    mocks.decryptSecret.mockResolvedValue('refresh-token');
    mocks.revokeGoogleToken.mockResolvedValue(undefined);
    mocks.deleteConnection.mockResolvedValue({ id: 'connection-1' });

    await expect(disconnectGoogleConnection('connection-1', 'user-1')).resolves.toEqual({
      id: 'connection-1',
      googleEmail: 'owner@example.com',
    });
    expect(mocks.revokeGoogleToken).toHaveBeenCalledWith('refresh-token');
    expect(mocks.deleteConnection).toHaveBeenCalledWith({ where: { id: 'connection-1' } });
  });

  it('also deletes a previously disconnected connection that no longer has a token', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 'connection-old',
      userId: 'user-1',
      googleEmail: 'old@example.com',
      refreshTokenEncrypted: null,
    });
    mocks.deleteConnection.mockResolvedValue({ id: 'connection-old' });

    await disconnectGoogleConnection('connection-old', 'user-1');

    expect(mocks.decryptSecret).not.toHaveBeenCalled();
    expect(mocks.revokeGoogleToken).not.toHaveBeenCalled();
    expect(mocks.deleteConnection).toHaveBeenCalledWith({ where: { id: 'connection-old' } });
  });
});
