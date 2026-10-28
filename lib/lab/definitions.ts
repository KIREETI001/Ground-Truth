import type { FixtureId, Phase, PlannedStep, SourceView } from '../contracts.ts';

export type LabPhase = Exclude<Phase, 'complete'>;
type KeyPolicy = (intentId:string,keys:Record<string,string>,sessionKey:string) => string|null;

// These functions issue the actual client plan's keys. The selected executable
// function itself is displayed, so the source cannot diverge from execution.
function disabledButtonKey(_intentId:string,_keys:Record<string,string>,_sessionKey:string) { return null; }
function stableIntentKey(intentId:string,keys:Record<string,string>,_sessionKey:string) { return keys[intentId]; }
function browserSessionKey(_intentId:string,_keys:Record<string,string>,sessionKey:string) { return sessionKey; }
function keyPolicy(phase:LabPhase):KeyPolicy {
  return phase==='baseline'?disabledButtonKey:phase==='transfer'?browserSessionKey:stableIntentKey;
}
export function allowedFixture(phase:LabPhase,fixtureId:FixtureId) {
  return (phase==='baseline'||phase==='repair')
    ? ['lost-success.v1','concurrent-retry.v1','fail-before-commit.v1'].includes(fixtureId)
    : (phase==='transfer'||phase==='transfer_repair')&&fixtureId==='intent-lifecycle.v1';
}
export function plannedSteps(phase:LabPhase,fixtureId:FixtureId):PlannedStep[] {
  const intentA=crypto.randomUUID(),intentB=crypto.randomUUID();
  const keys={[intentA]:crypto.randomUUID(),[intentB]:crypto.randomUUID()},sessionKey=keys[intentA];
  const payloadA={eventId:`event-${crypto.randomUUID()}`,attendeeRef:`attendee-${crypto.randomUUID()}`};
  const payloadB={...payloadA,eventId:`event-${crypto.randomUUID()}`};
  const policy=keyPolicy(phase),steps:PlannedStep[]=[];
  const total=fixtureId==='intent-lifecycle.v1'?3:2;
  for(let index=0;index<total;index++) {
    const intentId=index===2?intentB:intentA;
    steps.push({stepId:crypto.randomUUID(),index,group:fixtureId==='concurrent-retry.v1'?0:index,
      requiresStepIds:fixtureId==='concurrent-retry.v1'||index===0?[]:[steps[index-1].stepId],
      intentId,action:index===0?'signup':index===1?'retry':'new-signup',
      payload:index===2?payloadB:payloadA,idempotencyKey:policy(intentId,keys,sessionKey)});
  }
  return steps;
}

// Numbered placeholders are SQLite/D1 positional bind parameters. Guards are
// repeated inside the transaction, not trusted from a prior JavaScript read.
const RUN_WRITE_GUARD=`EXISTS (
 SELECT 1 FROM lab_runs AS run JOIN sessions AS session ON session.id=run.session_id
 WHERE run.id=?2 AND run.owner_id=?10 AND run.status='running'
 AND session.owner_id=?10 AND session.status='active' AND session.phase=run.phase
 AND run.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
 AND session.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
)`;
const STEP_WRITE_GUARD=`${RUN_WRITE_GUARD}
 AND NOT EXISTS (SELECT 1 FROM lab_receipts WHERE run_id=?2 AND step_id=?8)
 AND NOT EXISTS (
  SELECT 1 FROM json_each(?14) AS prerequisite
  WHERE NOT EXISTS (SELECT 1 FROM lab_receipts WHERE run_id=?2 AND step_id=prerequisite.value)
 )`;
const REGISTRATION_INSERT_SQL=`INSERT INTO lab_registrations
 (id,run_id,event_id,attendee_ref,intent_id,idempotency_key,payload_hash,created_by_step,registered_at)
 SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9 WHERE ${STEP_WRITE_GUARD}`;
const IDEMPOTENT_INSERT_SQL=`${REGISTRATION_INSERT_SQL}
 ON CONFLICT(run_id,idempotency_key) DO NOTHING`;
const RECEIPT_INSERT_SQL=`INSERT INTO lab_receipts
 (id,run_id,step_id,step_index,intent_id,decision,registration_id,handler_status,
 delivered_status,delivery_policy,committed_row_count_after,committed_at)
 SELECT ?11,?2,?8,?12,?5,
 CASE WHEN registration.payload_hash<>?7 THEN 'payload_conflict'
      WHEN registration.created_by_step=?8 THEN 'created' ELSE 'replayed' END,
 CASE WHEN registration.payload_hash<>?7 THEN NULL ELSE registration.id END,
 CASE WHEN registration.payload_hash<>?7 THEN 409 ELSE 201 END,
 CASE WHEN registration.payload_hash<>?7 THEN 409 WHEN ?13='discard-success' THEN 504 ELSE 201 END,
 CASE WHEN registration.payload_hash<>?7 THEN 'normal' ELSE ?13 END,
 (SELECT COUNT(*) FROM lab_registrations WHERE run_id=?2),?9
 FROM lab_registrations AS registration
 WHERE registration.run_id=?2
 AND ((?6 IS NULL AND registration.created_by_step=?8) OR registration.idempotency_key=?6)
 AND ${STEP_WRITE_GUARD}
 ON CONFLICT(run_id,step_id) DO NOTHING`;
