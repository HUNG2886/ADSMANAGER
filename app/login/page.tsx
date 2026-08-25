import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, localDevelopmentCredentials } from '../../lib/auth';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đăng nhập | Ads Manager Pro', description: 'Đăng nhập an toàn vào hệ thống quản lý Google Ads.' };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  return <LoginForm developmentCredentials={localDevelopmentCredentials()} />;
}
