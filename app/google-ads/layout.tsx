import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { GoogleAdsFrame } from './google-ads-frame';

export const dynamic='force-dynamic';
export default async function GoogleAdsLayout({children}:{children:React.ReactNode}){const user=await getCurrentUser();if(!user)redirect('/login?returnTo=/google-ads');return <GoogleAdsFrame user={user}>{children}</GoogleAdsFrame>}
