import { Search, Zap } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { allowedMccIds } from '@/lib/data-access';
import { formatCustomerId, formatMoney } from '@/lib/google-ads-format';
import { dateLocale, tr } from '@/lib/i18n';
import { getAppLocale } from '@/lib/i18n-server';
import { prisma } from '@/lib/prisma';
import { CampaignActions } from '../campaign-actions';

type CampaignQuery = { q?: string };

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<CampaignQuery>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/google-ads/campaigns');

  const query = await searchParams;
  const search = query.q?.trim().slice(0, 200) || '';
  const locale = await getAppLocale();
  const numberLocale = dateLocale(locale);
  const allowed = await allowedMccIds(user);
  const campaigns = await prisma.campaign.findMany({
    where: {
      AND: [
        { customerAccount: { mcc: allowed === null ? {} : { id: { in: allowed } } } },
        search ? { name: { contains: search, mode: 'insensitive' } } : {},
      ],
    },
    include: { customerAccount: { include: { mcc: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 1000,
  });
  const totals = campaigns.length
    ? await prisma.dailyMetric.groupBy({
        by: ['campaignId'],
        where: { campaignId: { in: campaigns.map((campaign) => campaign.id) } },
        _sum: { cost: true },
      })
    : [];
  const spendByCampaign = new Map(
    totals.map((item) => [item.campaignId, Number(item._sum.cost || 0)]),
  );

  return (
    <>
      <div className="ga-page-head">
        <div>
          <p>GOOGLE ADS</p>
          <h1>{tr(locale, 'Chiến dịch', 'Campaigns')}</h1>
          <span>
            {tr(
              locale,
              'ADMIN có thể tạm dừng, bật và cập nhật ngân sách; STAFF chỉ đọc.',
              'ADMIN can pause, enable, and update budgets; STAFF is read-only.',
            )}
          </span>
        </div>
      </div>

      <form className="ga-filters">
        <label>
          <Search size={14} />
          <input
            name="q"
            defaultValue={search}
            placeholder={tr(locale, 'Tìm theo tên chiến dịch', 'Search by campaign name')}
          />
        </label>
        <button>{tr(locale, 'Tìm kiếm', 'Search')}</button>
        {search && (
          <a className="ga-filter-clear" href="/google-ads/campaigns">
            {tr(locale, 'Xóa tìm kiếm', 'Clear search')}
          </a>
        )}
      </form>

      {campaigns.length === 0 ? (
        <section className="ga-empty">
          <Zap size={28} />
          <h2>
            {search
              ? tr(locale, 'Không tìm thấy chiến dịch', 'No matching campaigns')
              : tr(locale, 'Chưa đồng bộ chiến dịch', 'No campaigns synchronized')}
          </h2>
          <p>
            {search
              ? tr(
                  locale,
                  'Thử tên chiến dịch khác hoặc xóa tìm kiếm.',
                  'Try another campaign name or clear the search.',
                )
              : tr(
                  locale,
                  'Mở một tài khoản để hệ thống đọc chiến dịch và chỉ số thực tế từ Google Ads API.',
                  'Open an account so the system can load real campaigns and metrics from the Google Ads API.',
                )}
          </p>
        </section>
      ) : (
        <section className="ga-panel ga-table-panel">
          <div className="ga-table-wrap">
            <table className="ga-table">
              <thead>
                <tr>
                  <th>{tr(locale, 'Chiến dịch', 'Campaign')}</th>
                  <th>{tr(locale, 'Tài khoản', 'Account')}</th>
                  <th>MCC</th>
                  <th>{tr(locale, 'Trạng thái', 'Status')}</th>
                  <th>{tr(locale, 'Ngân sách', 'Budget')}</th>
                  <th>{tr(locale, 'Tổng chi tiêu đã đồng bộ', 'Total synchronized spend')}</th>
                  <th>{tr(locale, 'Thao tác', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.name}</strong>
                      <small>ID {campaign.campaignId}</small>
                    </td>
                    <td>
                      <a href={`/google-ads/accounts/${campaign.customerAccount.id}`}>
                        {campaign.customerAccount.name}
                      </a>
                      <small>{formatCustomerId(campaign.customerAccount.customerId)}</small>
                    </td>
                    <td>{campaign.customerAccount.mcc.name}</td>
                    <td>
                      <span
                        className={`ga-status ${campaign.status === 'ENABLED' ? 'connected' : 'reauth_required'}`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td>
                      {formatMoney(
                        Number(campaign.budget),
                        campaign.customerAccount.currency || 'VND',
                        numberLocale,
                      )}
                    </td>
                    <td>
                      <strong>
                        {formatMoney(
                          spendByCampaign.get(campaign.id) || 0,
                          campaign.customerAccount.currency || 'VND',
                          numberLocale,
                        )}
                      </strong>
                    </td>
                    <td>
                      {user.role === 'ADMIN' ? (
                        <CampaignActions
                          id={campaign.id}
                          status={campaign.status}
                          budget={Number(campaign.budget)}
                        />
                      ) : (
                        <span className="ga-readonly">{tr(locale, 'Chỉ đọc', 'Read only')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
