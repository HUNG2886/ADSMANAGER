import { Worker, type Job } from 'bullmq'; import { connection, SYNC_QUEUE } from './queue'; import { logger } from '../lib/logger';

async function processJob(job:Job){logger.info({jobId:job.id,type:job.name},'sync_job_started');await job.updateProgress(10);switch(job.name){case'SYNC_MCC':case'SYNC_CUSTOMER_ACCOUNT':case'SYNC_CAMPAIGNS':case'SYNC_AD_GROUPS':case'SYNC_KEYWORDS':case'SYNC_METRICS':case'EXPORT_DATA':case'BULK_ACTION':break;default:throw new Error(`Unsupported job type: ${job.name}`)}await job.updateProgress(100);return{success:true,completedAt:new Date().toISOString()};}
const worker=new Worker(SYNC_QUEUE,processJob,{connection,concurrency:Number(process.env.WORKER_CONCURRENCY||5),limiter:{max:20,duration:1_000}});
worker.on('completed',job=>logger.info({jobId:job.id,type:job.name},'sync_job_completed'));
worker.on('failed',(job,error)=>logger.error({jobId:job?.id,type:job?.name,error:error.message},'sync_job_failed'));
async function shutdown(){await worker.close();await connection.quit();process.exit(0)}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
