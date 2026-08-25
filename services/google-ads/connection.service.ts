import { decryptSecret, encryptSecret } from '../../lib/encryption';
import { prisma } from '../../lib/prisma';
import { GoogleAdsClient } from './client';
import { GoogleAdsError } from './errors';
import { googleAdsConfigStatus, refreshGoogleAccessToken, revokeGoogleToken, type GoogleOAuthToken } from './auth.service';
import { HierarchyService } from './hierarchy.service';

function developerToken() {
  const status = googleAdsConfigStatus();
  if (!status.configured) throw new GoogleAdsError('OAUTH_NOT_CONFIGURED', `Thiếu cấu hình: ${status.missing.join(', ')}.`, 503);
  return process.env.GOOGLE_DEVELOPER_TOKEN!;
}

export async function upsertGoogleConnection(input: { userId: string; googleEmail: string; token: GoogleOAuthToken }) {
  const googleEmail = input.googleEmail.trim().toLowerCase();
  const current = await prisma.googleConnection.findUnique({ where: { userId_googleEmail: { userId: input.userId, googleEmail } } });
  const refreshTokenEncrypted = input.token.refresh_token
    ? await encryptSecret(input.token.refresh_token)
    : current?.refreshTokenEncrypted;
  if (!refreshTokenEncrypted) throw new GoogleAdsError('REFRESH_TOKEN_MISSING', 'Google không trả về refresh token. Hãy thu hồi quyền ứng dụng và kết nối lại.', 400);

  return prisma.googleConnection.upsert({
    where: { userId_googleEmail: { userId: input.userId, googleEmail } },
    create: {
      userId: input.userId,
      googleEmail,
      refreshTokenEncrypted,
      accessTokenEncrypted: await encryptSecret(input.token.access_token),
      expiresAt: new Date(Date.now() + input.token.expires_in * 1000),
      status: 'CONNECTED',
      lastRefreshedAt: new Date(),
    },
    update: {
      refreshTokenEncrypted,
      accessTokenEncrypted: await encryptSecret(input.token.access_token),
      expiresAt: new Date(Date.now() + input.token.expires_in * 1000),
      status: 'CONNECTED',
      lastRefreshedAt: new Date(),
      disconnectedAt: null,
      lastError: null,
    },
  });
}

export async function connectionAccessToken(connectionId: string) {
  const connection = await prisma.googleConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.status === 'DISCONNECTED') throw new GoogleAdsError('CONNECTION_REQUIRED', 'Kết nối Google Ads không còn hoạt động.', 409);
  if (connection.status === 'REAUTH_REQUIRED' || !connection.refreshTokenEncrypted) throw new GoogleAdsError('CONNECTION_EXPIRED', 'Kết nối Google đã hết hạn. Vui lòng đăng nhập lại Google Ads.', 401);

  if (connection.accessTokenEncrypted && connection.expiresAt && connection.expiresAt.getTime() > Date.now() + 60_000) {
    return { connection, accessToken: await decryptSecret(connection.accessTokenEncrypted) };
  }

  try {
    const refreshed = await refreshGoogleAccessToken(await decryptSecret(connection.refreshTokenEncrypted));
    const updated = await prisma.googleConnection.update({
      where: { id: connection.id },
      data: {
        accessTokenEncrypted: await encryptSecret(refreshed.access_token),
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        status: 'CONNECTED',
        lastRefreshedAt: new Date(),
        lastError: null,
      },
    });
    return { connection: updated, accessToken: refreshed.access_token };
  } catch (error) {
    if (error instanceof GoogleAdsError && error.code === 'CONNECTION_EXPIRED') {
      await prisma.googleConnection.update({ where: { id: connection.id }, data: { status: 'REAUTH_REQUIRED', accessTokenEncrypted: null, expiresAt: null, lastError: error.message } });
    }
    throw error;
  }
}

export async function googleAdsClientForConnection(connectionId: string, loginCustomerId?: string) {
  const { connection, accessToken } = await connectionAccessToken(connectionId);
  return { connection, client: new GoogleAdsClient({ accessToken, developerToken: developerToken(), loginCustomerId }) };
}

export async function syncGoogleConnection(connectionId: string) {
  const { connection, accessToken } = await connectionAccessToken(connectionId);
  try {
    const hierarchy = await new HierarchyService(accessToken, developerToken()).discover();
    const storedMcc = new Map<string, string>();

    for (const item of hierarchy.mccs.sort((a, b) => a.level - b.level)) {
      const row = await prisma.mCC.upsert({
        where: { connectionId_customerId: { connectionId, customerId: item.customerId } },
        create: { userId: connection.userId, connectionId, ...item, currency: item.currency, timezone: item.timezone, lastSyncAt: new Date() },
        update: { ...item, currency: item.currency, timezone: item.timezone, lastSyncAt: new Date() },
      });
      storedMcc.set(item.customerId, row.id);
    }

    for (const item of hierarchy.accounts) {
      const mccId = storedMcc.get(item.parentManagerCustomerId);
      if (!mccId) continue;
      await prisma.customerAccount.upsert({
        where: { mccId_customerId: { mccId, customerId: item.customerId } },
        create: {
          mccId,
          customerId: item.customerId,
          parentCustomerId: item.parentCustomerId,
          loginCustomerId: item.loginCustomerId,
          manager: item.manager,
          level: item.level,
          testAccount: item.testAccount,
          name: item.name,
          currency: item.currency,
          timezone: item.timezone,
          status: mapAccountStatus(item.status),
        },
        update: {
          parentCustomerId: item.parentCustomerId,
          loginCustomerId: item.loginCustomerId,
          manager: item.manager,
          level: item.level,
          testAccount: item.testAccount,
          name: item.name,
          currency: item.currency,
          timezone: item.timezone,
          status: mapAccountStatus(item.status),
        },
      });
    }

    await prisma.googleConnection.update({ where: { id: connectionId }, data: { status: 'CONNECTED', lastSyncAt: new Date(), lastError: null } });
    return { mccCount: hierarchy.mccs.filter(item => item.manager).length, accountCount: hierarchy.accounts.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể đồng bộ Google Ads.';
    await prisma.googleConnection.update({ where: { id: connectionId }, data: { lastError: message.slice(0, 500) } }).catch(() => null);
    throw error;
  }
}

export async function disconnectGoogleConnection(connectionId: string, userId: string) {
  const connection = await prisma.googleConnection.findFirst({ where: { id: connectionId, userId } });
  if (!connection) throw new GoogleAdsError('CONNECTION_NOT_FOUND', 'Không tìm thấy kết nối Google Ads.', 404);
  if (connection.refreshTokenEncrypted) {
    const refreshToken = await decryptSecret(connection.refreshTokenEncrypted).catch(() => null);
    if (refreshToken) await revokeGoogleToken(refreshToken);
  }
  return prisma.googleConnection.update({
    where: { id: connection.id },
    data: { status: 'DISCONNECTED', refreshTokenEncrypted: null, accessTokenEncrypted: null, expiresAt: null, disconnectedAt: new Date() },
  });
}

function mapAccountStatus(value: string) {
  return ['ENABLED', 'SUSPENDED', 'CANCELED', 'CLOSED'].includes(value) ? value as 'ENABLED' | 'SUSPENDED' | 'CANCELED' | 'CLOSED' : 'UNKNOWN';
}
