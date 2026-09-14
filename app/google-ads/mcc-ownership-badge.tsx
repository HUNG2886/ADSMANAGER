import { tr, type AppLocale } from '@/lib/i18n';

export function MccOwnershipBadge({
  hasOwnership,
  errorCode,
  locale,
}: {
  hasOwnership: boolean | null;
  errorCode: string | null;
  locale: AppLocale;
}) {
  const label = hasOwnership === true
    ? tr(locale, 'Có', 'Yes')
    : hasOwnership === false
      ? tr(locale, 'Không', 'No')
      : tr(locale, 'Chưa kiểm tra', 'Not checked');
  const className = hasOwnership === true ? 'owner' : hasOwnership === false ? 'readonly' : 'unknown';
  const title = hasOwnership === null && errorCode
    ? tr(locale, `Không thể kiểm tra: ${errorCode}`, `Unable to check: ${errorCode}`)
    : tr(
        locale,
        'Khả năng quản lý người dùng tài khoản con qua MCC này',
        'Ability to manage child-account users through this MCC',
      );
  return <span className={`ga-mcc-role ${className}`} title={title}>{label}</span>;
}
