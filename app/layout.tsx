import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getAppLocale } from '@/lib/i18n-server';
import './globals.css';
import { LocaleProvider } from './locale-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://davidagency.click'),
  title: 'David Agency MCC Manager',
  description: 'David Agency MCC Manager is a management platform for authorized users to manage Google Ads MCC accounts and connected client accounts.',
  openGraph: {
    title: 'David Agency MCC Manager',
    description: 'Google Ads MCC and connected client account management for authorized users.',
    siteName: 'David Agency MCC Manager',
    url: '/',
    type: 'website',
    images: [{
      url: '/og.png',
      width: 933,
      height: 781,
      alt: 'David Agency logo',
    }],
  },
  twitter: {
    card: 'summary',
    title: 'David Agency MCC Manager',
    description: 'Google Ads MCC and connected client account management for authorized users.',
    images: ['/og.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getAppLocale();
  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
