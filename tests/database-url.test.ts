import { afterEach, describe, expect, it } from 'vitest';
import { configureMigrationDatabaseUrl, scopedDatabaseUrl } from '../lib/database-url';

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDirectUrl = process.env.DIRECT_URL;
const originalSchema = process.env.DATABASE_SCHEMA;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalDirectUrl === undefined) delete process.env.DIRECT_URL;
  else process.env.DIRECT_URL = originalDirectUrl;
  if (originalSchema === undefined) delete process.env.DATABASE_SCHEMA;
  else process.env.DATABASE_SCHEMA = originalSchema;
});

describe('database URL configuration', () => {
  it('adds the configured schema without changing the database endpoint', () => {
    process.env.DATABASE_SCHEMA = 'adsmanager';
    expect(scopedDatabaseUrl('postgresql://user:pass@db.example/neondb?sslmode=require'))
      .toBe('postgresql://user:pass@db.example/neondb?sslmode=require&schema=adsmanager');
  });

  it('prefers DIRECT_URL for Prisma CLI commands', () => {
    process.env.DATABASE_SCHEMA = 'adsmanager';
    process.env.DATABASE_URL = 'postgresql://user:pass@database-pooler.example/neondb';
    process.env.DIRECT_URL = 'postgresql://user:pass@database.example/neondb';

    const configured = configureMigrationDatabaseUrl();

    expect(configured).toBe('postgresql://user:pass@database.example/neondb?schema=adsmanager');
    expect(process.env.DATABASE_URL).toBe(configured);
  });

  it('falls back to DATABASE_URL when DIRECT_URL is not configured', () => {
    process.env.DATABASE_SCHEMA = 'adsmanager';
    process.env.DATABASE_URL = 'postgresql://user:pass@database.example/neondb';
    delete process.env.DIRECT_URL;

    expect(configureMigrationDatabaseUrl())
      .toBe('postgresql://user:pass@database.example/neondb?schema=adsmanager');
  });
});
