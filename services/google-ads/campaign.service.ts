import { GoogleAdsClient, normalizeCustomerId } from './client';
export class CampaignService {
  constructor(private client: GoogleAdsClient) {}
  async list(customerId:string,pageSize=100,pageToken?:string){const id=normalizeCustomerId(customerId);return this.client.request(`/customers/${id}/googleAds:search`,{method:'POST',body:JSON.stringify({query:'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.campaign_budget FROM campaign WHERE campaign.status != REMOVED ORDER BY campaign.id',pageSize,pageToken})});}
  async updateStatus(customerId:string,campaignId:string,status:'ENABLED'|'PAUSED'){const id=normalizeCustomerId(customerId);return this.client.request(`/customers/${id}/campaigns:mutate`,{method:'POST',body:JSON.stringify({operations:[{update:{resourceName:`customers/${id}/campaigns/${campaignId}`,status},updateMask:'status'}],partialFailure:false})});}
}
