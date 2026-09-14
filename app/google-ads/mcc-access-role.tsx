import { tr, type AppLocale } from '@/lib/i18n';

export function MccAccessRole({ role, locale }: { role: string | null; locale: AppLocale }) {
  const label = role === 'ADMIN'
    ? tr(locale, 'Chủ sở hữu', 'Owner')
    : role === 'STANDARD'
      ? tr(locale, 'Quyền chuẩn', 'Standard')
      : role === 'READ_ONLY'
        ? tr(locale, 'Chỉ đọc', 'Read only')
        : tr(locale, 'Chưa xác định', 'Unknown');
  const className = role === 'ADMIN' ? 'owner' : role === 'STANDARD' ? 'standard' : role === 'READ_ONLY' ? 'readonly' : 'unknown';
  return <span className={`ga-mcc-role ${className}`} title={tr(locale, 'Vai trò của Gmail kết nối trên MCC đăng nhập', 'Role of the connected Gmail on the login MCC')}>{label}</span>;
}
