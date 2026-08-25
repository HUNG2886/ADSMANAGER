import { redirect } from 'next/navigation';
import { getCurrentUser } from '../lib/auth';
import { DashboardApp } from './dashboard-app';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <DashboardApp user={user} />;
}
