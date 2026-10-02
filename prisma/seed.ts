import { Prisma, PrismaClient, Role, UserStatus } from '@prisma/client';
import { scopedDatabaseUrl } from '../lib/database-url';
import { hashPassword, passwordNeedsRehash, verifyPassword } from '../lib/password';

const datasourceUrl=scopedDatabaseUrl();
const prisma = new PrismaClient(datasourceUrl?{datasourceUrl}:undefined);

function required(name:string){
  const value=process.env[name]?.trim();
  if(!value)throw new Error(`${name} is required for authentication seeding.`);
  return value;
}

function requiredEither(primary:string,fallback:string){
  const value=process.env[primary]?.trim()||process.env[fallback]?.trim();
  if(!value)throw new Error(`${primary} (or legacy ${fallback}) is required for authentication seeding.`);
  return value;
}

async function syncBootstrapUser(input:{identifier:string;password:string;name:string;role:Role}){
  const identifier=input.identifier.trim().toLowerCase();
  const current=await prisma.user.findUnique({where:{email:identifier},select:{id:true,email:true,name:true,passwordHash:true,role:true,status:true,sessionVersion:true}});
  if(!current){
    try{
      const created=await prisma.user.create({data:{email:identifier,name:input.name,passwordHash:await hashPassword(input.password),role:input.role,status:UserStatus.ACTIVE},select:{id:true,email:true,role:true,status:true}});
      return {...created,action:'created' as const};
    }catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return syncBootstrapUser(input);
      throw error;
    }
  }

  const update:Prisma.UserUpdateInput={};
  const passwordMatches=Boolean(current.passwordHash&&await verifyPassword(input.password,current.passwordHash));
  if(!passwordMatches||!current.passwordHash||passwordNeedsRehash(current.passwordHash))update.passwordHash=await hashPassword(input.password);
  if(!current.name||(input.role===Role.DEV&&current.name==='System Admin'))update.name=input.name;
  if(input.role===Role.DEV&&current.role!==Role.DEV)update.role=Role.DEV;
  if(input.role===Role.DEV&&current.status!==UserStatus.ACTIVE)update.status=UserStatus.ACTIVE;
  const securityChanged=Boolean(update.passwordHash||update.role||update.status);
  if(securityChanged)update.sessionVersion={increment:1};
  if(Object.keys(update).length===0)return {...current,action:'unchanged' as const};
  const updated=await prisma.user.update({where:{id:current.id},data:update,select:{id:true,email:true,role:true,status:true}});
  return {...updated,action:'updated' as const};
}

async function main(){
  const adminIdentifier=requiredEither('DEFAULT_DEV_EMAIL','DEFAULT_ADMIN_EMAIL');
  const adminPassword=requiredEither('DEFAULT_DEV_PASSWORD','DEFAULT_ADMIN_PASSWORD');
  const staffIdentifier=required('DEFAULT_STAFF_EMAIL');
  const staffPassword=required('DEFAULT_STAFF_PASSWORD');
  if(adminIdentifier.toLowerCase()===staffIdentifier.toLowerCase())throw new Error('DEV and STAFF identifiers must be different.');
  if(adminPassword.length<8||staffPassword.length<10)throw new Error('Bootstrap passwords do not meet the minimum length requirement.');

  const admin=await syncBootstrapUser({identifier:adminIdentifier,password:adminPassword,name:'System Developer',role:Role.DEV});
  const staff=await syncBootstrapUser({identifier:staffIdentifier,password:staffPassword,name:'Default Staff',role:Role.STAFF});
  console.log(`Authentication seed complete: DEV ${admin.email} (${admin.role}/${admin.status}, ${admin.action}); STAFF ${staff.email} (${staff.role}/${staff.status}, ${staff.action}).`);
}

main().catch(error=>{console.error('Authentication seed failed:',error);process.exitCode=1}).finally(()=>prisma.$disconnect());
