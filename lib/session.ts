import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'ads_manager_session';
export type AppRole = 'ADMIN' | 'STAFF';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  sessionVersion: number;
};

export type SessionPayload = SessionUser & { exp: number };
const SHORT_SESSION_AGE = 60 * 60 * 12;
const REMEMBERED_SESSION_AGE = 60 * 60 * 24 * 30;

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
}

function sessionKey() {
  const key = secret();
  if (!key) throw new Error('AUTH_SECRET chưa được cấu hình.');
  return createHash('sha256').update(key).digest();
}

export function authConfigured() {
  return secret().length >= 32;
}

export function createSessionToken(user: SessionUser, remember = false) {
  const maxAge = remember ? REMEMBERED_SESSION_AGE : SHORT_SESSION_AGE;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv);
  const plaintext = JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + maxAge } satisfies SessionPayload);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`;
}

export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !secret()) return null;
  const [ivValue, encryptedValue, tagValue] = token.split('.');
  if (!ivValue || !encryptedValue || !tagValue) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', sessionKey(), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
    const payload = JSON.parse(plaintext) as SessionPayload;
    if (!payload.id || !payload.email || !['ADMIN','STAFF'].includes(payload.role) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(remember = false) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: remember ? REMEMBERED_SESSION_AGE : SHORT_SESSION_AGE, priority: 'high' as const };
}
