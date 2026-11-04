import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { handleClasses } from '../lib/study/classes.ts';

const request=(path='',method='GET')=>new Request('http://127.0.0.1/api/study/classes'+path,{method});
test('approved teachers create classes; enrollment is idempotent and does not share projects',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot',STAFF_USER_ROLES:JSON.stringify({teacher:'tutor'})};
 await assert.rejects(()=>handleClasses(request('','POST'),c,null,{name:'Web basics'}),/AUTH_REQUIRED/);
 await assert.rejects(()=>handleClasses(request('','POST'),c,'student',{name:'Web basics'}),/Only approved teachers/);
 const created=await (await handleClasses(request('','POST'),c,'teacher',{name:'Web basics'}))!.json() as {id:string;joinCode:string};assert.match(created.joinCode,/^[A-Z2-9]{10}$/);
 await assert.rejects(()=>handleClasses(request('/join','POST'),c,'student',{code:created.joinCode}),/CLASS_JOIN_CONFIRMATION_REQUIRED/);
 await handleClasses(request('/join','POST'),c,'student',{code:created.joinCode.toLowerCase(),confirmed:true});
 await handleClasses(request('/join','POST'),c,'student',{code:created.joinCode,confirmed:true});
 const student=await (await handleClasses(request(),c,'student',{}))!.json() as {joined:{id:string}[];owned:unknown[]};assert.equal(student.joined[0].id,created.id);assert.equal(student.joined.length,1);assert.deepEqual(student.owned,[]);
 const teacher=await (await handleClasses(request(),c,'teacher',{}))!.json() as {owned:{studentCount:number}[]};assert.equal(teacher.owned[0].studentCount,1);
 assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_projects WHERE teacher_id IS NOT NULL').first<{n:number}>())?.n,0);
 await handleClasses(request('/leave','POST'),c,'stranger',{classId:created.id});assert.equal((await d.db.prepare('SELECT count(*) AS n FROM class_enrollments').first<{n:number}>())?.n,1);
 await handleClasses(request('/leave','POST'),c,'student',{classId:created.id});assert.equal((await d.db.prepare('SELECT count(*) AS n FROM class_enrollments').first<{n:number}>())?.n,0);
 }finally{d.close();}
});
test('class codes are scoped to the pilot and revoked teacher access blocks new enrollment',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot',STAFF_USER_ROLES:JSON.stringify({teacher:'tutor'})};
 const target=await (await handleClasses(request('','POST'),c,'teacher',{name:'Class One'}))!.json() as {id:string;joinCode:string};
 await assert.rejects(()=>handleClasses(request('/join','POST'),{...c,PILOT_ID:'other'},'student',{code:target.joinCode,confirmed:true}),/not available/);
 await assert.rejects(()=>handleClasses(request('/join','POST'),c,'teacher',{code:target.joinCode,confirmed:true}),/already manage/);
 await d.db.prepare("UPDATE platform_access SET role='user' WHERE user_id='teacher'").run();
 await assert.rejects(()=>handleClasses(request('/join','POST'),c,'student',{code:target.joinCode,confirmed:true}),/not available/);
 const owned=await (await handleClasses(request(),c,'stranger',{}))!.json() as {owned:unknown[]};assert.deepEqual(owned.owned,[]);
 }finally{d.close();}
});
test('invalid class-code guesses are rate limited before exposing membership',async()=>{
 const d=createTestDb();try{const c={DB:d.db,PILOT_ID:'pilot'};
 for(let i=0;i<10;i++)await assert.rejects(()=>handleClasses(request('/join','POST'),c,'student',{code:'INVALID',confirmed:true}),/not available/);
 await assert.rejects(()=>handleClasses(request('/join','POST'),c,'student',{code:'INVALID',confirmed:true}),/Too many code attempts/);
 await assert.rejects(()=>handleClasses(request('/join','GET'),c,'student',{}),/METHOD_NOT_ALLOWED/);
 }finally{d.close();}
});
