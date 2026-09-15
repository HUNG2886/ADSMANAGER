import { GoogleAdsClient, normalizeCustomerId } from './client';

export type GoogleAdsUserAccessRole = 'ADMIN' | 'STANDARD' | 'READ_ONLY' | 'EMAIL_ONLY' | 'UNKNOWN';
export type ShareableGoogleAdsRole = 'STANDARD' | 'READ_ONLY';
export type GoogleAdsUserAccess = {
  userId: string;
  resourceName: string;
  emailAddress: string;
  accessRole: GoogleAdsUserAccessRole;
};

type UserAccessRow = {
  customerUserAccess?: {
    userId?: string;
    resourceName?: string;
    emailAddress?: string;
    accessRole?: GoogleAdsUserAccessRole;
  };
};

type SearchResponse = { results?: UserAccessRow[]; nextPageToken?: string };
type InvitationResponse = {
  result?: { resourceName?: string; multiPartyAuthReview?: string };
};
type UserAccessMutationResponse = {
  result?: { resourceName?: string; multiPartyAuthReview?: string };
};

export class UserAccessService {
  constructor(private client: GoogleAdsClient) {}

  async canManageCustomerUsers(customerId: string) {
    const id = normalizeCustomerId(customerId);
    await this.client.request(`/customers/${id}/googleAds:search`, {
      method: 'POST',
      body: JSON.stringify({
        query: 'SELECT customer_user_access.resource_name FROM customer_user_access LIMIT 1',
      }),
    });
    return true;
  }

  async findAccessRole(customerId: string, emailAddress: string) {
    const match = (await this.list(customerId))
      .find(access => access.emailAddress.toLowerCase() === emailAddress.trim().toLowerCase());
    return match?.accessRole ?? null;
  }

  async list(customerId: string) {
    const id = normalizeCustomerId(customerId);
    const users: GoogleAdsUserAccess[] = [];
    let pageToken: string | undefined;
    do {
      const payload: SearchResponse = await this.client.request(`/customers/${id}/googleAds:search`, {
        method: 'POST',
        body: JSON.stringify({
          query: 'SELECT customer_user_access.user_id, customer_user_access.resource_name, customer_user_access.email_address, customer_user_access.access_role FROM customer_user_access',
          pageToken,
        }),
      });
      users.push(...(payload.results ?? []).flatMap(row => {
        const access = row.customerUserAccess;
        if (!access?.userId || !access.resourceName || !access.emailAddress || !access.accessRole) return [];
        return [{
          userId: String(access.userId),
          resourceName: access.resourceName,
          emailAddress: access.emailAddress.trim().toLowerCase(),
          accessRole: access.accessRole,
        }];
      }));
      pageToken = payload.nextPageToken;
    } while (pageToken);
    return users;
  }

  async remove(customerId: string, resourceName: string) {
    const id = normalizeCustomerId(customerId);
    const prefix = `customers/${id}/customerUserAccesses/`;
    if (!resourceName.startsWith(prefix) || resourceName.slice(prefix.length).includes('/')) {
      throw new Error('Invalid customer user access resource name.');
    }
    return this.client.request<UserAccessMutationResponse>(`/customers/${id}/customerUserAccesses:mutate`, {
      method: 'POST',
      body: JSON.stringify({ operation: { remove: resourceName } }),
    });
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
