import { describe, expect, it } from 'vitest';
import { dateLocale, normalizeAppLocale, tr } from '../lib/i18n';

describe('application locale', () => {
  it('accepts supported values and safely falls back to Vietnamese', () => {
    expect(normalizeAppLocale('en')).toBe('en');
    expect(normalizeAppLocale('vi')).toBe('vi');
    expect(normalizeAppLocale('invalid')).toBe('vi');
  });

  it('selects both text and number/date locale consistently', () => {
    expect(tr('vi', 'Có', 'Yes')).toBe('Có');
    expect(tr('en', 'Có', 'Yes')).toBe('Yes');
    expect(dateLocale('vi')).toBe('vi-VN');
    expect(dateLocale('en')).toBe('en-US');
  });
});
