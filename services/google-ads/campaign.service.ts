import { GoogleAdsClient, normalizeCustomerId } from './client';
export type GoogleCampaignRow={campaign?:{id?:string;name?:string;status?:string;advertisingChannelType?:string;campaignBudget?:string};campaignBudget?:{id?:string;amountMicros?:string};metrics?:{costMicros?:string;clicks?:string;impressions?:string;ctr?:number;conversions?:number}};
export class CampaignService {
  constructor(private client: GoogleAdsClient) {}
  async list(customerId: string) {
    const id = normalizeCustomerId(customerId);
    const results: GoogleCampaignRow[] = [];
    let pageToken: string | undefined;

    do {
      const payload = await this.client.request<{ results?: GoogleCampaignRow[]; nextPageToken?: string }>(
        `/customers/${id}/googleAds:search`,
        {
          method: 'POST',
          body: JSON.stringify({
            query: 'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.campaign_budget, campaign_budget.id, campaign_budget.amount_micros, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.ctr, metrics.conversions FROM campaign WHERE campaign.status != REMOVED ORDER BY campaign.id',
            pageToken,
          }),
        },
      );
      results.push(...(payload.results ?? []));
      pageToken = payload.nextPageToken;
    } while (pageToken);

    return { results };
  }
  async updateStatus(customerId:string,campaignId:string,status:'ENABLED'|'PAUSED'){const id=normalizeCustomerId(customerId);return this.client.request(`/customers/${id}/campaigns:mutate`,{method:'POST',body:JSON.stringify({operations:[{update:{resourceName:`customers/${id}/campaigns/${campaignId}`,status},updateMask:'status'}],partialFailure:false})});}
}
