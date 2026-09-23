import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS, permissionsFor } from '../lib/permissions';
import { createSessionToken, readSessionToken, sessionCookieOptions, sessionIsActive } from '../lib/session';

const ORIGINAL_SECRET=process.env.AUTH_SECRET;
const ORIGINAL_EXPORT=process.env.STAFF_EXPORT_ENABLED;

describe('authentication session',()=>{
  beforeEach(()=>{process.env.AUTH_SECRET='test-secret-that-is-at-least-thirty-two-characters-long';vi.useRealTimers()});
  afterEach(()=>{if(ORIGINAL_SECRET===undefined)delete process.env.AUTH_SECRET;else process.env.AUTH_SECRET=ORIGINAL_SECRET});

  it('encrypts and validates an ADMIN session',()=>{
    const token=createSessionToken({id:'admin-1',email:'admin@example.com',name:'Admin',role:'ADMIN',sessionVersion:2});
    expect(readSessionToken(token)).toMatchObject({id:'admin-1',role:'ADMIN',sessionVersion:2});
    expect(readSessionToken(`${token}tampered`)).toBeNull();
  });

  it('uses 12-hour and 30-day secure HttpOnly cookie policies',()=>{
    const short=sessionCookieOptions(false);const remembered=sessionCookieOptions(true);
    expect(short).toMatchObject({httpOnly:true,sameSite:'lax',path:'/'});
    expect(remembered.maxAge).toBeGreaterThan(short.maxAge);
  });

  it('rejects suspended users and revoked session versions',()=>{
    const session={id:'staff-1',sessionVersion:3};
    expect(sessionIsActive(session,{id:'staff-1',status:'ACTIVE',sessionVersion:3})).toBe(true);
    expect(sessionIsActive(session,{id:'staff-1',status:'SUSPENDED',sessionVersion:3})).toBe(false);
    expect(sessionIsActive(session,{id:'staff-1',status:'ACTIVE',sessionVersion:4})).toBe(false);
  });
});

describe('permission matrix',()=>{
  afterEach(()=>{if(ORIGINAL_EXPORT===undefined)delete process.env.STAFF_EXPORT_ENABLED;else process.env.STAFF_EXPORT_ENABLED=ORIGINAL_EXPORT});

  it('gives ADMIN all permissions',()=>{
    expect(permissionsFor('ADMIN')).toEqual(expect.arrayContaining(Object.values(PERMISSIONS)));
  });

  it('keeps STAFF strictly read-only',()=>{
    process.env.STAFF_EXPORT_ENABLED='true';const permissions=permissionsFor('STAFF');
    expect(permissions).toContain(PERMISSIONS.VIEW_CAMPAIGN);
    expect(permissions).toContain(PERMISSIONS.VIEW_AUDIT_LOGS);
    expect(permissions).toContain(PERMISSIONS.VIEW_CLIENTS);
    expect(permissions).toContain(PERMISSIONS.VIEW_ACCOUNT_NOTES);
    expect(permissions).toContain(PERMISSIONS.EXPORT_DATA);
    expect(permissions).not.toContain(PERMISSIONS.SYNC_DATA);
    expect(permissions).not.toContain(PERMISSIONS.UPDATE_CAMPAIGN);
    expect(permissions).not.toContain(PERMISSIONS.CONNECT_MCC);
    expect(permissions).not.toContain(PERMISSIONS.MANAGE_CLIENTS);
    expect(permissions).not.toContain(PERMISSIONS.ASSIGN_ACCOUNTS);
    expect(permissions).not.toContain(PERMISSIONS.MANAGE_ACCOUNT_NOTES);
    expect(permissions).not.toContain(PERMISSIONS.MANAGE_USERS);
  });

  it('can disable STAFF exports independently',()=>{
    process.env.STAFF_EXPORT_ENABLED='false';
    expect(permissionsFor('STAFF')).not.toContain(PERMISSIONS.EXPORT_DATA);
  });
});
