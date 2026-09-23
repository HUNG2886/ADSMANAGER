import { tr, type AppLocale } from '@/lib/i18n';

export function MccOwnershipBadge({
  hasOwnership,
  locale,
}: {
  hasOwnership: boolean;
  locale: AppLocale;
}) {
  const label = hasOwnership === true
    ? tr(locale, 'Có', 'Yes')
    : tr(locale, 'Không', 'No');
  const className = hasOwnership === true ? 'owner' : 'readonly';
  const title = tr(
    locale,
    'MCC của dòng này có quyền chủ sở hữu (Owner manager) đối với tài khoản con',
    'Whether the MCC on this row is the Owner manager of the child account',
  );
  return <span className={`ga-mcc-role ${className}`} title={title}>{label}</span>;
}
