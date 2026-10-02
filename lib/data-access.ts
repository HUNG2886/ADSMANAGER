import type { SessionUser } from './session';
import { hasPostgres, prisma } from './prisma';

export async function allowedMccIds(user: Pick<SessionUser,'id'|'role'>): Promise<string[] | null> {
  if (user.role === 'DEV') return null;
  if (!hasPostgres()) return [];
  if (user.role === 'ADMIN') {
    const rows = await prisma.mCC.findMany({ where: { userId: user.id }, select: { id: true } });
    return rows.map(row => row.id);
  }
  const rows = await prisma.userMCCPermission.findMany({ where: { userId: user.id }, select: { mccId: true } });
  return rows.map(row => row.mccId);
}

export async function canAccessAccount(user: Pick<SessionUser,'id'|'role'>, accountId:string){
  if(user.role==='DEV')return true;
  if(!hasPostgres())return false;
  if(user.role==='ADMIN')return Boolean(await prisma.customerAccount.findFirst({where:{id:accountId,mcc:{userId:user.id}},select:{id:true}}));
  return Boolean(await prisma.customerAccount.findFirst({where:{id:accountId,mcc:{userPermissions:{some:{userId:user.id}}}},select:{id:true}}));
}

export async function canAccessMcc(user: Pick<SessionUser,'id'|'role'>, mccId: string) {
  const allowed = await allowedMccIds(user);
  return allowed === null || allowed.includes(mccId);
}

export async function canAccessConnection(user: Pick<SessionUser,'id'|'role'>, connectionId: string) {
  if (user.role === 'DEV') return true;
  if (user.role !== 'ADMIN' || !hasPostgres()) return false;
  return Boolean(await prisma.googleConnection.findFirst({ where: { id: connectionId, userId: user.id }, select: { id: true } }));
}

export async function canAccessClient(user: Pick<SessionUser,'id'|'role'>, clientId: string) {
  if (user.role === 'DEV') return true;
  if (!hasPostgres()) return false;
  if (user.role === 'ADMIN') return Boolean(await prisma.client.findFirst({ where: { id: clientId, ownerId: user.id }, select: { id: true } }));
  return Boolean(await prisma.client.findFirst({ where: { id: clientId, accountAssignments: { some: { customerAccount: { mcc: { userPermissions: { some: { userId: user.id } } } } } } }, select: { id: true } }));
}
