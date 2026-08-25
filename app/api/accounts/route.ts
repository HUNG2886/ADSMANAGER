import { accounts } from '@/lib/demo-data';
import { allowedMccIds } from '@/lib/data-access';
import { ok } from '@/lib/api';
import { requireReadAccess } from '@/lib/rbac';

export async function GET(request:Request){const access=await requireReadAccess();if(access.error)return access.error;const allowed=await allowedMccIds(access.user);const url=new URL(request.url);const q=(url.searchParams.get('q')||'').toLowerCase();const status=url.searchParams.get('status');const page=Math.max(1,Number(url.searchParams.get('page')||1));const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit')||20)));const filtered=accounts.filter(item=>(allowed===null||allowed.includes(item.mccId))&&item.name.toLowerCase().includes(q)&&(!status||status==='ALL'||item.status===status));return ok({items:filtered.slice((page-1)*limit,page*limit),pagination:{page,limit,total:filtered.length,pages:Math.ceil(filtered.length/limit)}})}
