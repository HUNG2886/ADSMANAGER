import { hash, verify, type Options } from '@node-rs/argon2';
import bcrypt from 'bcryptjs';

const ARGON2_OPTIONS = {
  algorithm: 2,
  version: 1,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
  outputLen: 32,
} satisfies Options;

export function passwordNeedsRehash(storedHash: string) {
  return !storedHash.startsWith('$argon2id$');
}

export function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, storedHash: string) {
  try {
    if (storedHash.startsWith('$argon2')) return await verify(storedHash, password);
    if (storedHash.startsWith('$2')) return await bcrypt.compare(password, storedHash);
    return false;
  } catch {
    return false;
  }
}
