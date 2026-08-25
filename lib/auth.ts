import 'server-only';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { hasPostgres, prisma } from './prisma';
import { readSessionToken, sessionIsActive, SESSION_COOKIE, type AppRole, type SessionUser } from './session';

export type { AppRole, SessionUser } from './session';
const BCRYPT_ROUNDS = 12;

function roleOf(role: string): AppRole {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' ? 'ADMIN' : 'STAFF';
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (session) {
    if (!hasPostgres()) return { id: session.id, email: session.email, name: session.name, role: session.role, sessionVersion: session.sessionVersion };
    const stored = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, email: true, name: true, role: true, status: true, sessionVersion: true } }).catch(() => null);
    if (!sessionIsActive(session,stored)) return null;
    return { id: stored.id, email: stored.email, name: stored.name || stored.email, role: roleOf(stored.role), sessionVersion: stored.sessionVersion };
  }

  const chatGPT = await getChatGPTUser();
  if (!chatGPT) return null;
  const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
  return { id: chatGPT.userId, email: chatGPT.email, name: chatGPT.displayName, role: chatGPT.email.toLowerCase() === adminEmail ? 'ADMIN' : 'STAFF', sessionVersion: 0 };
}

export async function hashPassword(password: string) {
  if (bcrypt.truncates(password)) throw new Error('Mật khẩu quá dài.');
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, stored: string) {
  if (bcrypt.truncates(password)) return false;
  return bcrypt.compare(password, stored);
}

function environmentCredential(email: string, password: string) {
  const candidates: Array<{ email?: string; password?: string; role: AppRole; name: string }> = [
    { email: process.env.DEFAULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL, password: process.env.DEFAULT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD, role: 'ADMIN', name: 'Quản trị viên' },
    { email: process.env.DEFAULT_STAFF_EMAIL, password: process.env.DEFAULT_STAFF_PASSWORD, role: 'STAFF', name: 'Cộng tác viên' },
  ];
  return candidates.find(item => item.email?.trim().toLowerCase() === email && item.password === password) || null;
}

export async function authenticate(emailInput: string, password: string): Promise<SessionUser | null> {
  const email = emailInput.trim().toLowerCase();
  const environment = environmentCredential(email, password);
  if (environment) {
    if (!hasPostgres()) return { id: `environment-${environment.role.toLowerCase()}`, email, name: environment.name, role: environment.role, sessionVersion: 0 };
    const hashed = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: environment.role, status: 'ACTIVE', passwordHash: hashed, lastLoginAt: new Date() },
      create: { email, name: environment.name, role: environment.role, status: 'ACTIVE', passwordHash: hashed, lastLoginAt: new Date() },
      select: { id: true, email: true, name: true, role: true, sessionVersion: true },
    });
    return { id: user.id, email: user.email, name: user.name || user.email, role: roleOf(user.role), sessionVersion: user.sessionVersion };
  }

  if (!hasPostgres()) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, role: true, status: true, sessionVersion: true, passwordHash: true } }).catch(() => null);
  if (!user || user.status !== 'ACTIVE' || !user.passwordHash || !await verifyPassword(password, user.passwordHash)) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, email: user.email, name: user.name || user.email, role: roleOf(user.role), sessionVersion: user.sessionVersion };
}
