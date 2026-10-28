import test from 'node:test';
import assert from 'node:assert/strict';
import type { FixtureId, Phase, RunPlan } from '../lib/contracts.ts';
import { SQLiteD1 } from './sqlite-d1.ts';
import * as engine from '../lib/lab/engine.ts';
import { digest, executeHandlerBatch } from '../lib/lab/definitions.ts';

async function setup(phase: Exclude<Phase, 'complete'> = 'baseline', fixtureId: FixtureId = 'lost-success.v1') {
  assert.ok(engine, 'The SQL lab engine must exist');
  const sqlite = new SQLiteD1();
  const now = new Date().toISOString();
  await sqlite.db.prepare(`INSERT INTO sessions
    (id,owner_id,status,phase,revision,document_json,request_id,created_at,expires_at)
    VALUES (?,?, 'active',?,0,'{}',?,?,?)`).bind('session-1','owner-1',phase,'request-1',now,
      new Date(Date.now()+86_400_000).toISOString()).run();
  const plan = await engine.createRun(sqlite.db, {sessionId:'session-1',caseId:'case-1',ownerId:'owner-1',
    phase,fixtureId,predictionId:'prediction-1'});
  return { sqlite, db: sqlite.db, plan };
}
async function step(db: D1Database, plan: RunPlan, index: number) {
  assert.ok(engine);
  const next = plan.steps[index];
  return engine.executeStep(db,plan.runId,'owner-1',next.stepId,next.payload,next.idempotencyKey);
}
async function count(db: D1Database, table = 'lab_registrations') {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<number>('n');
}

test('baseline commits before losing the success response and a real retry creates a duplicate', async () => {
  const {sqlite,db,plan} = await setup();
  try {
    const first = await step(db,plan,0);
    assert.equal(first.status,504);
    assert.deepEqual(first.body,{error:{code:'INJECTED_RESPONSE_LOSS'}});
    assert.equal(first.receipt.handlerStatus,201);
    assert.equal(first.receipt.deliveryPolicy,'discard-success');
    assert.equal(await count(db),1);
    const retry = await step(db,plan,1);
    assert.equal(retry.status,201);
    assert.equal(retry.receipt.decision,'created');
    assert.equal(await count(db),2);
    assert.notEqual(first.receipt.registrationId,retry.receipt.registrationId);
    assert.deepEqual((await step(db,plan,0)).receipt,first.receipt);
    assert.equal(await count(db),2, 'repeating an experiment step must not be another business request');
    const proof = await engine!.finalizeRun(db,plan.runId,'owner-1');
    assert.equal(proof.registrations.length,2);
    assert.equal(proof.probes.duplicate_registration_count,1);
    assert.equal(proof.probes.injected_loss_count,1);
    assert.equal(proof.sourceDigest,plan.sourceDigest);
    assert.equal(proof.executionMode,'live-fixture');
  } finally { sqlite.close(); }
});

test('repair replays the exact committed signup using SQL uniqueness and freezes one evidence snapshot', async () => {
  const {sqlite,db,plan} = await setup('repair');
  try {
    const first = await step(db,plan,0);
    const retry = await step(db,plan,1);
    assert.equal(retry.status,201);
    assert.equal(retry.receipt.decision,'replayed');
    assert.equal(retry.receipt.registrationId,first.receipt.registrationId);
    const stored = await db.prepare('SELECT * FROM lab_registrations').first<Record<string,string>>();
    assert.deepEqual(retry.body,{registrationId:stored!.id,eventId:stored!.event_id,
      attendeeRef:stored!.attendee_ref,registeredAt:stored!.registered_at});
    assert.equal(await count(db),1);
    const proof = await engine!.finalizeRun(db,plan.runId,'owner-1');
    assert.equal(proof.probes.replayed_count,1);
    assert.equal(proof.probes.duplicate_registration_count,0);
    assert.deepEqual(await engine!.finalizeRun(db,plan.runId,'owner-1'),proof);
    assert.deepEqual(await engine!.getEvidence(db,plan.runId,'owner-1'),proof);
  } finally { sqlite.close(); }
});

