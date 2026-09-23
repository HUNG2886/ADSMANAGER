import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { allowedMccIds } from '@/lib/data-access';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getAppLocale } from '@/lib/i18n-server';
import { tr } from '@/lib/i18n';
import { AppealCenter } from './appeal-center';

export default async function AppealsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/google-ads/appeals');
  if (!hasPermission(user.role, PERMISSIONS.VIEW_APPEALS)) redirect('/403');
  const locale = await getAppLocale();
  const allowed = await allowedMccIds(user);
  const accounts = await prisma.customerAccount.findMany({
    where: {
      AND: [
        allowed === null ? {} : { mccId: { in: allowed } },
        { OR: [{ status: 'SUSPENDED' }, { appeal: { isNot: null } }] },
      ],
    },
    include: {
      mcc: { select: { name: true, customerId: true } },
      appeal: true,
    },
    orderBy: [{ status: 'desc' }, { name: 'asc' }],
  });
  const rows = accounts.map(account => ({
    accountId: account.id,
    accountName: account.name,
    customerId: account.customerId,
    accountStatus: account.status,
    mccName: account.mcc.name,
    mccCustomerId: account.mcc.customerId,
    appeal: account.appeal ? {
      ...account.appeal,
      createdAt: account.appeal.createdAt.toISOString(),
      updatedAt: account.appeal.updatedAt.toISOString(),
      reviewedAt: account.appeal.reviewedAt?.toISOString() ?? null,
      submittedAt: account.appeal.submittedAt?.toISOString() ?? null,
      lastSubmittedAt: account.appeal.lastSubmittedAt?.toISOString() ?? null,
      outcomeAt: account.appeal.outcomeAt?.toISOString() ?? null,
    } : null,
  }));
  return <>
    <div className="ga-page-head"><div><p>GOOGLE ADS</p><h1>{tr(locale, 'Trung tâm kháng nghị', 'Appeal center')}</h1><span>{tr(locale, 'Chuẩn bị, duyệt và theo dõi hồ sơ riêng cho từng tài khoản bị đình chỉ.', 'Prepare, approve, and track a separate case for every suspended account.')}</span></div></div>
    <AppealCenter initialRows={rows} canManage={hasPermission(user.role, PERMISSIONS.MANAGE_APPEALS)}/>
  </>;
}
