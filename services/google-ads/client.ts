import { friendlyGoogleAdsError } from './errors';

export const GOOGLE_ADS_API_VERSION = 'v25';
const API_ROOT = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export type GoogleAdsClientOptions = { accessToken: string; developerToken: string; loginCustomerId?: string };

export class GoogleAdsClient {
  constructor(private options: GoogleAdsClientOptions) {}

  async request<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${this.options.accessToken}`);
    headers.set('developer-token', this.options.developerToken);
    headers.set('content-type', 'application/json');
    if (this.options.loginCustomerId) headers.set('login-customer-id', normalizeCustomerId(this.options.loginCustomerId));
    const response = await fetch(`${API_ROOT}${path}`, { ...init, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, Math.min(8000, 500 * 2 ** attempt + Math.random() * 250)));
        return this.request<T>(path, init, attempt + 1);
      }
      throw friendlyGoogleAdsError(response.status, payload, response.headers.get('request-id'));
    }
    return payload as T;
  }
}

export function normalizeCustomerId(value: string) { return value.replace(/\D/g, ''); }

export async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID; const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Thiếu cấu hình Google OAuth.');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  if (!response.ok) throw new Error('Không thể làm mới kết nối Google.');
  return response.json() as Promise<{ access_token: string; expires_in: number; token_type: string }>;
}
