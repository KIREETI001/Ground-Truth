import type { FixtureId, RunEvidence, RunPlan, SignupPayload, SignupSuccess, SourceView, StepReceipt } from '../contracts.ts';
import { allowedFixture, digest, executableSource, executeHandlerBatch, fixturePolicy, plannedSteps } from './definitions.ts';
import type { LabPhase } from './definitions.ts';

export class LabError extends Error {
  status:number;code:string;
  constructor(status:number,code:string) { super(code);this.name='LabError';this.status=status;this.code=code; }
}
type RunRow={id:string;session_id:string;case_id:string;owner_id:string;phase:LabPhase;fixture_id:FixtureId;
  source_digest:string;source_json:string;plan_digest:string;prediction_id:string;plan_json:string;
  status:'running'|'finalizing'|'complete'|'infra_error';completed_steps:number;expires_at:string};
type ReceiptRow={id:string;run_id:string;step_id:string;step_index:number;intent_id:string;
  decision:StepReceipt['decision'];registration_id:string|null;handler_status:number|null;
  delivered_status:number;delivery_policy:StepReceipt['deliveryPolicy'];committed_row_count_after:number;committed_at:string};
type RegistrationRow={id:string;event_id:string;attendee_ref:string;registered_at:string};
const CURRENT_SESSION=`session.owner_id=? AND session.status='active' AND session.expires_at>?`;

function requireFixture(phase:LabPhase,fixtureId:FixtureId) {
  if(!allowedFixture(phase,fixtureId)) throw new LabError(400,'FIXTURE_NOT_ALLOWED');
}
async function runFor(db:D1Database,runId:string,ownerId:string):Promise<RunRow> {
  const row=await db.prepare(`SELECT run.* FROM lab_runs AS run
    JOIN sessions AS session ON session.id=run.session_id
    WHERE run.id=? AND run.owner_id=? AND ${CURRENT_SESSION}`)
    .bind(runId,ownerId,ownerId,new Date().toISOString()).first<RunRow>();
  if(!row) throw new LabError(404,'RUN_NOT_FOUND');
  return row;
}
function receiptFrom(row:ReceiptRow):StepReceipt {
  return {receiptId:row.id,runId:row.run_id,stepId:row.step_id,index:row.step_index,intentId:row.intent_id,
    decision:row.decision,registrationId:row.registration_id,handlerStatus:row.handler_status,
    deliveredStatus:row.delivered_status,deliveryPolicy:row.delivery_policy,
    committedRowCountAfter:row.committed_row_count_after,committedAt:row.committed_at};
}
function registrationFrom(row:RegistrationRow):SignupSuccess {
  return {registrationId:row.id,eventId:row.event_id,attendeeRef:row.attendee_ref,registeredAt:row.registered_at};
}
async function receiptFor(db:D1Database,runId:string,stepId:string) {
  const row=await db.prepare('SELECT * FROM lab_receipts WHERE run_id=? AND step_id=?')
    .bind(runId,stepId).first<ReceiptRow>();
  return row?receiptFrom(row):null;
}
async function responseFor(db:D1Database,receipt:StepReceipt) {
  if(receipt.deliveryPolicy==='fail-before-handler')
    return {status:503,body:{error:{code:'INJECTED_PRECOMMIT_FAILURE'}},receipt};
  if(receipt.decision==='payload_conflict')
    return {status:409,body:{error:{code:'IDEMPOTENCY_PAYLOAD_CONFLICT'}},receipt};
  const registration=await db.prepare('SELECT id,event_id,attendee_ref,registered_at FROM lab_registrations WHERE id=? AND run_id=?')
    .bind(receipt.registrationId,receipt.runId).first<RegistrationRow>();
  if(!registration) throw new LabError(503,'COMMITTED_RESPONSE_UNAVAILABLE');
  const handlerBody=registrationFrom(registration);
  // Construct the real committed success first. Only the explicit fault adapter
  // discards it; its registration ID never appears in the delivered 504 body.
  if(receipt.deliveryPolicy==='discard-success')
    return {status:504,body:{error:{code:'INJECTED_RESPONSE_LOSS'}},receipt};
  return {status:201,body:handlerBody,receipt};
}

