import { describe, expect, it } from 'vitest';
import { publicAlternates, publicRoute } from '../app/public-locales';

describe('public locale routes', () => {
  it('maps every public page to matching English and Vietnamese URLs', () => {
    expect(publicRoute('en', 'home')).toBe('/');
    expect(publicRoute('vi', 'home')).toBe('/vi');
    expect(publicRoute('en', 'privacy')).toBe('/privacy-policy');
    expect(publicRoute('vi', 'privacy')).toBe('/vi/privacy-policy');
    expect(publicRoute('en', 'terms')).toBe('/terms');
    expect(publicRoute('vi', 'terms')).toBe('/vi/terms');
  });

  it('uses a self-canonical URL and exposes both language alternatives', () => {
    expect(publicAlternates('privacy', 'vi')).toEqual({
      canonical: '/vi/privacy-policy',
      languages: { en: '/privacy-policy', vi: '/vi/privacy-policy' },
    });
  });
});
