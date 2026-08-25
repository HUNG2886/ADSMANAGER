import type { SessionUser } from './session';
import { hasPostgres, prisma } from './prisma';

export async function allowedMccIds(user: Pick<SessionUser,'id'|'role'>): Promise<string[] | null> {
  if (user.role === 'ADMIN' || process.env.MCC_SCOPED_ACCESS_ENABLED !== 'true' || !hasPostgres()) return null;
  const rows = await prisma.userMCCPermission.findMany({ where: { userId: user.id }, select: { mccId: true } });
  return rows.map(row => row.mccId);
}

export async function canAccessMcc(user: Pick<SessionUser,'id'|'role'>, mccId: string) {
  const allowed = await allowedMccIds(user);
  return allowed === null || allowed.includes(mccId);
}