export async function sourceFor(phase:LabPhase,fixtureId:FixtureId):Promise<SourceView> {
  requireFixture(phase,fixtureId);
  return executableSource(phase,fixtureId,`${registrationFrom.toString()}\n${responseFor.toString()}`);
}
export async function createRun(db:D1Database,input:{sessionId:string;caseId:string;ownerId:string;
  phase:LabPhase;fixtureId:FixtureId;predictionId:string;runId?:string}):Promise<RunPlan> {
  requireFixture(input.phase,input.fixtureId);
  const now=new Date().toISOString();
  const session=await db.prepare(`SELECT expires_at FROM sessions WHERE id=? AND owner_id=?
    AND status='active' AND phase=? AND expires_at>?`)
    .bind(input.sessionId,input.ownerId,input.phase,now).first<{expires_at:string}>();
  if(!session) throw new LabError(404,'SESSION_NOT_FOUND');
  const source=await sourceFor(input.phase,input.fixtureId);
  const plan:RunPlan={runId:input.runId??crypto.randomUUID(),caseId:input.caseId,phase:input.phase,
    fixtureId:input.fixtureId,sourceDigest:source.sourceDigest,steps:plannedSteps(input.phase,input.fixtureId),expiresAt:session.expires_at};
  const planDigest=await digest(plan);
  await db.prepare(`INSERT INTO lab_runs
    (id,session_id,case_id,owner_id,phase,fixture_id,source_digest,source_json,plan_digest,prediction_id,
     plan_json,status,completed_steps,created_at,expires_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,'running',0,?,? FROM sessions
    WHERE id=? AND owner_id=? AND status='active' AND phase=?
      AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
    ON CONFLICT(session_id,case_id) DO NOTHING`)
    .bind(plan.runId,input.sessionId,input.caseId,input.ownerId,input.phase,input.fixtureId,plan.sourceDigest,
      JSON.stringify(source),planDigest,input.predictionId,JSON.stringify(plan),now,session.expires_at,input.sessionId,input.ownerId,input.phase).run();
  const stored=await db.prepare(`SELECT id,prediction_id,phase,fixture_id FROM lab_runs
    WHERE session_id=? AND case_id=? AND owner_id=?`).bind(input.sessionId,input.caseId,input.ownerId)
    .first<{id:string;prediction_id:string;phase:string;fixture_id:string}>();
  if(!stored) throw new LabError(404,'SESSION_NOT_FOUND');
  if(stored.prediction_id!==input.predictionId||stored.phase!==input.phase||stored.fixture_id!==input.fixtureId
    ||(input.runId&&input.runId!==stored.id)) throw new LabError(409,'CASE_RUN_EXISTS');
  return getRunPlan(db,stored.id,input.ownerId);
}
export async function getRunPlan(db:D1Database,runId:string,ownerId:string):Promise<RunPlan> {
  return JSON.parse((await runFor(db,runId,ownerId)).plan_json) as RunPlan;
}
export async function getRunSource(db:D1Database,runId:string,ownerId:string):Promise<SourceView> {
  return JSON.parse((await runFor(db,runId,ownerId)).source_json) as SourceView;
}
export async function getRunState(db:D1Database,runId:string,ownerId:string) {
  const run=await runFor(db,runId,ownerId);
  const receipts=await db.prepare('SELECT step_id FROM lab_receipts WHERE run_id=? ORDER BY step_index')
    .bind(runId).all<{step_id:string}>();
  return {plan:JSON.parse(run.plan_json) as RunPlan,completedStepIds:receipts.results.map(row=>row.step_id),status:run.status};
}
export async function executeStep(db:D1Database,runId:string,ownerId:string,stepId:string,
  payload:SignupPayload,key:string|null):Promise<{status:number;body:unknown;receipt:StepReceipt}> {
  const run=await runFor(db,runId,ownerId),plan=JSON.parse(run.plan_json) as RunPlan;
  const step=plan.steps.find(candidate=>candidate.stepId===stepId);
  if(!step) throw new LabError(400,'STEP_NOT_DECLARED');
  if(!payload||Object.keys(payload).sort().join(',')!=='attendeeRef,eventId'
    ||payload.eventId!==step.payload.eventId||payload.attendeeRef!==step.payload.attendeeRef)
    throw new LabError(400,'STEP_PAYLOAD_MISMATCH');
  if(key!==step.idempotencyKey) throw new LabError(400,'STEP_KEY_MISMATCH');
  const existing=await receiptFor(db,runId,stepId);
  if(existing) return responseFor(db,existing);
  if(run.status!=='running') throw new LabError(409,'RUN_CLOSED');
  if((await sourceFor(run.phase,run.fixture_id)).sourceDigest!==run.source_digest)
    throw new LabError(409,'SOURCE_VERSION_CHANGED');
  const completed=await db.prepare('SELECT step_id FROM lab_receipts WHERE run_id=?').bind(runId).all<{step_id:string}>();
  if(step.requiresStepIds.some(id=>!completed.results.some(row=>row.step_id===id)))
    throw new LabError(409,'STEP_PREREQUISITES');
  await executeHandlerBatch(db,run.phase,{registrationId:crypto.randomUUID(),runId,payload,intentId:step.intentId,key,
    payloadHash:await digest({eventId:payload.eventId,attendeeRef:payload.attendeeRef}),
    stepId,committedAt:new Date().toISOString(),ownerId,receiptId:crypto.randomUUID(),index:step.index,
    policy:fixturePolicy(run.fixture_id,step.index),requiresStepIds:step.requiresStepIds});
  await runFor(db,runId,ownerId);
  const receipt=await receiptFor(db,runId,stepId);
  if(!receipt) throw new LabError(409,'STEP_NOT_EXECUTED');
  return responseFor(db,receipt);
}
export async function getEvidence(db:D1Database,runId:string,ownerId:string):Promise<RunEvidence> {
  await runFor(db,runId,ownerId);
  const evidence=await db.prepare('SELECT evidence_json FROM lab_evidence WHERE run_id=?').bind(runId)
    .first<{evidence_json:string}>();
  if(!evidence) throw new LabError(409,'EVIDENCE_NOT_READY');
  return JSON.parse(evidence.evidence_json) as RunEvidence;
}
export async function finalizeRun(db:D1Database,runId:string,ownerId:string):Promise<RunEvidence> {
  let run=await runFor(db,runId,ownerId);
  if(run.status==='complete') return getEvidence(db,runId,ownerId);
  if(run.status==='infra_error') throw new LabError(409,'RUN_INFRA_ERROR');
  // Closing writes is durable and resumable. A crash before snapshot insertion
  // leaves fixed rows that a later finalization request can safely read again.
  await db.prepare(`UPDATE lab_runs SET status='finalizing'
    WHERE id=? AND owner_id=? AND status='running'
    AND (SELECT COUNT(*) FROM lab_receipts WHERE run_id=lab_runs.id)=json_array_length(plan_json,'$.steps')
    AND EXISTS (SELECT 1 FROM sessions WHERE sessions.id=lab_runs.session_id
      AND owner_id=? AND status='active' AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))`)
    .bind(runId,ownerId,ownerId).run();
  run=await runFor(db,runId,ownerId);
  if(run.status==='complete') return getEvidence(db,runId,ownerId);
  if(run.status!=='finalizing') throw new LabError(409,'RUN_INCOMPLETE');
  const plan=JSON.parse(run.plan_json) as RunPlan;
  const rows=await db.prepare('SELECT * FROM lab_receipts WHERE run_id=? ORDER BY step_index').bind(runId).all<ReceiptRow>();
  const registrations=await db.prepare(`SELECT id,event_id,attendee_ref,registered_at
    FROM lab_registrations WHERE run_id=? ORDER BY registered_at,id`).bind(runId).all<RegistrationRow>();
  const counts=await db.prepare(`SELECT COUNT(*) AS n,COUNT(DISTINCT intent_id) AS intents
    FROM lab_registrations WHERE run_id=?`).bind(runId).first<{n:number;intents:number}>();
  const receipts=rows.results.map(receiptFrom),intentKeys=new Map<string,Set<string|null>>();
  for(const step of plan.steps) {
    const keys=intentKeys.get(step.intentId)??new Set<string|null>();
    keys.add(step.idempotencyKey);intentKeys.set(step.intentId,keys);
  }
  const allKeys=Array.from(intentKeys.values()).flatMap(keys=>Array.from(keys));
  const snapshot={schemaVersion:'groundtruth-evidence.v1' as const,runId,caseId:run.case_id,sessionId:run.session_id,
    phase:run.phase,fixtureId:run.fixture_id,executionMode:'live-fixture' as const,sourceDigest:run.source_digest,
    planDigest:run.plan_digest,predictionId:run.prediction_id,finalizedAt:new Date().toISOString(),
    receipts,registrations:registrations.results.map(registrationFrom),probes:{
      committed_registration_count:counts!.n,distinct_intent_count:counts!.intents,
      duplicate_registration_count:counts!.n-counts!.intents,request_count:receipts.length,
      created_count:receipts.filter(row=>row.decision==='created').length,
      replayed_count:receipts.filter(row=>row.decision==='replayed').length,
      conflict_count:receipts.filter(row=>row.decision==='payload_conflict').length,
      injected_loss_count:receipts.filter(row=>row.deliveryPolicy==='discard-success').length,
      injected_precommit_failure_count:receipts.filter(row=>row.deliveryPolicy==='fail-before-handler').length,
      same_intent_reuses_token:run.phase==='baseline'?null:Array.from(intentKeys.values()).every(keys=>keys.size===1&&!keys.has(null)),
      new_intent_rotates_token:intentKeys.size<2?null:new Set(allKeys).size===intentKeys.size&&!allKeys.includes(null),
    }};
  const evidence:RunEvidence={...snapshot,evidenceHash:await digest(snapshot)};
  await db.batch([
    db.prepare(`INSERT INTO lab_evidence(run_id,evidence_json,evidence_hash,finalized_at)
      SELECT ?,?,?,? FROM lab_runs AS run JOIN sessions AS session ON session.id=run.session_id
      WHERE run.id=? AND run.owner_id=? AND run.status='finalizing' AND ${CURRENT_SESSION}
      ON CONFLICT(run_id) DO NOTHING`)
      .bind(runId,JSON.stringify(evidence),evidence.evidenceHash,evidence.finalizedAt,runId,ownerId,ownerId,new Date().toISOString()),
    db.prepare(`UPDATE lab_runs SET status='complete' WHERE id=? AND owner_id=? AND status='finalizing'
      AND EXISTS(SELECT 1 FROM lab_evidence WHERE run_id=lab_runs.id)`).bind(runId,ownerId),
  ]);
  return getEvidence(db,runId,ownerId);
}
