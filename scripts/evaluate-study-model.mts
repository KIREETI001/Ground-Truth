import { readFile,writeFile,mkdir,rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { ProjectSnapshot } from '../lib/learner/types.ts';
import type { StudyTask } from '../lib/study/model.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';

type Check={id:string;passed:boolean;detail:string};
type Receipt={task:StudyTask;provider:string;model:string;status:string;latencyMs:number;inputTokens:number|null;outputTokens:number|null;cachedInputTokens:number|null;createdAt:string};
type SemanticReview={reviewer:'Codex source inspection';status:'pass'|'concern'|'fail'|'not-reviewed';note:string;factsChecked:string[]};
type Attempt={index:number;startedAt:string;completedAt?:string;status:'running'|'success'|'failed'|'interrupted-unreplayed';errorCode?:string;wallLatencyMs?:number;receipt?:Receipt|null};
type CaseResult={id:string;repository:string;task:StudyTask;label:string;attempts:Attempt[];output?:unknown;automaticChecks?:Check[];semanticReview?:SemanticReview};
type Revision={id:string;modelCodeHash:string;description:string;startedAt:string;updatedAt:string;completedAt?:string;cases:CaseResult[]};
type RepositoryFixture={id:string;repository:string;url:string;branch:string;commit:string;verificationUrls:string[];files:{path:string;language:string;source:string;blobSha:string;url:string}[];facts:{id:string;assertion:string;path:string;quote:string}[];cases:{id:string;label:string;task:StudyTask;data:Record<string,unknown>}[]};
type Fixtures={schemaVersion:string;evaluationId:string;verifiedAt:string;provider:string;model:string;plannedCases:number;maxRequests:number;scope:string;repositories:RepositoryFixture[]};
type Evaluation={schemaVersion:string;evaluationId:string;model:string;provider:string;startedAt:string;updatedAt:string;completedAt?:string;fixtureHash:string;modelCodeHash:string;plannedCases:number;maxRequests:number;operatorIdentity:string;method:string;limitations:string[];cases:CaseResult[];revisions?:Revision[]};
const directory=new URL('../submission/evaluation/',import.meta.url),fixtureUrl=new URL('fixtures.json',directory),resultUrl=new URL('model-evaluation.json',directory),reportUrl=new URL('model-evaluation.md',directory);
const operatorIdentity='operator-study-content-eval-v1';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const safeError=(error:unknown)=>error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^[A-Z_]{1,80}$/.test(error.code)?error.code:'EVALUATION_REQUEST_FAILED';
const plain=(value:unknown)=>value&&typeof value==='object'?value as Record<string,unknown>:{};

// The cloud runtime uses extensionless framework imports. Resolve only ordinary
// local TypeScript modules; public fixture source remains inert text throughout.
registerHooks({resolve(specifier,context,nextResolve){
 try{return nextResolve(specifier,context);}catch(error){
  if((specifier.startsWith('./')||specifier.startsWith('../'))&&!/\.[a-z]+$/i.test(specifier)&&error&&typeof error==='object'&&'code' in error&&error.code==='ERR_MODULE_NOT_FOUND')return nextResolve(specifier+'.ts',context);
  throw error;
 }
}});

function snapshotFor(repository:RepositoryFixture):ProjectSnapshot{
 return {repository:repository.repository,url:repository.url,commit:repository.commit,analysedAt:new Date().toISOString(),files:repository.files.map(file=>({path:file.path,language:file.language,excerpt:file.source})),signals:[],suggestedMissionId:null,warnings:['Complete selected public files at the recorded commit; a partial repository view. Source-only evaluation; no imported code is executed.']};
}
function automaticChecks(task:StudyTask,output:unknown,snapshot:ProjectSnapshot):Check[]{
 const value=plain(output),checks:Check[]=[{id:'validated-output',passed:true,detail:'Accepted by the application output schema and source-path checks; this does not prove factual correctness.'}];
 const allowed=new Set(snapshot.files.map(file=>file.path));
 const paths=Array.isArray(value.filePaths)?value.filePaths as string[]:[];
 if(task==='analyse'){
  checks.push({id:'beginner-structure',passed:Array.isArray(value.glossary)&&value.glossary.length>=2&&value.glossary.length<=4&&Array.isArray(value.flow)&&value.flow.length>=2&&value.flow.length<=5,detail:'Expected 2–4 glossary terms and 2–5 reading-flow steps.'});
  checks.push({id:'selected-paths-only',passed:paths.every(path=>allowed.has(path)),detail:'Top-level paths resolve to selected source; nested flow/check paths are checked by application validation.'});
 }else if(task==='exercise'&&value.format==='mcq'){
  const options=value.options as {id:string;text:string}[];
  checks.push({id:'mcq-shape',passed:options.length===4&&new Set(options.map(option=>option.id)).size===4&&new Set(options.map(option=>option.text.trim().toLowerCase())).size===4&&options.filter(option=>option.id===value.correctOption).length===1,detail:'Four distinct option IDs/texts and one declared key; unique factual defensibility requires semantic review.'});
  checks.push({id:'private-review-fields',passed:Array.isArray(value.reviewPoints)&&typeof value.answerExplanation==='string'&&!String(value.prompt).includes(String(value.answerExplanation)),detail:'Review points/key/rationale are separate fields. Server tests separately verify public response filtering.'});
 }else if(task==='exercise'){
  checks.push({id:'small-code-format',passed:value.format==='coding'&&String(value.prompt).length<=600&&!/^\s*(?:explain|describe|discuss|reflect|justify|outline|plan|assess)\b/i.test(String(value.prompt)),detail:'Coding format with a bounded prompt; feasibility and missing requirements are reviewed separately. Student code is not executed.'});
 }else if(task==='hint'){
  const evidence=value.evidence as {path:string;quote:string}[];
  checks.push({id:'exact-source-evidence',passed:evidence.length>=1&&evidence.every(item=>snapshot.files.some(file=>file.path===item.path&&file.excerpt.includes(item.quote))),detail:'Every resolved source quote occurs exactly in a selected public file.'});
  checks.push({id:'socratic-shape',passed:String(value.feedback).trim().endsWith('?')&&String(value.feedback).length<=350,detail:'A bounded question; whether it gives away the answer is reviewed separately.'});
 }
 return checks;
}
function report(evaluation:Evaluation,fixtures:Fixtures){
 const completed=evaluation.cases.filter(result=>result.attempts.some(attempt=>attempt.status==='success'));
 const allResults=[...evaluation.cases,...(evaluation.revisions||[]).flatMap(revision=>revision.cases)];
 const attempts=allResults.flatMap(result=>result.attempts),receipts=attempts.flatMap(attempt=>attempt.receipt?[attempt.receipt]:[]);
 const sum=(field:'inputTokens'|'outputTokens'|'cachedInputTokens')=>receipts.reduce((total,receipt)=>total+(receipt[field]??0),0);
 const reviewed=completed.filter(result=>result.semanticReview&&result.semanticReview.status!=='not-reviewed');
 const rows=fixtures.repositories.map(repository=>{
  const cases=evaluation.cases.filter(result=>result.repository===repository.repository),done=cases.filter(result=>result.output!==undefined);
  const safe=done.filter(result=>result.automaticChecks?.every(check=>check.passed)),semantic=done.filter(result=>result.semanticReview&&result.semanticReview.status!=='not-reviewed');
  return '| '+repository.repository+' | '+done.length+'/'+repository.cases.length+' | '+safe.length+'/'+done.length+' | '+semantic.filter(result=>result.semanticReview?.status==='pass').length+' pass, '+semantic.filter(result=>result.semanticReview?.status==='concern').length+' concern, '+semantic.filter(result=>result.semanticReview?.status==='fail').length+' fail / '+semantic.length+' reviewed | '+cases.reduce((n,result)=>n+result.attempts.length,0)+' |';
 });
 const operationalRows=fixtures.repositories.map(repository=>{
  const all=allResults.filter(result=>result.repository===repository.repository).flatMap(result=>result.attempts),observed=all.flatMap(attempt=>attempt.receipt?[attempt.receipt]:[]);
  const timings=observed.map(receipt=>receipt.latencyMs).sort((a,b)=>a-b),middle=Math.floor(timings.length/2),median=timings.length?(timings.length%2?timings[middle]:(timings[middle-1]+timings[middle])/2):'unknown';
  const tokens=(field:'inputTokens'|'outputTokens'|'cachedInputTokens')=>observed.reduce((total,receipt)=>total+(receipt[field]??0),0);
  return '| '+repository.repository+' | '+all.length+' | '+all.filter(attempt=>attempt.status==='failed').length+' | '+observed.length+'/'+all.length+' | '+median+' | '+[tokens('inputTokens'),tokens('outputTokens'),tokens('cachedInputTokens')].join(' / ')+' |';
 });
 const lines=['# Public-source model content review','',`Evaluation: \`${evaluation.evaluationId}\` · ${evaluation.provider} / ${evaluation.model} · updated ${evaluation.updatedAt}`,'',evaluation.method,'',`Baseline returned outputs: **${completed.length}/${evaluation.plannedCases}** from **${evaluation.cases.reduce((count,result)=>count+result.attempts.length,0)}** generation attempts. Baseline Codex semantic reviews: **${reviewed.length}/${completed.length}**. Total generation attempts including explicit mitigation rechecks: **${attempts.length}** (cap ${evaluation.maxRequests}). Historical outputs and concerns are retained.`,'','| Repository | Baseline outputs / planned | Automatic checks passed / outputs | Baseline Codex semantic review | Baseline attempts |','|---|---:|---:|---|---:|',...rows,'','## Operational measurements','',`Sanitized receipts available: ${receipts.length}/${attempts.length} total generation attempts, including rechecks. Reported input tokens: ${sum('inputTokens')}; output tokens: ${sum('outputTokens')}; cached input tokens: ${sum('cachedInputTokens')}. Missing token values are unknown, not zero-cost claims. These are observed API counts, not a measured learner saving or price estimate.`,'','| Repository | Total attempts | Failed attempts | Receipts / attempts | Median latency (ms) | Input / output / cached tokens |','|---|---:|---:|---:|---:|---|',...operationalRows,'','| Baseline case | Status | Receipt latency (ms) | Input / output / cached tokens | Automatic checks | Codex review |','|---|---|---:|---|---|---|'];
 for(const result of evaluation.cases){const attempt=result.attempts.at(-1),receipt=attempt?.receipt;lines.push('| '+result.id+' | '+(attempt?.status||'not attempted')+' | '+(receipt?.latencyMs??'unknown')+' | '+(receipt?[receipt.inputTokens??'?',receipt.outputTokens??'?',receipt.cachedInputTokens??'?'].join(' / '):'unknown')+' | '+(result.automaticChecks?result.automaticChecks.filter(check=>check.passed).length+'/'+result.automaticChecks.length:'not assessed')+' | '+(result.semanticReview?.status||'not-reviewed')+' |');}
 lines.push('','## Content inspection','');
 for(const result of evaluation.cases)lines.push('### '+result.id,'',result.semanticReview?.note||'Pending Codex source inspection. Valid JSON is not a factual-quality verdict.',...(result.semanticReview?.factsChecked?.length?['','Source facts inspected: '+result.semanticReview.factsChecked.join(', ')+'.']:[]),'');
 for(const revision of evaluation.revisions||[]){
  lines.push('## Targeted mitigation recheck: '+revision.id,'',revision.description,'',`Baseline model-code SHA-256: \`${evaluation.modelCodeHash}\`. Revised model-code SHA-256: \`${revision.modelCodeHash}\`. Only the ${revision.cases.length} flagged cases below are rechecked; the original 12-case denominator is unchanged. This is a limited mitigation check, not a repeated-run consistency estimate.`,'','| Recheck case | Latest status | Automatic checks | Codex review | Latency (ms) | Input / output / cached tokens |','|---|---|---|---|---:|---|');
  for(const result of revision.cases){const latest=result.attempts.at(-1),receipt=latest?.receipt;lines.push('| '+result.id+' | '+(latest?.status||'not attempted')+' | '+(result.automaticChecks?result.automaticChecks.filter(check=>check.passed).length+'/'+result.automaticChecks.length:'not assessed')+' | '+(result.semanticReview?.status||'not-reviewed')+' | '+(receipt?.latencyMs??'unknown')+' | '+(receipt?[receipt.inputTokens??'?',receipt.outputTokens??'?',receipt.cachedInputTokens??'?'].join(' / '):'unknown')+' |');}
  for(const result of revision.cases)lines.push('','### Recheck '+result.id,'',result.semanticReview?.note||'Pending Codex source inspection.');
  lines.push('');
 }
 lines.push('## Pinned sources','');
 for(const repository of fixtures.repositories)lines.push('- ['+repository.repository+']('+repository.url+'/tree/'+repository.commit+') · `'+repository.commit+'`; '+repository.files.map(file=>'['+file.path+']('+file.url+')').join(', ')+'.');
 lines.push('','## Limits','',...evaluation.limitations.map(limitation=>'- '+limitation),'','## Reproduction','', 'Run `node scripts/evaluate-study-model.mts --check` for fixture validation with no model request. An authorized operator can run `node scripts/evaluate-study-model.mts --run`; it loads the normal server environment internally and uses `getRuntime()` / `recordedStudy()`. Completed cases are skipped. The explicitly requested `--run --recheck-concerns` creates or resumes the separate four-case mitigation revision. `--retry-failed` explicitly permits retrying failed cases, never interrupted or successful ones, within the total cap. `--report` regenerates this report without reclassifying historical outputs under a later validator. The JSON retains public source-derived outputs and sanitized counts; keys, database connections and student answers are excluded.','');
 return lines.join('\n');
}
async function checkpoint(evaluation:Evaluation,fixtures:Fixtures){
 evaluation.updatedAt=new Date().toISOString();await mkdir(directory,{recursive:true});
 const temporary=new URL('model-evaluation.json.tmp',directory);await writeFile(temporary,JSON.stringify(evaluation,null,2)+'\n');await rename(temporary,resultUrl);
 await writeFile(reportUrl,report(evaluation,fixtures));
}
async function main(){
 const args=new Set(process.argv.slice(2));if([...args].some(arg=>!['--check','--run','--retry-failed','--report','--recheck-concerns'].includes(arg)))throw new Error('INVALID_EVALUATION_ARGUMENT');
 const fixtureText=await readFile(fixtureUrl,'utf8'),fixtures=JSON.parse(fixtureText) as Fixtures;
 if(fixtures.plannedCases!==12||fixtures.maxRequests>18||fixtures.repositories.length!==3||fixtures.repositories.flatMap(repository=>repository.cases).length!==12)throw new Error('INVALID_EVALUATION_FIXTURES');
 for(const repository of fixtures.repositories){
  if(!/^[a-f0-9]{40}$/.test(repository.commit)||repository.files.length>3||!repository.url.startsWith('https://github.com/'))throw new Error('INVALID_PINNED_SOURCE');
  for(const file of repository.files){const gitBlob=createHash('sha1').update('blob '+Buffer.byteLength(file.source)+'\0').update(file.source).digest('hex');if(gitBlob!==file.blobSha)throw new Error('SOURCE_BLOB_MISMATCH');}
  for(const fact of repository.facts)if(!repository.files.some(file=>file.path===fact.path&&file.source.includes(fact.quote)))throw new Error('FACT_QUOTE_MISMATCH');
 }
 const fixtureHash=digest(fixtureText),modelCodeHash=digest(await readFile(new URL('../lib/study/model.ts',import.meta.url),'utf8'));
 const {validateGenerated}=await import('../lib/study/model.ts');
 let evaluation:Evaluation;
 if(existsSync(resultUrl)){
  evaluation=JSON.parse(await readFile(resultUrl,'utf8')) as Evaluation;
  if(evaluation.fixtureHash!==fixtureHash||evaluation.evaluationId!==fixtures.evaluationId)throw new Error('EVALUATION_INPUT_CHANGED');
 }else evaluation={schemaVersion:'groundtruth-study-content-evaluation.v1',evaluationId:fixtures.evaluationId,model:fixtures.model,provider:fixtures.provider,startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),fixtureHash,modelCodeHash,plannedCases:12,maxRequests:18,operatorIdentity,method:'Small 12-case engineering/content review: deterministic application-shape and exact-citation assertions, followed by a separate Codex inspection against pinned source facts. One planned output per task/repository; no human participants, learning study, model comparison or independently calibrated assessor.',limitations:['Three deliberately small JavaScript repositories and four content types; this is not broad repository coverage.','One planned sample per task/repository; no repeated-run consistency estimate or comparative model trial.','Codex content inspection can miss errors and is not a human teacher or learner study.','Automatic checks establish format, paths and quote identity; they do not establish factual correctness or unique MCQ defensibility.','No imported repository, generated student code or model-suggested command is executed. Coding feasibility is inspected, not runtime tested.','No evidence here establishes learning gains, grading fairness, mastery, outside-AI detection, authorship or reduced teacher workload.','Observed token/cache counts apply only to these calls; no measured total learner savings or cost comparison is claimed.'],cases:fixtures.repositories.flatMap(repository=>repository.cases.map(item=>({id:item.id,repository:repository.repository,task:item.task,label:item.label,attempts:[]})))};
 // Preserve historical checks under their captured code version. A stricter
 // later validator must not erase or silently reclassify baseline concerns.
 for(const result of evaluation.cases){const repository=fixtures.repositories.find(repository=>repository.repository===result.repository)!;if(result.output!==undefined&&evaluation.modelCodeHash===modelCodeHash)validateGenerated(result.task,result.output,snapshotFor(repository));}
 for(const revision of evaluation.revisions||[])if(revision.modelCodeHash===modelCodeHash)for(const result of revision.cases){const repository=fixtures.repositories.find(repository=>repository.repository===result.repository)!;if(result.output!==undefined)validateGenerated(result.task,result.output,snapshotFor(repository));}
 if(args.has('--check')){console.log(JSON.stringify({fixtures:'verified',repositories:3,cases:12,completed:evaluation.cases.filter(result=>result.output!==undefined).length,modelRequests:0}));return;}
 if(args.has('--report')){await checkpoint(evaluation,fixtures);console.log('Evaluation report refreshed without model requests.');return;}
 if(!args.has('--run')){console.log('Use --check, --report, or an explicitly authorized --run. No model request made.');return;}
 let target:Evaluation|Revision=evaluation;
 if(args.has('--recheck-concerns')){
  const revisionId='boundary-coding-fallback-v2',ids=new Set(['study-tasks-overview','study-tasks-coding','isarray-overview','isarray-coding']);
  evaluation.revisions??=[];let revision=evaluation.revisions.find(revision=>revision.id===revisionId);
  if(!revision){revision={id:revisionId,modelCodeHash,description:'General prompt corrections distinguish accepted/rejected bounds, require a single standalone coding implementation, and avoid unproved native/fallback equivalence. The coding schema now also supports replay of an intentionally blank editor. Raw baseline outputs and their four concerns remain unchanged.',startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),cases:evaluation.cases.filter(result=>ids.has(result.id)).map(result=>({id:result.id,repository:result.repository,task:result.task,label:result.label,attempts:[]}))};evaluation.revisions.push(revision);}
  if(revision.modelCodeHash!==modelCodeHash||revision.cases.length!==4)throw new Error('REVISION_INPUT_CHANGED');target=revision;
 }else if(evaluation.modelCodeHash!==modelCodeHash)throw new Error('EVALUATION_INPUT_CHANGED');
 const environment=new URL('../.env.production.local',import.meta.url);if(existsSync(environment))process.loadEnvFile(fileURLToPath(environment));
 const {getRuntime}=await import('../lib/cloud/runtime.ts'),{recordedStudy}=await import('../lib/study/model-receipts.ts');
 const config:RuntimeConfig=getRuntime();if(config.MODEL_CALLS_ENABLED!=='true'||config.MODEL_ID!==fixtures.model||!config.MODEL_API_KEY)throw new Error('EVALUATION_PROVIDER_NOT_CONFIGURED');
 await config.DB.prepare('SELECT 1 AS ready FROM study_model_receipts LIMIT 1').first();
 for(const repository of fixtures.repositories)for(const item of repository.cases){
  const result=target.cases.find(result=>result.id===item.id);if(!result)continue;
  if(result.output!==undefined)continue;
  const last=result.attempts.at(-1);if(last?.status==='running'){last.status='interrupted-unreplayed';await checkpoint(evaluation,fixtures);continue;}
  if(last&&(!args.has('--retry-failed')||last.status!=='failed'))continue;
  const requestCount=[...evaluation.cases,...(evaluation.revisions||[]).flatMap(revision=>revision.cases)].reduce((count,result)=>count+result.attempts.length,0);if(requestCount>=18)throw new Error('EVALUATION_REQUEST_CAP');
  const attempt:Attempt={index:requestCount+1,startedAt:new Date().toISOString(),status:'running'};result.attempts.push(attempt);await checkpoint(evaluation,fixtures);
  const started=Date.now();
  try{result.output=await recordedStudy(config,operatorIdentity,item.task,item.data,snapshotFor(repository));attempt.status='success';result.automaticChecks=automaticChecks(item.task,result.output,snapshotFor(repository));result.semanticReview={reviewer:'Codex source inspection',status:'not-reviewed',note:'Pending separate source-based content inspection.',factsChecked:[]};}
  catch(error){attempt.status='failed';attempt.errorCode=safeError(error);}
  attempt.completedAt=new Date().toISOString();attempt.wallLatencyMs=Math.max(0,Date.now()-started);
  try{attempt.receipt=await config.DB.prepare('SELECT task,provider,model,status,latency_ms AS latencyMs,input_tokens AS inputTokens,output_tokens AS outputTokens,cached_input_tokens AS cachedInputTokens,created_at AS createdAt FROM study_model_receipts WHERE owner_id=? AND pilot_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 1').bind(operatorIdentity,config.PILOT_ID||'groundtruth-pilot.v1',attempt.startedAt).first<Receipt>();}catch{attempt.receipt=null;}
  await checkpoint(evaluation,fixtures);console.log(JSON.stringify({case:item.id,status:attempt.status,errorCode:attempt.errorCode,latencyMs:attempt.receipt?.latencyMs??attempt.wallLatencyMs,inputTokens:attempt.receipt?.inputTokens??null,outputTokens:attempt.receipt?.outputTokens??null,cachedInputTokens:attempt.receipt?.cachedInputTokens??null}));
 }
 if(target.cases.every(result=>result.output!==undefined))target.completedAt=new Date().toISOString();target.updatedAt=new Date().toISOString();
 await checkpoint(evaluation,fixtures);console.log(JSON.stringify({evaluationId:evaluation.evaluationId,revision:args.has('--recheck-concerns')?'boundary-coding-fallback-v2':undefined,returned:target.cases.filter(result=>result.output!==undefined).length,planned:target.cases.length,totalAttempts:[...evaluation.cases,...(evaluation.revisions||[]).flatMap(revision=>revision.cases)].reduce((count,result)=>count+result.attempts.length,0)}));
}
main().catch(error=>{console.error(JSON.stringify({status:'evaluation-stopped',code:safeError(error)}));process.exitCode=1;});
