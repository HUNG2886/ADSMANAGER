import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';
import { hasPostgres, prisma } from '@/lib/prisma';
import { requireDev } from '@/lib/rbac';

const password = z.string().min(6).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/);
const identifier = z.string().trim().min(3).max(180).transform(value => value.toLowerCase()).refine(value => z.string().email().safeParse(value).success || /^[a-z0-9._-]+$/.test(value));
const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: identifier,
  password,
  role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
  status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE'),
});
const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(100).optional(),
  email: identifier.optional(),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  password: password.optional(),
  mccIds: z.array(z.string().min(1)).max(100).optional(),
});

export async function GET() {
  const access = await requireDev();
  if (access.error) return access.error;
  if (!hasPostgres()) {
    return ok({
      items: [{ id: access.user.id, name: access.user.name, email: access.user.email, role: 'DEV', status: 'ACTIVE', lastLoginAt: null, createdAt: null, mccIds: [], hasPassword: true }],
      databaseConfigured: false,
    });
  }
  const items = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      passwordHash: true,
      lastLoginAt: true,
      createdAt: true,
      mccPermissions: { select: { mccId: true } },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  return ok({
    items: items.map(({ passwordHash, ...item }) => ({
      ...item,
      hasPassword: Boolean(passwordHash),
      mccIds: item.mccPermissions.map(permission => permission.mccId),
    })),
    databaseConfigured: true,
  });
}

export async function POST(request: Request) {
  const access = await requireDev();
  if (access.error) return access.error;
  if (!hasPostgres()) return fail('DATABASE_REQUIRED', 'Hãy cấu hình DATABASE_URL để lưu tài khoản.', 503);
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Thông tin tài khoản chưa hợp lệ. Mật khẩu cần ít nhất 6 ký tự, gồm chữ và số.', 422);
  if (await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })) return fail('EMAIL_EXISTS', 'Email hoặc tên đăng nhập này đã tồn tại.', 409);
  const { password: plainPassword, ...data } = parsed.data;
  const user = await prisma.user.create({
    data: { ...data, passwordHash: await hashPassword(plainPassword) },
    select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, createdAt: true },
  });
  await writeAudit({
    userId: access.user.id,
    userEmail: access.user.email,
    userName: access.user.name,
    action: 'CREATE_USER',
    entityType: 'User',
    entityId: user.id,
    metadata: { email: user.email, role: user.role, status: user.status },
  });
  return ok({ ...user, mccIds: [], hasPassword: true }, 201);
}

export async function PATCH(request: Request) {
  const access = await requireDev();
  if (access.error) return access.error;
  if (!hasPostgres()) return fail('DATABASE_REQUIRED', 'Hãy cấu hình DATABASE_URL để cập nhật tài khoản.', 503);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Thông tin cập nhật không hợp lệ.', 422);
  const current = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!current) return fail('NOT_FOUND', 'Không tìm thấy tài khoản.', 404);
  if (current.role === 'DEV') return fail('DEV_ACCOUNT_PROTECTED', 'Tài khoản DEV chỉ được quản lý bằng biến môi trường triển khai.', 403);
  if (parsed.data.mccIds && (parsed.data.role ?? current.role) !== 'STAFF') return fail('STAFF_MCC_ONLY', 'Chỉ tài khoản STAFF mới được gán quyền MCC.', 422);
  if (parsed.data.email && parsed.data.email !== current.email && await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })) return fail('EMAIL_EXISTS', 'Email hoặc tên đăng nhập này đã tồn tại.', 409);
  if (parsed.data.mccIds) {
    const validMccCount = await prisma.mCC.count({ where: { id: { in: parsed.data.mccIds } } });
    if (validMccCount !== new Set(parsed.data.mccIds).size) return fail('MCC_NOT_FOUND', 'Một hoặc nhiều MCC không tồn tại.', 404);
  }

  const emailChanged = Boolean(parsed.data.email && parsed.data.email !== current.email);
  const roleChanged = Boolean(parsed.data.role && parsed.data.role !== current.role);
  const statusChanged = Boolean(parsed.data.status && parsed.data.status !== current.status);
  const invalidate = Boolean(parsed.data.password || emailChanged || roleChanged || statusChanged);
  const user = await prisma.$transaction(async tx => {
    const updated = await tx.user.update({
      where: { id: current.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        status: parsed.data.status,
        passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
        googleSubject: emailChanged ? null : undefined,
        image: emailChanged ? null : undefined,
        sessionVersion: invalidate ? { increment: 1 } : undefined,
      },
      select: { id: true, name: true, email: true, role: true, status: true, passwordHash: true, lastLoginAt: true, createdAt: true },
    });
    if (parsed.data.mccIds) {
      await tx.userMCCPermission.deleteMany({ where: { userId: current.id } });
      if (parsed.data.mccIds.length) await tx.userMCCPermission.createMany({ data: parsed.data.mccIds.map(mccId => ({ userId: current.id, mccId })) });
    }
    return updated;
  });
  const action = statusChanged && parsed.data.status === 'SUSPENDED' ? 'SUSPEND_USER' : statusChanged && parsed.data.status === 'ACTIVE' ? 'ACTIVATE_USER' : roleChanged ? 'CHANGE_ROLE' : parsed.data.password ? 'RESET_PASSWORD' : 'UPDATE_USER';
  await writeAudit({
    userId: access.user.id,
    userEmail: access.user.email,
    userName: access.user.name,
    action,
    entityType: 'User',
    entityId: user.id,
    metadata: { role: user.role, status: user.status, emailChanged },
  });
  const { passwordHash, ...safeUser } = user;
  return ok({ ...safeUser, hasPassword: Boolean(passwordHash), mccIds: parsed.data.mccIds });
}

export async function DELETE(request: Request) {
  const access = await requireDev();
  if (access.error) return access.error;
  if (!hasPostgres()) return fail('DATABASE_REQUIRED', 'Hãy cấu hình DATABASE_URL để xóa tài khoản.', 503);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('INVALID_ARGUMENT', 'Thiếu user id.', 422);
  if (id === access.user.id) return fail('SELF_PROTECTION', 'Bạn không thể xóa tài khoản đang đăng nhập.', 409);
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, status: true } });
  if (!target) return fail('NOT_FOUND', 'Không tìm thấy tài khoản.', 404);
  if (target.role === 'DEV') return fail('DEV_ACCOUNT_PROTECTED', 'Không thể xóa tài khoản DEV khỏi trang quản trị.', 403);
  const ownedConnections = await prisma.googleConnection.count({ where: { userId: id } });
  if (ownedConnections > 0) return fail('USER_OWNS_GOOGLE_DATA', 'Tài khoản này đang sở hữu kết nối Google Ads. Hãy đình chỉ tài khoản thay vì xóa để bảo toàn dữ liệu MCC.', 409);
  await prisma.user.delete({ where: { id } });
  await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: 'DELETE_USER', entityType: 'User', entityId: id, metadata: { email: target.email, role: target.role } });
  return ok({ id });
}
