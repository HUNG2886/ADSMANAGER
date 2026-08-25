import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { GoogleAdsFrame } from '@/app/google-ads/google-ads-frame';
import { StaffPermissions } from './staff-permissions';

export const dynamic='force-dynamic';
export default async function AdminUsersPage(){const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/admin/users');if(user.role!=='ADMIN')redirect('/403');return <GoogleAdsFrame user={user}><div className="ga-page-head"><div><p>QUẢN TRỊ</p><h1>Staff permissions</h1><span>Gán đúng MCC cho từng cộng tác viên. STAFF luôn chỉ đọc.</span></div></div><StaffPermissions/></GoogleAdsFrame>}
