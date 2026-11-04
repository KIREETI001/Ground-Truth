import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { saveStudyModelReceipt, type StudyReceiptOutcome } from '../lib/study/model-receipts.ts';

const sample:StudyReceiptOutcome={task:'exercise',provider:'meta',model:'muse-spark-1.3',status:'success',latencyMs:125.4,inputTokens:120,outputTokens:80,cachedInputTokens:90};
async function fixture(){const d=createTestDb();await d.db.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind('p','learner','pilot','Learn validation','{}',new Date().toISOString(),'2099-01-01T00:00:00Z').run();return d;}

test('model receipt persists bounded status, timing and tokens without prompt or answer text',async()=>{
 const d=await fixture();try{
  const outcome={...sample,prompt:'PRIVATE SOURCE',answer:'PRIVATE ANSWER'};
  assert.equal(await saveStudyModelReceipt({DB:d.db,PILOT_ID:'pilot'},'learner',outcome,'p'),true);
  const row=await d.db.prepare('SELECT * FROM study_model_receipts').first<Record<string,unknown>>();
  assert.equal(row?.latency_ms,125);assert.equal(row?.cached_input_tokens,90);assert.equal(row?.status,'success');
  assert.doesNotMatch(JSON.stringify(row),/PRIVATE SOURCE|PRIVATE ANSWER|prompt|answer/);
  assert.ok(Date.parse(String(row?.expires_at))>Date.now());
 }finally{d.close();}
});

test('model receipts reject wrong owner, pilot and expired projects',async()=>{
 const d=await fixture();try{
  assert.equal(await saveStudyModelReceipt({DB:d.db,PILOT_ID:'pilot'},'other',sample,'p'),false);
  assert.equal(await saveStudyModelReceipt({DB:d.db,PILOT_ID:'other'},'learner',sample,'p'),false);
  await d.db.prepare('UPDATE study_projects SET expires_at=? WHERE id=?').bind('2000-01-01T00:00:00Z','p').run();
  assert.equal(await saveStudyModelReceipt({DB:d.db,PILOT_ID:'pilot'},'learner',sample,'p'),false);
  assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_model_receipts').first<{n:number}>())?.n,0);
 }finally{d.close();}
});

test('pre-project map receipts retain failed status and sanitize invalid token counters',async()=>{
 const d=await fixture();try{
  assert.equal(await saveStudyModelReceipt({DB:d.db,PILOT_ID:'pilot'},'learner',{...sample,status:'rate-limited',inputTokens:-1,outputTokens:NaN,cachedInputTokens:1.5}),true);
  const row=await d.db.prepare('SELECT * FROM study_model_receipts').first<Record<string,unknown>>();
  assert.equal(row?.project_id,null);assert.equal(row?.status,'rate-limited');assert.equal(row?.input_tokens,null);assert.equal(row?.output_tokens,null);assert.equal(row?.cached_input_tokens,null);
  await d.db.prepare('DELETE FROM study_projects WHERE id=?').bind('p').run();
  assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_model_receipts').first<{n:number}>())?.n,1);
 }finally{d.close();}
});

test('project deletion cascades its model receipts and invalid latency is rejected',async()=>{
 const d=await fixture();try{
  assert.equal(await saveStudyModelReceipt({DB:d.db,PILOT_ID:'pilot'},'learner',{...sample,latencyMs:Infinity},'p'),false);
  assert.equal(await saveStudyModelReceipt({DB:d.db,PILOT_ID:'pilot'},'learner',sample,'p'),true);
  await d.db.prepare('DELETE FROM study_projects WHERE id=?').bind('p').run();
  assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_model_receipts').first<{n:number}>())?.n,0);
 }finally{d.close();}
});
