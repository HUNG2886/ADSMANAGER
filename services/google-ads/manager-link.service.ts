import { GoogleAdsClient, normalizeCustomerId } from './client';

export type ManagerLinkStatus = 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'REFUSED' | 'CANCELED' | 'UNKNOWN';

type CustomerClientLinkRow = {
  customerClientLink?: {
    resourceName?: string;
    clientCustomer?: string;
    managerLinkId?: string;
    status?: ManagerLinkStatus;
  };
};

type SearchResponse = { results?: CustomerClientLinkRow[]; nextPageToken?: string };
type MutateClientLinkResponse = { result?: { resourceName?: string } };
type MutateManagerLinkResponse = { results?: Array<{ resourceName?: string }> };

export type ManagerLinkSnapshot = {
  resourceName: string;
  managerLinkId: string;
  status: ManagerLinkStatus;
};

function managerLinkIdFromResource(resourceName: string) {
  const separator = resourceName.lastIndexOf('~');
  return separator >= 0 ? resourceName.slice(separator + 1) : '';
}

export class ManagerLinkService {
  constructor(private client: GoogleAdsClient) {}

  async list(managerCustomerId: string, clientCustomerId: string) {
    const managerId = normalizeCustomerId(managerCustomerId);
    const clientId = normalizeCustomerId(clientCustomerId);
    const links: ManagerLinkSnapshot[] = [];
    let pageToken: string | undefined;
    do {
      const payload: SearchResponse = await this.client.request(`/customers/${managerId}/googleAds:search`, {
        method: 'POST',
        body: JSON.stringify({
          query: `SELECT customer_client_link.resource_name, customer_client_link.client_customer, customer_client_link.manager_link_id, customer_client_link.status FROM customer_client_link WHERE customer_client_link.client_customer = 'customers/${clientId}'`,
          pageToken,
        }),
      });
      links.push(...(payload.results ?? []).flatMap(row => {
        const link = row.customerClientLink;
        if (!link?.resourceName || !link.managerLinkId) return [];
        return [{
          resourceName: link.resourceName,
          managerLinkId: String(link.managerLinkId),
          status: link.status ?? 'UNKNOWN',
        }];
      }));
      pageToken = payload.nextPageToken;
    } while (pageToken);
    return links;
  }

  async ensureInvitation(managerCustomerId: string, clientCustomerId: string) {
    const managerId = normalizeCustomerId(managerCustomerId);
    const clientId = normalizeCustomerId(clientCustomerId);
    const links = await this.list(managerId, clientId);
    const current = links.find(link => link.status === 'ACTIVE') ?? links.find(link => link.status === 'PENDING');
    if (current) return { ...current, created: false };

    const response = await this.client.request<MutateClientLinkResponse>(`/customers/${managerId}/customerClientLinks:mutate`, {
      method: 'POST',
      body: JSON.stringify({
        operation: {
          create: {
            clientCustomer: `customers/${clientId}`,
            status: 'PENDING',
          },
        },
      }),
    });
    const resourceName = response.result?.resourceName ?? '';
    const managerLinkId = managerLinkIdFromResource(resourceName);
    if (!resourceName || !managerLinkId) throw new Error('Google Ads did not return the manager link resource name.');
    return { resourceName, managerLinkId, status: 'PENDING' as const, created: true };
  }

  async acceptInvitation(clientCustomerId: string, managerCustomerId: string, managerLinkId: string) {
    const clientId = normalizeCustomerId(clientCustomerId);
    const managerId = normalizeCustomerId(managerCustomerId);
    const linkId = managerLinkId.replace(/\D/g, '');
    if (!linkId) throw new Error('Invalid Google Ads manager link ID.');
    const resourceName = `customers/${clientId}/customerManagerLinks/${managerId}~${linkId}`;
    return this.client.request<MutateManagerLinkResponse>(`/customers/${clientId}/customerManagerLinks:mutate`, {
      method: 'POST',
      body: JSON.stringify({
        operations: [{
          update: { resourceName, status: 'ACTIVE' },
          updateMask: 'status',
        }],
      }),
    });
  }
}
