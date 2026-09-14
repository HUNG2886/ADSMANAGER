import { prisma } from '../../lib/prisma';
import { CampaignService } from './campaign.service';
import { googleAdsClientForConnection } from './connection.service';
import { GoogleAdsError } from './errors';
import { MetricsService } from './metrics.service';
import { logGoogleAds } from './safe-logger';
import { UserAccessService } from './user-access.service';

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function bigint(value: string | undefined) { try { return BigInt(value || '0'); } catch { return BigInt(0); } }

const OWNERSHIP_DENIED_CODES = new Set([
  'ACTION_NOT_PERMITTED',
  'AUTHORIZATION_ERROR',
  'INVALID_LOGIN_CUSTOMER_ID_SERVING_CUSTOMER_ID_COMBINATION',
  'SERVICE_ACCESS_DENIED',
  'USER_PERMISSION_DENIED',
]);

export function ownershipResultFromError(error: unknown) {
  if (!(error instanceof GoogleAdsError)) {
    return { mccHasOwnership: null, mccOwnershipErrorCode: 'LOCAL_ERROR' };
  }
  return {
    mccHasOwnership: OWNERSHIP_DENIED_CODES.has(error.code) ? false : null,
    mccOwnershipErrorCode: error.code,
  };
}

async function updateMccOwnership(
  account: { id: string; customerId: string; loginCustomerId: string; mcc: { customerId: string; manager: boolean } },
  client: Awaited<ReturnType<typeof googleAdsClientForConnection>>['client'],
) {
  const checkedAt = new Date();
  if (!account.mcc.manager) {
    await prisma.customerAccount.update({
      where: { id: account.id },
      data: { mccHasOwnership: false, mccOwnershipCheckedAt: checkedAt, mccOwnershipErrorCode: null },
    });
    return false;
  }
  try {
    await new UserAccessService(client).canManageCustomerUsers(account.customerId);
    await prisma.customerAccount.update({
      where: { id: account.id },
      data: { mccHasOwnership: true, mccOwnershipCheckedAt: checkedAt, mccOwnershipErrorCode: null },
    });
    logGoogleAds('mcc_ownership_checked', {
      mccCustomerId: account.mcc.customerId,
      clientCustomerId: account.customerId,
      loginCustomerId: account.loginCustomerId,
    });
    return true;
  } catch (error) {
    const result = ownershipResultFromError(error);
    await prisma.customerAccount.update({
      where: { id: account.id },
      data: { ...result, mccOwnershipCheckedAt: checkedAt },
    });
    logGoogleAds('mcc_ownership_check_failed', {
      mccCustomerId: account.mcc.customerId,
      clientCustomerId: account.customerId,
      loginCustomerId: account.loginCustomerId,
      error: error instanceof GoogleAdsError ? error : undefined,
    }, 'warn');
    return result.mccHasOwnership;
  }
}

export async function syncGoogleAdsAccount(accountId: string) {
  const account = await prisma.customerAccount.findUnique({ where: { id: accountId }, include: { mcc: true } });
  if (!account) throw new Error('Không tìm thấy tài khoản Google Ads.');
  const loginCustomerId = account.mcc.manager ? account.loginCustomerId : undefined;
  const { client } = await googleAdsClientForConnection(account.mcc.connectionId, loginCustomerId);
  const mccHasOwnership = await updateMccOwnership(account, client);
  const campaignsPayload = await new CampaignService(client).list(account.customerId);

  for (const row of campaignsPayload.results ?? []) {
    if (!row.campaign?.id) continue;
    await prisma.campaign.upsert({
      where: { customerAccountId_campaignId: { customerAccountId: account.id, campaignId: String(row.campaign.id) } },
      create: {
        customerAccountId: account.id,
        campaignId: String(row.campaign.id),
        budgetId: row.campaignBudget?.id ? String(row.campaignBudget.id) : null,
        name: row.campaign.name || `Campaign ${row.campaign.id}`,
        status: mapCampaignStatus(row.campaign.status),
        type: row.campaign.advertisingChannelType || 'UNKNOWN',
        budget: Number(row.campaignBudget?.amountMicros || 0) / 1_000_000,
      },
      update: {
        budgetId: row.campaignBudget?.id ? String(row.campaignBudget.id) : null,
        name: row.campaign.name || `Campaign ${row.campaign.id}`,
        status: mapCampaignStatus(row.campaign.status),
        type: row.campaign.advertisingChannelType || 'UNKNOWN',
        budget: Number(row.campaignBudget?.amountMicros || 0) / 1_000_000,
      },
    });
  }

  const end = new Date();
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29);
  const metricBatches = await new MetricsService(client).query(account.customerId, isoDate(start), isoDate(end));
  const campaignRows = await prisma.campaign.findMany({ where: { customerAccountId: account.id }, select: { id: true, campaignId: true } });
  const campaignIds = new Map(campaignRows.map(item => [item.campaignId, item.id]));

  for (const row of metricBatches.flatMap(batch => batch.results ?? [])) {
    if (!row.segments?.date) continue;
    const campaignId = row.campaign?.id ? campaignIds.get(String(row.campaign.id)) : undefined;
    if(!campaignId)continue;
    await prisma.dailyMetric.upsert({
      where: { customerAccountId_campaignId_date: { customerAccountId: account.id, campaignId, date: new Date(`${row.segments.date}T00:00:00.000Z`) } },
      create: metricData(account.id, campaignId, row.segments.date, row.metrics),
      update: metricData(account.id, campaignId, row.segments.date, row.metrics),
    });
  }
  await prisma.customerAccount.update({ where: { id: account.id }, data: { lastSyncAt: new Date() } });
  return { campaignCount: campaignsPayload.results?.length ?? 0, metricDays: metricBatches.flatMap(batch => batch.results ?? []).length, mccHasOwnership };
}

function metricData(customerAccountId:string,campaignId:string,date:string,metrics:{impressions?:string;clicks?:string;costMicros?:string;conversions?:number;conversionsValue?:number;ctr?:number;averageCpc?:number|string}|undefined){
  return {customerAccountId,campaignId,date:new Date(`${date}T00:00:00.000Z`),impressions:bigint(metrics?.impressions),clicks:bigint(metrics?.clicks),cost:Number(metrics?.costMicros||0)/1_000_000,conversions:metrics?.conversions||0,conversionValue:metrics?.conversionsValue||0,ctr:metrics?.ctr||0,averageCpc:Number(metrics?.averageCpc||0)/1_000_000};
}

function mapCampaignStatus(value:string|undefined):'ENABLED'|'PAUSED'|'REMOVED'{return value==='ENABLED'?'ENABLED':value==='PAUSED'?'PAUSED':'REMOVED';}
