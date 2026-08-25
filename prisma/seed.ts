import { PrismaClient, AccountStatus, CampaignStatus, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({ where: { email: 'demo@adsmanager.local' }, update: {}, create: { email: 'demo@adsmanager.local', name: 'Demo Admin', role: Role.ADMIN } });
  const connection = await prisma.googleConnection.create({ data: { userId: user.id, googleEmail: 'demo@adsmanager.local', refreshTokenEncrypted: 'DEMO_ENCRYPTED_TOKEN' } });
  const mccs = await Promise.all(Array.from({length:3},(_,i)=>prisma.mCC.create({data:{userId:user.id,connectionId:connection.id,customerId:`100000000${i}`,name:`Demo MCC ${i+1}`,currency:'VND',timezone:'Asia/Ho_Chi_Minh',status:'CONNECTED'}})));
  const accounts=[];
  for(let i=0;i<20;i++) accounts.push(await prisma.customerAccount.create({data:{mccId:mccs[i%3].id,customerId:`20000000${String(i).padStart(2,'0')}`,name:`Demo Account ${i+1}`,currency:'VND',timezone:'Asia/Ho_Chi_Minh',status:i===18?AccountStatus.SUSPENDED:AccountStatus.ENABLED}}));
  const campaigns=[];
  for(let i=0;i<100;i++) campaigns.push(await prisma.campaign.create({data:{customerAccountId:accounts[i%20].id,campaignId:`300000${String(i).padStart(4,'0')}`,name:`Demo Campaign ${i+1}`,status:i%6===0?CampaignStatus.PAUSED:CampaignStatus.ENABLED,type:i%3===0?'PERFORMANCE_MAX':'SEARCH',budget:5_000_000+i*50_000}}));
  const today=new Date(); today.setUTCHours(0,0,0,0);
  for(let day=0;day<90;day++){const date=new Date(today);date.setUTCDate(date.getUTCDate()-day);await prisma.dailyMetric.createMany({data:accounts.map((account,i)=>({customerAccountId:account.id,campaignId:campaigns[i].id,date,impressions:BigInt(120000+i*2200+day*90),clicks:BigInt(4600+i*80),cost:24_000_000+i*550_000,conversions:210+i*7,conversionValue:72_000_000+i*2_000_000,ctr:0.038,averageCpc:5217}))});}
}
main().finally(()=>prisma.$disconnect());
