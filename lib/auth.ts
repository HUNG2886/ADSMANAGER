import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { hasPostgres, prisma } from './prisma';

export const SESSION_COOKIE = 'ads_manager_session';
export type AppRole = 'ADMIN' | 'COLLABORATOR';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
};

type SessionPayload = SessionUser & { exp: number };
const SESSION_MAX_AGE = 60 * 60 * 12;

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV !== 'production' ? 'ads-manager-local-development-secret-change-me' : '');
}

function sessionKey() {
  const key = secret();
  if (!key) throw new Error('AUTH_SECRET chưa được cấu hình.');
  return createHash('sha256').update(key).digest();
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function roleOf(role: string): AppRole {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' ? 'ADMIN' : 'COLLABORATOR';
}

export function createSessionToken(user: SessionUser) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv);
  const plaintext = JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE } satisfies SessionPayload);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`;
}

export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_MAX_AGE };
}

function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [ivValue, encryptedValue, tagValue] = token.split('.');
  if (!ivValue || !encryptedValue || !tagValue || !secret()) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', sessionKey(), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
    const payload = JSON.parse(plaintext) as SessionPayload;
    if (!payload.id || !payload.email || !payload.role || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (session) {
    if (!hasPostgres()) return { id: session.id, email: session.email, name: session.name, role: session.role };
    const stored = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, email: true, name: true, role: true, isActive: true } }).catch(() => null);
    if (!stored?.isActive) return null;
    return { id: stored.id, email: stored.email, name: stored.name || stored.email, role: roleOf(stored.role) };
  }

  const chatGPT = await getChatGPTUser();
  if (!chatGPT) return null;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return { id: chatGPT.userId, email: chatGPT.email, name: chatGPT.displayName, role: chatGPT.email.toLowerCase() === adminEmail ? 'ADMIN' : 'COLLABORATOR' };
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expected] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  return safeEqual(scryptSync(password, salt, 64).toString('base64url'), expected);
}

export async function authenticate(emailInput: string, password: string): Promise<SessionUser | null> {
  const email = emailInput.trim().toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL || (process.env.NODE_ENV !== 'production' ? 'admin@adsmanager.local' : '')).trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'Admin@123456' : '');

  if (adminEmail && adminPassword && email === adminEmail && safeEqual(password, adminPassword)) {
    if (!hasPostgres()) return { id: 'environment-admin', email, name: 'Quản trị viên', role: 'ADMIN' };
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN', isActive: true, passwordHash: hashPassword(password), lastLoginAt: new Date() },
      create: { email, name: 'Quản trị viên', role: 'ADMIN', isActive: true, passwordHash: hashPassword(password), lastLoginAt: new Date() },
      select: { id: true, email: true, name: true },
    });
    return { id: user.id, email: user.email, name: user.name || user.email, role: 'ADMIN' };
  }

  if (!hasPostgres()) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true } }).catch(() => null);
  if (!user?.isActive || !user.passwordHash || !verifyPassword(password, user.passwordHash)) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, email: user.email, name: user.name || user.email, role: roleOf(user.role) };
}

export function localDevelopmentCredentials() {
  if (process.env.NODE_ENV === 'production' || process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD) return null;
  return { email: 'admin@adsmanager.local', password: 'Admin@123456' };
}
