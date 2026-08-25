import { NextRequest, NextResponse } from 'next/server';
import { requestIp } from '../../../../../lib/api';
import { writeAudit } from '../../../../../lib/audit';
import { PERMISSIONS } from '../../../../../lib/permissions';
import { requirePermission } from '../../../../../lib/rbac';
import { exchangeGoogleAuthorizationCode, getGoogleProfile, GoogleAdsError, syncGoogleConnection, upsertGoogleConnection } from '../../../../../services/google-ads';

function oauthRedirect(request:NextRequest,params:Record<string,string>){
  const target=new URL('/google-ads',request.url);Object.entries(params).forEach(([key,value])=>target.searchParams.set(key,value));
  const response=NextResponse.redirect(target);response.cookies.delete('google_ads_oauth_state');return response;
}

export async function GET(request:NextRequest){
  const access=await requirePermission(PERMISSIONS.CONNECT_MCC);if(access.error)return access.error;
  const errorParam=request.nextUrl.searchParams.get('error');
  if(errorParam)return oauthRedirect(request,{error:errorParam==='access_denied'?'OAUTH_CANCELLED':'OAUTH_FAILED'});
  const state=request.nextUrl.searchParams.get('state');const code=request.nextUrl.searchParams.get('code');
  const expected=request.cookies.get('google_ads_oauth_state')?.value;
  if(!state||!expected||state!==expected||!code)return oauthRedirect(request,{error:'OAUTH_STATE_INVALID'});

  try{
    const token=await exchangeGoogleAuthorizationCode(code,request.url);
    const profile=await getGoogleProfile(token.access_token);
    if(!profile.email)throw new GoogleAdsError('GOOGLE_EMAIL_MISSING','Google không trả về địa chỉ email.',400);
    const connection=await upsertGoogleConnection({userId:access.user.id,googleEmail:profile.email,token});
    const result=await syncGoogleConnection(connection.id);
    await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'GOOGLE_CONNECTION_SYNCED',entityType:'GoogleConnection',entityId:connection.id,metadata:{googleEmail:profile.email,mccCount:result.mccCount,accountCount:result.accountCount},ipAddress:requestIp(request)});
    return oauthRedirect(request,{connected:'1',mcc:String(result.mccCount),accounts:String(result.accountCount)});
  }catch(error){
    const code=error instanceof GoogleAdsError?error.code:'GOOGLE_CONNECTION_FAILED';
    return oauthRedirect(request,{error:code});
  }
}
