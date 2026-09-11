import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PublicFooter, PublicHeader } from './public-site-shell';

export const metadata: Metadata = {
  title: 'David Agency MCC Manager',
  description:
    'David Agency MCC Manager is a management platform for authorized users to manage Google Ads MCC accounts and connected client accounts.',
  alternates: { canonical: '/' },
};

const features = [
  {
    title: 'View MCC accounts',
    description: 'View MCC accounts and connected Google Ads accounts.',
    icon: Building2,
  },
  {
    title: 'Synchronize account information',
    description: 'Synchronize account names and account information.',
    icon: RefreshCw,
  },
  {
    title: 'Monitor daily spend',
    description: 'Monitor daily advertising spend.',
    icon: BarChart3,
  },
  {
    title: 'Review spending',
    description: 'View spending by MCC and individual account.',
    icon: ShieldCheck,
  },
  {
    title: 'Manage employee access',
    description: 'Manage authorized employee access.',
    icon: Users,
  },
];

export default function HomePage() {
  return (
    <div className="public-site" lang="en">
      <PublicHeader />
      <main>
        <section className="public-hero" aria-labelledby="home-title">
          <div className="public-hero-copy">
            <p className="public-eyebrow">AUTHORIZED GOOGLE ADS MANAGEMENT</p>
            <h1 id="home-title">David Agency MCC Manager</h1>
            <p className="public-lead">
              David Agency MCC Manager is a management platform for authorized users to manage Google Ads MCC accounts and connected client accounts.
            </p>
            <div className="public-trust-row" aria-label="Platform principles">
              <span><ShieldCheck size={17} /> Authorized access</span>
              <span><RefreshCw size={17} /> Account synchronization</span>
            </div>
          </div>
          <aside className="public-overview" aria-label="How the platform works">
            <p>MANAGEMENT WORKFLOW</p>
            <ol>
              <li><span>01</span><div><strong>Connect securely</strong><small>Sign in with an authorized Google account.</small></div></li>
              <li><span>02</span><div><strong>Synchronize accounts</strong><small>Load the MCC and connected account structure.</small></div></li>
              <li><span>03</span><div><strong>Monitor performance</strong><small>Review account information and advertising spend.</small></div></li>
            </ol>
          </aside>
        </section>

        <section className="public-features" id="features" aria-labelledby="features-title">
          <div className="public-section-heading">
            <p className="public-eyebrow">PLATFORM FUNCTIONS</p>
            <h2 id="features-title">Tools for authorized account operations</h2>
          </div>
          <div className="public-feature-grid">
            {features.map((feature) => (
              <article key={feature.title}>
                <span><feature.icon size={20} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-signin" aria-labelledby="signin-title">
          <div>
            <p className="public-eyebrow">AUTHORIZED USERS</p>
            <h2 id="signin-title">Access your management dashboard</h2>
            <p>Sign in with Google to access your authorized Google Ads management dashboard.</p>
          </div>
          <div className="public-signin-actions">
            <a className="public-google-button" href="/api/auth/google?returnTo=%2Fdashboard">
              <span aria-hidden="true">G</span>
              Sign in with Google
              <ArrowRight size={17} />
            </a>
            <Link href="/login">Sign in with employee credentials</Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
