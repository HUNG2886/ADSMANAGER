export class MockGoogleAdsService {
  failure: 'AUTH'|'PERMISSION'|'RATE_LIMIT'|null=null;
  async listAccessibleCustomers(){if(this.failure==='AUTH')throw new Error('AUTHENTICATION_ERROR');return{resourceNames:['customers/1234567890','customers/2345678901']}}
  async listCampaigns(){if(this.failure==='PERMISSION')throw new Error('PERMISSION_DENIED');if(this.failure==='RATE_LIMIT')throw new Error('RESOURCE_EXHAUSTED');return[{id:'1',name:'Demo campaign',status:'ENABLED'}]}
  async updateCampaignStatus(id:string,status:string){return{id,status}}
}
