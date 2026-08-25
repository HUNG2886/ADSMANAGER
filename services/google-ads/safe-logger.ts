import { logger } from '../../lib/logger';
import { googleAdsErrorDetails,type GoogleAdsError } from './errors';

type SafeGoogleAdsLog={
  googleEmail?:string;
  accessibleCustomerIds?:string[];
  mccCustomerId?:string;
  clientCustomerId?:string;
  loginCustomerId?:string|null;
  requestPath?:string;
  apiVersion?:string;
  connectionId?:string;
  oauthResult?:'success'|'failure';
  tokenRefresh?:'success'|'failure';
  error?:GoogleAdsError;
};

function id(value:string|undefined|null){return value?value.replace(/\D/g,''):value}

export function logGoogleAds(event:string,input:SafeGoogleAdsLog={},level:'info'|'warn'|'error'='info'){
  const payload={
    component:'google-ads',event,
    googleEmail:input.googleEmail,
    accessibleCustomerIds:input.accessibleCustomerIds?.map(value=>id(value)),
    mccCustomerId:id(input.mccCustomerId),clientCustomerId:id(input.clientCustomerId),loginCustomerId:id(input.loginCustomerId),
    requestPath:input.requestPath,apiVersion:input.apiVersion,connectionId:input.connectionId,
    oauthResult:input.oauthResult,tokenRefresh:input.tokenRefresh,
    ...(input.error?{googleAdsError:googleAdsErrorDetails(input.error)}:{}),
  };
  logger[level](payload,event);
}
