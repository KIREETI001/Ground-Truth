import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { exercisesForReview,loadTeacherProjectEvidence,projectsForReview,summarizeReviewEvidence } from '../lib/study/teacher-evidence.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
import type { StudyExercise,StudyProject } from '../lib/study/types.ts';

const snapshot={repository:'same/repository',url:'https://github.com/same/repository',commit:'a'.repeat(40),analysedAt:'2026-11-01T00:00:00.000Z',files:[{path:'index.ts',language:'TypeScript',excerpt:'export const value = 1;'}],signals:[],suggestedMissionId:null,warnings:[]};
function exercise(id:string,status:StudyExercise['status']='submitted',reviewed=false):StudyExercise {
 return {id,status,prompt:{title:'Trace the value',prompt:'Which value is exported?',kind:'trace',filePaths:['index.ts']},answer:status==='submitted'?'A. One':null,feedback:null,startedAt:'2026-11-01T01:00:00.000Z',submittedAt:status==='submitted'?'2026-11-01T02:00:00.000Z':null,reviews:reviewed?[{teacherId:'teacher',level:'explained',note:'Synthetic test review based on the committed answer.',createdAt:'2026-11-01T03:00:00.000Z'}]:[]};
}
function project(id:string,exercises:StudyExercise[]):StudyProject {
 return {id,goal:'Understand the exported value',snapshot,teacherId:'teacher',concepts:[],analysis:null,events:[],stats:{guidanceRequests:0,independentAttempts:exercises.filter(ex=>ex.status==='submitted').length,aiChanges:0,manualChanges:0},exercises};
}

test('review queue distinguishes pending answers, reviewed answers and uncommitted work',()=>{
 const path=project('path',[exercise('pending'),exercise('reviewed','submitted',true),exercise('open','guided'),exercise('ended','ended')]);
 assert.deepEqual(summarizeReviewEvidence(path),{submitted:2,needsReview:1,reviewed:1,lastSubmittedAt:'2026-11-01T02:00:00.000Z',lastReviewedAt:'2026-11-01T03:00:00.000Z'});
 assert.deepEqual(exercisesForReview(path,'needs-review').map(ex=>ex.id),['pending']);
 assert.deepEqual(exercisesForReview(path,'reviewed').map(ex=>ex.id),['reviewed']);
 assert.equal(exercisesForReview(path,'all').length,4);
 const open=project('open-only',[exercise('open','independent')]);
 assert.deepEqual(projectsForReview([path,open],'needs-review').map(item=>item.id),['path']);
 assert.equal(projectsForReview([path,open],'all').length,2);
 // Server totals cover the full path even when a bounded question list omits older reviews.
 open.reviewSummary={submitted:120,needsReview:110,reviewed:10,lastSubmittedAt:null,lastReviewedAt:null};
 assert.deepEqual(projectsForReview([open],'reviewed').map(item=>item.id),['open-only']);
});

async function seedProject(c:RuntimeConfig,id:string,owner:string,teacher='teacher',pilot='pilot'){
 await c.DB.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,teacher_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)')
  .bind(id,owner,pilot,'Understand the exported value',JSON.stringify(snapshot),teacher,'2026-11-01T00:00:00.000Z','2099-01-01T00:00:00.000Z').run();
}
async function seedProfile(c:RuntimeConfig,user:string,name:string,pilot='pilot'){
 await c.DB.prepare("INSERT INTO account_profiles(user_id,pilot_id,display_name,requested_role,application_status,created_at,updated_at) VALUES(?,?,?,'user','none',?,?)").bind(user,pilot,name,'2026-11-01T00:00:00.000Z','2026-11-01T00:00:00.000Z').run();
}
async function seedClass(c:RuntimeConfig,id:string,teacher:string,student:string,name:string,pilot='pilot'){
 await c.DB.prepare('INSERT INTO teacher_classes(id,teacher_id,pilot_id,name,join_code,created_at) VALUES(?,?,?,?,?,?)').bind(id,teacher,pilot,name,id,'2026-11-01T00:00:00.000Z').run();
 await c.DB.prepare('INSERT INTO class_enrollments(class_id,student_id,joined_at) VALUES(?,?,?)').bind(id,student,'2026-11-01T00:00:00.000Z').run();
}

test('same-repository learners remain distinct and class identity is scoped to the receiving teacher and pilot',async()=>{
 const db=createTestDb();try{
  const c={DB:db.db,PILOT_ID:'pilot',STAFF_USER_ROLES:JSON.stringify({teacher:'tutor',other:'tutor'})};
  await seedProject(c,'alice-path','alice');await seedProject(c,'bob-path','bob');
  await seedProfile(c,'alice','Alice');await seedProfile(c,'bob','Bob');
  await seedClass(c,'alice-class','teacher','alice','Web development');await seedClass(c,'bob-class','teacher','bob','Data basics');
  await seedClass(c,'private-class','other','alice','Other teacher’s private class');await seedClass(c,'other-pilot','teacher','alice','Another pilot','other-pilot');
  const alice=await loadTeacherProjectEvidence(c,'alice-path','teacher'),bob=await loadTeacherProjectEvidence(c,'bob-path','teacher');
  assert.deepEqual(alice.learner,{displayName:'Alice',classNames:['Web development']});
  assert.deepEqual(bob.learner,{displayName:'Bob',classNames:['Data basics']});
  assert.equal('owner_id' in alice,false);assert.equal('userId' in alice.learner,false);
  await assert.rejects(()=>loadTeacherProjectEvidence(c,'alice-path','other'),/PROJECT_NOT_FOUND/);
  await assert.rejects(()=>loadTeacherProjectEvidence(c,'alice-path','alice'),/TEACHER_REQUIRED/);
  await assert.rejects(()=>loadTeacherProjectEvidence({...c,PILOT_ID:'other-pilot'},'alice-path','teacher'),/PROJECT_NOT_FOUND/);
 }finally{db.close();}
});

