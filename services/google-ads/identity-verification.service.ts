import { GoogleAdsClient, normalizeCustomerId } from './client';

export const IDENTITY_VERIFICATION_PROGRAM = 'ADVERTISER_IDENTITY_VERIFICATION' as const;

export type IdentityVerificationStatus =
  | 'NOT_REQUIRED'
  | 'REQUIRED'
  | 'UNSPECIFIED'
  | 'UNKNOWN'
  | 'PENDING_USER_ACTION'
  | 'PENDING_REVIEW'
  | 'SUCCESS'
  | 'FAILURE';

export type IdentityVerificationResult = {
  status: IdentityVerificationStatus;
  startDeadline: string | null;
  completionDeadline: string | null;
  actionUrl: string | null;
  actionUrlExpiration: string | null;
};

type GoogleIdentityVerificationResponse = {
  identityVerification?: Array<{
    verificationProgram?: string;
    identityVerificationRequirement?: {
      verificationStartDeadlineTime?: string;
      verificationCompletionDeadlineTime?: string;
    };
    verificationProgress?: {
      programStatus?: string;
      invitationLinkExpirationTime?: string;
      actionUrl?: string;
    };
  }>;
};

const statuses = new Set<IdentityVerificationStatus>([
  'UNSPECIFIED',
  'UNKNOWN',
  'PENDING_USER_ACTION',
  'PENDING_REVIEW',
  'SUCCESS',
  'FAILURE',
]);

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function safeActionUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export class IdentityVerificationService {
  constructor(private client: GoogleAdsClient) {}

  async get(customerId: string): Promise<IdentityVerificationResult> {
    const normalizedCustomerId = normalizeCustomerId(customerId);
    const payload = await this.client.request<GoogleIdentityVerificationResponse>(
      `/customers/${normalizedCustomerId}/getIdentityVerification`,
    );
    const item = payload.identityVerification?.find(
      verification => !verification.verificationProgram || verification.verificationProgram === IDENTITY_VERIFICATION_PROGRAM,
    );
    if (!item) {
      return {
        status: 'NOT_REQUIRED',
        startDeadline: null,
        completionDeadline: null,
        actionUrl: null,
        actionUrlExpiration: null,
      };
    }

    const rawStatus = item.verificationProgress?.programStatus;
    const status = rawStatus && statuses.has(rawStatus as IdentityVerificationStatus)
      ? rawStatus as IdentityVerificationStatus
      : 'REQUIRED';
    return {
      status,
      startDeadline: text(item.identityVerificationRequirement?.verificationStartDeadlineTime),
      completionDeadline: text(item.identityVerificationRequirement?.verificationCompletionDeadlineTime),
      actionUrl: safeActionUrl(item.verificationProgress?.actionUrl),
      actionUrlExpiration: text(item.verificationProgress?.invitationLinkExpirationTime),
    };
  }

  async start(customerId: string) {
    const normalizedCustomerId = normalizeCustomerId(customerId);
    const current = await this.get(normalizedCustomerId);
    if (current.actionUrl || ['NOT_REQUIRED', 'PENDING_REVIEW', 'SUCCESS'].includes(current.status)) {
      return { ...current, started: false };
    }
    await this.client.request<Record<string, never>>(
      `/customers/${normalizedCustomerId}:startIdentityVerification`,
      {
        method: 'POST',
        body: JSON.stringify({ verificationProgram: IDENTITY_VERIFICATION_PROGRAM }),
      },
    );
    return { ...(await this.get(normalizedCustomerId)), started: true };
  }
}
