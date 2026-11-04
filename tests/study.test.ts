import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { handleStudy } from '../lib/study/server.ts';
import { validateGenerated,generateStudy } from '../lib/study/model.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
import type { ProjectSnapshot } from '../lib/learner/types.ts';
test('model-selected evidence IDs resolve to actual source instead of model-written quotations',()=>{
 const result=validateGenerated('hint',{feedback:'What is returned by this expression?',nextStep:'Trace src/app.ts.',evidenceIds:['f0-l0']},snapshot) as {evidence:{quote:string}[]};
 assert.equal(result.evidence[0].quote,snapshot.files[0].excerpt);
 assert.throws(()=>validateGenerated('hint',{feedback:'What is returned?',nextStep:'Trace the source.',evidenceIds:['invented']},snapshot),/Unknown source evidence/);
});
test('guidance rejects fabricated source quotes and answer-like hints',()=>{
 const valid={feedback:'What does the returned expression do with n?',nextStep:'Read the expression in src/app.ts.',evidence:[{path:'src/app.ts',quote:'return n * 2;'}]};
 assert.deepEqual(validateGenerated('hint',valid,snapshot),valid);
 assert.throws(()=>validateGenerated('hint',{...valid,evidence:[{path:'src/app.ts',quote:'return n * 3;'}]},snapshot),/Source quote/);
 assert.throws(()=>validateGenerated('hint',{...valid,feedback:'It always returns the correct value.'},snapshot),/inspection question/);
});
const origin='https://groundtruth.test';
function req(path:string,body?:unknown,method=body?'POST':'GET'){return new Request(origin+'/api'+path,{method,headers:body?{Origin:origin,'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});}
const snapshot:ProjectSnapshot={repository:'test/repo',url:'https://github.com/test/repo',commit:'a'.repeat(40),analysedAt:new Date().toISOString(),files:[{path:'src/app.ts',language:'TypeScript',excerpt:'export function double(n: number) { return n * 2; }'}],signals:[],suggestedMissionId:null,warnings:[]};
async function seed(c:RuntimeConfig,id='p',owner='student'){await c.DB.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(id,owner,'pilot','Understand the transformation',JSON.stringify(snapshot),new Date().toISOString(),'2099-01-01T00:00:00.000Z').run();}
const generated={format:'coding',starterCode:'// TODO: double the input',title:'Trace a change',prompt:'Complete a function that doubles the input.',kind:'trace',filePaths:['src/app.ts'],reviewPoints:['Follow the parameter.','Distinguish the returned expression.']};
test('signup permits users and pending teachers but rejects developer registration without granting privilege',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};const path='/account/profile';
 await assert.rejects(()=>handleStudy(req(path,{requestedRole:'developer',displayName:'X'}),c,'x',{requestedRole:'developer',displayName:'X'}),/Only user or teacher/);
 const out=await handleStudy(req(path,{displayName:'T',requestedRole:'teacher'}),c,'t',{displayName:'T',requestedRole:'teacher'});
 assert.equal(out?.status,201);
 const profile=await (await handleStudy(req(path),c,'t',{}))!.json() as {role:string;profile:{applicationStatus:string}};
 assert.equal(profile.role,'user');assert.equal(profile.profile.applicationStatus,'pending');
 await assert.rejects(()=>handleStudy(req(path,{displayName:'X',requestedRole:'user'}),c,'t',{displayName:'X',requestedRole:'user'}),/ACCOUNT_ALREADY_REGISTERED/);
 }finally{d.close();}
});
test('projects are owned, private until explicit sharing, and revoked teacher access is enforced',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot',STAFF_USER_ROLES:'{"teacher":"tutor"}'};await seed(c);
 await assert.rejects(()=>handleStudy(req('/study/projects/p'),c,'other',{}),/PROJECT_NOT_FOUND/);
 const read=async()=>await (await handleStudy(req('/study/teacher'),c,'teacher',{}))!.json() as {projects:unknown[]};
 assert.equal((await read()).projects.length,0);
 await handleStudy(req('/study/projects/p/share',{}),c,'student',{teacherId:'teacher',acknowledged:true});
 assert.equal((await read()).projects.length,1);
 await handleStudy(req('/study/projects/p/share',{}),c,'student',{teacherId:null});
 assert.equal((await read()).projects.length,0);
 await assert.rejects(()=>handleStudy(req('/study/teacher'),c,'student',{}),/TEACHER_REQUIRED/);
 }finally{d.close();}
});
test('independent mode blocks model assistance account-wide, hides private rubric, and freezes the submitted answer',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};await seed(c);await seed(c,'second');
 let calls=0;const gen=async()=>{calls++;return generated;};
 const out=await handleStudy(req('/study/projects/p/exercise',{}),c,'student',{questionFormat:'coding'},gen);
 const p=await out!.json() as {exercises:{id:string;prompt:Record<string,unknown>}[]};
 const id=p.exercises[0].id;assert.equal(p.exercises[0].prompt.reviewPoints,undefined);
 await handleStudy(req('/study/projects/p/independent',{}),c,'student',{exerciseId:id});
 await assert.rejects(()=>handleStudy(req('/study/projects/second/hint',{}),c,'student',{question:'Help me trace this.'},gen),/AI assistance is disabled/);assert.equal(calls,1);
 await handleStudy(req('/study/projects/p/submit',{}),c,'student',{exerciseId:id,answer:'The expression returns twice the input.'});
 await assert.rejects(()=>handleStudy(req('/study/projects/p/submit',{}),c,'student',{exerciseId:id,answer:'A changed answer after submission.'}),/EXERCISE_STATE_CHANGED/);
 const saved=await d.db.prepare('SELECT answer FROM study_exercises WHERE id=?').bind(id).first<{answer:string}>();assert.equal(saved?.answer,'The expression returns twice the input.');
 }finally{d.close();}
});
test('deleting a project cascades its generated exercises and learning events',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};await seed(c);
 await handleStudy(req('/study/projects/p/exercise',{}),c,'student',{questionFormat:'coding'},async()=>generated);
 await handleStudy(req('/study/projects/p',undefined,'DELETE'),c,'student',{});
 assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_events').first<{n:number}>())?.n,0);
 assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_exercises').first<{n:number}>())?.n,0);
 }finally{d.close();}
});
test('generated output rejects unsupported citations, fields and standards references',()=>{
 assert.throws(()=>validateGenerated('exercise',{...generated,filePaths:['private.env']},snapshot),/Unknown source/);
 assert.throws(()=>validateGenerated('exercise',{...generated,score:100},snapshot));
 assert.throws(()=>validateGenerated('analyse',{summary:'test',filePaths:['src/app.ts'],checks:[{referenceId:'made-up',status:'evidence-found',observation:'test',filePaths:['src/app.ts']}]},snapshot));
});
test('disabled local inference has no preset fallback and makes no network request',async()=>{
 const d=createTestDb();try{let calls=0;await assert.rejects(()=>generateStudy({DB:d.db},'s','exercise',{},snapshot,async()=>{calls++;return new Response();}),/No preset/);assert.equal(calls,0);}finally{d.close();}
});


