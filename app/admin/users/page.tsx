import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { GoogleAdsFrame } from '@/app/google-ads/google-ads-frame';
import { UserAdministration } from './user-administration';
import { tr } from '@/lib/i18n';
import { getAppLocale } from '@/lib/i18n-server';

export const dynamic='force-dynamic';
export default async function AdminUsersPage(){const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/admin/users');if(user.role!=='ADMIN')redirect('/403');const locale=await getAppLocale();return <GoogleAdsFrame user={user}><div className="ga-page-head"><div><p>{tr(locale,'QUẢN TRỊ','ADMINISTRATION')}</p><h1>{tr(locale,'Quản lý tài khoản đăng nhập','Sign-in account management')}</h1><span>{tr(locale,'Thêm, sửa, đình chỉ hoặc xóa tài khoản được phép truy cập website; đồng thời phân quyền MCC cho STAFF.','Add, edit, suspend, or delete accounts allowed to access the website, and assign MCC permissions to STAFF users.')}</span></div></div><UserAdministration currentUserId={user.id}/></GoogleAdsFrame>}
