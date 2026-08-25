import {createHash} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {googleOAuthRedirectUri,googleAdsConfigStatus} from './auth.service';
import {GOOGLE_ADS_API_VERSION} from './client';
import {connectionAccessToken} from './connection.service';
import {googleAdsErrorDetails,GoogleAdsError,inferDeveloperTokenAccess} from './errors';
import {HierarchyService} from './hierarchy.service';
import {logGoogleAds} from './safe-logger';

function fingerprint(value:string|undefined){return value?createHash('sha256').update(value).digest('hex').slice(0,12):null}
function configured(value:string|undefined){return Boolean(value?.trim())}

export function googleAdsEnvironmentDiagnostics(requestUrl:string){
  const clientId=process.env.GOOGLE_CLIENT_ID?.trim();const clientSecret=process.env.GOOGLE_CLIENT_SECRET?.trim();const developerToken=process.env.GOOGLE_DEVELOPER_TOKEN?.trim();const encryptionKey=process.env.ENCRYPTION_KEY;
  const status=googleAdsConfigStatus();
  return{
    configured:status.configured,missing:status.missing,
    oauthClientId:{configured:configured(clientId),length:clientId?.length??0,suffix:clientId?.slice(-28)??null},
    oauthClientSecret:{configured:configured(clientSecret),length:clientSecret?.length??0},
    developerToken:{configured:configured(developerToken),length:developerToken?.length??0,fingerprint:fingerprint(developerToken),expectedLength:22},
    encryptionKey:{configured:configured(encryptionKey),validLength:(encryptionKey?.length??0)>=32},
    callbackUrl:googleOAuthRedirectUri(requestUrl),apiVersion:GOOGLE_ADS_API_VERSION,
  };
}

function cloudProjectAssessment(error:GoogleAdsError|null){
  if(!error)return'ALLOWED_FOR_CURRENT_REQUEST';
  if(error.code==='DEVELOPER_TOKEN_NOT_APPROVED')return'REQUEST_REACHED_GOOGLE_PROJECT_NOT_REJECTED_TOKEN_TEST_ONLY';
  if(['DEVELOPER_TOKEN_PROHIBITED','CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION','CLOUD_PROJECT_NOT_UNDER_ORGANIZATION','PROJECT_DISABLED'].includes(error.code))return error.code;
  return'UNDETERMINED_FROM_CURRENT_ERROR';
}

export async function diagnoseGoogleAdsConnection(connectionId:string,userId:string){
  const connection=await prisma.googleConnection.findFirst({where:{id:connectionId,userId},select:{id:true,googleEmail:true,status:true,refreshTokenEncrypted:true,accessTokenEncrypted:true,expiresAt:true,lastRefreshedAt:true,lastSyncAt:true,lastError:true}});
  if(!connection)return{connectionId,success:false,error:{code:'CONNECTION_NOT_FOUND',type:'LOCAL_VALIDATION',message:'Không tìm thấy Google connection.',requestId:null,status:404,rootStatus:null}};
  const base={connectionId:connection.id,googleEmail:connection.googleEmail,connectionStatus:connection.status,refreshToken:{stored:Boolean(connection.refreshTokenEncrypted),encrypted:connection.refreshTokenEncrypted?.startsWith('v1.')===true},accessToken:{stored:Boolean(connection.accessTokenEncrypted),expiresAt:connection.expiresAt?.toISOString()??null},lastRefreshedAt:connection.lastRefreshedAt?.toISOString()??null,lastSyncAt:connection.lastSyncAt?.toISOString()??null};
  let refreshSucceeded=false;
  try{
    const{accessToken}=await connectionAccessToken(connection.id,true);
    refreshSucceeded=true;
    const developerToken=process.env.GOOGLE_DEVELOPER_TOKEN?.trim();
    if(!developerToken)throw new GoogleAdsError('GOOGLE_ADS_NOT_CONFIGURED','GOOGLE_DEVELOPER_TOKEN chưa được cấu hình.',503,null,'LOCAL_CONFIGURATION');
    const hierarchy=await new HierarchyService(accessToken,developerToken).discover();
    logGoogleAds('diagnostics_succeeded',{connectionId:connection.id,googleEmail:connection.googleEmail,accessibleCustomerIds:hierarchy.accessibleCustomerIds});
    return{...base,success:true,refreshToken:{...base.refreshToken,refreshSucceeded:true},developerTokenAccessLevel:inferDeveloperTokenAccess(null),cloudProject:cloudProjectAssessment(null),api:{version:GOOGLE_ADS_API_VERSION,accessibleCustomerIds:hierarchy.accessibleCustomerIds,mccs:hierarchy.mccs.map(item=>({customerId:item.customerId,parentCustomerId:item.parentCustomerId,manager:item.manager,level:item.level,loginCustomerId:item.manager?item.loginCustomerId:null,testAccount:item.testAccount})),accounts:hierarchy.accounts.map(item=>({customerId:item.customerId,parentCustomerId:item.parentCustomerId,parentManagerCustomerId:item.parentManagerCustomerId,loginCustomerId:item.parentCustomerId?item.loginCustomerId:null,testAccount:item.testAccount}))}};
  }catch(cause){
    const error=cause instanceof GoogleAdsError?cause:new GoogleAdsError('DIAGNOSTIC_FAILED',cause instanceof Error?cause.message:'Google Ads diagnostic failed.',500,null,'LOCAL_ERROR');
    logGoogleAds('diagnostics_failed',{connectionId:connection.id,googleEmail:connection.googleEmail,error},'error');
    return{...base,success:false,refreshToken:{...base.refreshToken,refreshSucceeded},developerTokenAccessLevel:inferDeveloperTokenAccess(error),cloudProject:cloudProjectAssessment(error),api:{version:GOOGLE_ADS_API_VERSION,accessibleCustomerIds:[],mccs:[],accounts:[]},error:googleAdsErrorDetails(error)};
  }
}