test('manual editing preserves whitespace and rejects binary or oversized text',async()=>{
 const {editableSource}=await import('../lib/study/workspace.ts');
 const source='  indented();\n\n';assert.equal(editableSource(source),source);
 assert.equal(editableSource(''),'');assert.throws(()=>editableSource('x\0y'));assert.throws(()=>editableSource('x'.repeat(12001)));
});
test('utility source cannot acquire unrelated web-security review references',async()=>{
 const {applicableReferences}=await import('../lib/study/model.ts');
 const utility={...snapshot,files:[{path:'index.js',language:'JavaScript',excerpt:'module.exports = Array.isArray || function (arr) { return toString.call(arr) === "[object Array]"; };'}]};
 const refs=applicableReferences(utility).map(r=>r.id);
 assert.deepEqual(refs,['ecma-array','node-assert']);
});
test('concept evidence distinguishes unreviewed attempts from human review and rejects self-assessment',async()=>{
 const d=createTestDb();try{
 const c={DB:d.db,PILOT_ID:'pilot',STAFF_USER_ROLES:'{"teacher":"tutor"}'};await seed(c);
 const nodes={nodes:[{id:'double',title:'Doubling behavior',description:'Follow the multiplication.',category:'behavior',prerequisites:[],filePaths:['src/app.ts']},{id:'test-double',title:'Testing the function',description:'Choose cases for the function.',category:'testing',prerequisites:['double'],filePaths:['src/app.ts']}]};
 await handleStudy(req('/study/projects/p/concepts',{}),c,'student',{},async()=>nodes);
 const created=await (await handleStudy(req('/study/projects/p/exercise',{}),c,'student',{conceptId:'double',questionFormat:'coding'},async()=>generated))!.json() as {exercises:{id:string;conceptId:string}[]};
 assert.equal(created.exercises[0].conceptId,'double');
 const ex=created.exercises[0].id;
 await handleStudy(req('/study/projects/p/independent',{}),c,'student',{exerciseId:ex});
 await handleStudy(req('/study/projects/p/submit',{}),c,'student',{exerciseId:ex,answer:'I trace the input through the multiplication.'});
 const read=async()=>await (await handleStudy(req('/study/projects/p'),c,'student',{}))!.json() as {masteryIndex:number;concepts:{score:number}[];exercises:{reviews:unknown[]}[]};
 assert.equal((await read()).masteryIndex,13);
 const review={exerciseId:ex,level:'explained',note:'Synthetic teacher review based on the source and committed reasoning.'};
 await assert.rejects(()=>handleStudy(req('/study/reviews',{}),c,'student',review),/TEACHER_REQUIRED/);
 await assert.rejects(()=>handleStudy(req('/study/reviews',{}),c,'teacher',review),/REVIEW_TARGET_NOT_FOUND/);
 await handleStudy(req('/study/projects/p/share',{}),c,'student',{teacherId:'teacher',acknowledged:true});
 assert.equal((await handleStudy(req('/study/reviews',{}),c,'teacher',review))?.status,201);
 assert.equal((await read()).masteryIndex,35);
 await handleStudy(req('/study/reviews',{}),c,'teacher',{...review,level:'insufficient'});
 assert.equal((await read()).masteryIndex,0);
 assert.equal((await read()).exercises[0].reviews.length,2);
 await handleStudy(req('/study/projects/p/share',{}),c,'student',{teacherId:null});
 await assert.rejects(()=>handleStudy(req('/study/reviews',{}),c,'teacher',review),/REVIEW_TARGET_NOT_FOUND/);
 }finally{d.close();}
});
test('concept generation rejects cycles and file references outside the selected source',()=>{
 const node={id:'a',title:'A',description:'A source concept.',category:'behavior',filePaths:['src/app.ts'],prerequisites:[]};
 assert.throws(()=>validateGenerated('concepts',{nodes:[{...node,prerequisites:['b']},{...node,id:'b',prerequisites:['a']}]},snapshot),/cyclic prerequisites/);
 const ordered=validateGenerated('concepts',{nodes:[{...node,prerequisites:['b']},{...node,id:'b'}]},snapshot) as {nodes:{id:string}[]};
 assert.deepEqual(ordered.nodes.map(n=>n.id),['b','a']);
 assert.throws(()=>validateGenerated('concepts',{nodes:[node,{...node,id:'b',filePaths:['secret.ts']}]},snapshot),/invalid source links/);
});
test('the daily inference cap is enforced before networking and releases its lease',async()=>{
 const d=createTestDb();try{
 await d.db.prepare('INSERT INTO study_usage VALUES(?,?,60)').bind('student',new Date().toISOString().slice(0,10)).run();
 let calls=0;
 await assert.rejects(()=>generateStudy({DB:d.db,LOCAL_LLM_ENABLED:'true'},'student','exercise',{},snapshot,async()=>{calls++;return new Response();}),/Daily local-model/);
 assert.equal(calls,0);
 assert.equal((await d.db.prepare("SELECT count(*) AS n FROM coach_locks WHERE user_id='__study_model__'").first<{n:number}>())?.n,0);
 }finally{d.close();}
});

