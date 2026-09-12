import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { PublicFooter, PublicHeader } from './public-site-shell';
import type { PublicLocale } from './public-locales';

const copy = {
  en: {
    eyebrow: 'AUTHORIZED GOOGLE ADS MANAGEMENT',
    description: 'David Agency MCC Manager is a management platform for authorized users to manage Google Ads MCC accounts and connected client accounts.',
    principlesLabel: 'Platform principles',
    authorizedAccess: 'Authorized access',
    accountSync: 'Account synchronization',
    workflowLabel: 'How the platform works',
    workflowTitle: 'MANAGEMENT WORKFLOW',
    workflow: [
      ['Connect securely', 'Sign in with an authorized Google account.'],
      ['Synchronize accounts', 'Load the MCC and connected account structure.'],
      ['Monitor performance', 'Review account information and advertising spend.'],
    ],
    functions: 'PLATFORM FUNCTIONS',
    toolsTitle: 'Tools for authorized account operations',
    features: [
      ['View MCC accounts', 'View MCC accounts and connected Google Ads accounts.'],
      ['Synchronize account information', 'Synchronize account names and account information.'],
      ['Monitor daily spend', 'Monitor daily advertising spend.'],
      ['Review spending', 'View spending by MCC and individual account.'],
      ['Manage employee access', 'Manage authorized employee access.'],
    ],
    users: 'AUTHORIZED USERS',
    dashboardTitle: 'Access your management dashboard',
    dashboardDescription: 'Sign in with Google to access your authorized Google Ads management dashboard.',
    googleSignIn: 'Sign in with Google',
    employeeSignIn: 'Sign in with employee credentials',
  },
  vi: {
    eyebrow: 'QUẢN LÝ GOOGLE ADS ĐƯỢC ỦY QUYỀN',
    description: 'David Agency MCC Manager là nền tảng dành cho người dùng được ủy quyền để quản lý tài khoản Google Ads MCC và các tài khoản khách hàng được liên kết.',
    principlesLabel: 'Nguyên tắc của nền tảng',
    authorizedAccess: 'Truy cập được ủy quyền',
    accountSync: 'Đồng bộ tài khoản',
    workflowLabel: 'Cách nền tảng hoạt động',
    workflowTitle: 'QUY TRÌNH QUẢN LÝ',
    workflow: [
      ['Kết nối an toàn', 'Đăng nhập bằng tài khoản Google đã được cấp quyền.'],
      ['Đồng bộ tài khoản', 'Tải cấu trúc MCC và các tài khoản được liên kết.'],
      ['Theo dõi hiệu quả', 'Xem thông tin tài khoản và chi phí quảng cáo.'],
    ],
    functions: 'CHỨC NĂNG NỀN TẢNG',
    toolsTitle: 'Công cụ vận hành tài khoản được ủy quyền',
    features: [
      ['Xem tài khoản MCC', 'Xem tài khoản MCC và các tài khoản Google Ads được liên kết.'],
      ['Đồng bộ thông tin tài khoản', 'Đồng bộ tên và thông tin của từng tài khoản.'],
      ['Theo dõi chi phí hằng ngày', 'Theo dõi chi phí quảng cáo theo ngày.'],
      ['Xem chi phí', 'Xem chi phí theo từng MCC và từng tài khoản.'],
      ['Quản lý quyền nhân viên', 'Quản lý quyền truy cập của nhân viên được ủy quyền.'],
    ],
    users: 'NGƯỜI DÙNG ĐƯỢC ỦY QUYỀN',
    dashboardTitle: 'Truy cập trang quản lý của bạn',
    dashboardDescription: 'Đăng nhập bằng Google để truy cập trang quản lý Google Ads đã được cấp quyền.',
    googleSignIn: 'Đăng nhập bằng Google',
    employeeSignIn: 'Đăng nhập bằng tài khoản nhân viên',
  },
} as const;

const icons = [Building2, RefreshCw, BarChart3, ShieldCheck, Users];

export function PublicHome({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  return (
    <div className="public-site" lang={locale}>
      <PublicHeader locale={locale} page="home" />
      <main>
        <section className="public-hero" aria-labelledby={`${locale}-home-title`}>
          <div className="public-hero-copy">
            <BrandLogo className="public-hero-logo" variant="full" preload />
            <p className="public-eyebrow">{text.eyebrow}</p>
            <h1 id={`${locale}-home-title`}>David Agency MCC Manager</h1>
            <p className="public-lead">{text.description}</p>
            <div className="public-trust-row" aria-label={text.principlesLabel}>
              <span><ShieldCheck size={17} /> {text.authorizedAccess}</span>
              <span><RefreshCw size={17} /> {text.accountSync}</span>
            </div>
          </div>
          <aside className="public-overview" aria-label={text.workflowLabel}>
            <p>{text.workflowTitle}</p>
            <ol>
              {text.workflow.map((item, index) => (
                <li key={item[0]}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{item[0]}</strong><small>{item[1]}</small></div>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="public-features" id="features" aria-labelledby={`${locale}-features-title`}>
          <div className="public-section-heading">
            <p className="public-eyebrow">{text.functions}</p>
            <h2 id={`${locale}-features-title`}>{text.toolsTitle}</h2>
          </div>
          <div className="public-feature-grid">
            {text.features.map((feature, index) => {
              const Icon = icons[index];
              return (
                <article key={feature[0]}>
                  <span><Icon size={20} /></span>
                  <h3>{feature[0]}</h3>
                  <p>{feature[1]}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="public-signin" aria-labelledby={`${locale}-signin-title`}>
          <div>
            <p className="public-eyebrow">{text.users}</p>
            <h2 id={`${locale}-signin-title`}>{text.dashboardTitle}</h2>
            <p>{text.dashboardDescription}</p>
          </div>
          <div className="public-signin-actions">
            <a className="public-google-button" href="/api/auth/google?returnTo=%2Fdashboard">
              <span aria-hidden="true">G</span>
              {text.googleSignIn}
              <ArrowRight size={17} />
            </a>
            <Link href="/login">{text.employeeSignIn}</Link>
          </div>
        </section>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
