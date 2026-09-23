export const GOOGLE_ADS_SUSPENSION_APPEAL_URL = 'https://support.google.com/google-ads/answer/7217009';
export const APPEAL_RESUBMISSION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const APPEAL_STATUSES = [
  'DRAFT',
  'READY_TO_SUBMIT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
] as const;

export type AccountAppealStatus = (typeof APPEAL_STATUSES)[number];

export type AppealDraft = {
  reason: 'DISPUTE_DECISION' | 'MADE_CHANGES_TO_COMPLY' | null;
  suspensionReason: string | null;
  correctiveActions: string | null;
  appealStatement: string | null;
  contactEmail: string | null;
};

const TRANSITIONS: Record<AccountAppealStatus, readonly AccountAppealStatus[]> = {
  DRAFT: ['READY_TO_SUBMIT'],
  READY_TO_SUBMIT: ['DRAFT', 'SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['DRAFT'],
};

export function canTransitionAppeal(from: AccountAppealStatus, to: AccountAppealStatus) {
  return TRANSITIONS[from].includes(to);
}

export function missingAppealFields(draft: AppealDraft) {
  const missing: string[] = [];
  if (!draft.reason) missing.push('reason');
  if (!draft.suspensionReason?.trim()) missing.push('suspensionReason');
  if (!draft.correctiveActions?.trim()) missing.push('correctiveActions');
  if (!draft.appealStatement?.trim()) missing.push('appealStatement');
  if (!draft.contactEmail?.trim()) missing.push('contactEmail');
  return missing;
}

export function appealCooldownRemaining(lastSubmittedAt: Date | string | null, now = new Date()) {
  if (!lastSubmittedAt) return 0;
  const elapsed = now.getTime() - new Date(lastSubmittedAt).getTime();
  return Math.max(0, APPEAL_RESUBMISSION_COOLDOWN_MS - elapsed);
}
