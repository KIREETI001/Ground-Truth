import { readFile,writeFile,mkdir,rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { StudyProject } from '../lib/study/types.ts';
import type { WorkingCopy,ChangeProposal } from '../lib/study/workspace.ts';

type Jar=Record<string,string>;
type Guest={cookies:Jar;projectId?:string;creationAttempted?:boolean};
type ResponseData<T>={status:number;data:T;errorCode?:string;location:string|null;contentType:string|null;html?:string};
type Check={id:string;status:'pass'|'fail';at:string;detail:string};
type Receipt={task:string;provider:string;model:string;status:string;latencyMs:number;inputTokens:number|null;outputTokens:number|null;cachedInputTokens:number|null;createdAt:string};
type ModelAttempt={operation:string;startedAt:string;status:'running'|'success'|'failed';httpStatus?:number;errorCode?:string};
type PrivateState={baseUrl:string;commit:string;startedAt:string;guests:{a:Guest;b:Guest};teacherCookies:Jar;done:string[];models:ModelAttempt[];modelOutputs:Record<string,unknown>;values:{mcqId?:string;mcqHash?:string;codingId?:string;codingHash?:string;original?:string;revised?:string;proposal?:ChangeProposal;transferId?:string;teacherId?:string;className?:string;reviewLabel?:string}};
type Report={schemaVersion:string;target:string;commit:string;startedAt:string;updatedAt:string;disclaimer:string;guestClients:number;checks:Check[];requests:{operation:string;method:string;status:number;latencyMs:number;errorCode?:string;contentType?:string|null;hasLocation?:boolean}[];modelAttempts:ModelAttempt[];modelReceipts?:Receipt[];sourceProof?:{path:string;baseHash:string;resultHash:string;diffHash:string;proposalHash:string};answerHashes?:{mcq:string;coding:string};teacherReview?:{level:string;operatorQA:true;notEducatorStudy:true;identityVisible:boolean;classVisible:boolean;originalRetained:boolean};completedAt?:string};
const baseUrl=process.argv.find(argument=>argument.startsWith('--base='))?.slice(7)||'https://groundtruth-meta-blth8gk3x-kireeti001s-projects.vercel.app';
const commit='1e859023155d1c7bba4a5298fbb9239088f4554e';
if(!/^https:\/\/groundtruth-meta(?:-[a-z0-9-]+)?\.vercel\.app$/.test(baseUrl))throw new Error('Unexpected QA target.');
const directory=new URL('../.sites-runtime/',import.meta.url),stateFile=new URL('live-api-qa-state.json',directory),publicFile=new URL('../submission/evaluation/live-acceptance.json',import.meta.url);
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
class QAError extends Error{readonly code:string;constructor(code:string){super(code);this.code=code;}}
function requireCheck(condition:unknown,code:string):asserts condition{if(!condition)throw new QAError(code);}
const errorCode=(error:unknown)=>error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^[A-Z0-9_]{1,100}$/.test(error.code)?error.code:'QA_OPERATION_FAILED';
let state:PrivateState,report:Report;
async function persist(){
 report.updatedAt=new Date().toISOString();report.guestClients=Object.values(state.guests).filter(guest=>guest.projectId).length;report.modelAttempts=state.models.map(attempt=>({...attempt}));
 await mkdir(directory,{recursive:true});const temporary=new URL('live-api-qa-state.json.tmp',directory);await writeFile(temporary,JSON.stringify(state,null,2));await rename(temporary,stateFile);
 await mkdir(new URL('../submission/evaluation/',import.meta.url),{recursive:true});await writeFile(publicFile,JSON.stringify(report,null,2)+'\n');
}
async function request<T>(jar:Jar,operation:string,path:string,body?:unknown):Promise<ResponseData<T>>{
 const started=Date.now(),method=body===undefined?'GET':'POST';
 const response=await fetch(baseUrl+path,{method,redirect:'manual',headers:{Origin:baseUrl,...(body===undefined?{}:{'Content-Type':'application/json'}),...(Object.keys(jar).length?{Cookie:Object.entries(jar).map(([key,value])=>key+'='+value).join('; ')}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(120000)});
 for(const cookie of response.headers.getSetCookie()){const first=cookie.split(';')[0],index=first.indexOf('=');if(index>0){const key=first.slice(0,index),value=first.slice(index+1);if(value)jar[key]=value;else delete jar[key];}}
 const contentType=response.headers.get('content-type'),location=response.headers.get('location');
 const html=contentType?.includes('text/html')?await response.text():undefined,data:unknown=html===undefined?await response.json().catch(()=>null):null;
 const rawCode=data&&typeof data==='object'?(data as {error?:{code?:unknown}}).error?.code:undefined,code=typeof rawCode==='string'&&/^[A-Z0-9_]{1,100}$/.test(rawCode)?rawCode:undefined;
 report.requests.push({operation,method,status:response.status,latencyMs:Date.now()-started,contentType,hasLocation:location!==null,...(code?{errorCode:code}:{})});await persist();
 return {status:response.status,data:data as T,errorCode:code,location,contentType,html};
}
async function ok<T>(jar:Jar,operation:string,path:string,body?:unknown){const response=await request<T>(jar,operation,path,body);if(response.status<200||response.status>=300)throw new QAError(response.errorCode||'UNEXPECTED_HTTP_STATUS');return response.data;}
async function model<T>(operation:string,path:string,body:unknown):Promise<T>{
 if(operation in state.modelOutputs)return state.modelOutputs[operation] as T;
 const previous=state.models.find(attempt=>attempt.operation===operation);if(previous)throw new QAError(previous.status==='running'?'MODEL_REQUEST_UNCERTAIN':previous.errorCode||'MODEL_REQUEST_ALREADY_FAILED');
 requireCheck(state.models.length<8,'QA_MODEL_CALL_CAP');const attempt:ModelAttempt={operation,startedAt:new Date().toISOString(),status:'running'};state.models.push(attempt);await persist();
 try{const response=await request<T>(state.guests.a.cookies,operation,path,body);attempt.httpStatus=response.status;if(response.status<200||response.status>=300){attempt.status='failed';attempt.errorCode=response.errorCode||'MODEL_GENERATION_FAILED';await persist();throw new QAError(attempt.errorCode);}state.modelOutputs[operation]=response.data;attempt.status='success';await persist();return response.data;}
 catch(error){if(attempt.status==='running'){attempt.status='failed';attempt.errorCode=errorCode(error);await persist();}throw error;}
}
async function step(id:string,detail:string,work:()=>Promise<void>){
 if(state.done.includes(id))return;
 try{await work();state.done.push(id);report.checks=report.checks.filter(check=>check.id!==id);report.checks.push({id,status:'pass',at:new Date().toISOString(),detail});await persist();console.log(JSON.stringify({check:id,status:'pass'}));}
 catch(error){report.checks=report.checks.filter(check=>check.id!==id);report.checks.push({id,status:'fail',at:new Date().toISOString(),detail:errorCode(error)});await persist();console.log(JSON.stringify({check:id,status:'fail',code:errorCode(error)}));throw error;}
}
const projectPath=()=>'/api/study/projects/'+state.guests.a.projectId;
const own=()=>ok<StudyProject>(state.guests.a.cookies,'read-own-project',projectPath());
function exercise(project:StudyProject,id?:string){const result=id?project.exercises.find(item=>item.id===id):project.exercises[0];requireCheck(result,'EXERCISE_MISSING');return result;}
function noPrivateKeys(value:unknown):boolean{if(Array.isArray(value))return value.every(noPrivateKeys);if(!value||typeof value!=='object')return true;return Object.entries(value).every(([key,item])=>!['correctOption','answerExplanation','reviewPoints','suggestedOption','suggestedRationale','reviewEvidence'].includes(key)&&noPrivateKeys(item));}
async function main(){
 if(existsSync(stateFile)){state=JSON.parse(await readFile(stateFile,'utf8')) as PrivateState;requireCheck(state.baseUrl===baseUrl&&state.commit===commit,'QA_STATE_TARGET_MISMATCH');report=JSON.parse(await readFile(publicFile,'utf8')) as Report;}
 else{const at=new Date().toISOString();state={baseUrl,commit,startedAt:at,guests:{a:{cookies:{}},b:{cookies:{}}},teacherCookies:{},done:[],models:[],modelOutputs:{},values:{}};report={schemaVersion:'groundtruth-live-acceptance.v1',target:baseUrl,commit,startedAt:at,updatedAt:at,disclaimer:'Automated Operator QA with temporary synthetic accounts and a synthetic approved teacher. Not an educator study, learner study, independent human assessment or evidence of learning effectiveness. Imported and submitted code is never executed.',guestClients:0,checks:[],requests:[],modelAttempts:[]};await persist();}
 await step('two-isolated-guests','Exactly two temporary password-free guest clients use separate private cookie jars.',async()=>{
  for(const label of ['a','b'] as const){const guest=state.guests[label];if(guest.projectId)continue;requireCheck(!guest.creationAttempted,'GUEST_CREATION_ALREADY_ATTEMPTED');guest.creationAttempted=true;await persist();const started=await ok<{demo:boolean;projectId:string}>(guest.cookies,'create-guest-'+label,'/api/demo/start',{});guest.projectId=started.projectId;await persist();requireCheck(started.demo&&guest.projectId&&Object.keys(guest.cookies).length,'GUEST_SESSION_MISSING');}
  requireCheck(state.guests.a.projectId!==state.guests.b.projectId&&JSON.stringify(state.guests.a.cookies)!==JSON.stringify(state.guests.b.cookies),'GUEST_ISOLATION_FAILED');
 });
 await step('cross-owner-denied','A different guest receives 404 for the first guest’s project, source, working copy and receipts.',async()=>{
  for(const [suffix,label] of [['','project'],['/source?path=server%2Fvalidation.js','source'],['/working-copy','working-copy'],['/model-receipts','receipts']]){const response=await request(state.guests.b.cookies,'cross-owner-'+label,projectPath()+suffix);requireCheck(response.status===404,'CROSS_OWNER_ACCESS_NOT_DENIED');}
 });
 await step('teacher-page-and-own-preview-before-submit','An authenticated normal page request returns teacher-preview HTML with no redirect; the pre-submission API projection matches only this unexpired guest.',async()=>{
  const page=await request(state.guests.a.cookies,'teacher-page-before-submit','/demo/teacher');requireCheck(page.status===200&&page.location===null&&page.contentType?.includes('text/html')&&page.html?.includes('See the teacher perspective'),'AUTHENTICATED_TEACHER_PAGE_REDIRECTED');
  const session=await ok<{projectId:string;expiresAt:string}>(state.guests.a.cookies,'guest-expiry-before-submit','/api/demo/session');requireCheck(session.projectId===state.guests.a.projectId&&Date.parse(session.expiresAt)>Date.now()&&Date.parse(session.expiresAt)<=Date.now()+7320000,'GUEST_EXPIRY_INVALID');
  const preview=await ok<{readOnly:boolean;project:StudyProject}>(state.guests.a.cookies,'own-preview-before-submit','/api/demo/teacher');requireCheck(preview.readOnly&&preview.project.id===state.guests.a.projectId&&noPrivateKeys(preview),'PRE_SUBMIT_PREVIEW_OWNER_OR_KEYS_FAILED');
 });
 await step('fresh-mcq-guided-hint','A fresh Meta MCQ has four distinct options and no private key; guided hint cites exact selected source.',async()=>{
  const project=await model<StudyProject>('fresh-mcq',projectPath()+'/exercise',{questionFormat:'mcq',phase:'baseline'}),quiz=exercise(project);state.values.mcqId=quiz.id;await persist();
  requireCheck(quiz.prompt.format==='mcq'&&quiz.prompt.options?.length===4&&new Set(quiz.prompt.options.map(option=>option.text)).size===4&&noPrivateKeys(quiz.prompt)&&quiz.mcqResult===null,'PUBLIC_MCQ_CONTRACT_FAILED');
  const hint=await model<{response:{feedback:string;evidence:{path:string;quote:string}[]};project:StudyProject}>('guided-hint',projectPath()+'/hint',{question:'Which selected function checks a task title before the store receives it?'});
  requireCheck(hint.response.feedback.endsWith('?')&&hint.response.evidence.length>0&&hint.response.evidence.every(item=>project.snapshot.files.some(file=>file.path===item.path&&file.excerpt.includes(item.quote))),'HINT_SOURCE_GROUNDING_FAILED');
 });
 await step('independent-assistance-block','Independent mode rejects new hints and model generation before provider transmission.',async()=>{
  const id=state.values.mcqId!;const project=await own();if(exercise(project,id).status==='guided')await ok(state.guests.a.cookies,'start-independent-mcq',projectPath()+'/independent',{exerciseId:id});
  const hint=await request(state.guests.a.cookies,'blocked-independent-hint',projectPath()+'/hint',{question:'Give me a hint.'});requireCheck(hint.status===403&&hint.errorCode==='INDEPENDENT_MODE','INDEPENDENT_HINT_NOT_BLOCKED');
  const generation=await request(state.guests.a.cookies,'blocked-independent-generation',projectPath()+'/exercise',{questionFormat:'mcq'});requireCheck(generation.status===403&&generation.errorCode==='INDEPENDENT_MODE','INDEPENDENT_GENERATION_NOT_BLOCKED');
 });
 await step('immutable-mcq-answer','MCQ submission is immutable before and after source-grounded reflection feedback.',async()=>{
  const id=state.values.mcqId!,current=exercise(await own(),id);let project:StudyProject;
  if(current.status==='submitted')project=await own();else project=await ok<StudyProject>(state.guests.a.cookies,'submit-mcq',projectPath()+'/submit',{exerciseId:id,optionId:current.prompt.options![0].id});
  const answer=exercise(project,id).answer!;state.values.mcqHash=hash(answer);await persist();
  const repeated=await request(state.guests.a.cookies,'reject-second-mcq-answer',projectPath()+'/submit',{exerciseId:id,optionId:'B'});requireCheck(repeated.status===409,'MCQ_RESUBMISSION_NOT_BLOCKED');
  const feedback=await model<StudyProject>('mcq-reflection',projectPath()+'/feedback',{exerciseId:id});requireCheck(exercise(feedback,id).feedback?.feedback.endsWith('?')&&hash(exercise(feedback,id).answer!)===state.values.mcqHash,'MCQ_ORIGINAL_CHANGED');
 });
 await step('manual-change-review-hashes','A manual 80→100 draft change requires approval, rejects stale hashes and retains an idempotent apply receipt.',async()=>{
  let copy:WorkingCopy;const read=await request<WorkingCopy>(state.guests.a.cookies,'read-or-create-draft',projectPath()+'/working-copy');if(read.status===200)copy=read.data;else{
   const denied=await request(state.guests.a.cookies,'deny-unconfirmed-draft',projectPath()+'/workspace',{ownershipConfirmed:false});requireCheck(denied.status===400,'WORKSPACE_PERMISSION_NOT_ENFORCED');copy=await ok<WorkingCopy>(state.guests.a.cookies,'create-approved-draft',projectPath()+'/workspace',{ownershipConfirmed:true});}
  const file=copy.files.find(file=>file.path==='server/validation.js');requireCheck(file,'SELECTED_VALIDATION_FILE_MISSING');
  if(!state.values.original){requireCheck(file.source.includes('title.length > 80'),'ORIGINAL_BOUNDARY_NOT_FOUND');state.values.original=file.source;state.values.revised=file.source.replace('title.length > 80','title.length > 100');await persist();}
  const original=state.values.original,revised=state.values.revised!;
  if(!state.values.proposal){const stale=await request(state.guests.a.cookies,'deny-stale-proposal',projectPath()+'/propose-manual',{path:file.path,baseHash:'0'.repeat(64),source:revised});requireCheck(stale.status===409,'STALE_HASH_NOT_BLOCKED');state.values.proposal=await ok<ChangeProposal>(state.guests.a.cookies,'prepare-manual-diff',projectPath()+'/propose-manual',{path:file.path,baseHash:hash(original),source:revised});await persist();}
  const proposal=state.values.proposal;requireCheck(proposal.baseHash===hash(original)&&proposal.resultHash===hash(revised)&&proposal.original===original&&proposal.source===revised&&proposal.diff.includes('title.length > 100'),'PROPOSAL_SOURCE_INTEGRITY_FAILED');
  const before=await ok<WorkingCopy>(state.guests.a.cookies,'verify-draft-before-approval',projectPath()+'/working-copy');
  if(before.files.find(file=>file.path===proposal.path)?.hash===proposal.baseHash){const unapproved=await request(state.guests.a.cookies,'deny-unconfirmed-apply',projectPath()+'/apply-change',{proposalId:proposal.id,confirmed:false});requireCheck(unapproved.status===400,'UNCONFIRMED_DIFF_APPLIED');}
  const applied=await ok<{proposal:ChangeProposal;workingCopy:WorkingCopy}>(state.guests.a.cookies,'apply-reviewed-diff',projectPath()+'/apply-change',{proposalId:proposal.id,confirmed:true});
  const repeated=await ok<{proposal:ChangeProposal;workingCopy:WorkingCopy}>(state.guests.a.cookies,'repeat-idempotent-apply',projectPath()+'/apply-change',{proposalId:proposal.id,confirmed:true});requireCheck(applied.proposal.appliedAt&&applied.proposal.appliedAt===repeated.proposal.appliedAt&&applied.workingCopy.files.find(file=>file.path===proposal.path)?.hash===proposal.resultHash,'APPLY_RECEIPT_INTEGRITY_FAILED');
  state.values.proposal=applied.proposal;report.sourceProof={path:proposal.path,baseHash:proposal.baseHash,resultHash:proposal.resultHash,diffHash:hash(proposal.diff),proposalHash:hash(proposal.id)};await persist();
 });
 await step('change-linked-coding','A generated coding task captures verified original/applied source, proposal ID, hashes and actual changed 100-character boundary.',async()=>{
  const proposal=state.values.proposal!,pair={workingPath:proposal.path,changeProposalId:proposal.id,questionFormat:'coding',phase:'practice'};
  const missing=await request(state.guests.a.cookies,'deny-unlinked-working-path',projectPath()+'/exercise',{workingPath:proposal.path,questionFormat:'coding'});requireCheck(missing.status===400&&missing.errorCode==='CHANGE_CONTEXT_REQUIRED','UNVERIFIED_CHANGE_CONTEXT_ACCEPTED');
  const forged=await request(state.guests.a.cookies,'deny-client-forged-source',projectPath()+'/exercise',{...pair,originalSource:'forged source'});requireCheck(forged.status===400,'FORGED_CONTEXT_FIELDS_ACCEPTED');
  const project=await model<StudyProject>('change-linked-coding',projectPath()+'/exercise',pair),coding=exercise(project);state.values.codingId=coding.id;await persist();const context=coding.prompt.sourceContext;
  requireCheck(coding.prompt.format==='coding'&&coding.prompt.phase==='practice'&&context?.changeProposalId===proposal.id&&context.source===state.values.revised&&context.originalSource===state.values.original&&context.hash===proposal.resultHash&&context.baseHash===proposal.baseHash&&context.diff?.includes('title.length > 100')&&/\b100\b|\bhundred\b/i.test(coding.prompt.prompt)&&noPrivateKeys(coding.prompt),'CHANGE_LINKED_TASK_CONTEXT_FAILED');
 });
 await step('wrong-coding-answer-retained','A deliberately insufficient synthetic coding answer is committed, unchanged by model reflection and resubmission denial.',async()=>{
  const id=state.values.codingId!,current=exercise(await own(),id);if(current.status==='guided')await ok(state.guests.a.cookies,'start-independent-coding',projectPath()+'/independent',{exerciseId:id});
  const answer='function cleanTitle(value) { return null; }';let project=await own();if(exercise(project,id).status!=='submitted')project=await ok<StudyProject>(state.guests.a.cookies,'submit-deliberately-wrong-code',projectPath()+'/submit',{exerciseId:id,answer});state.values.codingHash=hash(exercise(project,id).answer!);await persist();requireCheck(exercise(project,id).answer===answer,'SYNTHETIC_CODE_ORIGINAL_NOT_RETAINED');
  const feedback=await model<StudyProject>('coding-reflection',projectPath()+'/feedback',{exerciseId:id});requireCheck(hash(exercise(feedback,id).answer!)===state.values.codingHash&&exercise(feedback,id).feedback?.feedback.endsWith('?'),'CODING_FEEDBACK_CHANGED_ORIGINAL');
  const repeated=await request(state.guests.a.cookies,'reject-second-coding-answer',projectPath()+'/submit',{exerciseId:id,answer:'replacement'});requireCheck(repeated.status===409,'CODING_RESUBMISSION_NOT_BLOCKED');
 });
 await step('fresh-linked-transfer','A fresh variation persists the submitted parent and the same verified applied proposal; ending it invents no submission.',async()=>{
  const proposal=state.values.proposal!,parent=exercise(await own(),state.values.codingId),project=await model<StudyProject>('fresh-linked-transfer',projectPath()+'/exercise',{workingPath:proposal.path,changeProposalId:proposal.id,questionFormat:'mcq',phase:'transfer',parentExerciseId:parent.id}),transfer=exercise(project);state.values.transferId=transfer.id;await persist();
  requireCheck(transfer.prompt.phase==='transfer'&&transfer.prompt.parentExerciseId===parent.id&&transfer.prompt.sourceContext?.changeProposalId===proposal.id&&transfer.prompt.sourceContext.hash===proposal.resultHash&&transfer.prompt.kind==='change-plan'&&transfer.prompt.prompt.trim().toLowerCase()!==parent.prompt.prompt.trim().toLowerCase()&&noPrivateKeys(transfer.prompt),'TRANSFER_LINK_OR_FRESHNESS_FAILED');
  const fresh=exercise(await own(),transfer.id);if(fresh.status==='guided')await ok(state.guests.a.cookies,'end-guided-transfer',projectPath()+'/end-attempt',{exerciseId:transfer.id});const ended=exercise(await own(),transfer.id);requireCheck(ended.status==='ended'&&ended.answer===null&&ended.submittedAt===null,'ENDED_TRANSFER_INVENTED_EVIDENCE');
 });
 await step('read-only-own-preview-no-role','Own teacher-shaped preview strips answer keys and never grants teacher permissions or access to another project.',async()=>{
  const page=await request(state.guests.a.cookies,'teacher-page-after-submit','/demo/teacher');requireCheck(page.status===200&&page.location===null&&page.contentType?.includes('text/html')&&page.html?.includes('See the teacher perspective'),'POST_SUBMIT_TEACHER_PAGE_REDIRECTED');
  const preview=await ok<{readOnly:boolean;mode:string;project:StudyProject}>(state.guests.a.cookies,'own-demo-teacher-preview','/api/demo/teacher');requireCheck(preview.readOnly&&preview.mode==='own-demo-preview'&&preview.project.id===state.guests.a.projectId&&noPrivateKeys(preview)&&preview.project.exercises.every(exercise=>exercise.mcqResult===null),'READ_ONLY_PREVIEW_LEAK_OR_WRONG_OWNER');
  const other=await request(state.guests.a.cookies,'deny-preview-project-selection','/api/demo/teacher?projectId='+state.guests.b.projectId);requireCheck(other.status===400,'PREVIEW_PROJECT_PARAMETER_ACCEPTED');
  const teacher=await request(state.guests.a.cookies,'deny-guest-teacher-route','/api/study/teacher');requireCheck(teacher.status===403,'PREVIEW_GRANTED_TEACHER_ROLE');
  const review=await request(state.guests.a.cookies,'deny-guest-review','/api/study/reviews',{exerciseId:state.values.codingId,level:'explained',note:'Operator QA role escalation must be denied.'});requireCheck(review.status===403,'GUEST_REVIEW_PRIVILEGE_ESCALATION');
 });
 await step('teacher-class-consent-review','Class enrollment alone shares nothing; explicit consent reveals name/class and permits a labelled operator QA review without changing the answer.',async()=>{
  const credentials=JSON.parse(await readFile(new URL('cloud-demo-logins.json',directory),'utf8')) as {teacher:{username:string;password:string}};
  await ok(state.teacherCookies,'approved-synthetic-teacher-login','/api/local-auth/login',credentials.teacher);
  const roster=await ok<{owned:{name:string;joinCode:string}[]}>(state.teacherCookies,'read-teacher-class-code','/api/study/classes');requireCheck(roster.owned.length>0,'SYNTHETIC_TEACHER_HAS_NO_CLASS');const selected=roster.owned[0];state.values.className=selected.name;await writeFile(new URL('strengthening-class-code.txt',directory),selected.joinCode,{mode:0o600});
  let teacher=await ok<{teacherId:string;projects:StudyProject[]}>(state.teacherCookies,'teacher-before-join','/api/study/teacher');state.values.teacherId=teacher.teacherId;await persist();requireCheck(!teacher.projects.some(project=>project.id===state.guests.a.projectId),'PROJECT_SHARED_BEFORE_CONSENT');
  await ok(state.guests.a.cookies,'join-synthetic-teacher-class','/api/study/classes/join',{code:selected.joinCode,confirmed:true});teacher=await ok(state.teacherCookies,'teacher-after-join-before-sharing','/api/study/teacher');requireCheck(!teacher.projects.some(project=>project.id===state.guests.a.projectId),'CLASS_ENROLLMENT_AUTO_SHARED_PROJECT');
  const denied=await request(state.guests.a.cookies,'deny-share-without-acknowledgement',projectPath()+'/share',{teacherId:state.values.teacherId});requireCheck(denied.status===400&&denied.errorCode==='SHARING_CONSENT_REQUIRED','SHARE_ACKNOWLEDGEMENT_NOT_REQUIRED');
  await ok(state.guests.a.cookies,'explicit-approved-teacher-share',projectPath()+'/share',{teacherId:state.values.teacherId,acknowledged:true});teacher=await ok(state.teacherCookies,'teacher-after-explicit-sharing','/api/study/teacher');const shared=teacher.projects.find(project=>project.id===state.guests.a.projectId);requireCheck(shared?.learner?.displayName&&shared.learner.classNames.includes(selected.name),'SHARED_LEARNER_IDENTITY_OR_CLASS_MISSING');
  const coding=exercise(shared,state.values.codingId);requireCheck(coding.reviewEvidence?.reviewPoints.length&&hash(coding.answer!)===state.values.codingHash,'TEACHER_EVIDENCE_MISSING_OR_CHANGED');
  const label='Operator QA — automated synthetic check, not an educator study. This intentionally wrong answer always returns null, so it does not implement acceptance of valid trimmed titles up to 100 characters. Evidence is insufficient; this is a synthetic integration check, not an independent human assessment.';state.values.reviewLabel=label;await persist();
  if(!coding.reviews.some(review=>review.note===label))await ok(state.teacherCookies,'save-labelled-operator-qa-review','/api/study/reviews',{exerciseId:coding.id,level:'insufficient',note:label});
  teacher=await ok(state.teacherCookies,'teacher-after-operator-review','/api/study/teacher');const reviewed=teacher.projects.find(project=>project.id===state.guests.a.projectId)!;requireCheck(exercise(reviewed,coding.id).reviews.some(review=>review.level==='insufficient'&&review.note===label)&&reviewed.reviewSummary?.reviewed===1&&reviewed.reviewSummary.needsReview===1&&hash(exercise(reviewed,coding.id).answer!)===state.values.codingHash,'TEACHER_QUEUE_REVIEW_OR_ORIGINAL_FAILED');
  report.teacherReview={level:'insufficient',operatorQA:true,notEducatorStudy:true,identityVisible:true,classVisible:true,originalRetained:true};await persist();
 });
 await step('sanitized-receipts-original-hashes','All six real model requests have sanitized Meta receipts; no prompts, source, answers, credentials or raw provider errors are exposed.',async()=>{
  const saved=await ok<{receipts:Receipt[]}>(state.guests.a.cookies,'read-sanitized-model-receipts',projectPath()+'/model-receipts');const allowed=new Set(['task','provider','model','status','latencyMs','inputTokens','outputTokens','cachedInputTokens','createdAt']);requireCheck(saved.receipts.length===6&&saved.receipts.every(receipt=>Object.keys(receipt).every(key=>allowed.has(key))&&receipt.provider==='meta'&&receipt.model==='muse-spark-1.3'&&receipt.status==='success'),'MODEL_RECEIPTS_MISSING_OR_PRIVATE');report.modelReceipts=saved.receipts;const project=await own();requireCheck(hash(exercise(project,state.values.mcqId).answer!)===state.values.mcqHash&&hash(exercise(project,state.values.codingId).answer!)===state.values.codingHash,'FINAL_ORIGINAL_ANSWER_CHANGED');report.answerHashes={mcq:state.values.mcqHash!,coding:state.values.codingHash!};
 });
 report.completedAt=new Date().toISOString();await persist();console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(check=>check.status==='pass').length,guests:report.guestClients,modelRequests:state.models.length,receiptCount:report.modelReceipts?.length||0,complete:true}));
}
main().catch(async error=>{if(state&&report)await persist();console.error(JSON.stringify({status:'operator-qa-stopped',code:errorCode(error)}));process.exitCode=1;});
