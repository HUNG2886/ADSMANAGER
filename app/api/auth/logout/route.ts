import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';
import { writeAudit } from '@/lib/audit';

export async function POST() {
  const user = await getCurrentUser();
  if (user) await writeAudit({ userId: user.id, userEmail: user.email, userName: user.name, action: 'LOGOUT', entityType: 'Session', entityId: user.id });
  const response = NextResponse.json({ success: true, data: null, error: null });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
