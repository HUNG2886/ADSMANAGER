import { decryptSecret, encryptSecret } from '../../lib/encryption';
import { mapWithConcurrency } from '../../lib/concurrency';
import { prisma } from '../../lib/prisma';
import { GoogleAdsClient } from './client';
import { formatGoogleAdsError,GoogleAdsError } from './errors';
import { googleAdsConfigStatus, refreshGoogleAccessToken, revokeGoogleToken, type GoogleOAuthToken } from './auth.service';
import { HierarchyService } from './hierarchy.service';
import { logGoogleAds } from './safe-logger';
import { UserAccessService, type GoogleAdsUserAccessRole } from './user-access.service';

function developerToken() {
  const status = googleAdsConfigStatus();
  if (!status.configured) throw new GoogleAdsError('OAUTH_NOT_CONFIGURED', `Thiếu cấu hình: ${status.missing.join(', ')}.`, 503);
  return process.env.GOOGLE_DEVELOPER_TOKEN!.trim();
}

export async function upsertGoogleConnection(input: { userId: string; googleEmail: string; token: GoogleOAuthToken }) {
  const googleEmail = input.googleEmail.trim().toLowerCase();
  const current = await prisma.googleConnection.findUnique({ where: { userId_googleEmail: { userId: input.userId, googleEmail } } });
  const refreshTokenEncrypted = input.token.refresh_token
    ? await encryptSecret(input.token.refresh_token)
    : current?.refreshTokenEncrypted;
  if (!refreshTokenEncrypted) throw new GoogleAdsError('REFRESH_TOKEN_MISSING', 'Google không trả về refresh token. Hãy thu hồi quyền ứng dụng và kết nối lại.', 400);

  const connection=await prisma.googleConnection.upsert({
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
  logGoogleAds('oauth_connection_stored',{connectionId:connection.id,googleEmail,oauthResult:'success'});
  return connection;
}

export async function connectionAccessToken(connectionId:string,forceRefresh=false) {
  const connection = await prisma.googleConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.status === 'DISCONNECTED') throw new GoogleAdsError('CONNECTION_REQUIRED', 'Kết nối Google Ads không còn hoạt động.', 409);
  if (connection.status === 'REAUTH_REQUIRED' || !connection.refreshTokenEncrypted) throw new GoogleAdsError('CONNECTION_EXPIRED', 'Kết nối Google đã hết hạn. Vui lòng đăng nhập lại Google Ads.', 401);

  if (!forceRefresh&&connection.accessTokenEncrypted && connection.expiresAt && connection.expiresAt.getTime() > Date.now() + 60_000) {
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
    logGoogleAds('oauth_token_refreshed',{connectionId:connection.id,googleEmail:connection.googleEmail,tokenRefresh:'success'});
    return { connection: updated, accessToken: refreshed.access_token };
  } catch (error) {
    if (error instanceof GoogleAdsError && error.code === 'CONNECTION_EXPIRED') {
      await prisma.googleConnection.update({ where: { id: connection.id }, data: { status: 'REAUTH_REQUIRED', accessTokenEncrypted: null, expiresAt: null, lastError: error.message } });
    }
    logGoogleAds('oauth_token_refresh_failed',{connectionId:connection.id,googleEmail:connection.googleEmail,tokenRefresh:'failure',error:error instanceof GoogleAdsError?error:undefined},'error');throw error;
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
    const accessRoles = new Map<string, GoogleAdsUserAccessRole | null>();
    const loginCustomerIds = [...new Set(hierarchy.mccs.map(item => item.loginCustomerId))];
    await mapWithConcurrency(loginCustomerIds, 3, async loginCustomerId => {
      const accessClient = new GoogleAdsClient({ accessToken, developerToken: developerToken(), loginCustomerId });
      try {
        const role = await new UserAccessService(accessClient).findAccessRole(loginCustomerId, connection.googleEmail);
        accessRoles.set(loginCustomerId, role);
      } catch (error) {
        accessRoles.set(loginCustomerId, null);
        if (error instanceof GoogleAdsError) {
          logGoogleAds('mcc_user_access_role_unavailable', { mccCustomerId: loginCustomerId, loginCustomerId, error }, 'warn');
        }
      }
    });
    const storedMcc = new Map<string, string>();

    for (const item of hierarchy.mccs.sort((a, b) => a.level - b.level)) {
      const row = await prisma.mCC.upsert({
        where: { connectionId_customerId: { connectionId, customerId: item.customerId } },
        create: { userId: connection.userId, connectionId, ...item, currency: item.currency, timezone: item.timezone, accessRole: accessRoles.get(item.loginCustomerId) ?? null, lastSyncAt: new Date() },
        update: { ...item, currency: item.currency, timezone: item.timezone, accessRole: accessRoles.get(item.loginCustomerId) ?? null, lastSyncAt: new Date() },
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

    const issueCount = hierarchy.issues.length;
    const lastError = issueCount > 0
      ? `Đã bỏ qua ${issueCount} customer không thể truy cập. Chạy Google Ads diagnostics để xem Customer ID và lỗi cụ thể.`
      : null;
    await prisma.googleConnection.update({ where: { id: connectionId }, data: { status: 'CONNECTED', lastSyncAt: new Date(), lastError } });
    logGoogleAds('connection_hierarchy_synced',{connectionId,googleEmail:connection.googleEmail,accessibleCustomerIds:hierarchy.accessibleCustomerIds});
    return { mccCount: hierarchy.mccs.filter(item => item.manager).length, accountCount: hierarchy.accounts.length, issueCount };
  } catch (error) {
    const message = error instanceof GoogleAdsError?formatGoogleAdsError(error):error instanceof Error ? error.message : 'Không thể đồng bộ Google Ads.';
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
  await prisma.googleConnection.delete({ where: { id: connection.id } });
  logGoogleAds('connection_deleted', {
    connectionId: connection.id,
    googleEmail: connection.googleEmail,
  });
  return { id: connection.id, googleEmail: connection.googleEmail };
}

function mapAccountStatus(value: string) {
  return ['ENABLED', 'SUSPENDED', 'CANCELED', 'CLOSED'].includes(value) ? value as 'ENABLED' | 'SUSPENDED' | 'CANCELED' | 'CLOSED' : 'UNKNOWN';
}
