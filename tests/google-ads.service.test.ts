import { afterEach, describe, expect, it, vi } from 'vitest'; import { GoogleAdsClient } from '../services/google-ads/client'; import { GoogleAdsError } from '../services/google-ads/errors';import { buildGoogleAuthorizationUrl,googleAdsConfigStatus } from '../services/google-ads/auth.service';import {HierarchyService} from '../services/google-ads/hierarchy.service';
const env={clientId:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET,developerToken:process.env.GOOGLE_DEVELOPER_TOKEN,encryptionKey:process.env.ENCRYPTION_KEY,nextAuthUrl:process.env.NEXTAUTH_URL};
afterEach(()=>{vi.restoreAllMocks();for(const[name,value]of Object.entries({GOOGLE_CLIENT_ID:env.clientId,GOOGLE_CLIENT_SECRET:env.clientSecret,GOOGLE_DEVELOPER_TOKEN:env.developerToken,ENCRYPTION_KEY:env.encryptionKey,NEXTAUTH_URL:env.nextAuthUrl})){if(value===undefined)delete process.env[name];else process.env[name]=value}});
describe('GoogleAdsClient',()=>{
  it('sends required headers and returns data',async()=>{const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({resourceNames:['customers/1']}),{status:200,headers:{'content-type':'application/json'}}));const client=new GoogleAdsClient({accessToken:'secret',developerToken:'developer',loginCustomerId:'123-456-7890'});await expect(client.request('/customers:listAccessibleCustomers')).resolves.toEqual({resourceNames:['customers/1']});const headers=(fetchMock.mock.calls[0][1]?.headers as Headers);expect(headers.get('authorization')).toBe('Bearer secret');expect(headers.get('login-customer-id')).toBe('1234567890')});
  it('preserves the exact Google Ads error code, type, message and request ID',async()=>{vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({error:{code:403,status:'PERMISSION_DENIED',message:'Permission denied.',details:[{'@type':'type.googleapis.com/google.ads.googleads.v25.errors.GoogleAdsFailure',errors:[{errorCode:{authorizationError:'DEVELOPER_TOKEN_NOT_APPROVED'},message:'The developer token is only approved for use with test accounts.'}],requestId:'failure-request-id'}]}}),{status:403,headers:{'request-id':'header-request-id'}}));const client=new GoogleAdsClient({accessToken:'x',developerToken:'y'});await expect(client.request('/customers/1')).rejects.toMatchObject<Partial<GoogleAdsError>>({code:'DEVELOPER_TOKEN_NOT_APPROVED',type:'authorizationError',message:'The developer token is only approved for use with test accounts.',requestId:'header-request-id',rootStatus:'PERMISSION_DENIED',status:403})});
});

describe('HierarchyService',()=>{
  it('reports accessible customer IDs before a later customer query fails',async()=>{const fetchMock=vi.spyOn(globalThis,'fetch');fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({resourceNames:['customers/123-456-7890']}),{status:200}));fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({error:{status:'PERMISSION_DENIED',details:[{errors:[{errorCode:{authorizationError:'DEVELOPER_TOKEN_NOT_APPROVED'},message:'Test token cannot read production.'}],requestId:'req-partial'}]}}),{status:403}));let accessible:string[]=[];await expect(new HierarchyService('access','developer').discover(ids=>{accessible=ids})).rejects.toMatchObject({code:'DEVELOPER_TOKEN_NOT_APPROVED'});expect(accessible).toEqual(['1234567890'])});
});

describe('Google OAuth configuration',()=>{
  it('requests offline Google Ads consent using the configured production callback',()=>{
    process.env.GOOGLE_CLIENT_ID='client-id';process.env.GOOGLE_CLIENT_SECRET='client-secret';process.env.GOOGLE_DEVELOPER_TOKEN='developer-token';process.env.ENCRYPTION_KEY='encryption-key-with-at-least-32-characters';process.env.NEXTAUTH_URL='https://ads.example.com';
    expect(googleAdsConfigStatus()).toEqual({configured:true,missing:[]});
    const url=buildGoogleAuthorizationUrl({state:'state-value',requestUrl:'http://localhost/api/auth/google-ads'});
    expect(url.origin).toBe('https://accounts.google.com');expect(url.searchParams.get('access_type')).toBe('offline');expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/adwords');expect(url.searchParams.get('redirect_uri')).toBe('https://ads.example.com/api/auth/google-ads/callback');expect(url.searchParams.get('state')).toBe('state-value');
  });
  it('reports backend variables that are missing or too short',()=>{
    delete process.env.GOOGLE_CLIENT_ID;delete process.env.GOOGLE_CLIENT_SECRET;delete process.env.GOOGLE_DEVELOPER_TOKEN;process.env.ENCRYPTION_KEY='short';
    expect(googleAdsConfigStatus()).toMatchObject({configured:false,missing:expect.arrayContaining(['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_DEVELOPER_TOKEN','ENCRYPTION_KEY'])});
  });
});