const PRECOMMIT_RECEIPT_SQL=`INSERT INTO lab_receipts
 (id,run_id,step_id,step_index,intent_id,decision,registration_id,handler_status,
 delivered_status,delivery_policy,committed_row_count_after,committed_at)
 SELECT ?11,?2,?8,?12,?5,'not_executed',NULL,NULL,503,'fail-before-handler',
 (SELECT COUNT(*) FROM lab_registrations WHERE run_id=?2),?9
 WHERE ${STEP_WRITE_GUARD}
 ON CONFLICT(run_id,step_id) DO NOTHING`;
const ADVANCE_SQL=`UPDATE lab_runs
 SET completed_steps=(SELECT COUNT(*) FROM lab_receipts WHERE run_id=?)
 WHERE id=? AND owner_id=? AND status='running'`;

export interface HandlerContext {
  registrationId:string;runId:string;payload:{eventId:string;attendeeRef:string};intentId:string;
  key:string|null;payloadHash:string;stepId:string;committedAt:string;ownerId:string;receiptId:string;index:number;
  policy:'normal'|'discard-success'|'fail-before-handler';requiresStepIds:string[];
}
function bindings(context:HandlerContext) {
  return [context.registrationId,context.runId,context.payload.eventId,context.payload.attendeeRef,
    context.intentId,context.key,context.payloadHash,context.stepId,context.committedAt,
    context.ownerId,context.receiptId,context.index,context.policy,JSON.stringify(context.requiresStepIds)];
}
function naiveHandlerStatements(db:D1Database,context:HandlerContext) {
  const values=bindings(context);
  const effect=context.policy==='fail-before-handler'
    ? [db.prepare(PRECOMMIT_RECEIPT_SQL).bind(...values)]
    : [db.prepare(REGISTRATION_INSERT_SQL).bind(...values),db.prepare(RECEIPT_INSERT_SQL).bind(...values)];
  return [...effect,db.prepare(ADVANCE_SQL).bind(context.runId,context.runId,context.ownerId)];
}
function handlerStatements(db:D1Database,context:HandlerContext) {
  const values=bindings(context);
  const effect=context.policy==='fail-before-handler'
    ? [db.prepare(PRECOMMIT_RECEIPT_SQL).bind(...values)]
    : [db.prepare(IDEMPOTENT_INSERT_SQL).bind(...values),db.prepare(RECEIPT_INSERT_SQL).bind(...values)];
  return [...effect,db.prepare(ADVANCE_SQL).bind(context.runId,context.runId,context.ownerId)];
}
export function executeHandlerBatch(db:D1Database,phase:LabPhase,context:HandlerContext) {
  return db.batch((phase==='baseline'?naiveHandlerStatements:handlerStatements)(db,context));
}
export function fixturePolicy(fixtureId:FixtureId,index:number):HandlerContext['policy'] {
  return index===0&&fixtureId==='lost-success.v1'?'discard-success'
    : index===0&&fixtureId==='fail-before-commit.v1'?'fail-before-handler':'normal';
}
export async function digest(value:unknown):Promise<string> {
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))));
  return `sha256:${Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('')}`;
}
export async function executableSource(phase:LabPhase,fixtureId:FixtureId,responseAdapterSource:string):Promise<SourceView> {
  const version=phase==='baseline'?'naive-signup.v1':'idempotent-signup.v1';
  const clientVersion=phase==='baseline'?'disabled-button.v1':phase==='transfer'?'browser-session-key.v1':'stable-intent-key.v1';
  const client=`// ${clientVersion}: executable key policy used to issue the client plan.\n${keyPolicy(phase).toString()}`;
  const server=`// ${version}: actual compiled SQL handler definition.\n`
    +'// Database schema enforces UNIQUE(run_id,idempotency_key); NULL keys permit independent inserts.\n'
    +[['RUN_WRITE_GUARD',RUN_WRITE_GUARD],['STEP_WRITE_GUARD',STEP_WRITE_GUARD],
      ['REGISTRATION_INSERT_SQL',REGISTRATION_INSERT_SQL],
      ...(phase==='baseline'?[]:[['IDEMPOTENT_INSERT_SQL',IDEMPOTENT_INSERT_SQL]]),
      ['RECEIPT_INSERT_SQL',RECEIPT_INSERT_SQL],['PRECOMMIT_RECEIPT_SQL',PRECOMMIT_RECEIPT_SQL],['ADVANCE_SQL',ADVANCE_SQL],
    ].map(([name,sql])=>`const ${name} = ${JSON.stringify(sql)};`).join('\n')
    +`\n${bindings.toString()}\n${(phase==='baseline'?naiveHandlerStatements:handlerStatements).toString()}`
    +`\n// The returned statements are awaited as one db.batch() transaction.\n${fixturePolicy.toString()}`
    +`\n// Actual committed-response reconstruction and explicit delivery adapter.\n${responseAdapterSource}`;
  const stages=fixtureId==='concurrent-retry.v1'?['Two independent concurrent signup requests']
    : fixtureId==='intent-lifecycle.v1'?['Start signup for event A','Retry signup A','Start signup for event B']
      : ['Initial signup request','Retry the same signup'];
  return {title:`${clientVersion} / ${version}`,client,server,
    sourceDigest:await digest({version:'groundtruth-source.v1',phase,fixtureId,client,server}),
    stages,groups:stages.length,requestCount:fixtureId==='intent-lifecycle.v1'?3:2};
}
