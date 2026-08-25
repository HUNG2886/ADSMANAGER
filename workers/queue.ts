import { Queue } from 'bullmq'; import IORedis from 'ioredis';
export const SYNC_QUEUE='google-ads-sync';
export const connection=new IORedis(process.env.REDIS_URL||'redis://localhost:6379',{maxRetriesPerRequest:null,enableReadyCheck:false});
export const syncQueue=new Queue(SYNC_QUEUE,{connection,defaultJobOptions:{attempts:5,backoff:{type:'exponential',delay:2_000},removeOnComplete:{age:86_400,count:5_000},removeOnFail:{age:604_800}}});
export type SyncJobName='SYNC_MCC'|'SYNC_CUSTOMER_ACCOUNT'|'SYNC_CAMPAIGNS'|'SYNC_AD_GROUPS'|'SYNC_KEYWORDS'|'SYNC_METRICS'|'EXPORT_DATA'|'BULK_ACTION';
export async function enqueueSync(name:SyncJobName,data:Record<string,unknown>,dedupeKey:string){return syncQueue.add(name,data,{jobId:`${name}:${dedupeKey}`});}