for (const phase of ['baseline','repair'] as const) {
  test(`${phase} concurrent fixture executes two SQL calls against the same unique constraint`, async () => {
    const {sqlite,db,plan} = await setup(phase,'concurrent-retry.v1');
    try {
      assert.deepEqual(plan.steps.map(item=>item.requiresStepIds),[[],[]]);
      const results = await Promise.all([step(db,plan,0),step(db,plan,1)]);
      assert.deepEqual(results.map(item=>item.status),[201,201]);
      assert.equal(await count(db),phase==='baseline'?2:1);
      assert.equal(results.filter(item=>item.receipt.decision==='replayed').length,phase==='repair'?1:0);
      if (phase==='repair') assert.equal(results[0].receipt.registrationId,results[1].receipt.registrationId);
    } finally { sqlite.close(); }
  });
  test(`${phase} precommit fault records no registration before the actual retry`, async () => {
    const {sqlite,db,plan} = await setup(phase,'fail-before-commit.v1');
    try {
      const fault=await step(db,plan,0);
      assert.equal(fault.status,503);
      assert.equal(fault.receipt.handlerStatus,null);
      assert.equal(fault.receipt.decision,'not_executed');
      assert.equal(fault.receipt.deliveryPolicy,'fail-before-handler');
      assert.equal(await count(db),0);
      assert.equal((await step(db,plan,1)).status,201);
      assert.equal(await count(db),1);
    } finally { sqlite.close(); }
  });
}

for (const phase of ['transfer','transfer_repair'] as const) {
  test(`${phase} enforces payload conflict or a fresh key for the new event`, async () => {
    const {sqlite,db,plan} = await setup(phase,'intent-lifecycle.v1');
    try {
      const results=[];
      for(let i=0;i<3;i++) results.push(await step(db,plan,i));
      assert.deepEqual(results.map(item=>item.status),phase==='transfer'?[201,201,409]:[201,201,201]);
      assert.equal(results[1].receipt.decision,'replayed');
      assert.equal(results[2].receipt.decision,phase==='transfer'?'payload_conflict':'created');
      assert.equal(await count(db),phase==='transfer'?1:2);
      const proof=await engine!.finalizeRun(db,plan.runId,'owner-1');
      assert.equal(proof.probes.new_intent_rotates_token,phase==='transfer_repair');
      assert.equal(proof.probes.duplicate_registration_count,0);
    } finally { sqlite.close(); }
  });
}

test('receipt insertion failure rolls back the registration and completed-step count', async () => {
  const {sqlite,db,plan} = await setup('repair');
  try {
    sqlite.sqlite.exec(`CREATE TRIGGER block_receipt BEFORE INSERT ON lab_receipts
      BEGIN SELECT RAISE(ABORT, 'injected storage fault'); END`);
    await assert.rejects(step(db,plan,0),/injected storage fault/);
    assert.equal(await count(db),0);
    assert.equal(await count(db,'lab_receipts'),0);
    assert.equal(await db.prepare('SELECT completed_steps FROM lab_runs').first('completed_steps'),0);
    sqlite.sqlite.exec('DROP TRIGGER block_receipt');
    assert.equal((await step(db,plan,0)).status,504);
    assert.equal(await count(db),1);
  } finally { sqlite.close(); }
});

test('ownership, exact supplied payload and key, prerequisite and finalization guards reject writes', async () => {
  const {sqlite,db,plan} = await setup('repair');
  try {
    const first=plan.steps[0];
    await assert.rejects(engine!.getRunPlan(db,plan.runId,'other-owner'),/RUN_NOT_FOUND/);
    await assert.rejects(engine!.executeStep(db,plan.runId,'other-owner',first.stepId,first.payload,first.idempotencyKey),/RUN_NOT_FOUND/);
    await assert.rejects(engine!.executeStep(db,plan.runId,'owner-1',first.stepId,{...first.payload,eventId:'forged'},first.idempotencyKey),/STEP_PAYLOAD_MISMATCH/);
    await assert.rejects(engine!.executeStep(db,plan.runId,'owner-1',first.stepId,first.payload,'forged'),/STEP_KEY_MISMATCH/);
    await assert.rejects(step(db,plan,1),/STEP_PREREQUISITES/);
    await assert.rejects(engine!.finalizeRun(db,plan.runId,'owner-1'),/RUN_INCOMPLETE/);
    assert.equal(await count(db),0);
    await step(db,plan,0);
    const state=await engine!.getRunState(db,plan.runId,'owner-1');
    assert.deepEqual(state.completedStepIds,[first.stepId]);
    assert.equal(state.status,'running');
  } finally { sqlite.close(); }
});

test('finalization is resumable after closing writes and remains immutable', async () => {
  const {sqlite,db,plan} = await setup('repair');
  try {
    await step(db,plan,0); await step(db,plan,1);
    await db.prepare(`UPDATE lab_runs SET status='finalizing' WHERE id=?`).bind(plan.runId).run();
    const proof=await engine!.finalizeRun(db,plan.runId,'owner-1');
    assert.deepEqual(await engine!.finalizeRun(db,plan.runId,'owner-1'),proof);
    assert.equal(await count(db,'lab_evidence'),1);
    assert.equal(await db.prepare('SELECT status FROM lab_runs').first('status'),'complete');
  } finally { sqlite.close(); }
});

