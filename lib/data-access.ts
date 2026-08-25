import type { SessionUser } from './session';
import { hasPostgres, prisma } from './prisma';

export async function allowedMccIds(user: Pick<SessionUser,'id'|'role'>): Promise<string[] | null> {
  if (user.role === 'ADMIN') return null;
  if (!hasPostgres()) return [];
  const rows = await prisma.userMCCPermission.findMany({ where: { userId: user.id }, select: { mccId: true } });
  return rows.map(row => row.mccId);
}

export async function canAccessAccount(user: Pick<SessionUser,'id'|'role'>, accountId:string){
  if(user.role==='ADMIN')return true;
  if(!hasPostgres())return false;
  return Boolean(await prisma.customerAccount.findFirst({where:{id:accountId,mcc:{userPermissions:{some:{userId:user.id}}}},select:{id:true}}));
}

export async function canAccessMcc(user: Pick<SessionUser,'id'|'role'>, mccId: string) {
  const allowed = await allowedMccIds(user);
  return allowed === null || allowed.includes(mccId);
}
