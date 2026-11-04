import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { handleApi } from '../lib/server/index.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
const origin='https://groundtruth.test';
function req(path:string,body?:unknown){return new Request(origin+'/api'+path,{method:body?'POST':'GET',headers:body?{Origin:origin,'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});}
test('platform roles deny anonymous, learners and teachers access to developer data and mutations',async()=>{
 const db=createTestDb();try{
 const config:RuntimeConfig={DB:db.db,PILOT_ID:'a',STAFF_USER_ROLES:JSON.stringify({owner:'owner',teacher:'tutor'})};
 assert.equal((await handleApi(req('/developer/status'),config,null)).status,401);
 for(const user of ['learner','teacher']){
 assert.equal((await handleApi(req('/developer/status'),config,user)).status,403);
 assert.equal((await handleApi(req('/developer/access',{userId:'learner',role:'developer'}),config,user)).status,403);
 assert.equal((await handleApi(req('/admin/purge-expired',{}),config,user)).status,403);
 }
 assert.equal((await handleApi(req('/developer/status'),config,'owner')).status,200);
 }finally{db.close();}
});
test('developer role changes are scoped, audited, reversible and cannot self-promote or overwrite own role',async()=>{
 const db=createTestDb();try{
 const config:RuntimeConfig={DB:db.db,PILOT_ID:'a',STAFF_USER_ROLES:JSON.stringify({owner:'owner',teacher:'tutor'})};
 assert.equal((await handleApi(req('/developer/access',{userId:'owner',role:'user'}),config,'owner')).status,409);
 assert.equal((await handleApi(req('/developer/access',{userId:'teacher',role:'bogus'}),config,'owner')).status,400);
 assert.equal((await handleApi(req('/developer/access',{userId:'teacher',role:'developer'}),config,'owner')).status,200);
 assert.equal((await handleApi(req('/developer/status'),config,'teacher')).status,200);
 assert.equal((await handleApi(req('/developer/status'),{...config,PILOT_ID:'b',STAFF_USER_ROLES:'{}'},'teacher')).status,403);
 assert.equal((await handleApi(req('/developer/access',{userId:'teacher',role:'user'}),config,'owner')).status,200);
 assert.equal((await handleApi(req('/developer/status'),config,'teacher')).status,403);
 const me=await (await handleApi(req('/me'),config,'teacher')).json() as {instructor:boolean};
 assert.equal(me.instructor,false); // Config bootstrap cannot restore a revoked role.
 assert.equal((await db.db.prepare('SELECT count(*) AS n FROM access_audit').first<{n:number}>())?.n,2);
 const foreign=new Request(origin+'/api/developer/access',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:JSON.stringify({userId:'learner',role:'developer'})});
 assert.equal((await handleApi(foreign,config,'owner')).status,403);
 }finally{db.close();}
});
test('a session retains its original pilot scope after membership changes',async()=>{
 const db=createTestDb();try{
 const config:RuntimeConfig={DB:db.db,PILOT_ID:'a',STAFF_USER_ROLES:JSON.stringify({teacher:'tutor'})};
 const at=new Date().toISOString(),future='2099-01-01T00:00:00.000Z';
 for(const id of ['teacher','learner']){
 await db.db.prepare("INSERT INTO practice_profiles(user_id,notice_version,updated_at) VALUES(?,'practice.v1',?)").bind(id,at).run();
 await db.db.prepare("INSERT INTO pilot_memberships VALUES(?,'a','student',?,?)").bind(id,at,future).run();
 }
 const made=await handleApi(req('/sessions',{requestId:crypto.randomUUID()}),config,'learner');
 const {sessionId}=await made.json() as {sessionId:string};
 assert.equal((await handleApi(req('/admin/sessions/'+sessionId+'/proof.json'),config,'teacher')).status,200);
 await db.db.prepare("UPDATE pilot_memberships SET pilot_id='b'").run();
 const other={...config,PILOT_ID:'b'};
 assert.equal((await handleApi(req('/admin/sessions/'+sessionId+'/proof.json'),other,'teacher')).status,404);
 const roster=await (await handleApi(req('/admin/pilot'),other,'teacher')).json() as {sessions:unknown[]};
 assert.equal(roster.sessions.length,0);
 }finally{db.close();}
});

