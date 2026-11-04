import type { RuntimeConfig } from '../contracts.ts';
import { generateStudy, type StudyTask } from './model.ts';
import type { ProjectSnapshot } from '../learner/types.ts';

export type StudyReceiptOutcome={task:StudyTask;provider:'meta'|'local';model:string;latencyMs:number;
 status:'success'|'failed'|'rate-limited'|'blocked'|'quota-limited';inputTokens?:number;outputTokens?:number;cachedInputTokens?:number};
const integer=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?n:null;

/** Only bounded numeric/provider metadata is persisted; no prompts, answers or raw errors. */
export async function saveStudyModelReceipt(c:RuntimeConfig,ownerId:string,outcome:StudyReceiptOutcome,projectId:string|null=null):Promise<boolean>{
 const pilot=c.PILOT_ID||'groundtruth-pilot.v1',at=new Date().toISOString();
 if(projectId&&!await c.DB.prepare('SELECT id FROM study_projects WHERE id=? AND owner_id=? AND pilot_id=? AND expires_at>?').bind(projectId,ownerId,pilot,at).first())return false;
 if(!['meta','local'].includes(outcome.provider)||!['success','failed','rate-limited','blocked','quota-limited'].includes(outcome.status))return false;
 const latency=integer(Math.round(outcome.latencyMs));if(latency===null)return false;
 try{
  await c.DB.prepare('INSERT INTO study_model_receipts(id,owner_id,pilot_id,project_id,task,provider,model,status,latency_ms,input_tokens,output_tokens,cached_input_tokens,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
   .bind(crypto.randomUUID(),ownerId,pilot,projectId,outcome.task,outcome.provider,outcome.model.slice(0,100),outcome.status,latency,integer(outcome.inputTokens),integer(outcome.outputTokens),integer(outcome.cachedInputTokens),at,new Date(Date.now()+7*86400000).toISOString()).run();
  return true;
 }catch{console.warn('Study model receipt could not be persisted.');return false;}
}

export async function recordedStudy(c:RuntimeConfig,userId:string,task:StudyTask,data:unknown,snapshot:ProjectSnapshot,projectId:string|null=null){
 return generateStudy(c,userId,task,data,snapshot,fetch,outcome=>saveStudyModelReceipt(c,userId,outcome,projectId).then(()=>{}));
}
