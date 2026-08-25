import { NextResponse } from 'next/server';
import { getChatGPTUser } from '../app/chatgpt-auth';

export function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data, error: null }, { status }); }
export function fail(code: string, message: string, status = 400) { return NextResponse.json({ success: false, data: null, error: { code, message } }, { status }); }

export async function apiUser() {
  const user = await getChatGPTUser();
  if (user) return { id: user.userId, email: user.email, name: user.displayName, demo: false };
  const demo = process.env.DEMO_MODE === 'true' || !process.env.GOOGLE_CLIENT_ID;
  return demo ? { id: 'demo-user', email: 'demo@adsmanager.local', name: 'Demo User', demo: true } : null;
}

export function requestIp(request: Request) { return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null; }
