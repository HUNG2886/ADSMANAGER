import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
