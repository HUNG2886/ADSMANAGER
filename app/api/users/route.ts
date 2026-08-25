import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';
import { hasPostgres, prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/rbac';

const password=z.string().min(10).max(72).regex(/[a-zA-Z]/).regex(/[0-9]/);
const createSchema=z.object({name:z.string().trim().min(2).max(100),email:z.string().email().max(180).transform(value=>value.trim().toLowerCase()),password,role:z.enum(['ADMIN','STAFF']).default('STAFF'),status:z.enum(['ACTIVE','SUSPENDED']).default('ACTIVE')});
const updateSchema=z.object({id:z.string().min(1),name:z.string().trim().min(2).max(100).optional(),email:z.string().email().max(180).transform(value=>value.trim().toLowerCase()).optional(),role:z.enum(['ADMIN','STAFF']).optional(),status:z.enum(['ACTIVE','SUSPENDED']).optional(),password:password.optional(),mccIds:z.array(z.string().min(1)).max(100).optional()});

async function ensureAnotherActiveAdmin(targetId:string){return(await prisma.user.count({where:{id:{not:targetId},role:'ADMIN',status:'ACTIVE'}}))>0}

export async function GET(){
  const access=await requireAdmin();if(access.error)return access.error;
  if(!hasPostgres())return ok({items:[{id:access.user.id,name:access.user.name,email:access.user.email,role:'ADMIN',status:'ACTIVE',lastLoginAt:null,createdAt:null,mccIds:[]}],databaseConfigured:false});
  const items=await prisma.user.findMany({select:{id:true,name:true,email:true,role:true,status:true,lastLoginAt:true,createdAt:true,mccPermissions:{select:{mccId:true}}},orderBy:[{role:'asc'},{createdAt:'asc'}]});
  return ok({items:items.map(item=>({...item,mccIds:item.mccPermissions.map(permission=>permission.mccId)})),databaseConfigured:true});
}

export async function POST(request:Request){
  const access=await requireAdmin();if(access.error)return access.error;
  if(!hasPostgres())return fail('DATABASE_REQUIRED','Hãy cấu hình DATABASE_URL để lưu tài khoản STAFF.',503);
  const parsed=createSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return fail('INVALID_ARGUMENT','Thông tin user chưa hợp lệ. Mật khẩu cần ít nhất 10 ký tự, gồm chữ và số.',422);
  if(await prisma.user.findUnique({where:{email:parsed.data.email},select:{id:true}}))return fail('EMAIL_EXISTS','Email này đã có tài khoản.',409);
  const {password:plainPassword,...data}=parsed.data;
  const user=await prisma.user.create({data:{...data,passwordHash:await hashPassword(plainPassword)},select:{id:true,name:true,email:true,role:true,status:true,lastLoginAt:true,createdAt:true}});
  await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'CREATE_USER',entityType:'User',entityId:user.id,metadata:{email:user.email,role:user.role,status:user.status}});
  return ok({...user,mccIds:[]},201);
}

export async function PATCH(request:Request){
  const access=await requireAdmin();if(access.error)return access.error;
  if(!hasPostgres())return fail('DATABASE_REQUIRED','Hãy cấu hình DATABASE_URL để cập nhật user.',503);
  const parsed=updateSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return fail('INVALID_ARGUMENT','Thông tin cập nhật không hợp lệ.',422);
  const current=await prisma.user.findUnique({where:{id:parsed.data.id},select:{id:true,email:true,role:true,status:true}});if(!current)return fail('NOT_FOUND','Không tìm thấy user.',404);
  if(parsed.data.email&&parsed.data.email!==current.email&&await prisma.user.findUnique({where:{email:parsed.data.email},select:{id:true}}))return fail('EMAIL_EXISTS','Email này đã có tài khoản.',409);
  const removesActiveAdmin=current.role==='ADMIN'&&current.status==='ACTIVE'&&(parsed.data.role==='STAFF'||parsed.data.status==='SUSPENDED');
  if(removesActiveAdmin&&!await ensureAnotherActiveAdmin(current.id))return fail('LAST_ADMIN_REQUIRED','Hệ thống phải luôn có ít nhất một ADMIN đang hoạt động.',409);
  const invalidate=Boolean(parsed.data.password||parsed.data.email||parsed.data.role||parsed.data.status);
  const user=await prisma.$transaction(async tx=>{
    const updated=await tx.user.update({where:{id:current.id},data:{name:parsed.data.name,email:parsed.data.email,role:parsed.data.role,status:parsed.data.status,passwordHash:parsed.data.password?await hashPassword(parsed.data.password):undefined,sessionVersion:invalidate?{increment:1}:undefined},select:{id:true,name:true,email:true,role:true,status:true,lastLoginAt:true,createdAt:true}});
    if(parsed.data.mccIds){await tx.userMCCPermission.deleteMany({where:{userId:current.id}});if(parsed.data.mccIds.length)await tx.userMCCPermission.createMany({data:parsed.data.mccIds.map(mccId=>({userId:current.id,mccId}))})}
    return updated;
  });
  const action=parsed.data.status==='SUSPENDED'?'SUSPEND_USER':parsed.data.status==='ACTIVE'?'ACTIVATE_USER':parsed.data.role?'CHANGE_ROLE':parsed.data.password?'RESET_PASSWORD':'UPDATE_USER';
  await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action,entityType:'User',entityId:user.id,metadata:{role:user.role,status:user.status}});
  return ok({...user,mccIds:parsed.data.mccIds});
}

export async function DELETE(request:Request){
  const access=await requireAdmin();if(access.error)return access.error;
  if(!hasPostgres())return fail('DATABASE_REQUIRED','Hãy cấu hình DATABASE_URL để xóa user.',503);
  const id=new URL(request.url).searchParams.get('id');if(!id)return fail('INVALID_ARGUMENT','Thiếu user id.',422);if(id===access.user.id)return fail('SELF_PROTECTION','Bạn không thể xóa tài khoản đang đăng nhập.',409);
  const target=await prisma.user.findUnique({where:{id},select:{id:true,email:true,role:true,status:true}});if(!target)return fail('NOT_FOUND','Không tìm thấy user.',404);
  if(target.role==='ADMIN'&&target.status==='ACTIVE'&&!await ensureAnotherActiveAdmin(id))return fail('LAST_ADMIN_REQUIRED','Hệ thống phải luôn có ít nhất một ADMIN đang hoạt động.',409);
  await prisma.user.delete({where:{id}});await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'DELETE_USER',entityType:'User',entityId:id,metadata:{email:target.email,role:target.role}});return ok({id});
}
