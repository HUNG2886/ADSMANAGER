import { PrismaClient } from '@prisma/client';
import { scopedDatabaseUrl } from './database-url';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const datasourceUrl = scopedDatabaseUrl();
export const prisma = globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export function hasPostgres() { return /^(postgres|postgresql):\/\//.test(process.env.DATABASE_URL || ''); }
