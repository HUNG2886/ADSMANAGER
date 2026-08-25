import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks=vi.hoisted(()=>({
  requireAdmin:vi.fn(), hasPostgres:vi.fn(()=>true), hashPassword:vi.fn(async()=>'$hash'), writeAudit:vi.fn(async()=>undefined),
  findMany:vi.fn(), findUnique:vi.fn(), count:vi.fn(), create:vi.fn(), delete:vi.fn(), txUpdate:vi.fn(), deletePermissions:vi.fn(), createPermissions:vi.fn(), transaction:vi.fn(),
}));

vi.mock('@/lib/rbac',()=>({requireAdmin:mocks.requireAdmin}));
vi.mock('@/lib/auth',()=>({hashPassword:mocks.hashPassword}));
vi.mock('@/lib/audit',()=>({writeAudit:mocks.writeAudit}));
vi.mock('@/lib/prisma',()=>({
  hasPostgres:mocks.hasPostgres,
  prisma:{
    user:{findMany:mocks.findMany,findUnique:mocks.findUnique,count:mocks.count,create:mocks.create,delete:mocks.delete},
    $transaction:mocks.transaction,
  },
}));

import { GET, PATCH, POST } from '../app/api/users/route';

const admin={id:'admin-1',email:'admin@example.com',name:'Admin',role:'ADMIN' as const,sessionVersion:0,demo:true};
const staffRow={id:'staff-1',name:'Staff',email:'staff@example.com',role:'STAFF' as const,status:'ACTIVE' as const,lastLoginAt:null,createdAt:new Date('2026-08-25T00:00:00Z')};

beforeEach(()=>{
  vi.clearAllMocks();mocks.hasPostgres.mockReturnValue(true);mocks.requireAdmin.mockResolvedValue({user:admin});
  mocks.transaction.mockImplementation(async(callback:(tx:unknown)=>unknown)=>callback({user:{update:mocks.txUpdate},userMCCPermission:{deleteMany:mocks.deletePermissions,createMany:mocks.createPermissions}}));
});

describe('ADMIN user management API',()=>{
  it('rejects STAFF before any database mutation',async()=>{
    mocks.requireAdmin.mockResolvedValue({error:NextResponse.json({error:{code:'FORBIDDEN'}},{status:403})});
    const response=await GET();
    expect(response.status).toBe(403);expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('creates a STAFF account with a password hash',async()=>{
    mocks.findUnique.mockResolvedValue(null);mocks.create.mockResolvedValue(staffRow);
    const response=await POST(new Request('http://localhost/api/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Staff',email:'staff@example.com',password:'StaffPass12345',role:'STAFF',status:'ACTIVE'})}));
    expect(response.status).toBe(201);expect(mocks.hashPassword).toHaveBeenCalledWith('StaffPass12345');expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({role:'STAFF',status:'ACTIVE',passwordHash:'$hash'})}));
  });

  it('preserves the last active ADMIN',async()=>{
    mocks.findUnique.mockResolvedValue({id:'admin-1',role:'ADMIN',status:'ACTIVE'});mocks.count.mockResolvedValue(0);
    const response=await PATCH(new Request('http://localhost/api/users',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:'admin-1',role:'STAFF'})}));
    expect(response.status).toBe(409);expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('suspends STAFF and revokes existing sessions',async()=>{
    mocks.findUnique.mockResolvedValue({id:'staff-1',role:'STAFF',status:'ACTIVE'});mocks.txUpdate.mockResolvedValue({...staffRow,status:'SUSPENDED'});
    const response=await PATCH(new Request('http://localhost/api/users',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:'staff-1',status:'SUSPENDED'})}));
    expect(response.status).toBe(200);expect(mocks.txUpdate).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'SUSPENDED',sessionVersion:{increment:1}})}));
  });
});