test('session deletion between load and SQL batch cannot recreate any lab activity', async () => {
  const {sqlite,db,plan} = await setup('repair');
  try {
    const actualBatch = sqlite.batch.bind(sqlite);
    sqlite.batch = async (statements) => {
      sqlite.sqlite.exec(`DELETE FROM sessions WHERE id='session-1'`);
      return actualBatch(statements);
    };
    await assert.rejects(step(db,plan,0),/RUN_NOT_FOUND/);
    assert.equal(await count(db,'lab_runs'),0);
    assert.equal(await count(db),0);
    assert.equal(await count(db,'lab_receipts'),0);
  } finally { sqlite.close(); }
});

test('expired sessions and mismatched fixture phases are unavailable', async () => {
  const {sqlite,db,plan} = await setup();
  try {
    await assert.rejects(engine!.sourceFor('transfer','lost-success.v1'),/FIXTURE_NOT_ALLOWED/);
    await db.prepare('UPDATE sessions SET expires_at=?').bind('2000-01-01T00:00:00.000Z').run();
    await assert.rejects(engine!.getRunPlan(db,plan.runId,'owner-1'),/RUN_NOT_FOUND/);
    await assert.rejects(step(db,plan,0),/RUN_NOT_FOUND/);
    assert.equal(await count(db),0);
  } finally { sqlite.close(); }
});

test('displayed source uses the executable definition and the run carries its digest', async () => {
  const {sqlite,plan} = await setup('repair');
  try {
    const source=await engine!.sourceFor('repair','lost-success.v1');
    assert.equal(source.sourceDigest,plan.sourceDigest);
    assert.match(source.server,/INSERT INTO lab_registrations/);
    assert.match(source.server,/ON CONFLICT/);
    assert.match(source.server,/handlerStatements/);
    assert.equal(source.requestCount,2);
    assert.equal(source.groups,2);
    assert.equal(source.stages.length,2);
  } finally { sqlite.close(); }
});

test('new requests refuse a changed executable source version without writing a receipt', async () => {
  const {sqlite,db,plan}=await setup('repair');
  try {
    await db.prepare('UPDATE lab_runs SET source_digest=? WHERE id=?').bind('sha256:previous-deployment',plan.runId).run();
    await assert.rejects(step(db,plan,0),/SOURCE_VERSION_CHANGED/);
    assert.equal(await count(db),0);
    assert.equal(await count(db,'lab_receipts'),0);
  } finally { sqlite.close(); }
});

test('a run retains the exact reviewed source snapshot that its digest identifies', async () => {
  const {sqlite,db,plan}=await setup('repair');
  try {
    assert.equal(typeof engine.getRunSource,'function','stored source must be retrievable');
    const source=await engine.getRunSource(db,plan.runId,'owner-1');
    assert.equal(source.sourceDigest,plan.sourceDigest);
    assert.deepEqual(source,await engine.sourceFor('repair','lost-success.v1'));
    await assert.rejects(engine.getRunSource(db,plan.runId,'other-owner'),/RUN_NOT_FOUND/);
  } finally { sqlite.close(); }
});

test('concurrent compiled handlers with the same key and different canonical payloads create one winner and one conflict', async () => {
  const {sqlite,db,plan}=await setup('repair','concurrent-retry.v1');
  try {
    // The HTTP engine rejects arbitrary edited fixtures. This exercises the
    // compiled handler directly to test its payload-conflict transaction branch.
    const contexts=await Promise.all(plan.steps.map(async (planned,index)=>{
      const payload=index===0?planned.payload:{...planned.payload,eventId:'different-event'};
      return {registrationId:crypto.randomUUID(),runId:plan.runId,payload,intentId:planned.intentId,
        key:planned.idempotencyKey,payloadHash:await digest(payload),stepId:planned.stepId,
        committedAt:new Date().toISOString(),ownerId:'owner-1',receiptId:crypto.randomUUID(),index,
        policy:'normal' as const,requiresStepIds:[]};
    }));
    await Promise.all(contexts.map(context=>executeHandlerBatch(db,'repair',context)));
    const receipts=await db.prepare('SELECT decision,registration_id,delivered_status FROM lab_receipts ORDER BY step_index')
      .all<{decision:string;registration_id:string|null;delivered_status:number}>();
    assert.equal(await count(db),1);
    assert.deepEqual(receipts.results.map(row=>row.decision).sort(),['created','payload_conflict']);
    const conflict=receipts.results.find(row=>row.decision==='payload_conflict')!;
    assert.equal(conflict.delivered_status,409);
    assert.equal(conflict.registration_id,null);
  } finally { sqlite.close(); }
});
