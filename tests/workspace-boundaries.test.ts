import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../lib/server/index.ts';
import { acknowledgePractice, completeRun, prepareRun, workspaceAccess } from '../lib/client/workspace.ts';
import { api, post } from '../lib/client/api.ts';
import type { LearningSession, Me, Prediction, RunPlan, RuntimeConfig } from '../lib/contracts.ts';
import { createTestDb } from './sqlite-d1.ts';

const origin = 'https://groundtruth.test';
function setup(t: test.TestContext) {
  const fixture = createTestDb(); t.after(() => fixture.close());
  const config: RuntimeConfig = { DB: fixture.db, PILOT_ID: 'boundary-pilot', PILOT_ENROLLMENT_ENABLED: 'true', PILOT_ENROLLMENT_CODE: 'pilot-code' };
  const send = (path: string, method = 'GET', body?: unknown, user = 'learner') => handleApi(new Request(origin + path, {
    method, headers: { Origin: origin, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
  }), config, user);
  t.mock.method(globalThis, 'fetch', (path: string | URL | Request, init?: RequestInit) => send(String(path), init?.method, init?.body ? JSON.parse(String(init.body)) : undefined));
  const stored = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { get length() { return stored.size; }, clear: () => stored.clear(), key: (index: number) => [...stored.keys()][index] ?? null, getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => { stored.set(key, value); }, removeItem: (key: string) => { stored.delete(key); } } satisfies Storage });
  return { fixture, config, send, stored };
}
async function start() {
  await post('/api/notices/practice', { version: 'practice.v1', acknowledged: true });
  await post('/api/pilot/enroll', { code: 'pilot-code' });
  const { sessionId } = await post<{ sessionId: string }>('/api/sessions', { requestId: crypto.randomUUID() });
  return api<LearningSession>(`/api/sessions/${sessionId}`);
}
async function prepare(session: LearningSession, caseId = session.cases.find(c => c.phase === session.phase)!.id) {
  const selected = session.cases.find(c => c.id === caseId)!;
  const prediction = await post<Prediction>(`/api/sessions/${session.id}/predictions`, {
    caseId, rowsAfterEachGroup: selected.fixtureId === 'concurrent-retry.v1' ? [1] : [1, 1], requestOutcomes: ['created', 'replayed'],
    rationale: 'Compare receipt and row evidence.', confidence: 3, requestId: crypto.randomUUID(),
  });
  return { caseId, predictionId: prediction.id, requestId: crypto.randomUUID() };
}
async function steps(plan: RunPlan) {
  for (const group of new Set(plan.steps.map(s => s.group))) await Promise.all(plan.steps.filter(s => s.group === group).map(s => fetch(`/api/lab/runs/${plan.runId}/registrations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GT-Step-Id': s.stepId, ...(s.idempotencyKey ? { 'Idempotency-Key': s.idempotencyKey } : {}) }, body: JSON.stringify(s.payload),
  })));
}
// Preserve fixture headers while exercising the real client transport and actual API.
function transport(t: test.TestContext, config: RuntimeConfig, after?: (path: string, response: Response, body: unknown) => void) {
  t.mock.method(globalThis, 'fetch', async (path: string | URL | Request, init?: RequestInit) => {
    const response = await handleApi(new Request(origin + String(path), { ...init, headers: { Origin: origin, ...init?.headers } }), config, 'learner');
    after?.(String(path), response, init?.body ? JSON.parse(String(init.body)) : undefined);
    return response;
  });
}

for (const optIn of [false, true]) test(`fresh authenticated onboarding reaches practice for research choice ${optIn}`, async t => {
  const { config } = setup(t); transport(t, config);
  assert.equal(workspaceAccess(await api<Me>('/api/me')), 'notice');
  let sessionLoads = 0;
  const me = await acknowledgePractice(optIn, async () => { sessionLoads++; await api('/api/sessions'); });
  assert.equal(me.researchConsent, optIn); assert.equal(sessionLoads, 0);
  assert.equal(workspaceAccess(me), 'enrollment');
  await post('/api/pilot/enroll', { code: 'pilot-code' });
  assert.equal(workspaceAccess(await api<Me>('/api/me')), 'activity');
  assert.equal((await api<{ sessions: unknown[] }>('/api/sessions')).sessions.length, 0);
});

test('finalize client survives a lost response and failed session reconcile with the same run request', async t => {
  const { config, fixture, stored } = setup(t); transport(t, config);
  const session = await start(); const body = await prepare(session);
  const plan = await post<RunPlan>(`/api/sessions/${session.id}/runs`, body); await steps(plan);
  const ids: string[] = []; let lose = true;
  transport(t, config, (path, response, body) => {
    if (path.endsWith('/finalize')) {
      ids.push((body as { requestId: string }).requestId);
      assert.equal(response.status, 200);
      if (lose) { lose = false; throw new Error('response lost after commit'); }
    }
  });
  const reconcile = () => api<LearningSession>(`/api/sessions/${session.id}`);
  await assert.rejects(completeRun(plan.runId, reconcile));
  assert.equal(fixture.sqlite.prepare('SELECT count(*) n FROM lab_evidence').get()!.n, 1);
  assert.ok([...stored.values()].includes(ids[0]), 'pending request survives a reload');
  const reloaded = await import(`../lib/client/workspace.ts?reload=${crypto.randomUUID()}`);
  await assert.rejects(reloaded.completeRun(plan.runId, async () => { throw new Error('session reload unavailable'); }));
  assert.ok([...stored.values()].includes(ids[0]));
  const saved = await reloaded.completeRun(plan.runId, reconcile);
  assert.ok(saved.cases[0].evidence); assert.equal(new Set(ids).size, 1);
  assert.ok(![...stored.values()].includes(ids[0]));
  assert.equal(fixture.sqlite.prepare('SELECT count(*) n FROM lab_evidence').get()!.n, 1);
});

for (const phase of ['baseline', 'repair'] as const) test(`${phase} transition blocks an unfinished optional probe and can proceed after finalization`, async t => {
  const { config } = setup(t); transport(t, config);
  let session = await start();
  const completeRequired = async () => {
    const body = await prepare(session); const plan = await post<RunPlan>(`/api/sessions/${session.id}/runs`, body); await steps(plan);
    await post(`/api/runs/${plan.runId}/finalize`, { requestId: crypto.randomUUID() });
    await post(`/api/sessions/${session.id}/explanations`, { caseId: body.caseId, runId: plan.runId, body: { claim: 'One intent', evidence: 'Saved receipts', reasoning: 'Compare rows' }, requestId: crypto.randomUUID() });
  };
  await completeRequired();
  const patch = () => post(`/api/sessions/${session.id}/patches`, { patchId: 'idempotent-intent.v1', reason: 'Replay one intent.', requestId: crypto.randomUUID() });
  if (phase === 'repair') { await patch(); session = await api<LearningSession>(`/api/sessions/${session.id}`); await completeRequired(); }
  const { caseId } = await post<{ caseId: string }>(`/api/sessions/${session.id}/cases`, { fixtureId: 'concurrent-retry.v1', selectionSource: 'student', selectionReason: 'Try parallel retries', requestId: crypto.randomUUID() });
  session = await api<LearningSession>(`/api/sessions/${session.id}`);
  const run = await post<RunPlan>(`/api/sessions/${session.id}/runs`, await prepare(session, caseId));
  const transition = phase === 'baseline' ? patch : () => post(`/api/sessions/${session.id}/advance`, { requestId: crypto.randomUUID() });
  await assert.rejects(transition(), { code: 'RUN_IN_PROGRESS' });
  assert.equal((await api<LearningSession>(`/api/sessions/${session.id}`)).phase, phase);
  await steps(run); await post(`/api/runs/${run.runId}/finalize`, { requestId: crypto.randomUUID() });
  await transition(); assert.equal((await api<LearningSession>(`/api/sessions/${session.id}`)).phase, phase === 'baseline' ? 'repair' : 'transfer');
});

test('failed run INSERT recovers source and case in a fresh browser without the original request id', async t => {
  const { config, fixture, stored } = setup(t); transport(t, config);
  const session = await start(); const body = await prepare(session);
  const predicted = await api<LearningSession>(`/api/sessions/${session.id}`);
  fixture.sqlite.exec("CREATE TRIGGER fail_run BEFORE INSERT ON lab_runs BEGIN SELECT RAISE(ABORT, 'transient write failure'); END");
  await assert.rejects(prepareRun(session.id, predicted.cases[0]), { status: 503 });
  const saved = await api<LearningSession>(`/api/sessions/${session.id}`); assert.ok(saved.cases[0].runId);
  fixture.sqlite.exec('DROP TRIGGER fail_run'); stored.clear();
  const source = await api<{ sourceDigest: string }>(`/api/sessions/${session.id}/source?caseId=${body.caseId}`); assert.ok(source.sourceDigest);
  const plan = await prepareRun(session.id, saved.cases[0]);
  assert.equal(plan.runId, saved.cases[0].runId);
  assert.equal((await post<RunPlan>(`/api/sessions/${session.id}/runs`, { ...body, requestId: 'another-tab' })).runId, plan.runId);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) n FROM lab_runs').get()!.n, 1);
  await steps(plan); await post(`/api/runs/${plan.runId}/finalize`, { requestId: 'recovered-finalize' });
});

test('enrollment throttles parallel failed codes persistently per native identity and pilot, then resets after ten minutes', async t => {
  const { fixture, config, send } = setup(t);
  for (const user of ['learner', 'other']) await send('/api/notices/practice', 'POST', { version: 'practice.v1', acknowledged: true }, user);
  const responses = await Promise.all(Array.from({ length: 8 }, () => send('/api/pilot/enroll', 'POST', { code: 'wrong' })));
  assert.equal(responses.filter(r => r.status === 403).length, 5);
  assert.equal(responses.filter(r => r.status === 429).length, 3);
  assert.ok(responses.filter(r => r.status === 429).every(r => Number(r.headers.get('retry-after')) > 0 && Number(r.headers.get('retry-after')) <= 600));
  const restartedConfig = { ...config };
  const blocked = await handleApi(new Request(origin + '/api/pilot/enroll', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'pilot-code' }) }), restartedConfig, 'learner');
  assert.equal(blocked.status, 429);
  assert.equal((await send('/api/pilot/enroll', 'POST', { code: 'pilot-code' }, 'other')).status, 201);
  const anotherPilot = await handleApi(new Request(origin + '/api/pilot/enroll', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'wrong' }) }), { ...config, PILOT_ID: 'other-pilot' }, 'learner');
  assert.equal(anotherPilot.status, 403, 'another pilot has its own attempt window');
  fixture.sqlite.prepare('UPDATE enrollment_attempts SET window_started_at=? WHERE user_id=?').run(Date.now() - 600_001, 'learner');
  assert.equal((await send('/api/pilot/enroll', 'POST', { code: 'pilot-code' })).status, 201);
});

test('activity deletion removes expired enrollment counters but preserves an active cooldown and other identities', async t => {
  const { fixture, config, send } = setup(t); transport(t, config);
  await start();
  await Promise.all(Array.from({ length: 5 }, () => send('/api/pilot/enroll', 'POST', { code: 'wrong' })));
  const active = fixture.sqlite.prepare('SELECT * FROM enrollment_attempts WHERE user_id=?').get('learner');
  const expiredAt = Date.now() - 600_001;
  fixture.sqlite.prepare('INSERT INTO enrollment_attempts VALUES(?,?,?,?)').run('learner', 'expired-pilot', expiredAt, 5);
  fixture.sqlite.prepare('INSERT INTO enrollment_attempts VALUES(?,?,?,?)').run('other', 'expired-pilot', expiredAt, 3);
  fixture.sqlite.prepare('INSERT INTO enrollment_attempts VALUES(?,?,?,?)').run('other', 'active-pilot', Date.now(), 4);
  const otherRows = fixture.sqlite.prepare('SELECT * FROM enrollment_attempts WHERE user_id=? ORDER BY pilot_id').all('other');
  const deleted = await send('/api/activity', 'DELETE');
  assert.equal(deleted.status, 200);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) n FROM enrollment_attempts WHERE user_id=? AND pilot_id=?').get('learner', 'expired-pilot')!.n, 0);
  const result = await deleted.json() as { deleted: { enrollmentAttempts: number }; retained: { enrollmentSecurityCounters: number; enrollmentSecurityWindowEndsAt: string | null; enrollmentSecurityCleanup: string } };
  assert.equal(result.deleted.enrollmentAttempts, 1);
  assert.equal(result.retained.enrollmentSecurityCounters, 1);
  assert.equal(result.retained.enrollmentSecurityWindowEndsAt, new Date(Number(active!.window_started_at) + 600_000).toISOString());
  assert.match(result.retained.enrollmentSecurityCleanup, /moderator cleanup/);
  assert.deepEqual(fixture.sqlite.prepare('SELECT * FROM enrollment_attempts WHERE user_id=?').get('learner'), active);
  assert.deepEqual(fixture.sqlite.prepare('SELECT * FROM enrollment_attempts WHERE user_id=? ORDER BY pilot_id').all('other'), otherRows);
  assert.equal((await api<Me>('/api/me')).enrolled, false);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) n FROM sessions WHERE owner_id=?').get('learner')!.n, 0);
  await post('/api/notices/practice', { version: 'practice.v1', acknowledged: true });
  assert.equal((await send('/api/pilot/enroll', 'POST', { code: 'pilot-code' })).status, 429);
  fixture.sqlite.prepare('UPDATE enrollment_attempts SET window_started_at=? WHERE user_id=?').run(expiredAt, 'learner');
  const laterDeletion = await send('/api/activity', 'DELETE');
  const later = await laterDeletion.json() as { deleted: { enrollmentAttempts: number }; retained: { enrollmentSecurityCounters: number; enrollmentSecurityWindowEndsAt: string | null } };
  assert.equal(later.deleted.enrollmentAttempts, 1); assert.equal(later.retained.enrollmentSecurityCounters, 0); assert.equal(later.retained.enrollmentSecurityWindowEndsAt, null);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) n FROM enrollment_attempts WHERE user_id=?').get('learner')!.n, 0);
});

test('authenticated moderator cleanup removes only expired enrollment counters', async t => {
  const { fixture, config, send } = setup(t); transport(t, config);
  config.STAFF_USER_ROLES = JSON.stringify({ moderator: 'tutor' });
  await start();
  await send('/api/notices/practice', 'POST', { version: 'practice.v1', acknowledged: true }, 'moderator');
  await send('/api/pilot/enroll', 'POST', { code: 'pilot-code' }, 'moderator');
  fixture.sqlite.prepare('INSERT INTO enrollment_attempts VALUES(?,?,?,?)').run('expired-user', 'boundary-pilot', Date.now() - 600_001, 5);
  const activeRows = fixture.sqlite.prepare('SELECT * FROM enrollment_attempts WHERE user_id!=? ORDER BY user_id').all('expired-user');
  assert.equal((await send('/api/admin/purge-expired', 'POST', {}, 'learner')).status, 403);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) n FROM enrollment_attempts WHERE user_id=?').get('expired-user')!.n, 1);
  const purged = await send('/api/admin/purge-expired', 'POST', {}, 'moderator');
  assert.equal(purged.status, 200);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) n FROM enrollment_attempts WHERE user_id=?').get('expired-user')!.n, 0);
  assert.equal((await purged.json() as { deleted: { enrollmentAttempts: number } }).deleted.enrollmentAttempts, 1);
  assert.deepEqual(fixture.sqlite.prepare('SELECT * FROM enrollment_attempts ORDER BY user_id').all(), activeRows);
});
