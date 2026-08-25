# Ads Manager Pro

Ứng dụng Next.js quản lý tập trung nhiều Google Ads Manager Accounts (MCC), customer accounts, campaigns, metrics và phân quyền STAFF. Giao diện production chỉ đọc dữ liệu đã đồng bộ từ Google Ads API; không trả dữ liệu mẫu.

## Chạy local

1. Sao chép `.env.example` thành `.env` và điền cấu hình.
2. Chạy `npm install`, `npm run dev`.
3. Kiểm tra bằng `npm run lint`, `npm test`, `npm run build`.
4. Database: `npm run prisma:validate`, `npx prisma migrate deploy`, `npx prisma db seed`.
5. Worker: `npm run worker` với `REDIS_URL` và `WORKER_CONCURRENCY`.

## Hai lớp đăng nhập độc lập

- Website login (`/login`) dùng bảng `User`, mật khẩu Argon2id, `AUTH_SECRET` và cookie phiên mã hoá. Google Sign-In là tuỳ chọn thứ hai nhưng chỉ chấp nhận email đã được ADMIN cấp trong `User`; không tự tạo user hay nâng role.
- Google Ads connection (`/google-ads`) dùng Google OAuth. Website không nhận hoặc lưu mật khẩu Gmail.
- Một ADMIN có thể kết nối nhiều Google account. Refresh token được mã hoá AES-256-GCM trước khi lưu PostgreSQL.
- `ADMIN` kết nối/ngắt kết nối/refresh và sửa campaign. `STAFF` chỉ đọc các MCC đã được ADMIN gán.

## Google OAuth và Google Ads API

- Redirect URI: `${NEXTAUTH_URL}/api/auth/google-ads/callback`.
- Redirect URI đăng nhập website tuỳ chọn: `${NEXTAUTH_URL}/api/auth/google/callback`.
- Scope: `openid email https://www.googleapis.com/auth/adwords`.
- Cần Google Cloud OAuth client, Google Ads Developer Token và OAuth app verification trước khi production.
- Google Ads REST service hiện nhắm `v25`, tự retry 429/5xx bằng exponential backoff, gửi `developer-token` và `login-customer-id` đúng chuẩn.
- Refresh token được mã hoá AES-256-GCM bằng `ENCRYPTION_KEY`; token không được trả về frontend hoặc ghi log.
- Sau OAuth, hệ thống gọi `customers:listAccessibleCustomers`, đọc `customer_client` đệ quy với concurrency giới hạn, lưu hierarchy và đặt đúng `login-customer-id` khi gọi qua MCC.
- Nếu Google không trả refresh token ở lần cấp quyền mới, hãy thu hồi quyền của ứng dụng trong Google Account rồi kết nối lại.

## Kiến trúc

```text
Browser -> Next.js Route Handlers -> service layer -> Google Ads REST API
                                  -> PostgreSQL/Prisma

Scheduler/API -> BullMQ/Redis -> workers/worker.ts -> Google Ads API -> PostgreSQL
```

`services/google-ads/` gom OAuth, token refresh, hierarchy, campaigns và metrics. `prisma/schema.prisma` là nguồn schema PostgreSQL. Route API có permission check ở backend; client không được tự gửi `login-customer-id` hoặc connection ID để vượt phạm vi truy cập.

## API chính

`/api/mcc`, `/api/mcc/:id`, `/api/mcc/:id/accounts`, `/api/accounts`, `/api/accounts/:id`, `/api/accounts/:id/campaigns`, `/api/accounts/:id/notes`, `/api/clients`, `/api/clients/:id/assignments`, `/api/campaigns`, `/api/campaigns/:id`, `/api/metrics`, `/api/sync`, `/api/jobs`, `/api/audit-logs`.

Campaign mutations luôn đi qua backend. UI yêu cầu xác nhận, backend kiểm tra user, gọi Google Ads service và ghi audit log.

## Đăng nhập và phân quyền

- `ADMIN`: toàn quyền, bao gồm kết nối MCC, đồng bộ, sửa campaign, cài đặt và quản lý user.
- `STAFF`: chỉ đọc MCC được gán. Quyền xuất CSV có thể tắt bằng `STAFF_EXPORT_ENABLED=false`.
- Session được mã hoá trong cookie `HttpOnly`, `SameSite=Lax`; thời hạn 12 giờ hoặc 30 ngày khi chọn ghi nhớ.
- Mật khẩu mới dùng Argon2id; hash bcrypt cũ chỉ được giữ để nâng cấp tự động sau lần đăng nhập thành công. Khoá user, reset password và đăng xuất tất cả phiên đều thu hồi session cũ.
- Khởi tạo ADMIN/STAFF bằng `DEFAULT_ADMIN_*`, `DEFAULT_STAFF_*` và `npm run db:seed`; không hard-code mật khẩu production.
- Nếu username website không phải email Google, đặt `DEFAULT_ADMIN_GOOGLE_EMAIL` hoặc `DEFAULT_STAFF_GOOGLE_EMAIL` để liên kết lần đăng nhập Google đầu tiên. Sau đó hệ thống khoá liên kết bằng Google subject ID.

## CRM và chi tiêu

- `/google-ads/clients` lưu hồ sơ khách hàng nội bộ và gán Google Ads account đã đồng bộ; không tạo account Ads giả.
- Trang chi tiết account có ghi chú nội bộ, khách hàng được gán và spend hôm nay/hôm qua/7 ngày/tháng theo timezone account.
- STAFF xem CRM và ghi chú trong MCC được gán; chỉ ADMIN được thay đổi.

## Deploy Vercel

1. Import GitHub repository và giữ Framework Preset là **Next.js**. Không đặt Output Directory; Next.js dùng `.next` mặc định.
2. Thêm `AUTH_SECRET`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_STAFF_EMAIL`, `DEFAULT_STAFF_PASSWORD`, `DATABASE_URL`, `DATABASE_SCHEMA=adsmanager` và `NEXTAUTH_URL`. Nếu dùng Google Sign-In, thêm `DEFAULT_ADMIN_GOOGLE_EMAIL`/`DEFAULT_STAFF_GOOGLE_EMAIL` khi identifier website khác email Google.
3. Thêm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DEVELOPER_TOKEN`, `ENCRYPTION_KEY`; tuyệt đối không dùng tiền tố `NEXT_PUBLIC_` cho các biến này.
4. Trong Google Cloud Console, thêm hai redirect URI chính xác: `${NEXTAUTH_URL}/api/auth/google-ads/callback` và `${NEXTAUTH_URL}/api/auth/google/callback`.
5. Build Vercel tự chạy `prisma migrate deploy` và seed idempotent trước khi build Next.js. Seed chỉ upsert hai tài khoản bootstrap theo environment và không tạo duplicate.
6. Build command đã được cố định trong `vercel.json` là `npm run build:vercel`; Output Directory để trống để Vercel dùng `.next`.
