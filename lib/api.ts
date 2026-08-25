import { NextResponse } from 'next/server';
import { getCurrentUser } from './auth';

export function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data, error: null }, { status }); }
export function fail(code: string, message: string, status = 400) { return NextResponse.json({ success: false, data: null, error: { code, message } }, { status }); }

export async function apiUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  const demo = process.env.DEMO_MODE === 'true' || !process.env.GOOGLE_CLIENT_ID;
  return { ...user, demo };
}

export function requestIp(request: Request) { return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null; }
