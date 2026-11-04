import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { handleStudy } from '../lib/study/server.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';

const request=(id:string)=>new Request('https://groundtruth.test/api/study/projects/'+id+'/independent',{method:'POST'});
async function seed(c:RuntimeConfig,id:string,owner:string){
 const at=new Date().toISOString();
 await c.DB.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(id,owner,'pilot','Learn validation',JSON.stringify({repository:'demo/repo',files:[]}),at,'2099-01-01T00:00:00.000Z').run();
 await c.DB.prepare("INSERT INTO study_exercises(id,project_id,prompt_json,rubric_json,status,created_at) VALUES(?,?,?,?,'guided',?)").bind(id+'-exercise',id,JSON.stringify({format:'coding',title:'Trace validation',prompt:'Complete the validation function.'}),'{}',at).run();
}
const lease=(db:D1Database,key:string,expires='2099-01-01T00:00:00.000Z')=>db.prepare('INSERT INTO coach_locks(user_id,token,expires_at) VALUES(?,?,?)').bind(key,'synthetic-lease',expires).run();

test('own Meta inference blocks independent start while another learner can proceed',async()=>{
 const d=createTestDb();try{
  const c={DB:d.db,PILOT_ID:'pilot'};await seed(c,'a','alice');await seed(c,'b','bob');
  await lease(d.db,'__study_meta__:alice');
  await assert.rejects(()=>handleStudy(request('a'),c,'alice',{exerciseId:'a-exercise'}),/Wait for your active AI request/);
  assert.equal(await d.db.prepare('SELECT status FROM study_exercises WHERE id=?').bind('a-exercise').first('status'),'guided');
  assert.equal((await handleStudy(request('b'),c,'bob',{exerciseId:'b-exercise'}))?.status,200);
  assert.equal(await d.db.prepare('SELECT status FROM study_exercises WHERE id=?').bind('b-exercise').first('status'),'independent');
  assert.equal((await d.db.prepare("SELECT count(*) AS n FROM study_events WHERE project_id='a' AND kind='independent-started'").first<{n:number}>())?.n,0);
 }finally{d.close();}
});

test('expired Meta leases permit progress and the local shared inference lease still blocks',async()=>{
 const d=createTestDb();try{
  const c={DB:d.db,PILOT_ID:'pilot'};await seed(c,'a','alice');await seed(c,'b','bob');
  await lease(d.db,'__study_meta__:alice','2000-01-01T00:00:00.000Z');
  assert.equal((await handleStudy(request('a'),c,'alice',{exerciseId:'a-exercise'}))?.status,200);
  await lease(d.db,'__study_model__');
  await assert.rejects(()=>handleStudy(request('b'),c,'bob',{exerciseId:'b-exercise'}),/Wait for your active AI request/);
  assert.equal(await d.db.prepare('SELECT status FROM study_exercises WHERE id=?').bind('b-exercise').first('status'),'guided');
 }finally{d.close();}
});

test('guarded transition rejects a Meta lease acquired between the initial read and write',async()=>{
 const d=createTestDb();try{
  const base={DB:d.db,PILOT_ID:'pilot'};await seed(base,'a','alice');
  const racing={prepare(sql:string){
   const statement=d.prepare(sql);
   if(sql.startsWith("UPDATE study_exercises SET status='independent'")){
    const bind=statement.bind.bind(statement);
    statement.bind=(...values:unknown[])=>{
     const bound=bind(...values),run=bound.run.bind(bound);
     bound.run=async<T>()=>{await lease(d.db,'__study_meta__:alice');return run<T>();};
     return bound;
    };
   }
   return statement;
  }} as unknown as D1Database;
  await assert.rejects(()=>handleStudy(request('a'),{...base,DB:racing},'alice',{exerciseId:'a-exercise'}),/Wait for your active AI request/);
  const saved=await d.db.prepare('SELECT status,started_at FROM study_exercises WHERE id=?').bind('a-exercise').first<{status:string;started_at:string|null}>();
  assert.equal(saved?.status,'guided');assert.equal(saved.started_at,null);
 }finally{d.close();}
});
