import { z } from 'zod';
import { apiUser, fail, ok } from '@/lib/api';
import { hashPassword } from '@/lib/auth';
import { hasPostgres, prisma } from '@/lib/prisma';

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(180).transform(value => value.trim().toLowerCase()),
  password: z.string().min(10).max(200).regex(/[a-zA-Z]/).regex(/[0-9]/),
  role: z.enum(['ADMIN', 'COLLABORATOR']).default('COLLABORATOR'),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['ADMIN', 'COLLABORATOR']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(10).max(200).regex(/[a-zA-Z]/).regex(/[0-9]/).optional(),
});

async function admin() {
  const user = await apiUser();
  if (!user) return { error: fail('UNAUTHORIZED', 'Vui lòng đăng nhập.', 401) };
  if (user.role !== 'ADMIN') return { error: fail('FORBIDDEN', 'Chỉ quản trị viên được quản lý thành viên.', 403) };
  return { user };
}

export async function GET() {
  const access = await admin(); if ('error' in access) return access.error;
  if (!hasPostgres()) return ok({ items: [{ id: access.user.id, name: access.user.name, email: access.user.email, role: 'ADMIN', isActive: true, lastLoginAt: null }], databaseConfigured: false });
  const items = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }, orderBy: [{ role: 'asc' }, { createdAt: 'asc' }] });
  return ok({ items: items.map(item => ({ ...item, role: item.role === 'ADMIN' || item.role === 'SUPER_ADMIN' ? 'ADMIN' : 'COLLABORATOR' })), databaseConfigured: true });
}

export async function POST(request: Request) {
  const access = await admin(); if ('error' in access) return access.error;
  if (!hasPostgres()) return fail('DATABASE_REQUIRED', 'Hãy cấu hình DATABASE_URL để lưu tài khoản cộng tác viên.', 503);
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Thông tin thành viên chưa hợp lệ. Mật khẩu cần ít nhất 10 ký tự, gồm chữ và số.', 422);
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return fail('EMAIL_EXISTS', 'Email này đã có tài khoản.', 409);
  const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash: hashPassword(parsed.data.password), role: parsed.data.role, isActive: true }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } });
  return ok({ ...user, role: user.role === 'ADMIN' ? 'ADMIN' : 'COLLABORATOR' }, 201);
}

export async function PATCH(request: Request) {
  const access = await admin(); if ('error' in access) return access.error;
  if (!hasPostgres()) return fail('DATABASE_REQUIRED', 'Hãy cấu hình DATABASE_URL để cập nhật thành viên.', 503);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Thông tin cập nhật không hợp lệ.', 422);
  if (parsed.data.id === access.user.id && (parsed.data.isActive === false || parsed.data.role === 'COLLABORATOR')) return fail('SELF_PROTECTION', 'Bạn không thể tự khóa hoặc hạ quyền tài khoản đang đăng nhập.', 409);
  const user = await prisma.user.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name, role: parsed.data.role, isActive: parsed.data.isActive, passwordHash: parsed.data.password ? hashPassword(parsed.data.password) : undefined }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } }).catch(() => null);
  if (!user) return fail('NOT_FOUND', 'Không tìm thấy thành viên.', 404);
  return ok({ ...user, role: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'ADMIN' : 'COLLABORATOR' });
}
