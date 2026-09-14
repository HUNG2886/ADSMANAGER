import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { GoogleAdsFrame } from '@/app/google-ads/google-ads-frame';
import { StaffPermissions } from './staff-permissions';
import { tr } from '@/lib/i18n';
import { getAppLocale } from '@/lib/i18n-server';

export const dynamic='force-dynamic';
export default async function AdminUsersPage(){const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/admin/users');if(user.role!=='ADMIN')redirect('/403');const locale=await getAppLocale();return <GoogleAdsFrame user={user}><div className="ga-page-head"><div><p>{tr(locale,'QUẢN TRỊ','ADMINISTRATION')}</p><h1>{tr(locale,'Phân quyền nhân viên','Staff permissions')}</h1><span>{tr(locale,'Gán đúng MCC cho từng cộng tác viên. STAFF luôn chỉ đọc.','Assign the appropriate MCCs to each staff member. STAFF access is always read-only.')}</span></div></div><StaffPermissions/></GoogleAdsFrame>}
