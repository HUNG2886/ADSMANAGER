import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks=vi.hoisted(()=>({
  requireDev:vi.fn(), hasPostgres:vi.fn(()=>true), hashPassword:vi.fn(async()=>'$hash'), writeAudit:vi.fn(async()=>undefined),
  findMany:vi.fn(), findUnique:vi.fn(), count:vi.fn(), create:vi.fn(), delete:vi.fn(), connectionCount:vi.fn(), txUpdate:vi.fn(), deletePermissions:vi.fn(), createPermissions:vi.fn(), transaction:vi.fn(),
}));

vi.mock('@/lib/rbac',()=>({requireDev:mocks.requireDev}));
vi.mock('@/lib/auth',()=>({hashPassword:mocks.hashPassword}));
vi.mock('@/lib/audit',()=>({writeAudit:mocks.writeAudit}));
vi.mock('@/lib/prisma',()=>({
  hasPostgres:mocks.hasPostgres,
  prisma:{
    user:{findMany:mocks.findMany,findUnique:mocks.findUnique,count:mocks.count,create:mocks.create,delete:mocks.delete},
    googleConnection:{count:mocks.connectionCount},
    $transaction:mocks.transaction,
  },
}));

import { DELETE, GET, PATCH, POST } from '../app/api/users/route';

const developer={id:'dev-1',email:'dev@example.com',name:'Developer',role:'DEV' as const,sessionVersion:0,demo:true};
const staffRow={id:'staff-1',name:'Staff',email:'staff@example.com',role:'STAFF' as const,status:'ACTIVE' as const,lastLoginAt:null,createdAt:new Date('2026-08-25T00:00:00Z')};

beforeEach(()=>{
  vi.clearAllMocks();mocks.hasPostgres.mockReturnValue(true);mocks.requireDev.mockResolvedValue({user:developer});mocks.connectionCount.mockResolvedValue(0);
  mocks.transaction.mockImplementation(async(callback:(tx:unknown)=>unknown)=>callback({user:{update:mocks.txUpdate},userMCCPermission:{deleteMany:mocks.deletePermissions,createMany:mocks.createPermissions}}));
});

describe('DEV user management API',()=>{
  it('rejects non-DEV users before any database mutation',async()=>{
    mocks.requireDev.mockResolvedValue({error:NextResponse.json({error:{code:'FORBIDDEN'}},{status:403})});
    const response=await GET();
    expect(response.status).toBe(403);expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('creates a STAFF account with a password hash',async()=>{
    mocks.findUnique.mockResolvedValue(null);mocks.create.mockResolvedValue(staffRow);
    const response=await POST(new Request('http://localhost/api/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Staff',email:'staff@example.com',password:'StaffPass12345',role:'STAFF',status:'ACTIVE'})}));
    expect(response.status).toBe(201);expect(mocks.hashPassword).toHaveBeenCalledWith('StaffPass12345');expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({role:'STAFF',status:'ACTIVE',passwordHash:'$hash'})}));
  });

  it('protects the DEV account from page-level edits',async()=>{
    mocks.findUnique.mockResolvedValue({id:'dev-1',email:'dev@example.com',role:'DEV',status:'ACTIVE'});
    const response=await PATCH(new Request('http://localhost/api/users',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:'dev-1',role:'ADMIN'})}));
    expect(response.status).toBe(403);expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('suspends STAFF and revokes existing sessions',async()=>{
    mocks.findUnique.mockResolvedValue({id:'staff-1',role:'STAFF',status:'ACTIVE'});mocks.txUpdate.mockResolvedValue({...staffRow,status:'SUSPENDED'});
    const response=await PATCH(new Request('http://localhost/api/users',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:'staff-1',status:'SUSPENDED'})}));
    expect(response.status).toBe(200);expect(mocks.txUpdate).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'SUSPENDED',sessionVersion:{increment:1}})}));
  });

  it('accepts a username identifier for a password account',async()=>{
    mocks.findUnique.mockResolvedValue(null);mocks.create.mockResolvedValue({...staffRow,email:'staff_user'});
    const response=await POST(new Request('http://localhost/api/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Staff',email:'staff_user',password:'StaffPass12345',role:'STAFF',status:'ACTIVE'})}));
    expect(response.status).toBe(201);expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({email:'staff_user',passwordHash:'$hash'})}));
  });

  it('unlinks an old Google identity when the login identifier changes',async()=>{
    mocks.findUnique.mockResolvedValueOnce({id:'staff-1',email:'old@example.com',role:'STAFF',status:'ACTIVE'}).mockResolvedValueOnce(null);
    mocks.txUpdate.mockResolvedValue({...staffRow,email:'new@example.com',passwordHash:'$hash'});
    const response=await PATCH(new Request('http://localhost/api/users',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:'staff-1',email:'new@example.com'})}));
    expect(response.status).toBe(200);expect(mocks.txUpdate).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({googleSubject:null,image:null,sessionVersion:{increment:1}})}));
  });

  it('does not delete an account that owns Google Ads connections',async()=>{
    mocks.findUnique.mockResolvedValue({id:'staff-1',email:'staff@example.com',role:'STAFF',status:'ACTIVE'});mocks.connectionCount.mockResolvedValue(1);
    const response=await DELETE(new Request('http://localhost/api/users?id=staff-1',{method:'DELETE'}));
    expect(response.status).toBe(409);expect(mocks.delete).not.toHaveBeenCalled();
  });
});
