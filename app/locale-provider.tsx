'use client';

import { createContext, useContext } from 'react';
import type { AppLocale } from '@/lib/i18n';

const LocaleContext = createContext<AppLocale>('vi');

export function LocaleProvider({ locale, children }: { locale: AppLocale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useAppLocale() {
  return useContext(LocaleContext);
}
