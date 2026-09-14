import { defineConfig } from 'prisma/config';
import { configureMigrationDatabaseUrl } from './lib/database-url';

try {
  process.loadEnvFile('.env');
} catch {
  // Vercel injects environment variables directly; a local .env is optional.
}

// Prisma CLI commands (especially migrate deploy) must avoid pooled PostgreSQL
// endpoints because session-level advisory locks can remain attached to a pool.
// The application itself continues to use DATABASE_URL at runtime.
configureMigrationDatabaseUrl();

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
});