test('teacher rubric is available only after commitment and guidance counts use the question-to-commitment window',async()=>{
 const db=createTestDb();try{
  const c={DB:db.db,PILOT_ID:'pilot',STAFF_USER_ROLES:JSON.stringify({teacher:'tutor'})};await seedProject(c,'path','learner');await seedProject(c,'other-path','learner');
  const rubric=JSON.stringify({reviewPoints:['Inspect the exported value.'],mcq:{correctOption:'A',answerExplanation:'PRIVATE: the source exports one.'}});
  await c.DB.prepare("INSERT INTO study_exercises(id,project_id,prompt_json,rubric_json,status,created_at) VALUES('open','path','{}',?,'guided','2026-11-01T01:00:00.000Z')").bind(rubric).run();
  let evidence=await loadTeacherProjectEvidence(c,'path','teacher');assert.deepEqual(evidence.reviewEvidenceByExercise,{});assert.ok(!JSON.stringify(evidence).includes('PRIVATE'));
  await c.DB.prepare("UPDATE study_exercises SET status='independent',started_at='2026-11-01T01:15:00.000Z' WHERE id='open'").run();
  evidence=await loadTeacherProjectEvidence(c,'path','teacher');assert.deepEqual(evidence.reviewEvidenceByExercise,{});
  await c.DB.prepare("UPDATE study_exercises SET status='submitted',answer='A. One',submitted_at='2026-11-01T02:00:00.000Z' WHERE id='open'").run();
  for(const [id,path,time,kind] of [['before','path','2026-11-01T00:59:59.000Z','assistance-requested'],['during','path','2026-11-01T01:10:00.000Z','assistance-requested'],['after','path','2026-11-01T02:00:01.000Z','assistance-requested'],['unrelated','other-path','2026-11-01T01:10:00.000Z','assistance-requested'],['not-guidance','path','2026-11-01T01:10:00.000Z','exercise-generated']]){
   await c.DB.prepare("INSERT INTO study_events(id,project_id,kind,detail_json,created_at) VALUES(?,?,?,'{}',?)").bind(id,path,kind,time).run();
  }
  evidence=await loadTeacherProjectEvidence(c,'path','teacher');assert.deepEqual(evidence.reviewEvidenceByExercise.open,{reviewPoints:['Inspect the exported value.'],suggestedOption:'A',suggestedRationale:'PRIVATE: the source exports one.',guidanceRequests:1});
  await c.DB.prepare("INSERT INTO study_exercises(id,project_id,prompt_json,rubric_json,status,ended_at,created_at) VALUES('ended','path','{}',?,'guided','2026-11-01T04:00:00.000Z','2026-11-01T03:00:00.000Z')").bind(rubric).run();
  evidence=await loadTeacherProjectEvidence(c,'path','teacher');assert.equal('ended' in evidence.reviewEvidenceByExercise,false);
 }finally{db.close();}
});

test('revocation, expiry and mismatched profile pilots prevent private projection or identity leakage',async()=>{
 const db=createTestDb();try{
  const c={DB:db.db,PILOT_ID:'pilot',STAFF_USER_ROLES:JSON.stringify({teacher:'tutor'})};await seedProject(c,'path','learner');await seedProfile(c,'learner','Name from another pilot','other');
  assert.equal((await loadTeacherProjectEvidence(c,'path','teacher')).learner.displayName,'Shared learner');
  await c.DB.prepare("UPDATE study_projects SET teacher_id=NULL WHERE id='path'").run();await assert.rejects(()=>loadTeacherProjectEvidence(c,'path','teacher'),/PROJECT_NOT_FOUND/);
  await c.DB.prepare("UPDATE study_projects SET teacher_id='teacher',expires_at='2000-01-01T00:00:00.000Z' WHERE id='path'").run();await assert.rejects(()=>loadTeacherProjectEvidence(c,'path','teacher'),/PROJECT_NOT_FOUND/);
  await c.DB.prepare("UPDATE study_projects SET expires_at='2099-01-01T00:00:00.000Z' WHERE id='path'").run();
  await c.DB.prepare("UPDATE platform_access SET role='user' WHERE user_id='teacher' AND pilot_id='pilot'").run();await assert.rejects(()=>loadTeacherProjectEvidence(c,'path','teacher'),/TEACHER_REQUIRED/);
 }finally{db.close();}
});
