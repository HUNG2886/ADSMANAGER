import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { GoogleAdsFrame } from '@/app/google-ads/google-ads-frame';
import { UserAdministration } from './user-administration';
import { tr } from '@/lib/i18n';
import { getAppLocale } from '@/lib/i18n-server';

export const dynamic='force-dynamic';
export default async function AdminUsersPage(){const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/admin/users');if(user.role!=='DEV')redirect('/403');const locale=await getAppLocale();return <GoogleAdsFrame user={user}><div className="ga-page-head"><div><p>{tr(locale,'QUẢN TRỊ NỀN TẢNG','PLATFORM ADMINISTRATION')}</p><h1>{tr(locale,'Quản lý tài khoản khách hàng','Customer account management')}</h1><span>{tr(locale,'Chỉ DEV có thể tạo, sửa, đình chỉ hoặc xóa ADMIN/STAFF. Mỗi ADMIN chỉ nhìn thấy dữ liệu Google Ads do chính họ sở hữu.','Only DEV can create, edit, suspend, or delete ADMIN/STAFF accounts. Each ADMIN can only see Google Ads data they own.')}</span></div></div><UserAdministration currentUserId={user.id}/></GoogleAdsFrame>}
