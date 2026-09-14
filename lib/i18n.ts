export const APP_LOCALE_COOKIE = 'david_agency_locale';

export type AppLocale = 'vi' | 'en';

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  return value === 'en' ? 'en' : 'vi';
}

export function dateLocale(locale: AppLocale) {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

export function tr(locale: AppLocale, vietnamese: string, english: string) {
  return locale === 'vi' ? vietnamese : english;
}
