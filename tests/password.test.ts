import bcrypt from 'bcryptjs';
import { describe,expect,it } from 'vitest';
import { hashPassword,passwordNeedsRehash,verifyPassword } from '../lib/password';

describe('password hashing',()=>{
  it('creates and verifies Argon2id hashes',async()=>{
    const hashed=await hashPassword('CorrectHorse123');
    expect(hashed.startsWith('$argon2id$')).toBe(true);
    expect(passwordNeedsRehash(hashed)).toBe(false);
    await expect(verifyPassword('CorrectHorse123',hashed)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password',hashed)).resolves.toBe(false);
  });

  it('accepts legacy bcrypt hashes only for migration',async()=>{
    const legacy=await bcrypt.hash('LegacyPass123',4);
    expect(passwordNeedsRehash(legacy)).toBe(true);
    await expect(verifyPassword('LegacyPass123',legacy)).resolves.toBe(true);
  });
});
