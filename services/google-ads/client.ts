import { parseGoogleAdsError } from './errors';
import { logGoogleAds } from './safe-logger';

export const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v25';

export type GoogleAdsClientOptions = { accessToken: string; developerToken: string; loginCustomerId?: string };

export class GoogleAdsClient {
  constructor(private options: GoogleAdsClientOptions) {}

  async request<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${this.options.accessToken}`);
    headers.set('developer-token', this.options.developerToken);
    headers.set('content-type', 'application/json');
    if (this.options.loginCustomerId) headers.set('login-customer-id', normalizeCustomerId(this.options.loginCustomerId));
    const response = await fetch(`https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}${path}`, { ...init, headers, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, Math.min(8000, 500 * 2 ** attempt + Math.random() * 250)));
        return this.request<T>(path, init, attempt + 1);
      }
      const error=parseGoogleAdsError(response.status,payload,response.headers.get('request-id'));
      logGoogleAds('api_request_failed',{requestPath:path,loginCustomerId:this.options.loginCustomerId,apiVersion:GOOGLE_ADS_API_VERSION,error},'error');
      throw error;
    }
    return payload as T;
  }
}

export function normalizeCustomerId(value: string) { return value.replace(/\D/g, ''); }
