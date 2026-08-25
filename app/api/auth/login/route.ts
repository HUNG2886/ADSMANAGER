import { z } from 'zod';
import { NextResponse } from 'next/server';
import { authenticate, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { fail } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({ email: z.string().email().max(180), password: z.string().min(8).max(200) });

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`login:${ip}`, 8, 60_000)) return fail('RATE_LIMITED', 'Bạn đã thử quá nhiều lần. Vui lòng chờ một phút.', 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không hợp lệ.', 400);
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return fail('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.', 401);
  const response = NextResponse.json({ success: true, data: { user }, error: null });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
  return response;
}
