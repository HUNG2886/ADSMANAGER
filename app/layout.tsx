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
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Ads Manager Pro | Multi-MCC Dashboard',
  description: 'Quản lý tập trung nhiều MCC, tài khoản và chiến dịch Google Ads.',
  openGraph: {
    title: 'Ads Manager Pro',
    description: 'Quản lý Multi-MCC tập trung',
    images: [{ url: '/og.png', width: 1536, height: 864, alt: 'Ads Manager Pro — Quản lý Multi-MCC tập trung' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ads Manager Pro',
    description: 'Quản lý Multi-MCC tập trung',
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