test('ending an independent attempt releases assistance without inventing a submission or mastery evidence',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};await seed(c);await seed(c,'second');
 const created=await (await handleStudy(req('/study/projects/p/exercise',{}),c,'student',{questionFormat:'coding'},async()=>generated))!.json() as {exercises:{id:string}[]};
 const id=created.exercises[0].id;await handleStudy(req('/study/projects/p/independent',{}),c,'student',{exerciseId:id});
 await assert.rejects(()=>handleStudy(req('/study/projects/second/hint',{}),c,'student',{question:'Where should I trace?'},async()=>({})),/disabled/);
 const ended=await (await handleStudy(req('/study/attempts/end',{}),c,'student',{}))!.json() as {ended:number;projects:{id:string;stats:{independentAttempts:number};exercises:{status:string;endedAt:string;answer:null;submittedAt:null}[]}[]};
 assert.equal(ended.ended,1);const project=ended.projects.find(p=>p.id==='p')!;assert.equal(project.exercises[0].status,'ended');assert.ok(project.exercises[0].endedAt);assert.equal(project.exercises[0].answer,null);assert.equal(project.exercises[0].submittedAt,null);assert.equal(project.stats.independentAttempts,0);
 const again=await (await handleStudy(req('/study/attempts/end',{}),c,'student',{}))!.json() as {ended:number};assert.equal(again.ended,0);
 assert.equal((await d.db.prepare("SELECT count(*) AS n FROM study_events WHERE kind='attempt-ended'").first<{n:number}>())?.n,1);
 const hint=await handleStudy(req('/study/projects/second/hint',{}),c,'student',{question:'Where should I trace?'},async()=>({feedback:'What expression receives n?',nextStep:'Inspect the returned expression.',evidence:[{path:'src/app.ts',quote:'return n * 2;'}]}));assert.equal(hint?.status,200);
 }finally{d.close();}
});
test('ending a guided activity frees its open-exercise slot and the ended activity cannot resume or submit',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};await seed(c);
 const created=await (await handleStudy(req('/study/projects/p/exercise',{}),c,'student',{questionFormat:'coding'},async()=>generated))!.json() as {exercises:{id:string}[]};const id=created.exercises[0].id;
 await handleStudy(req('/study/projects/p/end-attempt',{}),c,'student',{exerciseId:id});
 await handleStudy(req('/study/projects/p/end-attempt',{}),c,'student',{exerciseId:id});
 await assert.rejects(()=>handleStudy(req('/study/projects/p/independent',{}),c,'student',{exerciseId:id}),/EXERCISE_STATE_CHANGED/);
 await assert.rejects(()=>handleStudy(req('/study/projects/p/submit',{}),c,'student',{exerciseId:id,answer:'This answer must not be accepted after ending.'}),/EXERCISE_STATE_CHANGED/);
 const next=await (await handleStudy(req('/study/projects/p/exercise',{}),c,'student',{questionFormat:'coding'},async()=>({...generated,title:'A fresh exercise'})))!.json() as {exercises:{id:string;status:string}[]};assert.notEqual(next.exercises[0].id,id);assert.equal(next.exercises[0].status,'guided');
 }finally{d.close();}
});
test('global ending is scoped to the owner and pilot and never touches another learner',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};await seed(c);await seed(c,'other','another-student');
 const created=await (await handleStudy(req('/study/projects/other/exercise',{}),c,'another-student',{questionFormat:'coding'},async()=>generated))!.json() as {exercises:{id:string}[]};const id=created.exercises[0].id;
 await handleStudy(req('/study/projects/other/independent',{}),c,'another-student',{exerciseId:id});
 await assert.rejects(()=>handleStudy(req('/study/projects/other/end-attempt',{}),c,'student',{exerciseId:id}),/PROJECT_NOT_FOUND/);
 const mine=await (await handleStudy(req('/study/attempts/end',{}),c,'student',{}))!.json() as {ended:number};assert.equal(mine.ended,0);
 const otherPilot=await (await handleStudy(req('/study/attempts/end',{}),{...c,PILOT_ID:'other-pilot'},'another-student',{}))!.json() as {ended:number};assert.equal(otherPilot.ended,0);
 const row=await d.db.prepare('SELECT ended_at,status FROM study_exercises WHERE id=?').bind(id).first<{ended_at:null;status:string}>();assert.equal(row?.ended_at,null);assert.equal(row?.status,'independent');
 }finally{d.close();}
});
test('ending never changes a committed answer or awards ended attempts concept credit',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};await seed(c);
 await handleStudy(req('/study/projects/p/concepts',{}),c,'student',{},async()=>({nodes:[{id:'a',title:'Reading',description:'Read the expression.',category:'behavior',prerequisites:[],filePaths:['src/app.ts']},{id:'b',title:'Testing',description:'Test the expression.',category:'testing',prerequisites:['a'],filePaths:['src/app.ts']}]}));
 const created=await (await handleStudy(req('/study/projects/p/exercise',{}),c,'student',{conceptId:'a',questionFormat:'coding'},async()=>generated))!.json() as {exercises:{id:string}[]};let id=created.exercises[0].id;
 await handleStudy(req('/study/projects/p/independent',{}),c,'student',{exerciseId:id});await handleStudy(req('/study/projects/p/end-attempt',{}),c,'student',{exerciseId:id});
 const ended=await (await handleStudy(req('/study/projects/p'),c,'student',{}))!.json() as {masteryIndex:number};assert.equal(ended.masteryIndex,0);
 const next=await (await handleStudy(req('/study/projects/p/exercise',{}),c,'student',{conceptId:'a',questionFormat:'coding'},async()=>generated))!.json() as {exercises:{id:string}[]};id=next.exercises[0].id;
 await handleStudy(req('/study/projects/p/independent',{}),c,'student',{exerciseId:id});await handleStudy(req('/study/projects/p/submit',{}),c,'student',{exerciseId:id,answer:'A committed synthetic explanation supported by the expression.'});
 await assert.rejects(()=>handleStudy(req('/study/projects/p/end-attempt',{}),c,'student',{exerciseId:id}),/Submitted answers are retained/);
 await handleStudy(req('/study/attempts/end',{}),c,'student',{});
 const row=await d.db.prepare('SELECT answer,ended_at FROM study_exercises WHERE id=?').bind(id).first<{answer:string;ended_at:null}>();assert.match(row!.answer,/committed synthetic/);assert.equal(row?.ended_at,null);
 }finally{d.close();}
});
test('racing end and submit leaves one consistent terminal outcome',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};await seed(c);
 const created=await (await handleStudy(req('/study/projects/p/exercise',{}),c,'student',{questionFormat:'coding'},async()=>generated))!.json() as {exercises:{id:string}[]};const id=created.exercises[0].id;
 await handleStudy(req('/study/projects/p/independent',{}),c,'student',{exerciseId:id});
 await Promise.allSettled([handleStudy(req('/study/projects/p/end-attempt',{}),c,'student',{exerciseId:id}),handleStudy(req('/study/projects/p/submit',{}),c,'student',{exerciseId:id,answer:'A synthetic answer racing with the end action.'})]);
 const row=await d.db.prepare('SELECT status,ended_at,answer,submitted_at FROM study_exercises WHERE id=?').bind(id).first<{status:string;ended_at:string|null;answer:string|null;submitted_at:string|null}>();
 if(row!.ended_at){assert.equal(row!.answer,null);assert.equal(row!.submitted_at,null);assert.equal(row!.status,'independent');}else{assert.equal(row!.status,'submitted');assert.ok(row!.answer);assert.ok(row!.submitted_at);}
 }finally{d.close();}
});


