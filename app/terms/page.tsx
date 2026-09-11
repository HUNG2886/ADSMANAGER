import type { Metadata } from 'next';
import { LegalPage, SUPPORT_EMAIL } from '../public-site-shell';

export const metadata: Metadata = {
  title: 'Terms of Service | David Agency MCC Manager',
  description: 'Terms of Service for David Agency MCC Manager.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service for David Agency MCC Manager"
      intro="By using David Agency MCC Manager, you agree to these Terms of Service."
    >
      <section>
        <h2>Service purpose</h2>
        <p>David Agency MCC Manager provides tools for authorized users to manage and monitor Google Ads MCC accounts and associated client accounts.</p>
      </section>
      <section>
        <h2>Authorized use</h2>
        <p>Users must only access Google Ads accounts for which they have legitimate authorization.</p>
      </section>
      <section>
        <h2>Account security</h2>
        <p>Users are responsible for maintaining the security of their Google accounts and for all activity performed through their authorized access.</p>
      </section>
      <section>
        <h2>Service availability</h2>
        <p>The service may be updated, modified, suspended, or discontinued when necessary for maintenance, security, compliance, or service improvement.</p>
      </section>
      <section>
        <h2>Prohibited use</h2>
        <p>Users must not use the service for unlawful activities, unauthorized access, abuse of Google services, or violation of Google Ads policies.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>For questions regarding these terms, contact: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  );
}
