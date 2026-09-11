import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { googleSignInConfigured, safeReturnTo } from '../../lib/google-sign-in';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in | David Agency MCC Manager', description: 'Secure sign-in for authorized David Agency MCC Manager users.' };

export default async function LoginPage({searchParams}:{searchParams:Promise<{returnTo?:string;googleError?:string}>}) {
  if (await getCurrentUser()) redirect('/dashboard');
  const query=await searchParams;
  return <LoginForm googleEnabled={googleSignInConfigured()} returnTo={safeReturnTo(query.returnTo)} googleError={query.googleError||''}/>;
}
