import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { googleSignInConfigured, safeReturnTo } from '../../lib/google-sign-in';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đăng nhập | Ads Manager Pro', description: 'Đăng nhập an toàn vào hệ thống quản lý Google Ads.' };

export default async function LoginPage({searchParams}:{searchParams:Promise<{returnTo?:string;googleError?:string}>}) {
  if (await getCurrentUser()) redirect('/');
  const query=await searchParams;
  return <LoginForm googleEnabled={googleSignInConfigured()} returnTo={safeReturnTo(query.returnTo)} googleError={query.googleError||''}/>;
}
