import { NextResponse } from 'next/server';
import { getCurrentUser } from './auth';

export function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data, error: null }, { status }); }
export function fail(code:string,message:string,status=400,details:Record<string,unknown>={}){return NextResponse.json({success:false,data:null,error:{code,message,...details}},{status})}

export async function apiUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}

export function requestIp(request: Request) { return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null; }
