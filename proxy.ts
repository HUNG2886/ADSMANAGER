import { NextResponse,type NextRequest } from 'next/server';
import { readSessionToken,SESSION_COOKIE } from './lib/session';

export function proxy(request:NextRequest){
  const session=readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if(!session){const login=new URL('/login',request.url);login.searchParams.set('returnTo',`${request.nextUrl.pathname}${request.nextUrl.search}`);return NextResponse.redirect(login)}
  if(request.nextUrl.pathname.startsWith('/admin')&&session.role!=='ADMIN')return NextResponse.redirect(new URL('/403',request.url));
  return NextResponse.next();
}

export const config={matcher:['/dashboard/:path*','/mcc/:path*','/accounts/:path*','/campaigns/:path*','/analytics/:path*','/profile','/admin/:path*']};
