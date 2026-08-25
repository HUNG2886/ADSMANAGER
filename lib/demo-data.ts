export type AccountStatus = 'ENABLED' | 'SUSPENDED' | 'CANCELED';
export type CampaignStatus = 'ENABLED' | 'PAUSED' | 'REMOVED';

export const mccs = [
  { id: 'mcc-1', name: 'Orbit Commerce Group', customerId: '123-456-7890', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', accounts: 6, status: 'CONNECTED', lastSync: '2 phút trước' },
  { id: 'mcc-2', name: 'Northstar Digital', customerId: '238-441-9072', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', accounts: 5, status: 'CONNECTED', lastSync: '8 phút trước' },
  { id: 'mcc-3', name: 'Vertex Performance', customerId: '672-105-3384', currency: 'USD', timezone: 'Asia/Singapore', accounts: 5, status: 'CONNECTED', lastSync: '16 phút trước' },
  { id: 'mcc-4', name: 'Beacon Growth Lab', customerId: '890-334-1257', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', accounts: 4, status: 'ACTION_REQUIRED', lastSync: '2 giờ trước' },
];

const accountNames = ['Orion Retail VN','Nova E-commerce','Lumina Finance','Atlas Education','Cedar Homes','Aster Beauty','Mango Travel','Nexa Mobile','Bright Kids','Harbor Logistics','Solace Health','Urban Kitchen','Lotus Fashion','Zenith Auto','Mira Insurance','Cloud Nine','Evergreen Foods','Kite Learning','Pixel Studio','Terra Living'];
export const accounts = accountNames.map((name, index) => ({
  id: `acc-${index + 1}`,
  mccId: `mcc-${(index % 4) + 1}`,
  name,
  customerId: `${218 + index}-${430 + index}-${7751 + index}`,
  status: (index === 8 ? 'SUSPENDED' : index === 17 ? 'CANCELED' : 'ENABLED') as AccountStatus,
  spend: 284_600_000 - index * 8_470_000,
  impressions: 1_820_000 - index * 42_000,
  clicks: 58_420 - index * 1_280,
  conversions: 4218 - index * 137,
}));

const campaignNames = ['PMax | Summer Scale','Search | Brand Core','Shopping | Best Sellers','Demand Gen | Retargeting','Search | Competitors','YouTube | Awareness','PMax | New Customers','Search | High Intent','Display | Remarketing','App | Acquisition','Search | Product A','PMax | Flash Sale'];
export const campaigns = campaignNames.map((name, index) => ({
  id: `camp-${index + 1}`,
  accountId: `acc-${(index % 8) + 1}`,
  campaignId: `${91420830 + index}`,
  name,
  type: name.split(' | ')[0],
  status: (index % 5 === 1 ? 'PAUSED' : 'ENABLED') as CampaignStatus,
  budget: 5_000_000 + index * 750_000,
  spend: 72_400_000 - index * 3_250_000,
  clicks: 14_820 - index * 680,
  impressions: 425_000 - index * 17_500,
  conversions: 920 - index * 43,
}));

export const metrics = Array.from({ length: 30 }, (_, index) => ({
  date: `${String(index + 1).padStart(2, '0')}/08`,
  spend: 31 + Math.round(Math.sin(index / 3) * 7 + index * .65),
  previous: 29 + Math.round(Math.sin((index + 2) / 3) * 5 + index * .45),
  conversions: 420 + Math.round(Math.sin(index / 2.5) * 90 + index * 13),
  clicks: 9200 + Math.round(Math.sin(index / 3) * 1100 + index * 180),
}));

export const jobs = [
  { id: 'JOB-8204', type: 'SYNC_METRICS', target: 'Orbit Commerce Group', progress: 78, status: 'PROCESSING', createdAt: '10:42' },
  { id: 'JOB-8203', type: 'SYNC_CAMPAIGNS', target: 'Northstar Digital', progress: 100, status: 'SUCCESS', createdAt: '10:36' },
  { id: 'JOB-8202', type: 'SYNC_CUSTOMER_ACCOUNT', target: 'Vertex Performance', progress: 35, status: 'PROCESSING', createdAt: '10:31' },
  { id: 'JOB-8201', type: 'EXPORT_METRICS', target: '20 tài khoản', progress: 0, status: 'PENDING', createdAt: '10:28' },
  { id: 'JOB-8200', type: 'SYNC_MCC', target: 'Beacon Growth Lab', progress: 0, status: 'FAILED', createdAt: '09:54' },
];

export const auditLogs = [
  { id: 'log-1', user: 'Hùng Nguyễn', action: 'CAMPAIGN_PAUSED', entity: 'Search | Competitors', time: 'Hôm nay, 10:18', ip: '113.161.••.••' },
  { id: 'log-2', user: 'Hùng Nguyễn', action: 'BUDGET_UPDATED', entity: 'PMax | Summer Scale', time: 'Hôm nay, 09:42', ip: '113.161.••.••' },
  { id: 'log-3', user: 'System Worker', action: 'MCC_SYNCED', entity: 'Orbit Commerce Group', time: 'Hôm nay, 09:30', ip: '—' },
  { id: 'log-4', user: 'Hùng Nguyễn', action: 'DATA_EXPORTED', entity: 'Báo cáo 30 ngày', time: 'Hôm qua, 17:22', ip: '113.161.••.••' },
  { id: 'log-5', user: 'Hùng Nguyễn', action: 'MCC_CONNECTED', entity: 'Beacon Growth Lab', time: 'Hôm qua, 14:06', ip: '113.161.••.••' },
];

export function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + ' đ';
}
