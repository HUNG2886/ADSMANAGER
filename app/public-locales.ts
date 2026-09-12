export type PublicLocale = 'en' | 'vi';
export type PublicPage = 'home' | 'privacy' | 'terms';

const routes: Record<PublicLocale, Record<PublicPage, string>> = {
  en: { home: '/', privacy: '/privacy-policy', terms: '/terms' },
  vi: { home: '/vi', privacy: '/vi/privacy-policy', terms: '/vi/terms' },
};

export function publicRoute(locale: PublicLocale, page: PublicPage) {
  return routes[locale][page];
}

export function publicAlternates(page: PublicPage, locale: PublicLocale = 'en') {
  return {
    canonical: publicRoute(locale, page),
    languages: {
      en: publicRoute('en', page),
      vi: publicRoute('vi', page),
    },
  };
}
