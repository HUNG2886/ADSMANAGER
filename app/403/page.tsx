'use client';
import { ShieldX } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { BrandLogo } from '../brand-logo';
import { AppLanguageSwitcher } from '../language-switcher';
import { useAppLocale } from '../locale-provider';

export default function ForbiddenPage(){const locale=useAppLocale();return <main className="forbidden-shell"><section><AppLanguageSwitcher/><div className="forbidden-brand"><BrandLogo decorative /><strong>David Agency MCC Manager</strong></div><span><ShieldX size={27}/></span><p>403</p><h1>{tr(locale,'Bạn không có quyền truy cập trang này.','You do not have permission to access this page.')}</h1><a href="/dashboard">{tr(locale,'Quay lại Tổng quan','Back to Dashboard')}</a></section></main>}
