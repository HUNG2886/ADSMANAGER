import { GoogleAdsClient, normalizeCustomerId } from './client';

export type GoogleCustomer = {
  id: string;
  descriptiveName?: string;
  currencyCode?: string;
  timeZone?: string;
  status?: string;
  manager?: boolean;
  testAccount?: boolean;
};

export type GoogleCustomerClient = GoogleCustomer & { clientCustomer?: string; level?: string | number };
type SearchResult<T> = { results?: T[]; nextPageToken?: string };

export class CustomerService {
  constructor(private client: GoogleAdsClient) {}

  async getCustomer(customerId: string) {
    const id = normalizeCustomerId(customerId);
    const payload = await this.client.request<SearchResult<{ customer?: GoogleCustomer }>>(`/customers/${id}/googleAds:search`, {
      method: 'POST',
      body: JSON.stringify({ query: 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.status, customer.manager, customer.test_account FROM customer LIMIT 1' }),
    });
    return payload.results?.[0]?.customer ?? null;
  }

  async listImmediateClients(managerCustomerId: string) {
    const id = normalizeCustomerId(managerCustomerId);
    const payload = await this.client.request<SearchResult<{ customerClient?: GoogleCustomerClient }>>(`/customers/${id}/googleAds:search`, {
      method: 'POST',
      body: JSON.stringify({
        query: 'SELECT customer_client.id, customer_client.client_customer, customer_client.descriptive_name, customer_client.currency_code, customer_client.time_zone, customer_client.status, customer_client.manager, customer_client.level, customer_client.test_account FROM customer_client WHERE customer_client.level <= 1',
        pageSize: 10_000,
      }),
    });
    return (payload.results ?? []).map(item => item.customerClient).filter((item): item is GoogleCustomerClient => Boolean(item));
  }
}
