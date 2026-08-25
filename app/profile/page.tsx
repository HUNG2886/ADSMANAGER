import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProfileClient } from './profile-client';

export const dynamic='force-dynamic';
export default async function ProfilePage(){const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/profile');return <ProfileClient user={user}/>}
