'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { APP_LOCALE_COOKIE, type AppLocale, tr } from '@/lib/i18n';
import { useAppLocale } from './locale-provider';

function rememberLocale(locale: AppLocale) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${APP_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function AppLanguageSwitcher() {
  const locale = useAppLocale();
  const pathname = usePathname();
  const localeHref = (nextLocale: AppLocale) => `/api/locale?locale=${nextLocale}&returnTo=${encodeURIComponent(pathname)}`;

  return <div className="app-language-switcher" aria-label={tr(locale, 'Ngôn ngữ', 'Language')}>
    <a href={localeHref('vi')} aria-current={locale === 'vi' ? 'true' : undefined}>VI</a>
    <a href={localeHref('en')} aria-current={locale === 'en' ? 'true' : undefined}>EN</a>
  </div>;
}

export function PublicLocaleLink({ locale, href, children }: { locale: AppLocale; href: string; children: React.ReactNode }) {
  return <Link href={href} hrefLang={locale} lang={locale} onClick={() => rememberLocale(locale)}>{children}</Link>;
}

export function PublicLocaleSync({ locale }: { locale: AppLocale }) {
  useEffect(() => rememberLocale(locale), [locale]);
  return null;
}
