import type { NextResponse } from 'next/server';
import { apiUser, fail } from './api';
import { hasPermission, PERMISSIONS, type Permission } from './permissions';

type AccessUser = NonNullable<Awaited<ReturnType<typeof apiUser>>>;
type AccessResult = { user: AccessUser; error?: never } | { user?: never; error: NextResponse };

export async function requireAuth(): Promise<AccessResult> {
  const user = await apiUser();
  return user ? { user } : { error: fail('UNAUTHORIZED', 'Vui lòng đăng nhập.', 401) };
}

export async function requireRole(...roles: AccessUser['role'][]): Promise<AccessResult> {
  const access = await requireAuth();
  if (access.error) return access;
  return roles.includes(access.user.role) ? access : { error: fail('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403) };
}

export function requireAdmin() {
  return requireRole('ADMIN');
}

export function requireReadAccess() {
  return requireRole('ADMIN','STAFF');
}

export async function requirePermission(permission: Permission): Promise<AccessResult> {
  const access = await requireAuth();
  if (access.error) return access;
  return hasPermission(access.user.role, permission) ? access : { error: fail('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403) };
}

export const guards = {
  dashboard: () => requirePermission(PERMISSIONS.VIEW_DASHBOARD),
  admin: requireAdmin,
  read: requireReadAccess,
};
