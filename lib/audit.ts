import { hasPostgres, prisma } from './prisma';

export async function writeAudit(input: { userId: string; userEmail?: string; userName?: string; action: string; entityType: string; entityId: string; metadata?: unknown; ipAddress?: string | null }) {
  if (!hasPostgres()) return;
  await prisma.user.upsert({
    where: { id: input.userId },
    update: { email: input.userEmail ?? undefined, name: input.userName ?? undefined },
    create: { id: input.userId, email: input.userEmail ?? `${input.userId}@ads-manager.local`, name: input.userName },
  });
  await prisma.auditLog.create({ data: { userId: input.userId, action: input.action, entityType: input.entityType, entityId: input.entityId, metadata: (input.metadata ?? {}) as object, ipAddress: input.ipAddress ?? null } });
}
