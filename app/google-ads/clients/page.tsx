import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { allowedMccIds } from '@/lib/data-access';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { ClientsManager } from './clients-manager';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/google-ads/clients');
  if (!hasPermission(user.role, PERMISSIONS.VIEW_CLIENTS)) redirect('/403');
  const allowed = await allowedMccIds(user);
  const clientWhere = allowed === null ? {} : { accountAssignments: { some: { customerAccount: { mccId: { in: allowed } } } } };
  const [clients, accounts] = await Promise.all([
    prisma.client.findMany({
      where: clientWhere,
      include: { accountAssignments: { where: allowed === null ? {} : { customerAccount: { mccId: { in: allowed } } }, select: { customerAccount: { select: { id: true, name: true, customerId: true, status: true, mcc: { select: { name: true } } } } } } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    }),
    prisma.customerAccount.findMany({
      where: allowed === null ? {} : { mccId: { in: allowed } },
      select: { id: true, name: true, customerId: true, status: true, mcc: { select: { name: true } }, clientAssignment: { select: { clientId: true, client: { select: { name: true } } } } },
      orderBy: { name: 'asc' },
    }),
  ]);
  const clientRows = clients.map(client => ({ ...client, createdAt: client.createdAt.toISOString(), updatedAt: client.updatedAt.toISOString() }));
  const accountRows = accounts.map(account => ({ id: account.id, name: account.name, customerId: account.customerId, status: account.status, mccName: account.mcc.name, assignedClientId: account.clientAssignment?.clientId || null, assignedClientName: account.clientAssignment?.client.name || null }));
  return <><div className="ga-page-head"><div><p>INTERNAL CRM</p><h1>Khách hàng</h1><span>Quản lý hồ sơ khách hàng và gán tài khoản Google Ads, không tạo dữ liệu Ads giả.</span></div></div><ClientsManager initialClients={clientRows} accounts={accountRows} canManage={hasPermission(user.role, PERMISSIONS.MANAGE_CLIENTS) && hasPermission(user.role, PERMISSIONS.ASSIGN_ACCOUNTS)}/></>;
}
