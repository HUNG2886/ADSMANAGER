import { Share2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAppLocale } from '@/lib/i18n-server';
import { tr } from '@/lib/i18n';
import { AccountSharingBoard } from './account-sharing-board';

export default async function AccountSharingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/google-ads/account-sharing');
  if (user.role !== 'ADMIN') redirect('/403');
  const locale = await getAppLocale();
  return <>
    <div className="ga-page-head">
      <div>
        <p>GOOGLE ADS</p>
        <h1>{tr(locale, 'Chia sẻ tài khoản giữa các MCC', 'Share accounts between MCCs')}</h1>
        <span>{tr(
          locale,
          'Kéo thả tài khoản hoặc dán Customer ID để liên kết thêm MCC quản lý. Tài khoản vẫn được giữ tại MCC nguồn.',
          'Drag accounts or paste Customer IDs to link another manager MCC. Accounts remain linked to the source MCC.',
        )}</span>
      </div>
      <span className="ga-page-icon"><Share2 size={18} /></span>
    </div>
    <AccountSharingBoard />
  </>;
}
