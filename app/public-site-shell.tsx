import Link from 'next/link';
import { BrandLogo } from './brand-logo';
import { PublicLocaleLink, PublicLocaleSync } from './language-switcher';
import { publicRoute, type PublicLocale, type PublicPage } from './public-locales';

export const APP_NAME = 'David Agency MCC Manager';
export const SUPPORT_EMAIL = 'davidagency36@gmail.com';

const shellCopy = {
  en: {
    home: 'Home', features: 'Features', privacy: 'Privacy Policy', terms: 'Terms of Service', signIn: 'Employee sign in',
    publicNavigation: 'Public navigation', language: 'Language', legal: 'Legal links', description: 'Google Ads account management for authorized users.', contact: 'Contact',
  },
  vi: {
    home: 'Trang chủ', features: 'Chức năng', privacy: 'Chính sách quyền riêng tư', terms: 'Điều khoản dịch vụ', signIn: 'Đăng nhập nhân viên',
    publicNavigation: 'Điều hướng công khai', language: 'Ngôn ngữ', legal: 'Liên kết pháp lý', description: 'Quản lý tài khoản Google Ads dành cho người dùng được ủy quyền.', contact: 'Liên hệ',
  },
} as const;

function LanguageSwitcher({ locale, page }: { locale: PublicLocale; page: PublicPage }) {
  return (
    <nav className="public-language" aria-label={shellCopy[locale].language}>
      <span aria-current={locale === 'en' ? 'page' : undefined}><PublicLocaleLink locale="en" href={publicRoute('en', page)}>EN</PublicLocaleLink></span>
      <span aria-current={locale === 'vi' ? 'page' : undefined}><PublicLocaleLink locale="vi" href={publicRoute('vi', page)}>VI</PublicLocaleLink></span>
    </nav>
  );
}

export function PublicHeader({ locale = 'en', page = 'home' }: { locale?: PublicLocale; page?: PublicPage }) {
  const text = shellCopy[locale];
  return (
    <header className="public-header">
      <PublicLocaleSync locale={locale} />
      <Link className="public-brand" href={publicRoute(locale, 'home')} aria-label={`${APP_NAME} — ${text.home}`}>
        <BrandLogo decorative />
        <strong>{APP_NAME}</strong>
      </Link>
      <nav className="public-navigation" aria-label={text.publicNavigation}>
        <Link href={`${publicRoute(locale, 'home')}#features`}>{text.features}</Link>
        <Link href={publicRoute(locale, 'privacy')}>{text.privacy}</Link>
        <Link href={publicRoute(locale, 'terms')}>{text.terms}</Link>
      </nav>
      <div className="public-header-actions">
        <LanguageSwitcher locale={locale} page={page} />
        <Link className="public-header-signin" href="/login">{text.signIn}</Link>
      </div>
    </header>
  );
}

export function PublicFooter({ locale = 'en' }: { locale?: PublicLocale }) {
  const text = shellCopy[locale];
  return (
    <footer className="public-footer">
      <div>
        <BrandLogo variant="full" />
        <div>
          <strong>{APP_NAME}</strong>
          <p>{text.description}</p>
        </div>
      </div>
      <nav aria-label={text.legal}>
        <Link href={publicRoute(locale, 'privacy')}>{text.privacy}</Link>
        <Link href={publicRoute(locale, 'terms')}>{text.terms}</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{text.contact}: {SUPPORT_EMAIL}</a>
      </nav>
      <small>© {new Date().getFullYear()} {APP_NAME}</small>
    </footer>
  );
}

export function LegalPage({
  title,
  intro,
  children,
  locale = 'en',
  page,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
  locale?: PublicLocale;
  page: Extract<PublicPage, 'privacy' | 'terms'>;
}) {
  return (
    <div className="public-site" lang={locale}>
      <PublicHeader locale={locale} page={page} />
      <main className="legal-main">
        <article className="legal-document">
          <header>
            <p className="public-eyebrow">DAVID AGENCY MCC MANAGER</p>
            <h1>{title}</h1>
            <p>{intro}</p>
          </header>
          <div className="legal-content">{children}</div>
        </article>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
