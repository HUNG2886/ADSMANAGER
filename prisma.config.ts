import { defineConfig } from 'prisma/config';
import { configureDatabaseUrl } from './lib/database-url';

try {
  process.loadEnvFile('.env');
} catch {
  // Vercel injects environment variables directly; a local .env is optional.
}

configureDatabaseUrl();

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
});
