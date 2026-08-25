type JsonRecord=Record<string,unknown>;

export class GoogleAdsError extends Error {
  constructor(
    public code:string,
    message:string,
    public status:number,
    public requestId?:string|null,
    public type='GOOGLE_ADS_API_ERROR',
    public rootStatus?:string,
  ){super(message);this.name='GoogleAdsError'}
}

function record(value:unknown):JsonRecord|undefined{return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:undefined}
function string(value:unknown){return typeof value==='string'&&value.trim()?value.trim():undefined}

export function parseGoogleAdsError(status:number,payload:unknown,headerRequestId?:string|null){
  const root=record(record(payload)?.error);const details=Array.isArray(root?.details)?root.details:[];
  const failure=details.map(record).find(item=>Array.isArray(item?.errors));
  const firstError=Array.isArray(failure?.errors)?record(failure.errors[0]):undefined;
  const errorCode=record(firstError?.errorCode);const codeEntry=errorCode?Object.entries(errorCode).find(([,value])=>string(value)):undefined;
  const rootStatus=string(root?.status);const type=codeEntry?.[0]??rootStatus??'HTTP_ERROR';
  const code=string(codeEntry?.[1])??rootStatus??`HTTP_${status}`;
  const message=string(firstError?.message)??string(root?.message)??`Google Ads API request failed with HTTP ${status}.`;
  const requestId=headerRequestId??string(failure?.requestId)??string(root?.requestId)??null;
  return new GoogleAdsError(code,message,status,requestId,type,rootStatus);
}

export function googleAdsErrorDetails(error:GoogleAdsError){return{code:error.code,type:error.type,message:error.message,requestId:error.requestId??null,status:error.status,rootStatus:error.rootStatus??null}}

export function formatGoogleAdsError(error:GoogleAdsError){return `${error.code} · ${error.type} · ${error.message}${error.requestId?` · Request ID: ${error.requestId}`:''}`}

export function inferDeveloperTokenAccess(error:GoogleAdsError|null){
  if(error?.code==='DEVELOPER_TOKEN_NOT_APPROVED')return'TEST' as const;
  if(error&&['DEVELOPER_TOKEN_PROHIBITED','CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION','CLOUD_PROJECT_NOT_UNDER_ORGANIZATION','PROJECT_DISABLED'].includes(error.code))return'BLOCKED_OR_PROJECT_RESTRICTED' as const;
  if(error)return'UNKNOWN' as const;
  return'NOT_EXPOSED_BY_API' as const;
}
