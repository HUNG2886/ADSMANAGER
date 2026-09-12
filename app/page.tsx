import type { Metadata } from 'next';
import { PublicHome } from './public-home';
import { publicAlternates } from './public-locales';

export const metadata: Metadata = {
  title: 'David Agency MCC Manager',
  description:
    'David Agency MCC Manager is a management platform for authorized users to manage Google Ads MCC accounts and connected client accounts.',
  alternates: publicAlternates('home'),
};

export default function HomePage() {
  return <PublicHome locale="en" />;
}
