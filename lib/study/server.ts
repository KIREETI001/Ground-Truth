import { handleClasses } from './classes.ts';
import { shuffleMCQ,suggestedMCQResult,type MCQExercise } from './mcq.ts';
import { endAttempts } from './attempts.ts';
import { readStudySource,readStudySources,contextFromFullSource } from './source.ts';
import { cloudGitHubFetcher } from '../cloud/github-fetch.ts';
import { createRepositoryMap,focusedRepository,loadLearningPath } from './repository-server.ts';
import type { DiscoveryFetcher } from '../discovery/types.ts';
import type { StudyTask } from './model.ts';
import { localWorkspace, editableSource, type WorkingCopy, type ChangeProposal } from './workspace.ts';
import type { RuntimeConfig } from '../contracts.ts';
import type { ProjectSnapshot } from '../learner/types.ts';
import { analyseProject } from '../discovery/github.ts';
import { ApiError, fields, json, string } from '../server/http.ts';
import { platformRole } from '../server/access.ts';
import { generateStudy, validateGenerated, type StudyGenerator } from './model.ts';
import { references } from './types.ts';
const REPORT_VERSION=4;
const now=()=>new Date().toISOString();
const pilot=(c:RuntimeConfig)=>c.PILOT_ID||'groundtruth-pilot.v1';
type Row={id:string;owner_id:string;pilot_id:string;goal:string;snapshot_json:string;analysis_json:string|null;teacher_id:string|null;expires_at:string};
type Ex={ended_at?:string|null;concept_id?:string|null;id:string;project_id:string;prompt_json:string;rubric_json:string;status:string;answer:string|null;feedback_json:string|null;started_at:string|null;submitted_at:string|null};
async function event(c:RuntimeConfig,id:string,kind:string,detail:unknown,exerciseId:string|null=null){await c.DB.prepare('INSERT INTO study_events(id,project_id,exercise_id,kind,detail_json,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,exerciseId,kind,JSON.stringify(detail),now()).run();}
async function own(c:RuntimeConfig,id:string,user:string){const row=await c.DB.prepare('SELECT * FROM study_projects WHERE id=? AND owner_id=? AND pilot_id=? AND expires_at>?').bind(id,user,pilot(c),now()).first<Row>();if(!row)throw new ApiError(404,'PROJECT_NOT_FOUND');return row;}
async function independent(c:RuntimeConfig,user:string){return !!await c.DB.prepare("SELECT e.id FROM study_exercises e JOIN study_projects p ON p.id=e.project_id WHERE p.owner_id=? AND p.pilot_id=? AND e.status='independent' AND e.ended_at IS NULL AND p.expires_at>?").bind(user,pilot(c),now()).first();}
function publicExercise(e:Ex){return {conceptId:e.concept_id||null,id:e.id,prompt:JSON.parse(e.prompt_json),status:e.ended_at?'ended':e.status,endedAt:e.ended_at||null,mcqResult:suggestedMCQResult(e.ended_at?'ended':e.status,e.answer,JSON.parse(e.rubric_json)),answer:e.answer,feedback:e.feedback_json&&JSON.parse(e.feedback_json).version===REPORT_VERSION?JSON.parse(e.feedback_json).report:null,startedAt:e.started_at,submittedAt:e.submitted_at};}
async function view(c:RuntimeConfig,p:Row){
 const exercises=await c.DB.prepare('SELECT e.*,c.local_id AS concept_id FROM study_exercises e LEFT JOIN study_exercise_concepts l ON l.exercise_id=e.id LEFT JOIN study_concepts c ON c.id=l.concept_id WHERE e.project_id=? ORDER BY e.created_at DESC,e.rowid DESC LIMIT 20').bind(p.id).all<Ex>();
 const events=await c.DB.prepare('SELECT kind,detail_json,created_at FROM study_events WHERE project_id=? ORDER BY created_at DESC LIMIT 60').bind(p.id).all<{kind:string;detail_json:string;created_at:string}>();
 const reviews=await c.DB.prepare('SELECT r.exercise_id AS exerciseId,r.level,r.note,r.teacher_id AS teacherId,r.created_at AS createdAt FROM study_reviews r JOIN study_exercises e ON e.id=r.exercise_id WHERE e.project_id=? ORDER BY r.created_at DESC,r.rowid DESC LIMIT 100').bind(p.id).all<{exerciseId:string;level:string;note:string;teacherId:string;createdAt:string}>();
 const stats=await c.DB.prepare("SELECT (SELECT count(*) FROM study_events WHERE project_id=? AND kind='assistance-requested') AS guidanceRequests,(SELECT count(*) FROM study_exercises WHERE project_id=? AND status='submitted') AS independentAttempts,(SELECT count(*) FROM study_events WHERE project_id=? AND kind='change-applied' AND json_extract(detail_json,'$.mode')='ai') AS aiChanges,(SELECT count(*) FROM study_events WHERE project_id=? AND kind='change-applied' AND json_extract(detail_json,'$.mode')='manual-declared') AS manualChanges").bind(p.id,p.id,p.id,p.id).first();
 const conceptRows=await c.DB.prepare("SELECT c.*, (SELECT count(*) FROM study_exercise_concepts l JOIN study_exercises e ON e.id=l.exercise_id WHERE l.concept_id=c.id AND e.status='submitted') AS attempts, (SELECT r.level FROM study_reviews r JOIN study_exercise_concepts l ON l.exercise_id=r.exercise_id WHERE l.concept_id=c.id ORDER BY r.created_at DESC,r.rowid DESC LIMIT 1) AS reviewed_level FROM study_concepts c WHERE c.project_id=? ORDER BY c.ordinal").bind(p.id).all<{local_id:string;title:string;description:string;category:string;file_paths_json:string;prerequisites_json:string;attempts:number;reviewed_level:string|null}>();
 const levels:Record<string,number>={insufficient:0,supported:40,explained:70,transferred:100};
 const concepts=conceptRows.results.map(n=>({id:n.local_id,title:n.title,description:n.description,category:n.category,filePaths:JSON.parse(n.file_paths_json),prerequisites:JSON.parse(n.prerequisites_json),attempts:n.attempts,score:n.reviewed_level?levels[n.reviewed_level]:n.attempts?25:0,state:n.reviewed_level?'Human review: '+n.reviewed_level:n.attempts?'Independent attempt · unreviewed':'Not attempted'}));
 const masteryIndex=concepts.length?Math.round(concepts.reduce((sum,n)=>sum+n.score,0)/concepts.length):0;
 return {learningPath:await loadLearningPath(c,p.id),concepts,masteryIndex,stats,id:p.id,goal:p.goal,snapshot:JSON.parse(p.snapshot_json),analysis:p.analysis_json&&JSON.parse(p.analysis_json).version===REPORT_VERSION?JSON.parse(p.analysis_json).report:null,teacherId:p.teacher_id,exercises:exercises.results.map(e=>({...publicExercise(e),reviews:reviews.results.filter(r=>r.exerciseId===e.id)})),events:events.results.map(e=>({kind:e.kind,detail:JSON.parse(e.detail_json),createdAt:e.created_at})),references};
}
export async function handleStudy(request:Request,c:RuntimeConfig,user:string|null,body:Record<string,unknown>,generator?:StudyGenerator,discoveryFetcher?:DiscoveryFetcher):Promise<Response|null>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/study')&&!path.startsWith('/api/account/'))return null;
 if(!user)throw new ApiError(401,'AUTH_REQUIRED');
 const classes=await handleClasses(request,c,user,body);if(classes)return classes;
 if(path==='/api/account/profile'){
  if(request.method==='GET')return json({profile:await c.DB.prepare('SELECT display_name AS displayName,requested_role AS requestedRole,application_status AS applicationStatus FROM account_profiles WHERE user_id=?').bind(user).first(),role:await platformRole(c,user)});
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
  fields(body,['displayName','requestedRole']);
  const name=string(body.displayName,'displayName',1,100);
  if(body.requestedRole!=='user'&&body.requestedRole!=='teacher')throw new ApiError(400,'SIGNUP_ROLE_INVALID','Only user or teacher registration is available.');
  const saved=await c.DB.prepare('INSERT OR IGNORE INTO account_profiles(user_id,pilot_id,display_name,requested_role,application_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(user,pilot(c),name,body.requestedRole,body.requestedRole==='teacher'?'pending':'none',now(),now()).run();
  if(!saved.meta.changes)throw new ApiError(409,'ACCOUNT_ALREADY_REGISTERED');
  return json({registered:true,teacherApprovalPending:body.requestedRole==='teacher'},201);
 }
 if(path==='/api/study/reviews'){
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
  if(await platformRole(c,user)!=='teacher')throw new ApiError(403,'TEACHER_REQUIRED');
  fields(body,['exerciseId','level','note']);
  const exerciseId=string(body.exerciseId,'exerciseId',1,100),note=string(body.note,'note',10,1500);
  if(typeof body.level!=='string'||!['insufficient','supported','explained','transferred'].includes(body.level))throw new ApiError(400,'INVALID_REVIEW_LEVEL');
  const saved=await c.DB.prepare("INSERT INTO study_reviews(id,exercise_id,teacher_id,level,note,created_at) SELECT ?,e.id,?,?,?,? FROM study_exercises e JOIN study_projects p ON p.id=e.project_id WHERE e.id=? AND p.teacher_id=? AND p.pilot_id=? AND p.expires_at>? AND e.status='submitted'").bind(crypto.randomUUID(),user,body.level,note,now(),exerciseId,user,pilot(c),now()).run();
  if(!saved.meta.changes)throw new ApiError(404,'REVIEW_TARGET_NOT_FOUND');
  return json({saved:true},201);
 }
 if(path==='/api/study/teacher'){
  const role=await platformRole(c,user);
  if(role!=='teacher'&&role!=='developer')throw new ApiError(403,'TEACHER_REQUIRED');
  if(request.method!=='GET')throw new ApiError(405,'METHOD_NOT_ALLOWED');
  const rows=await c.DB.prepare('SELECT * FROM study_projects WHERE teacher_id=? AND pilot_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 50').bind(user,pilot(c),now()).all<Row>();
  return json({teacherId:user,projects:await Promise.all(rows.results.map(p=>view(c,p)))});
 }
 if(path==='/api/study/attempts/end'){
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
  fields(body,[]);
  const result=await endAttempts(c,user);
  const rows=await c.DB.prepare('SELECT * FROM study_projects WHERE owner_id=? AND pilot_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 10').bind(user,pilot(c),now()).all<Row>();
  return json({...result,projects:await Promise.all(rows.results.map(p=>view(c,p)))});
 }
 if(path==='/api/study/collection/remove-repository'){
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
  fields(body,['repository']);const repository=string(body.repository,'repository',3,250);
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(repository))throw new ApiError(400,'REPOSITORY_INVALID');
  const removed=await c.DB.batch([
   c.DB.prepare("DELETE FROM study_projects WHERE owner_id=? AND pilot_id=? AND json_extract(snapshot_json,'$.repository')=?").bind(user,pilot(c),repository),
   c.DB.prepare("DELETE FROM study_repository_maps WHERE owner_id=? AND pilot_id=? AND json_extract(map_json,'$.repository')=?").bind(user,pilot(c),repository)
  ]);
  return json({removedPaths:removed[0].meta.changes,removedMaps:removed[1].meta.changes});
 }
 if(path==='/api/study/repository-maps'){
  if(request.method==='GET'){const maps=await c.DB.prepare('SELECT map_json FROM study_repository_maps WHERE owner_id=? AND pilot_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 6').bind(user,pilot(c),now()).all<{map_json:string}>();return json({maps:maps.results.map(m=>JSON.parse(m.map_json))});}
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
  return json(await createRepositoryMap(c,user,body,()=>independent(c,user),generator,discoveryFetcher),201);
 }
 if(path==='/api/study/projects'){
  if(request.method==='GET'){const rows=await c.DB.prepare('SELECT * FROM study_projects WHERE owner_id=? AND pilot_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 10').bind(user,pilot(c),now()).all<Row>();return json({projects:await Promise.all(rows.results.map(p=>view(c,p)))});}
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
  if(body.acknowledged!==true)throw new ApiError(400,'SOURCE_CONSENT_REQUIRED');
  if(await independent(c,user))throw new ApiError(409,'INDEPENDENT_MODE','Finish your independent attempt before opening another learning path.');
  const focus=body.mapId!==undefined?await focusedRepository(c,user,body,discoveryFetcher):null;
  if(!focus){fields(body,['url','commit','paths','goal','acknowledged']);if(!Array.isArray(body.paths)||body.paths.length>3)throw new ApiError(400,'SELECT_UP_TO_THREE_FILES');}
  const goal=focus?.goal||string(body.goal,'goal',8,600);
  const snapshot=focus?.snapshot||await analyseProject({url:body.url,commit:body.commit,paths:body.paths},cloudGitHubFetcher(c,discoveryFetcher));
  if(await independent(c,user))throw new ApiError(409,'INDEPENDENT_MODE');
  const id=crypto.randomUUID();
  const inserts=[c.DB.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT count(*) FROM study_projects WHERE owner_id=? AND expires_at>?)<6').bind(id,user,pilot(c),goal,JSON.stringify(snapshot),now(),new Date(Date.now()+30*86400000).toISOString(),user,now())];
  if(focus){const l=focus.learningPath;inserts.push(c.DB.prepare('INSERT INTO study_learning_paths(project_id,purpose,area,feature_title,concepts_json,transfer_goal,map_id) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM study_projects WHERE id=?)').bind(id,l.purpose,l.area,l.featureTitle,JSON.stringify(l.concepts),l.transferGoal,l.mapId,id));}
  const saved=await c.DB.batch(inserts);
  if(!saved[0].meta.changes)throw new ApiError(409,'PROJECT_LIMIT','Keep at most six active learning paths.');
  await event(c,id,'project-imported',{commit:snapshot.commit,paths:snapshot.files.map(f=>f.path)});
  return json(await view(c,await own(c,id,user)),201);
 }
 const match=path.match(/^\/api\/study\/projects\/([^/]+)(?:\/([^/]+))?$/);
 if(!match)throw new ApiError(404,'NOT_FOUND');
 const [,id,action]=match,p=await own(c,id,user),snapshot=JSON.parse(p.snapshot_json) as ProjectSnapshot;
 const learningPath=await loadLearningPath(c,id);
 if(action==='source'&&request.method==='GET')return json(await readStudySource(c,snapshot,string(new URL(request.url).searchParams.get('path'),'path',1,250)));
 const call=async(task:StudyTask,data:unknown,sources:ProjectSnapshot=snapshot)=>{
  if(await independent(c,user))throw new ApiError(403,'INDEPENDENT_MODE','AI assistance is disabled during your independent attempt.');
  const context={...(data as Record<string,unknown>),learningPath};
  if(sources===snapshot&&(c.CLOUD_ENABLED==='true'||c.LOCAL_WORKSPACE_TOKEN)&&!generator)sources=contextFromFullSource(snapshot,await readStudySources(c,snapshot));
  const out=generator?validateGenerated(task,await generator(task,context,sources),sources):await generateStudy(c,user,task,context,sources);
  if(await independent(c,user))throw new ApiError(409,'EXERCISE_STATE_CHANGED','The activity became independent. The generated response was discarded.');
  return out;
 };
 const workspaceInput={ownerId:user,projectId:id};
 if(learningPath?.purpose==='transfer'&&['working-copy','workspace','propose-manual','propose-ai','apply-change'].includes(action))throw new ApiError(403,'REFERENCE_REPOSITORY_READ_ONLY','This learning path uses a public reference. Plan an original implementation for your own project instead of editing this repository.');
 if(action==='working-copy'&&request.method==='GET')return json(await localWorkspace<WorkingCopy>(c,'read',workspaceInput));
 if(!action&&request.method==='GET')return json(await view(c,p));
 if(!action&&request.method==='DELETE'){await c.DB.prepare('DELETE FROM study_projects WHERE id=? AND owner_id=?').bind(id,user).run();return json({deleted:true});}
 if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
 if(['workspace','propose-manual','propose-ai','apply-change'].includes(action)){
  if(await independent(c,user))throw new ApiError(403,'INDEPENDENT_MODE','Finish the independent attempt before changing code.');
  if(action==='workspace'){
   fields(body,['ownershipConfirmed']);
   return json(await localWorkspace<WorkingCopy>(c,'create',{...workspaceInput,url:p.snapshot_json?JSON.parse(p.snapshot_json).url:'',commit:snapshot.commit,paths:snapshot.files.map(f=>f.path),ownershipConfirmed:body.ownershipConfirmed}));
  }
  if(action==='apply-change'){
   fields(body,['proposalId','confirmed']);
   const proposal=await localWorkspace<ChangeProposal>(c,'apply',{...workspaceInput,proposalId:string(body.proposalId,'proposalId',1,100),confirmed:body.confirmed});
   await c.DB.prepare('INSERT OR IGNORE INTO study_events(id,project_id,exercise_id,kind,detail_json,created_at) VALUES(?,?,NULL,?,?,?)').bind(proposal.id,id,'change-applied',JSON.stringify({path:proposal.path,mode:proposal.mode,summary:proposal.summary,baseHash:proposal.baseHash,resultHash:proposal.resultHash}),proposal.appliedAt||now()).run();
   return json({proposal,workingCopy:await localWorkspace<WorkingCopy>(c,'read',workspaceInput),project:await view(c,p)});
  }
  fields(body,action==='propose-ai'?['path','baseHash','intent']:['path','baseHash','source']);
  const pathName=string(body.path,'path',1,250),baseHash=string(body.baseHash,'baseHash',64,64);
  const working=await localWorkspace<WorkingCopy>(c,'read',workspaceInput);
  const file=working.files.find(f=>f.path===pathName);
  if(!file||file.hash!==baseHash)throw new ApiError(409,'WORKING_FILE_CHANGED','Reload this selected file before proposing a change.');
  let source:string,summary:string;
  if(action==='propose-ai'){
   if(file.source.length>4000)throw new ApiError(400,'AI_EDIT_FILE_TOO_LARGE','AI proposals currently support files up to 4,000 characters. Use the manual editor for this file.');
   const intent=string(body.intent,'intent',8,600);
   const context={...snapshot,files:[{path:file.path,language:snapshot.files.find(f=>f.path===file.path)?.language||'source',excerpt:file.source}]};
   const result=await call('change',{goal:p.goal,intent,filePath:file.path},context) as {summary:string;source:string};
   source=result.source;summary=result.summary;
   await event(c,id,'ai-change-proposed',{path:pathName,summary});
  }else{source=editableSource(body.source);summary='Declared manual change to '+pathName;}
  return json(await localWorkspace<ChangeProposal>(c,'propose',{...workspaceInput,path:pathName,baseHash,source,summary,mode:action==='propose-ai'?'ai':'manual-declared'}));
 }
 if(action==='concepts'){
  fields(body,[]);
  if(await c.DB.prepare('SELECT id FROM study_concepts WHERE project_id=? LIMIT 1').bind(id).first())return json(await view(c,p));
  const result=await call('concepts',{goal:p.goal}) as {nodes:{id:string;title:string;description:string;category:string;filePaths:string[];prerequisites:string[]}[]};
  await c.DB.batch(result.nodes.map((node,i)=>c.DB.prepare('INSERT INTO study_concepts(id,project_id,local_id,title,description,category,file_paths_json,prerequisites_json,ordinal) VALUES(?,?,?,?,?,?,?,?,?)').bind(id+':'+node.id,id,node.id,node.title,node.description,node.category,JSON.stringify(node.filePaths),JSON.stringify(node.prerequisites),i)));
  await event(c,id,'concept-map-generated',{nodes:result.nodes.length});return json(await view(c,p));
 }
 if(action==='share'){
  fields(body,['teacherId','acknowledged']);
  const teacher=body.teacherId===null?null:string(body.teacherId,'teacherId',1,200);
  if(teacher){if(body.acknowledged!==true)throw new ApiError(400,'SHARING_CONSENT_REQUIRED');const role=await platformRole(c,teacher);if(role!=='teacher')throw new ApiError(400,'TEACHER_NOT_ASSIGNED','This account is not an approved teacher in this pilot.');}
  await c.DB.prepare('UPDATE study_projects SET teacher_id=? WHERE id=? AND owner_id=?').bind(teacher,id,user).run();
  await event(c,id,'sharing-updated',{shared:!!teacher});
  return json(await view(c,await own(c,id,user)));
 }
 if(action==='end-attempt'){
  fields(body,['exerciseId']);
  const exerciseId=string(body.exerciseId,'exerciseId',1,100);
  const exercise=await c.DB.prepare('SELECT status,ended_at FROM study_exercises WHERE id=? AND project_id=?').bind(exerciseId,id).first<{status:string;ended_at:string|null}>();
  if(!exercise)throw new ApiError(404,'EXERCISE_NOT_FOUND');
  if(exercise.status==='submitted')throw new ApiError(409,'ANSWER_ALREADY_SUBMITTED','Submitted answers are retained; you can start another exercise.');
  await endAttempts(c,user,{projectId:id,exerciseId});
  return json(await view(c,p));
 }
 if(action==='independent'){
  fields(body,['exerciseId']);
  const exId=string(body.exerciseId,'exerciseId',1,100);
  const busy=await c.DB.prepare('SELECT token FROM coach_locks WHERE user_id=? AND expires_at>?').bind('__study_model__',now()).first();
  if(busy)throw new ApiError(409,'MODEL_STILL_RUNNING','Wait for the active model request to finish before starting independently.');
  const changed=await c.DB.prepare("UPDATE study_exercises SET status='independent',started_at=? WHERE id=? AND project_id=? AND status='guided' AND ended_at IS NULL").bind(now(),exId,id).run();
  if(!changed.meta.changes)throw new ApiError(409,'EXERCISE_STATE_CHANGED');
  await event(c,id,'independent-started',{},exId);return json(await view(c,p));
 }
 if(action==='submit'){
  fields(body,['exerciseId','answer','optionId']);
  const exId=string(body.exerciseId,'exerciseId',1,100);
  const exercise=await c.DB.prepare("SELECT prompt_json FROM study_exercises WHERE id=? AND project_id=? AND status='independent' AND ended_at IS NULL").bind(exId,id).first<{prompt_json:string}>();
  if(!exercise)throw new ApiError(409,'EXERCISE_STATE_CHANGED');
  const prompt=JSON.parse(exercise.prompt_json);let answer:string;
  if(prompt.format==='mcq'){
   const option=prompt.options?.find((o:{id:string;text:string})=>o.id===body.optionId);
   if(!option)throw new ApiError(400,'MCQ_OPTION_REQUIRED','Choose one of the listed answers.');
   const reason=body.answer===undefined||body.answer===''?'':string(body.answer,'answer',1,800);
   answer=option.id+'. '+option.text+(reason?'\nReasoning: '+reason:'');
  }else{if(body.optionId!==undefined)throw new ApiError(400,'NOT_A_MULTIPLE_CHOICE_QUESTION');answer=string(body.answer,'answer',prompt.format==='coding'?1:10,prompt.format==='coding'?1500:5000);}
  const saved=await c.DB.prepare("UPDATE study_exercises SET status='submitted',answer=?,submitted_at=? WHERE id=? AND project_id=? AND status='independent' AND ended_at IS NULL").bind(answer,now(),exId,id).run();
  if(!saved.meta.changes)throw new ApiError(409,'EXERCISE_STATE_CHANGED');
  await event(c,id,'independent-submitted',{},exId);return json(await view(c,p));
 }
 if(!['analyse','exercise','hint','feedback'].includes(action))throw new ApiError(404,'NOT_FOUND');
 if(await independent(c,user))throw new ApiError(403,'INDEPENDENT_MODE','AI assistance is disabled during your independent attempt. Submit your answer or end the attempt first.');

 if(action==='analyse'){
  fields(body,[]);const result=await call('analyse',{goal:p.goal});
  await c.DB.prepare('UPDATE study_projects SET analysis_json=? WHERE id=? AND owner_id=?').bind(JSON.stringify({version:REPORT_VERSION,report:result}),id,user).run();await event(c,id,'analysis-generated',{});
  return json(await view(c,await own(c,id,user)));
 }
 if(action==='exercise'){
  fields(body,['conceptId','workingPath','transferChallenge','questionFormat']);
  if(body.transferChallenge!==undefined&&typeof body.transferChallenge!=='boolean')throw new ApiError(400,'TRANSFER_CHALLENGE_INVALID');
  if(body.transferChallenge===true&&learningPath?.purpose!=='transfer')throw new ApiError(400,'TRANSFER_PATH_REQUIRED');
  if(body.workingPath!==undefined&&learningPath?.purpose==='transfer')throw new ApiError(403,'REFERENCE_REPOSITORY_READ_ONLY');
  if(body.questionFormat!==undefined&&!['mcq','coding'].includes(String(body.questionFormat)))throw new ApiError(400,'QUESTION_FORMAT_INVALID');
  const questionFormat=body.questionFormat||'mcq';
  const conceptId=body.conceptId===undefined?null:string(body.conceptId,'conceptId',1,32);
  const concept=conceptId?await c.DB.prepare('SELECT id,title,description FROM study_concepts WHERE project_id=? AND local_id=?').bind(id,conceptId).first<{id:string;title:string;description:string}>():null;
  if(conceptId&&!concept)throw new ApiError(400,'CONCEPT_NOT_IN_PROJECT');
  let exerciseSnapshot=snapshot;
  let sourceContext: {path:string;source:string;hash:string;label:string}|undefined;
  if(body.workingPath!==undefined){
   const name=string(body.workingPath,'workingPath',1,250);
   const copy=await localWorkspace<WorkingCopy>(c,'read',workspaceInput),file=copy.files.find(f=>f.path===name);
   if(!file||file.source.length>6000)throw new ApiError(400,'WORKING_FILE_UNAVAILABLE');
   sourceContext={path:file.path,source:file.source,hash:file.hash,label:c.CLOUD_ENABLED==='true'?'Cloud draft · not pushed to GitHub':'Local working copy · uncommitted'};
   exerciseSnapshot={...snapshot,files:[{path:file.path,language:snapshot.files.find(f=>f.path===file.path)?.language||'source',excerpt:file.source}]};
  }

  const active=await c.DB.prepare("SELECT id FROM study_exercises WHERE project_id=? AND status IN ('guided','independent') AND ended_at IS NULL").bind(id).first();if(active)throw new ApiError(409,'OPEN_EXERCISE','Finish or end the current exercise first.');
  const previous=await c.DB.prepare('SELECT prompt_json FROM study_exercises WHERE project_id=? ORDER BY created_at DESC LIMIT 3').bind(id).all();
  let out=await call('exercise',{goal:p.goal,concept:concept?{title:concept.title,description:concept.description}:null,sourceLabel:sourceContext?.label,previous:previous.results,transferChallenge:body.transferChallenge===true,questionFormat},exerciseSnapshot) as {title:string;prompt:string;kind:string;filePaths:string[];reviewPoints:string[];format?:'mcq'|'coding';starterCode?:string;options?:{id:string;text:string}[];correctOption?:string;answerExplanation?:string};
  if(questionFormat==='mcq'&&out.format!=='mcq')throw new ApiError(503,'MCQ_GENERATION_FAILED','The AI model did not return a multiple-choice question. Please retry.');
  if(questionFormat==='coding'&&out.format!=='coding')throw new ApiError(503,'CODING_GENERATION_FAILED','The AI model did not return a short coding task. Please retry.');
  if(out.format==='mcq')out=shuffleMCQ(out as typeof out & MCQExercise);
  if(body.transferChallenge===true&&out.kind!=='change-plan')throw new ApiError(503,'TRANSFER_CHALLENGE_INVALID','The AI model did not return an adaptation exercise. Retry generation.');
  const {reviewPoints,correctOption,answerExplanation,...prompt}=out,exId=crypto.randomUUID();
  const statements=[c.DB.prepare("INSERT OR IGNORE INTO study_exercises(id,project_id,prompt_json,rubric_json,status,created_at) VALUES(?,?,?,?,'guided',?)").bind(exId,id,JSON.stringify({...prompt,...(body.transferChallenge===true?{intent:'transfer'}:{}),...(sourceContext?{sourceContext}:{})}),JSON.stringify(out.format==='mcq'?{reviewPoints,mcq:{correctOption,answerExplanation}}:reviewPoints),now())];
  if(concept)statements.push(c.DB.prepare('INSERT INTO study_exercise_concepts(exercise_id,concept_id) SELECT ?,? WHERE EXISTS(SELECT 1 FROM study_exercises WHERE id=? AND project_id=?)').bind(exId,concept.id,exId,id));
  const inserted=await c.DB.batch(statements);
  if(!inserted[0].meta.changes)throw new ApiError(409,'OPEN_EXERCISE','An exercise is already active. Reload the saved project.');
  await event(c,id,'exercise-generated',{kind:out.kind},exId);return json(await view(c,p));
 }
 if(action==='hint'){
  fields(body,['question','sessionId']);const question=string(body.question,'question',3,1000);const sessionId=body.sessionId===undefined?null:string(body.sessionId,'sessionId',1,100);await event(c,id,'guidance-query',{question,sessionId});
  const out=await call('hint',{goal:p.goal,question});
  await event(c,id,'assistance-requested',{question,response:out});
  return json({response:out,project:await view(c,p)});
 }
 fields(body,['exerciseId']);const exId=string(body.exerciseId,'exerciseId',1,100);
 const ex=await c.DB.prepare("SELECT * FROM study_exercises WHERE id=? AND project_id=? AND status='submitted'").bind(exId,id).first<Ex>();
 if(!ex)throw new ApiError(409,'SUBMIT_FIRST');
 if(ex.feedback_json&&JSON.parse(ex.feedback_json).version===REPORT_VERSION)return json(await view(c,p));
 const prompt=JSON.parse(ex.prompt_json);
 const feedbackSnapshot=prompt.sourceContext?{...snapshot,files:[{path:prompt.sourceContext.path,language:'source',excerpt:prompt.sourceContext.source}]}:snapshot;
 const out=await call('feedback',{goal:p.goal,prompt,reviewPoints:JSON.parse(ex.rubric_json),answer:ex.answer},feedbackSnapshot);
 await c.DB.prepare('UPDATE study_exercises SET feedback_json=? WHERE id=? AND project_id=?').bind(JSON.stringify({version:REPORT_VERSION,report:out}),exId,id).run();
 await event(c,id,'formative-feedback',{},exId);return json(await view(c,p));
}

