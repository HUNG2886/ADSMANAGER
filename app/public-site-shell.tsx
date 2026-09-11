import Link from 'next/link';

export const APP_NAME = 'David Agency MCC Manager';
export const SUPPORT_EMAIL = 'davidagency36@gmail.com';

export function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="public-brand" href="/" aria-label={`${APP_NAME} home`}>
        <span>DA</span>
        <strong>{APP_NAME}</strong>
      </Link>
      <nav aria-label="Public navigation">
        <Link href="/#features">Features</Link>
        <Link href="/privacy-policy">Privacy Policy</Link>
        <Link href="/terms">Terms of Service</Link>
      </nav>
      <Link className="public-header-signin" href="/login">Employee sign in</Link>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div>
        <strong>{APP_NAME}</strong>
        <p>Google Ads account management for authorized users.</p>
      </div>
      <nav aria-label="Legal links">
        <Link href="/privacy-policy">Privacy Policy</Link>
        <Link href="/terms">Terms of Service</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`}>Contact: {SUPPORT_EMAIL}</a>
      </nav>
      <small>© {new Date().getFullYear()} {APP_NAME}</small>
    </footer>
  );
}

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="public-site" lang="en">
      <PublicHeader />
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
      <PublicFooter />
    </div>
  );
}
