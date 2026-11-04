import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { handleStudy } from '../lib/study/server.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
import type { ProjectSnapshot } from '../lib/learner/types.ts';
import type { StudyProject } from '../lib/study/types.ts';
import type { QueryClient } from '../lib/cloud/postgres-d1.ts';

const snapshot:ProjectSnapshot={repository:'same/shared-repository',url:'https://github.com/same/shared-repository',commit:'a'.repeat(40),analysedAt:'2026-11-01T00:00:00.000Z',files:[{path:'index.ts',language:'TypeScript',excerpt:'export const value = 1;'}],signals:[],suggestedMissionId:null,warnings:[]};
const rubricSentinel='PRIVATE_RUBRIC: inspect the exported source constant.';
const rationaleSentinel='PRIVATE_RATIONALE: the exported constant is one.';
const quiz={format:'mcq' as const,title:'Trace an exported value',prompt:'Which value does this module export?',kind:'trace',filePaths:['index.ts'],reviewPoints:[rubricSentinel,'Compare each option with the expression.'],options:[{id:'A',text:'The number one.'},{id:'B',text:'The number two.'},{id:'C',text:'An empty string.'},{id:'D',text:'No value.'}],correctOption:'A',answerExplanation:rationaleSentinel};
const at=(hour=0)=>new Date(Date.UTC(2026,10,1,hour)).toISOString();
const request=(path:string,method='GET')=>new Request('https://groundtruth.test/api/study/'+path,{method});
const config=(DB:D1Database):RuntimeConfig=>({DB,PILOT_ID:'pilot',STAFF_USER_ROLES:JSON.stringify({teacher:'tutor',otherTeacher:'tutor'})});
async function read<T=StudyProject>(c:RuntimeConfig,user:string,path:string):Promise<T>{
 return await (await handleStudy(request(path),c,user,{}))!.json() as T;
}
async function post<T=StudyProject>(c:RuntimeConfig,user:string,path:string,body:Record<string,unknown>):Promise<T>{
 return await (await handleStudy(request(path,'POST'),c,user,body))!.json() as T;
}
async function seedProject(c:RuntimeConfig,id:string,owner:string,teacher:string|null=null,pilot='pilot'){
 await c.DB.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,teacher_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,owner,pilot,'Understand the module’s exported value.',JSON.stringify(snapshot),teacher,at(),'2099-01-01T00:00:00.000Z').run();
}
async function profile(c:RuntimeConfig,user:string,name:string,pilot='pilot',requestedRole='user',status='none'){
 await c.DB.prepare('INSERT INTO account_profiles(user_id,pilot_id,display_name,requested_role,application_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(user,pilot,name,requestedRole,status,at(),at()).run();
}
async function enrollment(c:RuntimeConfig,id:string,teacher:string,learner:string,name:string,pilot='pilot'){
 await c.DB.prepare('INSERT INTO teacher_classes(id,teacher_id,pilot_id,name,join_code,created_at) VALUES(?,?,?,?,?,?)').bind(id,teacher,pilot,name,id,at()).run();
 await c.DB.prepare('INSERT INTO class_enrollments(class_id,student_id,joined_at) VALUES(?,?,?)').bind(id,learner,at()).run();
}
async function committed(c:RuntimeConfig,projectId:string,id:string,index:number){
 const {reviewPoints,correctOption,answerExplanation,...prompt}=quiz;
 await c.DB.prepare("INSERT INTO study_exercises(id,project_id,prompt_json,rubric_json,status,answer,created_at,started_at,submitted_at) VALUES(?,?,?,?,'submitted',?,?,?,?)").bind(id,projectId,JSON.stringify(prompt),JSON.stringify({reviewPoints,mcq:{correctOption,answerExplanation}}),'B. The number two.',at(index),at(index+1),at(index+2)).run();
}
async function savedReview(c:RuntimeConfig,exerciseId:string,id:string,date:string){
 await c.DB.prepare("INSERT INTO study_reviews(id,exercise_id,teacher_id,level,note,created_at) VALUES(?,?,'teacher','supported','Synthetic operator QA fixture; no educator validation.',?)").bind(id,exerciseId,date).run();
}
const teacherProjects=(c:RuntimeConfig,user='teacher')=>read<{teacherId:string;projects:StudyProject[]}>(c,user,'teacher');

test('teacher route distinguishes two learners on the same repository and reveals only receiving-teacher class membership',async()=>{
 const db=createTestDb();try{
  const c=config(db.db);await seedProject(c,'alice-path','alice');await seedProject(c,'bob-path','bob');await seedProject(c,'unshared','charlie');
  await profile(c,'alice','Alice');await profile(c,'bob','Bob');await profile(c,'charlie','Charlie');
  await enrollment(c,'alice-web','teacher','alice','Web basics');await enrollment(c,'bob-data','teacher','bob','Data basics');
  await enrollment(c,'alice-other','otherTeacher','alice','Private other-teacher class');await enrollment(c,'alice-other-pilot','teacher','alice','Private other-pilot class','another-pilot');
  assert.deepEqual((await teacherProjects(c)).projects,[]);
  await post(c,'alice','projects/alice-path/share',{teacherId:'teacher',acknowledged:true});await post(c,'bob','projects/bob-path/share',{teacherId:'teacher',acknowledged:true});
  const teacher=await teacherProjects(c);assert.equal(teacher.projects.length,2);
  const alice=teacher.projects.find(project=>project.id==='alice-path')!,bob=teacher.projects.find(project=>project.id==='bob-path')!;
  assert.equal(alice.snapshot.repository,bob.snapshot.repository);assert.deepEqual(alice.learner,{displayName:'Alice',classNames:['Web basics']});assert.deepEqual(bob.learner,{displayName:'Bob',classNames:['Data basics']});
  assert.ok(!JSON.stringify(teacher).includes('Private other-'));assert.ok(!JSON.stringify(teacher).includes('Charlie'));assert.equal('userId' in alice.learner!,false);
  assert.deepEqual((await teacherProjects(c,'otherTeacher')).projects,[]);
  await assert.rejects(()=>read(c,'teacher','projects/alice-path'),/PROJECT_NOT_FOUND/);
  const owner=await read(c,'alice','projects/alice-path');assert.equal('learner' in owner,false);assert.ok(owner.exercises.every(ex=>!Object.hasOwn(ex,'reviewEvidence')));
  assert.ok(!JSON.stringify(owner).includes('Bob'));await assert.rejects(()=>read(c,'alice','projects/bob-path'),/PROJECT_NOT_FOUND/);
  assert.deepEqual((await teacherProjects({...c,PILOT_ID:'another-pilot'})).projects,[]);
 }finally{db.close();}
});

test('teacher route denies pending or revoked roles and current sharing controls reads and reviews',async()=>{
 const db=createTestDb();try{
  const c=config(db.db);await seedProject(c,'path','learner');await profile(c,'pending','Pending teacher','pilot','teacher','pending');
  await committed(c,'path','answer',1);
  await assert.rejects(()=>teacherProjects(c,'pending'),/TEACHER_REQUIRED/);
  await assert.rejects(()=>post(c,'learner','projects/path/share',{teacherId:'pending',acknowledged:true}),/approved teacher/);
  await assert.rejects(()=>post(c,'learner','projects/path/share',{teacherId:'teacher'}),/SHARING_CONSENT_REQUIRED/);
  await assert.rejects(()=>post(c,'teacher','reviews',{exerciseId:'answer',level:'supported',note:'Synthetic operator QA fixture; no educator validation.'}),/REVIEW_TARGET_NOT_FOUND/);
  await post(c,'learner','projects/path/share',{teacherId:'teacher',acknowledged:true});assert.equal((await teacherProjects(c)).projects.length,1);
  await post(c,'learner','projects/path/share',{teacherId:null});assert.deepEqual((await teacherProjects(c)).projects,[]);
  await assert.rejects(()=>post(c,'teacher','reviews',{exerciseId:'answer',level:'supported',note:'Synthetic operator QA fixture; no educator validation.'}),/REVIEW_TARGET_NOT_FOUND/);
  await post(c,'learner','projects/path/share',{teacherId:'teacher',acknowledged:true});
  await c.DB.prepare("UPDATE platform_access SET role='user' WHERE user_id='teacher' AND pilot_id='pilot'").run();
  await assert.rejects(()=>teacherProjects(c),/TEACHER_REQUIRED/);await assert.rejects(()=>post(c,'teacher','reviews',{exerciseId:'answer',level:'supported',note:'Synthetic operator QA fixture; no educator validation.'}),/TEACHER_REQUIRED/);
 }finally{db.close();}
});

test('MCQ route never reveals a key before commitment and retains a wrong answer after human review',async()=>{
 const db=createTestDb();try{
  const c=config(db.db);await seedProject(c,'path','learner');
  await c.DB.prepare("INSERT INTO study_concepts(id,project_id,local_id,title,description,category,file_paths_json,prerequisites_json,ordinal) VALUES('path:export','path','export','Exported value','Trace the exported source constant.','behavior','[\"index.ts\"]','[]',0)").run();
  await post(c,'learner','projects/path/share',{teacherId:'teacher',acknowledged:true});
  const generated=await (await handleStudy(request('projects/path/exercise','POST'),c,'learner',{conceptId:'export',questionFormat:'mcq'},async()=>quiz))!.json() as StudyProject;
  const id=generated.exercises[0].id;
  const checkPrivate=(project:StudyProject,teacher=false)=>{
   assert.ok(!JSON.stringify(project).includes(rationaleSentinel));assert.ok(!JSON.stringify(project).includes(rubricSentinel));
   const exercise=project.exercises.find(ex=>ex.id===id)!;assert.equal(exercise.mcqResult,null);assert.equal('correctOption' in exercise.prompt,false);assert.equal('answerExplanation' in exercise.prompt,false);
   assert.equal(teacher?exercise.reviewEvidence:undefined,teacher?null:undefined);if(!teacher)assert.equal('reviewEvidence' in exercise,false);
  };
  checkPrivate(generated);checkPrivate((await teacherProjects(c)).projects[0],true);
  await post(c,'learner','projects/path/independent',{exerciseId:id});checkPrivate(await read(c,'learner','projects/path'));checkPrivate((await teacherProjects(c)).projects[0],true);
  const wrong=generated.exercises[0].prompt.options!.find(option=>option.text==='The number two.')!;
  await post(c,'learner','projects/path/submit',{exerciseId:id,optionId:wrong.id,answer:''});
  const teacher=(await teacherProjects(c)).projects[0],submitted=teacher.exercises[0];
  assert.equal(submitted.answer,wrong.id+'. '+wrong.text);assert.equal(submitted.mcqResult?.matchesSuggestedAnswer,false);assert.equal(submitted.reviews.length,0);
  assert.equal(submitted.reviewEvidence?.suggestedRationale,rationaleSentinel);assert.deepEqual(submitted.reviewEvidence?.reviewPoints,quiz.reviewPoints);
  assert.equal(teacher.reviewSummary?.needsReview,1);assert.equal(teacher.reviewSummary?.reviewed,0);assert.equal(teacher.masteryIndex,0);assert.equal(teacher.concepts[0].score,0);assert.match(teacher.concepts[0].state,/unreviewed/);
  const owner=await read(c,'learner','projects/path');assert.equal('learner' in owner,false);assert.equal('reviewEvidence' in owner.exercises[0],false);assert.equal(owner.exercises[0].mcqResult?.explanation,rationaleSentinel);
  await post(c,'teacher','reviews',{exerciseId:id,level:'supported',note:'Synthetic operator QA fixture: inspect the mismatch against the source; no educator validation.'});
  await assert.rejects(()=>post(c,'learner','projects/path/submit',{exerciseId:id,optionId:submitted.mcqResult!.suggestedOption,answer:''}),/EXERCISE_STATE_CHANGED/);
  const reviewed=(await teacherProjects(c)).projects[0];assert.equal(reviewed.exercises[0].answer,submitted.answer);assert.equal(reviewed.exercises[0].mcqResult?.matchesSuggestedAnswer,false);assert.equal(reviewed.exercises[0].reviews[0].level,'supported');
  assert.equal(reviewed.reviewSummary?.needsReview,0);assert.equal(reviewed.reviewSummary?.reviewed,1);assert.equal(reviewed.masteryIndex,0);assert.equal(reviewed.concepts[0].score,0);
 }finally{db.close();}
});

test('whole-path review totals exceed bounded lists and teachers see old unreviewed answers first',async()=>{
 const db=createTestDb();try{
  const c=config(db.db);await seedProject(c,'path','learner','teacher');
  for(let index=0;index<120;index++){
   await committed(c,'path','answer-'+index,index*2);
   if(index>0)await savedReview(c,'answer-'+index,'review-'+index,at(index*2+3));
  }
  const owner=await read(c,'learner','projects/path');assert.equal(owner.exercises.length,20);assert.ok(owner.exercises.every(ex=>ex.id!=='answer-0'));
  assert.deepEqual(owner.reviewSummary,{submitted:120,reviewed:119,needsReview:1,lastSubmittedAt:at(240),lastReviewedAt:at(241)});
  assert.ok(owner.exercises.every(ex=>!Object.hasOwn(ex,'reviewEvidence')));
  const teacher=(await teacherProjects(c)).projects[0];assert.equal(teacher.exercises.length,100);assert.equal(teacher.exercises[0].id,'answer-0');assert.equal(teacher.exercises[0].reviews.length,0);assert.equal(teacher.exercises[0].reviewEvidence?.suggestedRationale,rationaleSentinel);
  assert.deepEqual(teacher.reviewSummary,owner.reviewSummary);assert.equal(teacher.stats.independentAttempts,120);assert.equal(teacher.masteryIndex,0);
 }finally{db.close();}
});

test('repeated reviews of one answer do not hide another answer’s saved human review',async()=>{
 const db=createTestDb();try{
  const c=config(db.db);await seedProject(c,'path','learner','teacher');await committed(c,'path','older',0);await committed(c,'path','newer',2);
  await savedReview(c,'older','older-review',at(3));
  for(let index=0;index<101;index++)await savedReview(c,'newer','newer-review-'+index,at(index+4));
  const teacher=(await teacherProjects(c)).projects[0];assert.equal(teacher.reviewSummary?.reviewed,2);assert.equal(teacher.reviewSummary?.needsReview,0);
  assert.ok(teacher.exercises.find(ex=>ex.id==='older')!.reviews.length>0,'An older reviewed answer must retain its review state even when another answer has more than 100 reviews.');
  assert.equal(teacher.exercises.find(ex=>ex.id==='newer')!.reviews.length,5);
  assert.equal(teacher.exercises.find(ex=>ex.id==='newer')!.reviews[0].createdAt,at(104));
  const owner=await read(c,'learner','projects/path');assert.equal(owner.exercises.find(ex=>ex.id==='older')!.reviews.length,1);assert.equal(owner.exercises.find(ex=>ex.id==='newer')!.reviews.length,5);
 }finally{db.close();}
});

test('PostgreSQL teacher route keeps per-answer recent reviews and private evidence projections compatible',async()=>{
 const [{PGlite},{PostgresD1},{readFileSync,readdirSync}]=await Promise.all([
  import('@electric-sql/pglite'),import('../lib/cloud/postgres-d1.ts'),import('node:fs'),
 ]);
 const pg=new PGlite();
 try{
  const migrations=new URL('../supabase/migrations/',import.meta.url);
  await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  for(const schema of readdirSync(migrations).filter(name=>name.endsWith('.sql')).sort())await pg.exec(readFileSync(new URL(schema,migrations),'utf8'));
  await pg.exec('SET ROLE groundtruth_app');
  const client:QueryClient={async query(sql,values=[]){
   if(sql.startsWith('SELECT pg_advisory_xact_lock'))return {rows:[],rowCount:0,command:'SELECT'};
   const result=await pg.query<Record<string,unknown>>(sql,values);
   return {rows:result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='bigint'?Number(value):value]))),rowCount:result.affectedRows??0,command:/^\s*(\w+)/.exec(sql)?.[1].toUpperCase()};
  },release(){}};
  const c=config(new PostgresD1({async connect(){return client;}}).db);
  await seedProject(c,'path','learner','teacher');await profile(c,'learner','PostgreSQL learner');await enrollment(c,'class','teacher','learner','PostgreSQL class');
  await committed(c,'path','older',0);await committed(c,'path','newer',2);await savedReview(c,'older','older-review',at(3));
  for(let index=0;index<7;index++)await savedReview(c,'newer','newer-review-'+index,at(index+4));
  const teacher=(await teacherProjects(c)).projects[0];
  assert.deepEqual(teacher.learner,{displayName:'PostgreSQL learner',classNames:['PostgreSQL class']});assert.equal(teacher.reviewSummary?.reviewed,2);assert.equal(teacher.reviewSummary?.needsReview,0);
  assert.equal(teacher.exercises.find(ex=>ex.id==='older')!.reviews.length,1);assert.equal(teacher.exercises.find(ex=>ex.id==='newer')!.reviews.length,5);assert.equal(teacher.exercises.find(ex=>ex.id==='newer')!.reviews[0].createdAt,at(10));
  assert.equal(teacher.exercises[0].reviewEvidence?.suggestedRationale,rationaleSentinel);
  const owner=await read(c,'learner','projects/path');assert.equal('learner' in owner,false);assert.ok(owner.exercises.every(ex=>!Object.hasOwn(ex,'reviewEvidence')));assert.equal(owner.reviewSummary?.submitted,2);
 }finally{await pg.close();}
});
