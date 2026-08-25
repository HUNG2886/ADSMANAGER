import { GoogleAdsClient, normalizeCustomerId } from './client';

export class MccService {
  constructor(private client: GoogleAdsClient) {}
  async listAccessibleCustomers() { return this.client.request<{ resourceNames: string[] }>('/customers:listAccessibleCustomers'); }
  async getManagerHierarchy(managerCustomerId: string) {
    const id = normalizeCustomerId(managerCustomerId);
    return this.client.request<Array<{ results?: unknown[] }>>(`/customers/${id}/googleAds:searchStream`, { method: 'POST', body: JSON.stringify({ query: `SELECT customer_client.client_customer, customer_client.descriptive_name, customer_client.currency_code, customer_client.time_zone, customer_client.status, customer_client.manager, customer_client.level FROM customer_client WHERE customer_client.level <= 1` }) });
  }
}
