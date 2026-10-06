import { BadgeCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { allowedMccIds } from '@/lib/data-access';
import { getAppLocale } from '@/lib/i18n-server';
import { tr } from '@/lib/i18n';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { VerificationManager } from './verification-manager';

export default async function VerificationPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/google-ads/verification');
  if (!hasPermission(user.role, PERMISSIONS.MANAGE_IDENTITY_VERIFICATION)) redirect('/403');
  const locale = await getAppLocale();
  const allowed = await allowedMccIds(user);
  const accounts = await prisma.customerAccount.findMany({
    where: {
      manager: false,
      ...(allowed === null ? {} : { mccId: { in: allowed } }),
      mcc: { connection: { status: 'CONNECTED' } },
    },
    select: {
      id: true,
      customerId: true,
      name: true,
      status: true,
      verificationStatus: true,
      verificationStartDeadline: true,
      verificationCompletionDeadline: true,
      verificationCheckedAt: true,
      verificationErrorCode: true,
      verificationErrorMessage: true,
      verificationRequestId: true,
      mcc: { select: { id: true, customerId: true, name: true } },
    },
    orderBy: [{ mcc: { name: 'asc' } }, { name: 'asc' }, { customerId: 'asc' }],
  });

  return <>
    <div className="ga-page-head">
      <div>
        <p>GOOGLE ADS</p>
        <h1>{tr(locale, 'Xác minh nhà quảng cáo', 'Advertiser verification')}</h1>
        <span>{tr(
          locale,
          'Kiểm tra nhanh toàn bộ hoặc các tài khoản được chọn, khởi tạo phiên xác minh và tiếp tục trên trang chính thức của Google.',
          'Check all or selected accounts, start verification sessions, and continue on Google’s official page.',
        )}</span>
      </div>
      <span className="ga-page-icon"><BadgeCheck size={18}/></span>
    </div>
    <VerificationManager initialAccounts={accounts.map(account => ({
      ...account,
      verificationCheckedAt: account.verificationCheckedAt?.toISOString() ?? null,
    }))}/>
  </>;
}
