import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../lib/server/index.ts';
import type { CoachResult, LearningSession, Me, Prediction, RunEvidence, RunPlan, RuntimeConfig } from '../lib/contracts.ts';
import { createTestDb } from './sqlite-d1.ts';
import type { SQLiteD1 } from './sqlite-d1.ts';
import { createCoach } from '../lib/ai/coach.ts';

const origin = 'https://groundtruth.test';
const emptyConfig = { DB: null as unknown as D1Database, PILOT_ENROLLMENT_ENABLED: 'true', PILOT_ENROLLMENT_CODE: 'pilot-code' } satisfies RuntimeConfig;
type ErrorResult = { error: { code: string } };
async function readJson<T>(response: Response): Promise<T> { return await response.json() as T; }

function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${origin}/api${path}`, {
    method,
    headers: { ...(method === 'GET' ? {} : { Origin: origin, 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('anonymous status never treats a supplied identity header as native identity', async () => {
  const response = await handleApi(request('/me', 'GET', undefined, { 'oai-authenticated-user-id': 'forged' }), emptyConfig, null);
  assert.equal(response.status, 200);
  const result = await readJson<Me>(response);
  assert.equal(result.authenticated, false);
  assert.equal(result.userId, null);
  assert.equal(result.enrolled, false);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
});

test('anonymous session access is denied before touching persistence', async () => {
  const response = await handleApi(request('/sessions'), emptyConfig, null);
  assert.equal(response.status, 401);
  assert.equal((await readJson<ErrorResult>(response)).error.code, 'AUTH_REQUIRED');
});

test('cross-origin mutation is refused before any profile or session write', async () => {
  const response = await handleApi(request('/notices/practice', 'POST', { version: 'practice.v1', acknowledged: true }, { Origin: 'https://attacker.test' }), emptyConfig, 'member-a');
  assert.equal(response.status, 403);
  assert.equal((await readJson<ErrorResult>(response)).error.code, 'ORIGIN_REQUIRED');
});

test('mutation only accepts JSON and bounded payloads', async () => {
  const plain = await handleApi(request('/notices/practice', 'POST', {}, { 'Content-Type': 'text/plain' }), emptyConfig, 'member-a');
  assert.equal(plain.status, 415);
  const oversized = await handleApi(request('/notices/practice', 'POST', { padding: 'a'.repeat(33_000) }), emptyConfig, 'member-a');
  assert.equal(oversized.status, 413);
});

function configFor(fixture: SQLiteD1): RuntimeConfig {
  return { ...emptyConfig, DB: fixture.db, PILOT_ID: 'test-pilot', STAFF_USER_ROLES: JSON.stringify({ 'tutor-a': 'tutor' }) };
}

async function enroll(config: RuntimeConfig, user = 'member-a') {
  assert.equal((await handleApi(request('/notices/practice', 'POST', { version: 'practice.v1', acknowledged: true }), config, user)).status, 200);
  assert.equal((await handleApi(request('/pilot/enroll', 'POST', { code: 'pilot-code' }), config, user)).status, 201);
}

async function start(config: RuntimeConfig, user = 'member-a', id = 'create-1'): Promise<LearningSession> {
  const created = await handleApi(request('/sessions', 'POST', { requestId: id }), config, user);
  assert.equal(created.status, 201);
  const { sessionId } = await readJson<{ sessionId: string }>(created);
  return readJson<LearningSession>(await handleApi(request(`/sessions/${sessionId}`), config, user));
}

const prediction = (caseId: string, id = 'prediction-1') => ({
  caseId, rowsAfterEachGroup: [0, 1], requestOutcomes: ['fault', 'created'],
  rationale: 'I expect the failed response to leave no completed registration.', confidence: 3, requestId: id,
});

test('practice acknowledgment is required and optional research consent can be withdrawn', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture);
  assert.equal((await handleApi(request('/pilot/enroll', 'POST', { code: 'pilot-code' }), config, 'member-a')).status, 403);
  await enroll(config);
  let me = await readJson<Me>(await handleApi(request('/me'), config, 'member-a'));
  assert.equal(me.researchConsent, false); assert.equal(me.enrolled, true);
  for (const optIn of [true, false]) {
    assert.equal((await handleApi(request('/me/research-consent', 'PATCH', { optIn }), config, 'member-a')).status, 200);
    me = await readJson<Me>(await handleApi(request('/me'), config, 'member-a'));
    assert.equal(me.researchConsent, optIn); assert.equal(me.enrolled, true);
  }
  assert.equal((await handleApi(request('/notices/practice', 'POST', { version: 'practice.v1', acknowledged: true, userId: 'other' }), config, 'member-a')).status, 400);
});

test('simultaneous native enrollment admits at most five students without granting instructor access', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture);
  const users = Array.from({ length: 8 }, (_, i) => `student-${i}`);
  for (const user of users) await handleApi(request('/notices/practice', 'POST', { version: 'practice.v1', acknowledged: true }), config, user);
  const responses = await Promise.all(users.map((user) => handleApi(request('/pilot/enroll', 'POST', { code: 'pilot-code' }), config, user)));
  assert.equal(responses.filter((response) => response.status === 201).length, 5);
  assert.equal(responses.filter((response) => response.status === 409).length, 3);
  assert.equal((await handleApi(request('/pilot/enroll', 'POST', { code: 'pilot-code' }), config, 'student-0')).status, 200);
  assert.equal((await handleApi(request('/admin/pilot'), config, 'student-0')).status, 403);
  await enroll(config, 'tutor-a');
  assert.equal((await readJson<Me>(await handleApi(request('/me'), config, 'tutor-a'))).instructor, true);
});

test('session ownership and frozen prediction are enforced even when requests race', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture); await enroll(config); await enroll(config, 'member-b');
  const session = await start(config); const caseId = session.cases[0].id;
  const duplicateCreate = await handleApi(request('/sessions', 'POST', { requestId: 'create-1' }), config, 'member-a');
  assert.equal((await readJson<{ sessionId: string }>(duplicateCreate)).sessionId, session.id);
  assert.equal((await handleApi(request(`/sessions/${session.id}`), config, 'member-b')).status, 404);
  assert.equal((await handleApi(request(`/sessions/${session.id}/source?caseId=${caseId}`), config, 'member-b')).status, 404);
  const attempts = await Promise.all(['first', 'second'].map((id) => handleApi(request(`/sessions/${session.id}/predictions`, 'POST', prediction(caseId, id)), config, 'member-a')));
  assert.equal(attempts.filter((response) => response.status === 201).length, 1);
  assert.equal(attempts.filter((response) => response.status === 409).length, 1);
  const winner = attempts[0].status === 201 ? 'first' : 'second';
  const frozen = await readJson<Prediction>(attempts.find((response) => response.status === 201)!);
  const repeated = await handleApi(request(`/sessions/${session.id}/predictions`, 'POST', prediction(caseId, winner)), config, 'member-a');
  assert.deepEqual(await repeated.json(), frozen);
  const changed = await handleApi(request(`/sessions/${session.id}/predictions`, 'POST', { ...prediction(caseId, winner), confidence: 5 }), config, 'member-a');
  assert.equal(changed.status, 409);
});

test('future source and reviewed patches remain unavailable before required frozen explanation', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture); await enroll(config); const session = await start(config);
  assert.equal(session.phase, 'baseline'); assert.equal(session.cases.length, 1); assert.equal(session.cases[0].fixtureId, 'lost-success.v1');
  assert.equal((await handleApi(request(`/sessions/${session.id}/source?caseId=future`), config, 'member-a')).status, 404);
  const premature = await handleApi(request(`/sessions/${session.id}/patches`, 'POST', { patchId: 'idempotent-intent.v1', reason: 'Try a stable key.', requestId: 'patch-1' }), config, 'member-a');
  assert.equal(premature.status, 409);
  assert.equal((await handleApi(request(`/sessions/${session.id}/advance`, 'POST', { requestId: 'advance-1' }), config, 'member-a')).status, 409);
  assert.equal((await handleApi(request(`/sessions/${session.id}/cases`, 'POST', { fixtureId: 'intent-lifecycle.v1', selectionSource: 'student', selectionReason: 'Try another input.', requestId: 'case-2' }), config, 'member-a')).status, 400);
});

test('expired activity cannot be read or mutated', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture); await enroll(config); const session = await start(config);
  fixture.sqlite.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(session.id);
  assert.equal((await handleApi(request(`/sessions/${session.id}`), config, 'member-a')).status, 410);
  assert.equal((await handleApi(request(`/sessions/${session.id}/predictions`, 'POST', prediction(session.cases[0].id)), config, 'member-a')).status, 410);
});

test('deleting own activity removes memberships and frozen state without touching another member', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture); await enroll(config); await enroll(config, 'member-b');
  const own = await start(config); const other = await start(config, 'member-b');
  const response = await handleApi(request('/activity', 'DELETE', undefined, { 'X-GroundTruth-Account': 'member-a' }), config, 'member-a');
  assert.equal(response.status, 200);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM sessions WHERE owner_id=?').get('member-a')!.n, 0);
  assert.equal((await readJson<Me>(await handleApi(request('/me'), config, 'member-a'))).enrolled, false);
  assert.equal((await handleApi(request(`/sessions/${other.id}`), config, 'member-b')).status, 200);
  await enroll(config);
  assert.equal((await handleApi(request(`/sessions/${own.id}`), config, 'member-a')).status, 404);
});

async function executeCase(config: RuntimeConfig, session: LearningSession, user = 'member-a') {
  const selected = session.cases.find((item) => item.phase === session.phase)!;
  const lifecycle = selected.fixtureId === 'intent-lifecycle.v1';
  const predictionBody = { ...prediction(selected.id, `prediction-${session.phase}`),
    ...(lifecycle ? { rowsAfterEachGroup: [1, 1, 2], requestOutcomes: ['created', 'replayed', 'created'] } : {}) };
  const locked = await handleApi(request(`/sessions/${session.id}/predictions`, 'POST', predictionBody), config, user);
  assert.equal(locked.status, 201);
  const frozen = await readJson<Prediction>(locked);
  const createBody = { caseId: selected.id, predictionId: frozen.id, requestId: `run-${session.phase}` };
  const started = await handleApi(request(`/sessions/${session.id}/runs`, 'POST', createBody), config, user);
  assert.equal(started.status, 201);
  const plan = await readJson<RunPlan>(started);
  const again = await handleApi(request(`/sessions/${session.id}/runs`, 'POST', createBody), config, user);
  assert.equal(again.status, 201); assert.deepEqual(await again.json(), plan);
  assert.equal((await handleApi(request(`/runs/${plan.runId}/evidence`), config, user)).status, 409);
  const groups = Array.from(new Set(plan.steps.map((step) => step.group))).sort();
  for (const group of groups) await Promise.all(plan.steps.filter((step) => step.group === group).map(async (step) => {
    const response = await handleApi(request(`/lab/runs/${plan.runId}/registrations`, 'POST', step.payload, {
      'X-GT-Step-Id': step.stepId, ...(step.idempotencyKey ? { 'Idempotency-Key': step.idempotencyKey } : {}),
    }), config, user);
    assert.ok([201, 409, 503, 504].includes(response.status), `${response.status}: ${await response.text()}`);
  }));
  const state = await readJson<{ completedStepIds: string[] }>(await handleApi(request(`/runs/${plan.runId}`), config, user));
  assert.equal(state.completedStepIds.length, plan.steps.length);
  const finalized = await handleApi(request(`/runs/${plan.runId}/finalize`, 'POST', { requestId: `finalize-${session.phase}` }), config, user);
  assert.equal(finalized.status, 200);
  const evidence = await readJson<RunEvidence>(finalized);
  const latest = await readJson<LearningSession>(await handleApi(request(`/sessions/${session.id}`), config, user));
  assert.equal(latest.cases.find((item) => item.id === selected.id)!.evidence!.evidenceHash, evidence.evidenceHash);
  return { selected, plan, evidence };
}

async function explain(config: RuntimeConfig, sessionId: string, caseId: string, runId: string, id: string) {
  return handleApi(request(`/sessions/${sessionId}/explanations`, 'POST', { caseId, runId, body: {
    claim: 'The request outcome and committed rows are different observations.',
    evidence: 'I inspected the receipt statuses and registration identifiers.',
    reasoning: 'The server commits a transaction before the adapter changes delivery.',
  }, requestId: id }), config, 'member-a');
}

test('real handler routes retain evidence through required repair and independent transfer gates', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture); await enroll(config);
  let session: LearningSession = await start(config);
  assert.equal((await handleApi(request(`/sessions/${session.id}/runs`, 'POST', { caseId: session.cases[0].id, predictionId: 'forged', requestId: 'too-early' }), config, 'member-a')).status, 409);
  for (const [phase, expectedCount] of [['baseline', 2], ['repair', 1], ['transfer', 1], ['transfer_repair', 2]] as const) {
    assert.equal(session.phase, phase);
    const { selected, plan, evidence } = await executeCase(config, session);
    assert.equal(evidence.probes.committed_registration_count, expectedCount);
    if (phase === 'baseline') {
      assert.equal(evidence.receipts[0].handlerStatus, 201); assert.equal(evidence.receipts[0].deliveredStatus, 504);
      assert.equal(evidence.receipts[1].decision, 'created');
    }
    if (phase === 'repair') assert.equal(evidence.receipts[1].decision, 'replayed');
    if (phase === 'transfer') {
      assert.equal(evidence.receipts[2].deliveredStatus, 409);
      assert.equal((await handleApi(request('/coach', 'POST', { sessionId: session.id, caseId: selected.id }), config, 'member-a')).status, 403);
      assert.equal((await handleApi(request(`/sessions/${session.id}/patches`, 'POST', { patchId: 'new-intent-new-key.v1', reason: 'I want to change the client.', requestId: 'early-transfer-patch' }), config, 'member-a')).status, 409);
    }
    assert.equal((await explain(config, session.id, selected.id, plan.runId, `explain-${phase}`)).status, 201);
    assert.equal((await explain(config, session.id, selected.id, plan.runId, `explain-again-${phase}`)).status, 409);
    if (phase === 'baseline' || phase === 'transfer') {
      const patchId = phase === 'baseline' ? 'idempotent-intent.v1' : 'new-intent-new-key.v1';
      assert.equal((await handleApi(request(`/sessions/${session.id}/patches`, 'POST', { patchId, reason: 'Use the reviewed repair for this application.', requestId: `patch-${phase}` }), config, 'member-a')).status, 201);
    } else assert.equal((await handleApi(request(`/sessions/${session.id}/advance`, 'POST', { requestId: `advance-${phase}` }), config, 'member-a')).status, 201);
    session = await readJson<LearningSession>(await handleApi(request(`/sessions/${session.id}`), config, 'member-a'));
  }
  assert.equal(session.phase, 'complete'); assert.equal(session.cases.length, 4);
  const baseline = session.cases[0];
  const retriedOldRun = await handleApi(request(`/sessions/${session.id}/runs`, 'POST', { caseId: baseline.id, predictionId: baseline.prediction!.id, requestId: 'run-baseline' }), config, 'member-a');
  assert.equal(retriedOldRun.status, 201); assert.equal((await readJson<RunPlan>(retriedOldRun)).runId, baseline.runId);
  const exported = await handleApi(request(`/sessions/${session.id}/proof.json`), config, 'member-a');
  assert.equal(exported.status, 200); const text = await exported.text();
  assert.equal(text.includes('member-a'), false); assert.equal(text.includes('pilot-code'), false);
  assert.equal(JSON.parse(text).session.cases.filter((item: { evidence: unknown }) => item.evidence).length, 4);
});

test('run execution, evidence, finalization and tutor exports enforce separate ownership and role checks', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture);
  await enroll(config); await enroll(config, 'member-b'); await enroll(config, 'tutor-a');
  const session = await start(config); const { plan } = await executeCase(config, session);
  for (const endpoint of [`/runs/${plan.runId}`, `/runs/${plan.runId}/evidence`, `/sessions/${session.id}/proof.json`]) {
    assert.equal((await handleApi(request(endpoint), config, 'member-b')).status, 404);
  }
  assert.equal((await handleApi(request(`/runs/${plan.runId}/finalize`, 'POST', { requestId: 'foreign-finalize' }), config, 'member-b')).status, 404);
  assert.equal((await handleApi(request(`/lab/runs/${plan.runId}/registrations`, 'POST', plan.steps[0].payload, { 'X-GT-Step-Id': plan.steps[0].stepId }), config, 'member-b')).status, 404);
  assert.equal((await handleApi(request(`/admin/sessions/${session.id}/proof.json`), config, 'member-b')).status, 403);
  assert.equal((await handleApi(request(`/admin/sessions/${session.id}/proof.json`), config, 'tutor-a')).status, 200);
  assert.equal((await handleApi(request(`/sessions/${session.id}`), config, 'tutor-a')).status, 404);
  await handleApi(request('/activity', 'DELETE', undefined, { 'X-GroundTruth-Account': 'member-a' }), config, 'member-a');
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM lab_runs').get()!.n, 0);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM lab_registrations').get()!.n, 0);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM lab_receipts').get()!.n, 0);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM lab_evidence').get()!.n, 0);
  await enroll(config);
  assert.equal((await handleApi(request(`/runs/${plan.runId}/finalize`, 'POST', { requestId: 'stale-finalize' }), config, 'member-a')).status, 404);
});

test('learner coach decisions are saved as their own bounded reasoning and cannot bypass transfer', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture); await enroll(config); const session = await start(config);
  const body = { caseId: session.cases[0].id, decision: 'rejected', reason: 'I will first compare the original lost response experiment.', requestId: 'decision-1' };
  assert.equal((await handleApi(request(`/sessions/${session.id}/suggestion-decisions`, 'POST', body), config, 'member-a')).status, 201);
  assert.equal((await handleApi(request(`/sessions/${session.id}/suggestion-decisions`, 'POST', body), config, 'member-a')).status, 201);
  const updated = await readJson<LearningSession>(await handleApi(request(`/sessions/${session.id}`), config, 'member-a'));
  assert.equal(updated.suggestionDecisions!.length, 1); assert.equal(updated.suggestionDecisions![0].decision, 'rejected');
});

test('unconfigured coaching remains visibly instructor-authored and consumes no provider attempts', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture); await enroll(config); const session = await start(config);
  assert.equal((await handleApi(request('/coach', 'POST', { sessionId: session.id, caseId: session.cases[0].id }), config, 'member-a')).status, 409);
  await handleApi(request(`/sessions/${session.id}/predictions`, 'POST', prediction(session.cases[0].id)), config, 'member-a');
  const response = await handleApi(request('/coach', 'POST', { sessionId: session.id, caseId: session.cases[0].id }), config, 'member-a');
  assert.equal(response.status, 200);
  const result = await readJson<CoachResult>(response); assert.equal(result.mode, 'instructor-authored'); assert.equal(result.status, 'unavailable');
  assert.equal(fixture.sqlite.prepare('SELECT provider_attempts FROM coach_usage WHERE session_id=?').get(session.id)!.provider_attempts, 0);
});

test('persisted coach quota counts actual preflight and generation attempts and stops at twelve', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close());
  const config = { ...configFor(fixture), MODEL_API_KEY: 'test-provider-key', MODEL_CALLS_ENABLED: 'true' };
  await enroll(config); const session = await start(config);
  await handleApi(request(`/sessions/${session.id}/predictions`, 'POST', prediction(session.cases[0].id)), config, 'member-a');
  let providerAttempts = 0;
  const adapter = createCoach({ fetch: (async (url) => {
    providerAttempts++;
    return String(url).endsWith('/input_tokens') ? Response.json({ input_tokens: 100 }) : Response.json({}, { status: 401 });
  }) as typeof fetch });
  for (let i = 0; i < 6; i++) {
    assert.equal((await handleApi(request('/coach', 'POST', { sessionId: session.id, caseId: session.cases[0].id }), config, 'member-a', { coach: adapter })).status, 200);
  }
  assert.equal(providerAttempts, 12);
  assert.equal(fixture.sqlite.prepare('SELECT provider_attempts FROM coach_usage WHERE session_id=?').get(session.id)!.provider_attempts, 12);
  const limited = await handleApi(request('/coach', 'POST', { sessionId: session.id, caseId: session.cases[0].id }), config, 'member-a', { coach: adapter });
  assert.equal(limited.status, 429); assert.equal(providerAttempts, 12);
});

test('a remaining single coach attempt is kept instead of spending it on an unusable preflight', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close());
  const config = { ...configFor(fixture), MODEL_API_KEY: 'test-provider-key', MODEL_CALLS_ENABLED: 'true' };
  await enroll(config); const session = await start(config);
  await handleApi(request(`/sessions/${session.id}/predictions`, 'POST', prediction(session.cases[0].id)), config, 'member-a');
  fixture.sqlite.prepare('INSERT INTO coach_usage(session_id,provider_attempts) VALUES(?,11)').run(session.id);
  let fetched = false;
  const adapter = createCoach({ fetch: (async () => { fetched = true; return Response.json({ input_tokens: 100 }); }) as typeof fetch });
  const limited = await handleApi(request('/coach', 'POST', { sessionId: session.id, caseId: session.cases[0].id }), config, 'member-a', { coach: adapter });
  assert.equal(limited.status, 429); assert.equal(fetched, false);
  assert.equal(fixture.sqlite.prepare('SELECT provider_attempts FROM coach_usage WHERE session_id=?').get(session.id)!.provider_attempts, 11);
});

test('one coach request per native user runs at a time and deletion prevents a late coaching write', { timeout: 2_000 }, async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close());
  const config = { ...configFor(fixture), MODEL_API_KEY: 'test-provider-key', MODEL_CALLS_ENABLED: 'true' };
  await enroll(config); const session = await start(config);
  await handleApi(request(`/sessions/${session.id}/predictions`, 'POST', prediction(session.cases[0].id)), config, 'member-a');
  let release!: () => void; let started!: () => void;
  const providerStarted = new Promise<void>((resolve) => { started = resolve; });
  const held = new Promise<void>((resolve) => { release = resolve; });
  const adapter = createCoach({ fetch: (async () => { started(); await held; return Response.json({}, { status: 401 }); }) as typeof fetch });
  const first = handleApi(request('/coach', 'POST', { sessionId: session.id, caseId: session.cases[0].id }), config, 'member-a', { coach: adapter });
  await providerStarted;
  assert.equal((await handleApi(request('/coach', 'POST', { sessionId: session.id, caseId: session.cases[0].id }), config, 'member-a', { coach: adapter })).status, 429);
  assert.equal((await handleApi(request('/activity', 'DELETE', undefined, { 'X-GroundTruth-Account': 'member-a' }), config, 'member-a')).status, 200);
  release(); assert.equal((await first).status, 404);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM sessions').get()!.n, 0);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM coach_usage').get()!.n, 0);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM coach_locks').get()!.n, 0);
});

test('a coach response begun before a reviewed patch is discarded when the phase changes', { timeout: 2_000 }, async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close());
  const config = { ...configFor(fixture), MODEL_API_KEY: 'test-provider-key', MODEL_CALLS_ENABLED: 'true' };
  await enroll(config); const session = await start(config); const { selected, plan } = await executeCase(config, session);
  assert.equal((await explain(config, session.id, selected.id, plan.runId, 'explain-before-coach')).status, 201);
  let release!: () => void; let started!: () => void;
  const providerStarted = new Promise<void>((resolve) => { started = resolve; }); const held = new Promise<void>((resolve) => { release = resolve; });
  const adapter = createCoach({ fetch: (async () => { started(); await held; return Response.json({}, { status: 401 }); }) as typeof fetch });
  const pending = handleApi(request('/coach', 'POST', { sessionId: session.id, caseId: selected.id }), config, 'member-a', { coach: adapter });
  await providerStarted;
  const patched = await handleApi(request(`/sessions/${session.id}/patches`, 'POST', { patchId: 'idempotent-intent.v1', reason: 'Apply the reviewed repair.', requestId: 'patch-during-coach' }), config, 'member-a');
  assert.equal(patched.status, 201); release();
  const response = await pending; assert.equal(response.status, 409);
  assert.equal((await readJson<ErrorResult>(response)).error.code, 'COACH_STATE_CHANGED');
});

test('only an instructor can purge expired data while active learning and hard quotas remain intact', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture);
  await enroll(config); await enroll(config, 'member-b'); await enroll(config, 'tutor-a');
  const expired = await start(config); await executeCase(config, expired);
  const active = await start(config, 'member-b');
  fixture.sqlite.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(expired.id);
  fixture.sqlite.prepare("INSERT INTO practice_profiles(user_id,research_opt_in,updated_at) VALUES('expired-user',0,'2000-01-01T00:00:00.000Z')").run();
  fixture.sqlite.prepare("INSERT INTO pilot_memberships(user_id,pilot_id,role,enrolled_at,expires_at) VALUES('expired-user','test-pilot','student','2000-01-01T00:00:00.000Z','2000-02-01T00:00:00.000Z')").run();
  fixture.sqlite.prepare("INSERT INTO coach_locks(user_id,token,expires_at) VALUES('expired-user','old-token','2000-01-01T00:00:00.000Z')").run();
  fixture.sqlite.prepare('INSERT INTO coach_usage(session_id,provider_attempts) VALUES(?,12)').run(active.id);
  const stored = fixture.sqlite.prepare('SELECT document_json FROM sessions WHERE id=?').get(active.id)!;
  const doc = JSON.parse(String(stored.document_json)) as { coaching?: unknown[] };
  doc.coaching = [{ caseId: active.cases[0].id, phase: 'baseline', result: { status: 'unavailable', mode: 'instructor-authored', decision: null }, at: '2000-01-01T00:00:00.000Z', receipt: { providerResponseId: 'old-provider-response' } }];
  fixture.sqlite.prepare('UPDATE sessions SET document_json=? WHERE id=?').run(JSON.stringify(doc), active.id);
  assert.equal((await handleApi(request('/admin/purge-expired', 'POST', {}), config, 'member-a')).status, 403);
  const response = await handleApi(request('/admin/purge-expired', 'POST', {}), config, 'tutor-a');
  assert.equal(response.status, 200);
  assert.equal((await readJson<{ deleted: { sessions: number } }>(response)).deleted.sessions, 1);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM lab_runs').get()!.n, 0);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM pilot_memberships WHERE user_id=?').get('expired-user')!.n, 0);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM practice_profiles WHERE user_id=?').get('expired-user')!.n, 0);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM coach_locks').get()!.n, 0);
  assert.equal(fixture.sqlite.prepare('SELECT provider_attempts FROM coach_usage WHERE session_id=?').get(active.id)!.provider_attempts, 12);
  const report = await readJson<{ coach: { events: { receipt?: unknown }[] } }>(await handleApi(request(`/admin/sessions/${active.id}/proof.json`), config, 'tutor-a'));
  assert.equal(report.coach.events.length, 1); assert.equal(report.coach.events[0].receipt, undefined);
  assert.equal((await handleApi(request(`/sessions/${active.id}`), config, 'member-b')).status, 200);
});

test('prediction reasoning accepts concise nonempty text while bounding storage', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture); await enroll(config); const session = await start(config);
  const path = `/sessions/${session.id}/predictions`;
  for (const rationale of ['   ', 'x'.repeat(2_001)]) {
    assert.equal((await handleApi(request(path, 'POST', { ...prediction(session.cases[0].id), rationale }), config, 'member-a')).status, 400);
  }
  const response = await handleApi(request(path, 'POST', { ...prediction(session.cases[0].id), rationale: ' x ' }), config, 'member-a');
  assert.equal(response.status, 201); assert.equal((await readJson<Prediction>(response)).rationale, 'x');
});

test('locked explanation fields accept concise nonempty text without exceeding the combined limit', async (t) => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = configFor(fixture); await enroll(config); const session = await start(config);
  const { selected, plan } = await executeCase(config, session);
  const path = `/sessions/${session.id}/explanations`;
  const outer = { caseId: selected.id, runId: plan.runId, requestId: 'concise-explanation' };
  for (const body of [{ claim: ' ', evidence: 'y', reasoning: 'z' }, { claim: 'x'.repeat(2_000), evidence: 'y'.repeat(2_000), reasoning: 'z' }]) {
    assert.equal((await handleApi(request(path, 'POST', { ...outer, body }), config, 'member-a')).status, 400);
  }
  const response = await handleApi(request(path, 'POST', { ...outer, body: { claim: ' x ', evidence: ' y ', reasoning: ' z ' } }), config, 'member-a');
  assert.equal(response.status, 201);
  const result = await readJson<{ claim: string; evidence: string; reasoning: string }>(response);
  assert.equal(result.claim, 'x'); assert.equal(result.evidence, 'y'); assert.equal(result.reasoning, 'z');
});
