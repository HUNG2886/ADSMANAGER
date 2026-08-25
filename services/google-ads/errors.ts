export class GoogleAdsError extends Error {
  constructor(public code: string, message: string, public status: number, public requestId?: string | null) { super(message); }
}

export function friendlyGoogleAdsError(status: number, payload: unknown, requestId?: string | null) {
  const raw = JSON.stringify(payload);
  if (status === 401) return new GoogleAdsError('AUTHENTICATION_ERROR', 'Kết nối Google đã hết hạn. Vui lòng kết nối lại.', status, requestId);
  if (status === 403) return new GoogleAdsError('PERMISSION_DENIED', 'Không có quyền truy cập tài khoản Google Ads này.', status, requestId);
  if (status === 404) return new GoogleAdsError('CUSTOMER_NOT_FOUND', 'Không tìm thấy tài khoản Google Ads.', status, requestId);
  if (status === 429 || raw.includes('RESOURCE_EXHAUSTED')) return new GoogleAdsError('RATE_LIMITED', 'Google Ads đang giới hạn tần suất. Hệ thống sẽ tự thử lại.', status, requestId);
  if (status >= 500) return new GoogleAdsError('API_UNAVAILABLE', 'Google Ads tạm thời không khả dụng. Vui lòng thử lại sau.', status, requestId);
  return new GoogleAdsError('GOOGLE_ADS_API_ERROR', 'Google Ads không thể xử lý yêu cầu này.', status, requestId);
}
