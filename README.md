# Ads Manager Pro

MVP quản lý tập trung nhiều Google Ads Manager Accounts (MCC), customer accounts, campaign, metrics, background sync và audit log.

## Hai chế độ chạy

- `DEMO_MODE=true`: dashboard chạy ngay với 3 MCC, 20 accounts, 100 campaigns và 90 ngày metrics do seed tạo ra. UI hiện tại có 4 MCC để minh hoạ thêm trạng thái OAuth cần xử lý.
- Production: web dùng PostgreSQL/Prisma, worker dùng Redis/BullMQ. Bản Sites được host với D1/R2 cho demo vì edge runtime không hỗ trợ raw TCP tới PostgreSQL/Redis; worker production được tách riêng để deploy Railway, Render hoặc VPS.

## Chạy local

1. Sao chép `.env.example` thành `.env` và điền cấu hình.
2. Chạy `npm install`, `npm run dev`.
3. Kiểm tra bằng `npm run lint`, `npm test`, `npm run build`.
4. Production database: `npm run prisma:validate`, migrate Prisma và chạy `prisma/seed.ts` khi cần demo data.
5. Worker: `npm run worker` với `REDIS_URL` và `WORKER_CONCURRENCY`.

## Google OAuth và Google Ads API

- Redirect URI: `${NEXTAUTH_URL}/api/auth/google-ads/callback`.
- Scope: `openid email https://www.googleapis.com/auth/adwords`.
- Cần Google Cloud OAuth client, Google Ads Developer Token và OAuth app verification trước khi production.
- Google Ads REST service hiện nhắm `v25`, tự retry 429/5xx bằng exponential backoff, gửi `developer-token` và `login-customer-id` đúng chuẩn.
- Refresh/access token được mã hoá AES-256-GCM bằng `ENCRYPTION_KEY`; token không được trả về frontend hoặc ghi log.

## Kiến trúc

```text
Browser -> Vinext/Next Route Handlers -> service layer -> Google Ads REST API
                                      -> PostgreSQL/Prisma (production)
                                      -> D1/R2 (hosted demo)

Scheduler/API -> BullMQ/Redis -> workers/worker.ts -> Google Ads API -> PostgreSQL
```

`services/google-ads/` gom toàn bộ request Google Ads. `workers/` giới hạn concurrency, retry, exponential backoff và dedup qua deterministic `jobId`. `db/schema.ts` là schema D1 của hosted demo; `prisma/schema.prisma` là schema PostgreSQL production. Route API có response envelope thống nhất, Zod validation, permission check, rate limit và audit log.

## API chính

`/api/mcc`, `/api/mcc/:id`, `/api/mcc/:id/accounts`, `/api/accounts`, `/api/accounts/:id`, `/api/accounts/:id/campaigns`, `/api/campaigns`, `/api/campaigns/:id`, `/api/metrics`, `/api/sync`, `/api/jobs`, `/api/audit-logs`.

Campaign mutations luôn đi qua backend. UI yêu cầu xác nhận, backend kiểm tra user, gọi Google Ads service và ghi audit log.

## Đăng nhập và phân quyền

- `ADMIN`: toàn quyền, bao gồm kết nối MCC, đồng bộ, sửa campaign, cài đặt và quản lý user.
- `STAFF`: chỉ đọc. Quyền xuất CSV có thể tắt bằng `STAFF_EXPORT_ENABLED=false`.
- Session được mã hoá trong cookie `HttpOnly`, `SameSite=Lax`; thời hạn 12 giờ hoặc 30 ngày khi chọn ghi nhớ.
- Mật khẩu mới dùng Argon2id; hash bcrypt cũ chỉ được giữ để nâng cấp tự động sau lần đăng nhập thành công. Khoá user, reset password và đăng xuất tất cả phiên đều thu hồi session cũ.
- Khởi tạo ADMIN/STAFF bằng `DEFAULT_ADMIN_*`, `DEFAULT_STAFF_*` và `npm run db:seed`; không hard-code mật khẩu production.

## Deploy Vercel

1. Import GitHub repository và giữ Framework Preset là **Next.js**. Không đặt Output Directory; Next.js dùng `.next` mặc định.
2. Thêm tối thiểu `AUTH_SECRET`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_STAFF_EMAIL`, `DEFAULT_STAFF_PASSWORD`, `DATABASE_URL` và `NEXTAUTH_URL` trong Project Settings → Environment Variables.
3. Build Vercel tự chạy `prisma migrate deploy` và seed idempotent trước khi build Next.js. Seed chỉ upsert hai tài khoản bootstrap theo environment, không tạo lại dữ liệu demo.
4. Build command đã được cố định trong `vercel.json` là `npm run build:vercel`; không dùng `vinext build` cho Vercel.
