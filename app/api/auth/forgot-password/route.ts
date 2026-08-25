import { z } from 'zod';
import { ok } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

const schema=z.object({email:z.string().email().max(180)});

export async function POST(request:Request){
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
  if(rateLimit(`forgot:${ip}`,3,15*60_000))schema.safeParse(await request.json().catch(()=>null));
  return ok({message:'Nếu email tồn tại, hướng dẫn khôi phục sẽ được gửi. Vui lòng liên hệ quản trị viên nếu chưa cấu hình email.'});
}
