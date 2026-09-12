import type { Metadata } from 'next';
import { LegalPage, SUPPORT_EMAIL } from '../public-site-shell';
import { publicAlternates } from '../public-locales';

export const metadata: Metadata = {
  title: 'Privacy Policy | David Agency MCC Manager',
  description: 'Privacy Policy for David Agency MCC Manager.',
  alternates: publicAlternates('privacy'),
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      page="privacy"
      title="Privacy Policy for David Agency MCC Manager"
      intro="David Agency MCC Manager respects user privacy and is committed to protecting user information."
    >
      <section>
        <h2>Information we access</h2>
        <p>When a user signs in with Google, the application may access basic Google account information required for authentication and Google Ads account information authorized by the user.</p>
        <p>The application may access Google Ads data including MCC accounts, client account names, customer IDs, account structure, and advertising spend information.</p>
      </section>
      <section>
        <h2>How we use information</h2>
        <p>We use this information only to provide account management, synchronization, reporting, spending monitoring, and authorized employee access features within David Agency MCC Manager.</p>
      </section>
      <section>
        <h2>Data sharing</h2>
        <p>We do not sell Google user data. We do not share Google user data with third parties except where required to operate the service, comply with applicable law, or protect the security of the service.</p>
      </section>
      <section>
        <h2>Data storage and security</h2>
        <p>We use reasonable technical and organizational safeguards to protect user information from unauthorized access, alteration, disclosure, or destruction.</p>
      </section>
      <section>
        <h2>Google API Services</h2>
        <p>David Agency MCC Manager&apos;s use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.</p>
      </section>
      <section>
        <h2>User control and revocation</h2>
        <p>Users may revoke access granted to the application through their Google Account security settings at any time.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>If you have questions about this Privacy Policy, please contact us at: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  );
}
