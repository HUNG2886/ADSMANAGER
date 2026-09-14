import { GoogleAdsClient, normalizeCustomerId } from './client';

export type GoogleAdsUserAccessRole = 'ADMIN' | 'STANDARD' | 'READ_ONLY' | 'EMAIL_ONLY' | 'UNKNOWN';
export type ShareableGoogleAdsRole = 'STANDARD' | 'READ_ONLY';

type UserAccessRow = {
  customerUserAccess?: {
    emailAddress?: string;
    accessRole?: GoogleAdsUserAccessRole;
  };
};

type SearchResponse = { results?: UserAccessRow[]; nextPageToken?: string };
type InvitationResponse = {
  result?: { resourceName?: string; multiPartyAuthReview?: string };
};

export class UserAccessService {
  constructor(private client: GoogleAdsClient) {}

  async findAccessRole(customerId: string, emailAddress: string) {
    const id = normalizeCustomerId(customerId);
    const expectedEmail = emailAddress.trim().toLowerCase();
    let pageToken: string | undefined;
    do {
      const payload: SearchResponse = await this.client.request(`/customers/${id}/googleAds:search`, {
        method: 'POST',
        body: JSON.stringify({
          query: 'SELECT customer_user_access.email_address, customer_user_access.access_role FROM customer_user_access',
          pageToken,
        }),
      });
      const match = (payload.results ?? [])
        .map(row => row.customerUserAccess)
        .find(access => access?.emailAddress?.trim().toLowerCase() === expectedEmail);
      if (match?.accessRole) return match.accessRole;
      pageToken = payload.nextPageToken;
    } while (pageToken);
    return null;
  }

  invite(customerId: string, emailAddress: string, accessRole: ShareableGoogleAdsRole) {
    const id = normalizeCustomerId(customerId);
    return this.client.request<InvitationResponse>(`/customers/${id}/customerUserAccessInvitations:mutate`, {
      method: 'POST',
      body: JSON.stringify({
        operation: {
          create: {
            emailAddress: emailAddress.trim().toLowerCase(),
            accessRole,
          },
        },
      }),
    });
  }
}
