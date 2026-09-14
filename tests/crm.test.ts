import { describe, expect, it } from 'vitest';
import { clientSchema } from '../lib/crm';

describe('clientSchema', () => {
  it('accepts and normalizes a rental account', () => {
    expect(clientSchema.parse({
      name: 'Khách hàng A',
      email: 'CLIENT@EXAMPLE.COM',
      rentalAccount: ' 123-456-7890 ',
      notes: '',
    })).toEqual({
      name: 'Khách hàng A',
      email: 'client@example.com',
      rentalAccount: '123-456-7890',
      notes: null,
    });
  });

  it('does not write removed company, phone, or website fields', () => {
    expect(clientSchema.parse({
      name: 'Khách hàng B',
      company: 'Legacy company',
      phone: '0123456789',
      website: 'https://example.com',
    })).toEqual({
      name: 'Khách hàng B',
      email: null,
      rentalAccount: null,
      notes: null,
    });
  });
});
