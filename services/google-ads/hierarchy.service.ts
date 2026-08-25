import { GoogleAdsClient, normalizeCustomerId } from './client';
import { mapWithConcurrency } from '../../lib/concurrency';
import { CustomerService, type GoogleCustomer, type GoogleCustomerClient } from './customer.service';
import { MccService } from './mcc.service';
import { logGoogleAds } from './safe-logger';

export type HierarchyMcc = {
  customerId: string;
  parentCustomerId: string | null;
  loginCustomerId: string;
  manager: boolean;
  level: number;
  name: string;
  currency: string | null;
  timezone: string | null;
  status: string;
  testAccount: boolean;
};

export type HierarchyAccount = HierarchyMcc & { parentManagerCustomerId: string };

function snapshot(value: GoogleCustomer | GoogleCustomerClient, fallbackId: string, input: { parentCustomerId: string | null; loginCustomerId: string; level: number }): HierarchyMcc {
  const clientCustomer='clientCustomer' in value?value.clientCustomer:undefined;
  return {
    customerId: normalizeCustomerId(String(value.id || clientCustomer || fallbackId)),
    parentCustomerId: input.parentCustomerId,
    loginCustomerId: normalizeCustomerId(input.loginCustomerId),
    manager: Boolean(value.manager),
    level: input.level,
    name: value.descriptiveName || `Customer ${normalizeCustomerId(fallbackId)}`,
    currency: value.currencyCode || null,
    timezone: value.timeZone || null,
    status: value.status || 'UNKNOWN',
    testAccount: Boolean(value.testAccount),
  };
}

export class HierarchyService {
  constructor(private accessToken: string, private developerToken: string) {}

  async discover(onAccessibleCustomers?:(customerIds:string[])=>void) {
    const baseClient = new GoogleAdsClient({ accessToken: this.accessToken, developerToken: this.developerToken });
    const resourceNames = await new MccService(baseClient).listAccessibleCustomers();
    const accessibleCustomerIds=(resourceNames.resourceNames??[]).map(normalizeCustomerId).filter(Boolean);
    logGoogleAds('accessible_customers_listed',{accessibleCustomerIds});
    onAccessibleCustomers?.(accessibleCustomerIds);
    const mccs: HierarchyMcc[] = [];
    const accounts: HierarchyAccount[] = [];

    await mapWithConcurrency(resourceNames.resourceNames ?? [], 3, async resourceName => {
      const rootId = normalizeCustomerId(resourceName);
      logGoogleAds('accessible_customer_probe',{clientCustomerId:rootId,loginCustomerId:null});
      const root = await new CustomerService(baseClient).getCustomer(rootId);
      if (!root) return;

      if (!root.manager) {
        const direct = snapshot(root, rootId, { parentCustomerId: null, loginCustomerId: rootId, level: 0 });
        mccs.push(direct);
        accounts.push({ ...direct, parentManagerCustomerId: direct.customerId });
        return;
      }

      const rootMcc = snapshot(root, rootId, { parentCustomerId: null, loginCustomerId: rootId, level: 0 });
      mccs.push(rootMcc);
      const queue = [rootMcc];
      const visited = new Set<string>();

      while (queue.length) {
        const manager = queue.shift()!;
        if (visited.has(manager.customerId)) continue;
        visited.add(manager.customerId);
        const managerClient = new GoogleAdsClient({ accessToken: this.accessToken, developerToken: this.developerToken, loginCustomerId: rootId });
        logGoogleAds('hierarchy_manager_query',{mccCustomerId:manager.customerId,clientCustomerId:manager.customerId,loginCustomerId:rootId});
        const children = await new CustomerService(managerClient).listImmediateClients(manager.customerId);
        for (const child of children) {
          const childId = normalizeCustomerId(String(child.id || child.clientCustomer || ''));
          if (!childId || childId === manager.customerId || Number(child.level ?? 0) !== 1) continue;
          const item = snapshot(child, childId, { parentCustomerId: manager.customerId, loginCustomerId: rootId, level: manager.level + 1 });
          logGoogleAds('hierarchy_child_discovered',{mccCustomerId:manager.customerId,clientCustomerId:childId,loginCustomerId:rootId});
          if (item.manager) {
            mccs.push(item);
            queue.push(item);
          } else {
            accounts.push({ ...item, parentManagerCustomerId: manager.customerId });
          }
        }
      }
    });

    return {
      accessibleCustomerIds,
      mccs: [...new Map(mccs.map(item => [item.customerId, item])).values()],
      accounts: [...new Map(accounts.map(item => [`${item.parentManagerCustomerId}:${item.customerId}`, item])).values()],
    };
  }
}
