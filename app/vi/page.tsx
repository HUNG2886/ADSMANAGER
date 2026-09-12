import type { Metadata } from 'next';
import { PublicHome } from '../public-home';
import { publicAlternates } from '../public-locales';

export const metadata: Metadata = {
  title: 'David Agency MCC Manager',
  description: 'Nền tảng dành cho người dùng được ủy quyền để quản lý tài khoản Google Ads MCC và các tài khoản khách hàng được liên kết.',
  alternates: publicAlternates('home', 'vi'),
  openGraph: {
    title: 'David Agency MCC Manager',
    description: 'Nền tảng quản lý tài khoản Google Ads MCC dành cho người dùng được ủy quyền.',
    url: '/vi',
    locale: 'vi_VN',
    alternateLocale: ['en_US'],
  },
};

export default function VietnameseHomePage() {
  return <PublicHome locale="vi" />;
}
