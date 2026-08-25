import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { permissionsFor } from '@/lib/permissions';
import { DashboardApp } from '../dashboard-app';

export const dynamic='force-dynamic';
export default async function DashboardPage(){const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/dashboard');return <DashboardApp user={user} permissions={permissionsFor(user.role)}/>}
