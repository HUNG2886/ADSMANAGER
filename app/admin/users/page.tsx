import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { permissionsFor } from '@/lib/permissions';
import { DashboardApp } from '../../dashboard-app';

export const dynamic='force-dynamic';
export default async function AdminUsersPage(){const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/admin/users');if(user.role!=='ADMIN')redirect('/403');return <DashboardApp user={user} permissions={permissionsFor(user.role)} initialSection="team"/>}
