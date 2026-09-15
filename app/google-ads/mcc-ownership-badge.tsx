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
    'Khả năng quản lý người dùng tài khoản con qua MCC này',
    'Ability to manage child-account users through this MCC',
  );
  return <span className={`ga-mcc-role ${className}`} title={title}>{label}</span>;
}
