import { z } from 'zod';
import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { authConfigured, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';
import { fail } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { writeAudit } from '@/lib/audit';

const identifier=z.string().trim().min(3).max(180).refine(value=>z.string().email().safeParse(value).success||/^[a-zA-Z0-9._-]+$/.test(value));
const schema = z.object({ email: identifier, password: z.string().min(8).max(128), remember: z.boolean().optional().default(false) });

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`login:${ip}`, 5, 15 * 60_000)) return fail('RATE_LIMITED', 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau.', 429);
  if (!authConfigured()) return fail('AUTH_NOT_CONFIGURED', 'Hệ thống đăng nhập chưa được cấu hình.', 503);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.', 400);
  let user;
  try{user=await authenticate(parsed.data.email, parsed.data.password)}catch(error){console.error('[auth] Login backend unavailable:',error);return fail('AUTH_UNAVAILABLE','Hệ thống đăng nhập tạm thời không khả dụng.',503)}
  if (!user) return fail('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.', 401);
  const response = NextResponse.json({ success: true, data: { user }, error: null });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user, parsed.data.remember), sessionCookieOptions(parsed.data.remember));
  await writeAudit({ userId: user.id, userEmail: user.email, userName: user.name, action: 'LOGIN', entityType: 'Session', entityId: user.id, ipAddress: ip });
  return response;
}
