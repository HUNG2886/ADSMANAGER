import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { hasPostgres, prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

const passwordSchema=z.object({currentPassword:z.string().min(8).max(128),newPassword:z.string().min(10).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/)});

export async function GET(){
  const access=await requireAuth();if(access.error)return access.error;
  if(!hasPostgres())return ok({id:access.user.id,name:access.user.name,email:access.user.email,role:access.user.role,status:'ACTIVE',lastLoginAt:null,databaseConfigured:false});
  const user=await prisma.user.findUnique({where:{id:access.user.id},select:{id:true,name:true,email:true,role:true,status:true,lastLoginAt:true}});
  if(!user)return fail('NOT_FOUND','Không tìm thấy tài khoản.',404);
  return ok({...user,databaseConfigured:true});
}

export async function PATCH(request:Request){
  const access=await requireAuth();if(access.error)return access.error;
  if(!hasPostgres())return fail('DATABASE_REQUIRED','Cần cấu hình DATABASE_URL để đổi mật khẩu.',503);
  const parsed=passwordSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return fail('INVALID_ARGUMENT','Mật khẩu mới cần ít nhất 10 ký tự, gồm chữ và số.',422);
  const user=await prisma.user.findUnique({where:{id:access.user.id},select:{passwordHash:true}});
  if(!user?.passwordHash||!await verifyPassword(parsed.data.currentPassword,user.passwordHash))return fail('INVALID_PASSWORD','Mật khẩu hiện tại không chính xác.',400);
  await prisma.user.update({where:{id:access.user.id},data:{passwordHash:await hashPassword(parsed.data.newPassword),sessionVersion:{increment:1}}});
  await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'CHANGE_PASSWORD',entityType:'User',entityId:access.user.id});
  return ok({requiresLogin:true});
}
