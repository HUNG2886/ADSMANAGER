import { describe, expect, it } from 'vitest';
import {
  APPEAL_RESUBMISSION_COOLDOWN_MS,
  appealCooldownRemaining,
  canTransitionAppeal,
  missingAppealFields,
} from '../lib/account-appeals';

describe('account appeal workflow', () => {
  it('requires ADMIN review before an appeal can be marked submitted', () => {
    expect(canTransitionAppeal('DRAFT', 'READY_TO_SUBMIT')).toBe(true);
    expect(canTransitionAppeal('READY_TO_SUBMIT', 'SUBMITTED')).toBe(true);
    expect(canTransitionAppeal('DRAFT', 'SUBMITTED')).toBe(false);
  });

  it('allows revision after rejection but keeps approved appeals final', () => {
    expect(canTransitionAppeal('REJECTED', 'DRAFT')).toBe(true);
    expect(canTransitionAppeal('APPROVED', 'DRAFT')).toBe(false);
  });

  it('reports every required field missing from an incomplete draft', () => {
    expect(
      missingAppealFields({
        reason: null,
        suspensionReason: ' ',
        correctiveActions: null,
        appealStatement: '',
        contactEmail: null,
      }),
    ).toEqual(['reason', 'suspensionReason', 'correctiveActions', 'appealStatement', 'contactEmail']);
  });

  it('accepts a complete appeal draft', () => {
    expect(
      missingAppealFields({
        reason: 'MADE_CHANGES_TO_COMPLY',
        suspensionReason: 'Billing profile was corrected.',
        correctiveActions: 'Removed the invalid payment method.',
        appealStatement: 'Please review the corrected account.',
        contactEmail: 'support@example.com',
      }),
    ).toEqual([]);
  });

  it('enforces a 24-hour cooldown between submissions', () => {
    const now = new Date('2026-09-23T12:00:00.000Z');
    const twelveHoursAgo = new Date('2026-09-23T00:00:00.000Z');
    const twoDaysAgo = new Date('2026-09-21T12:00:00.000Z');

    expect(appealCooldownRemaining(twelveHoursAgo, now)).toBe(APPEAL_RESUBMISSION_COOLDOWN_MS / 2);
    expect(appealCooldownRemaining(twoDaysAgo, now)).toBe(0);
    expect(appealCooldownRemaining(null, now)).toBe(0);
  });
});
