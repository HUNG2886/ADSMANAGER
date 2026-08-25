import { NextResponse } from 'next/server';
import { writeAudit } from '@/lib/audit';
import { hasPostgres, prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export async function POST(){
  const access=await requireAuth();if(access.error)return access.error;
  if(hasPostgres())await prisma.user.update({where:{id:access.user.id},data:{sessionVersion:{increment:1}}}).catch(()=>null);
  await writeAudit({userId:access.user.id,userEmail:access.user.email,userName:access.user.name,action:'LOGOUT_ALL',entityType:'Session',entityId:access.user.id});
  const response=NextResponse.json({success:true,data:null,error:null});response.cookies.set(SESSION_COOKIE,'',{...sessionCookieOptions(),maxAge:0});return response;
}
