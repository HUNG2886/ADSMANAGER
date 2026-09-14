import 'server-only';
import { cookies } from 'next/headers';
import { APP_LOCALE_COOKIE, normalizeAppLocale } from './i18n';

export async function getAppLocale() {
  return normalizeAppLocale((await cookies()).get(APP_LOCALE_COOKIE)?.value);
}
