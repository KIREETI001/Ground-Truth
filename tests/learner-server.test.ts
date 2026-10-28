import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi as handleRawApi } from '../lib/server/index.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
import type { LearnerRecord, LearnerState, Pulse } from '../lib/learner/types.ts';
import { createTestDb } from './sqlite-d1.ts';
import { pulseForDate } from '../lib/server/learner.ts';

const origin = 'https://groundtruth.test';
const state: LearnerState = { version: 1, profile: { goal: 'full-stack', languages: ['typescript'], interests: ['apis'], minutes: 20 }, baseline: [], completed: [], project: null };
function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api${path}`, { method, headers: { ...(method === 'GET' ? {} : { Origin: origin, 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function read<T>(response: Response) { return await response.json() as T; }
const saveBody = (revision: string | null = null, value: unknown = state) => ({ state: value, revision, noticeVersion: 'learner.v1' });
// Successful test requests carry the owner captured by the client at operation start.
function handleApi(request: Request, config: RuntimeConfig, userId: string | null) {
  const headers = new Headers(request.headers);
  if (userId && ['/api/learner', '/api/learner/export', '/api/pulse', '/api/activity'].includes(new URL(request.url).pathname) && !headers.has('X-GroundTruth-Account')) headers.set('X-GroundTruth-Account', userId);
  return handleRawApi(new Request(request, { headers }), config, userId);
}

async function expectError(response: Response, status: number, code: string) {
  assert.equal(response.status, status);
  const result = await read<{ error: { code: string }; state?: unknown; choiceId?: unknown }>(response);
  assert.equal(result.error.code, code); assert.equal('state' in result, false); assert.equal('choiceId' in result, false);
}

test('account preconditions reject missing, changed and unauthenticated owners before touching persistence', async () => {
  const config = { DB: null as unknown as D1Database } satisfies RuntimeConfig;
  const operations = [
    { path: '/learner', method: 'GET' },
    { path: '/learner/export', method: 'GET' },
    { path: '/learner', method: 'POST', body: saveBody() },
    { path: '/learner', method: 'DELETE' },
    { path: '/activity', method: 'DELETE' },
    { path: '/pulse', method: 'POST', body: { pollId: 'current', choiceId: 'unsure' } },
  ];
  for (const operation of operations) {
    await expectError(await handleRawApi(request(operation.path, operation.method, operation.body), config, 'member-b'), 428, 'ACCOUNT_PRECONDITION_REQUIRED');
    await expectError(await handleRawApi(request(operation.path, operation.method, operation.body, { 'X-GroundTruth-Account': 'member-a' }), config, 'member-b'), 409, 'ACCOUNT_CHANGED');
    await expectError(await handleRawApi(request(operation.path, operation.method, operation.body, { 'X-GroundTruth-Account': 'member-b', 'oai-authenticated-user-id': 'member-b' }), config, null), 401, 'AUTH_REQUIRED');
  }
  await expectError(await handleRawApi(request('/pulse', 'GET', undefined, { 'X-GroundTruth-Account': 'member-a' }), config, 'member-b'), 409, 'ACCOUNT_CHANGED');
  await expectError(await handleRawApi(request('/pulse', 'GET', undefined, { 'X-GroundTruth-Account': 'member-a' }), config, null), 401, 'AUTH_REQUIRED');
});

test('a delayed request after an A preflight cannot initially save, read, export or delete the current B profile', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  const preflight = await read<{ userId: string }>(await handleRawApi(request('/me'), config, 'member-a'));
  assert.equal(preflight.userId, 'member-a');
  const boundToA = { 'X-GroundTruth-Account': preflight.userId };
  await expectError(await handleRawApi(request('/learner', 'POST', saveBody(), boundToA), config, 'member-b'), 409, 'ACCOUNT_CHANGED');
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM learner_records').get()!.n, 0);
  const bState = { ...state, completed: ['queue-trace'] };
  const b = await read<LearnerRecord>(await handleApi(request('/learner', 'POST', saveBody(null, bState)), config, 'member-b'));
  const before = fixture.sqlite.prepare('SELECT * FROM learner_records WHERE user_id=?').get('member-b');
  for (const path of ['/learner', '/learner/export']) await expectError(await handleRawApi(request(path, 'GET', undefined, boundToA), config, 'member-b'), 409, 'ACCOUNT_CHANGED');
  await expectError(await handleRawApi(request('/learner', 'POST', saveBody(null), boundToA), config, 'member-b'), 409, 'ACCOUNT_CHANGED');
  await expectError(await handleRawApi(request('/learner', 'POST', saveBody(b.revision), boundToA), config, 'member-b'), 409, 'ACCOUNT_CHANGED');
  await expectError(await handleRawApi(request('/learner', 'DELETE', undefined, boundToA), config, 'member-b'), 409, 'ACCOUNT_CHANGED');
  assert.deepEqual(fixture.sqlite.prepare('SELECT * FROM learner_records WHERE user_id=?').get('member-b'), before);
  assert.deepEqual((await read<LearnerRecord>(await handleApi(request('/learner'), config, 'member-b'))).state, bState);
});

test('pulse only exposes a private choice to its bound current owner and rejects a delayed cross-account vote', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  const pulse = await read<Pulse>(await handleRawApi(request('/pulse'), config, null));
  for (const [user, choiceId] of [['member-a', 'unsure'], ['member-b', pulse.choices[0].id]]) {
    const voted = await handleApi(request('/pulse', 'POST', { pollId: pulse.id, choiceId }), config, user); assert.equal(voted.status, 200);
  }
  const unbound = await read<Pulse>(await handleRawApi(request('/pulse'), config, 'member-b'));
  assert.equal(unbound.total, 2); assert.equal(unbound.choiceId, null);
  const own = await read<Pulse>(await handleApi(request('/pulse'), config, 'member-b')); assert.equal(own.choiceId, pulse.choices[0].id);
  const before = fixture.sqlite.prepare('SELECT * FROM pulse_votes WHERE user_id=?').get('member-b');
  const staleOwner = { 'X-GroundTruth-Account': 'member-a' };
  await expectError(await handleRawApi(request('/pulse', 'GET', undefined, staleOwner), config, 'member-b'), 409, 'ACCOUNT_CHANGED');
  await expectError(await handleRawApi(request('/pulse', 'POST', { pollId: pulse.id, choiceId: 'unsure' }, staleOwner), config, 'member-b'), 409, 'ACCOUNT_CHANGED');
  await expectError(await handleRawApi(request('/pulse', 'POST', { pollId: pulse.id, choiceId: 'unsure' }), config, 'member-b'), 428, 'ACCOUNT_PRECONDITION_REQUIRED');
  assert.deepEqual(fixture.sqlite.prepare('SELECT * FROM pulse_votes WHERE user_id=?').get('member-b'), before);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM pulse_votes').get()!.n, 2);
});

test('learner records require native identity but no pilot seat and GET never creates a row', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  const anonymous = await handleApi(request('/learner', 'GET', undefined, { 'oai-authenticated-user-id': 'member-a' }), config, null);
  assert.equal(anonymous.status, 401);
  const missing = await handleApi(request('/learner'), config, 'member-a');
  assert.equal(missing.status, 200); assert.deepEqual(await read(missing), { state: null, revision: null, expiresAt: null });
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM learner_records').get()!.n, 0);
  const saved = await handleApi(request('/learner', 'POST', saveBody()), config, 'member-a');
  assert.equal(saved.status, 200); const record = await read<LearnerRecord>(saved);
  assert.deepEqual(record.state, state); assert.equal(typeof record.revision, 'string');
  assert.ok(Date.parse(record.expiresAt!) > Date.now() + 29 * 86400000);
  assert.deepEqual(await read(await handleApi(request('/learner'), config, 'member-b')), { state: null, revision: null, expiresAt: null });
});

test('learner writes reject absent consent, forged ownership, nested derived fields and cross-origin requests', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  for (const body of [{ state, revision: null }, { ...saveBody(), userId: 'member-b' }, { ...saveBody(), noticeVersion: 'practice.v1' }, saveBody(null, { ...state, mastery: 100 }), saveBody(null, { ...state, profile: { ...state.profile, points: 999 } })]) {
    assert.equal((await handleApi(request('/learner', 'POST', body), config, 'member-a')).status, 400);
  }
  assert.equal((await handleApi(request('/learner', 'POST', saveBody(), { Origin: 'https://evil.test' }), config, 'member-a')).status, 403);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM learner_records').get()!.n, 0);
});

test('revision tokens refuse concurrent saves and stale saves after delete and recreation', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  const first = await read<LearnerRecord>(await handleApi(request('/learner', 'POST', saveBody()), config, 'member-a'));
  const next = await read<LearnerRecord>(await handleApi(request('/learner', 'POST', saveBody(first.revision)), config, 'member-a'));
  assert.notEqual(next.revision, first.revision);
  const stale = await handleApi(request('/learner', 'POST', saveBody(first.revision)), config, 'member-a');
  assert.equal(stale.status, 409); assert.equal((await read<{error:{code:string}}>(stale)).error.code, 'LEARNER_REVISION_CONFLICT');
  assert.equal((await handleApi(request('/learner', 'DELETE'), config, 'member-a')).status, 200);
  const recreated = await read<LearnerRecord>(await handleApi(request('/learner', 'POST', saveBody()), config, 'member-a'));
  assert.notEqual(recreated.revision, next.revision);
  assert.equal((await handleApi(request('/learner', 'POST', saveBody(next.revision)), config, 'member-a')).status, 409);
  assert.equal((await read<LearnerRecord>(await handleApi(request('/learner'), config, 'member-a'))).revision, recreated.revision);
});

test('two initial saves or edits with the same revision have one atomic winner', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  const created = await Promise.all([
    handleApi(request('/learner', 'POST', saveBody()), config, 'member-a'),
    handleApi(request('/learner', 'POST', saveBody()), config, 'member-a'),
  ]);
  assert.deepEqual(created.map(response => response.status).sort(), [200, 409]);
  const record = await read<LearnerRecord>(await handleApi(request('/learner'), config, 'member-a'));
  const edited = await Promise.all([
    handleApi(request('/learner', 'POST', saveBody(record.revision, { ...state, completed: ['queue-trace'] })), config, 'member-a'),
    handleApi(request('/learner', 'POST', saveBody(record.revision, { ...state, completed: ['queue-choose'] })), config, 'member-a'),
  ]);
  assert.deepEqual(edited.map(response => response.status).sort(), [200, 409]);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM learner_records').get()!.n, 1);
});

test('expiry makes saved content unavailable and only an explicit fresh save can replace it', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  const old = await read<LearnerRecord>(await handleApi(request('/learner', 'POST', saveBody()), config, 'member-a'));
  fixture.sqlite.prepare("UPDATE learner_records SET expires_at='2000-01-01T00:00:00.000Z'").run();
  for (const path of ['/learner', '/learner/export']) assert.deepEqual(await read(await handleApi(request(path), config, 'member-a')), { state: null, revision: null, expiresAt: null });
  assert.equal((await handleApi(request('/learner', 'POST', saveBody(old.revision)), config, 'member-a')).status, 409);
  const renewed = await handleApi(request('/learner', 'POST', saveBody()), config, 'member-a'); assert.equal(renewed.status, 200);
  assert.notEqual((await read<LearnerRecord>(renewed)).revision, old.revision);
});

test('exports contain only owned validated state and corrupt stored JSON is never returned', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  await handleApi(request('/learner', 'POST', saveBody()), config, 'member-a');
  const exported = await handleApi(request('/learner/export'), config, 'member-a');
  assert.equal(exported.status, 200); assert.match(exported.headers.get('content-disposition') ?? '', /attachment/);
  assert.equal('userId' in await read<Record<string, unknown>>(exported), false);
  fixture.sqlite.prepare("UPDATE learner_records SET state_json='{broken' WHERE user_id='member-a'").run();
  const corrupt = await handleApi(request('/learner'), config, 'member-a');
  assert.equal(corrupt.status, 503); assert.equal((await read<{error:{code:string}}>(corrupt)).error.code, 'LEARNER_STATE_UNAVAILABLE');
});

test('pulse is public aggregate-only, validates current choices and requires native identity for writes', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  const initialResponse = await handleApi(request('/pulse'), config, null); assert.equal(initialResponse.status, 200);
  const initial = await read<Pulse>(initialResponse);
  assert.equal(initial.choices.length, 3); assert.ok(initial.choices.some(choice => choice.id === 'unsure'));
  assert.equal(initial.counts, null); assert.equal(initial.total, 0); assert.equal(initial.choiceId, null);
  const body = { pollId: initial.id, choiceId: initial.choices[0].id };
  assert.equal((await handleApi(request('/pulse', 'POST', body, { 'oai-authenticated-user-id': 'forged' }), config, null)).status, 401);
  assert.equal((await handleApi(request('/pulse', 'POST', { ...body, pollId: 'yesterday' }), config, 'member-a')).status, 400);
  assert.equal((await handleApi(request('/pulse', 'POST', { ...body, choiceId: 'fabricated' }), config, 'member-a')).status, 400);
  assert.equal((await handleApi(request('/pulse', 'POST', { ...body, userId: 'member-b' }), config, 'member-a')).status, 400);
  assert.equal((await handleApi(request('/pulse', 'POST', body, { Origin: 'https://evil.test' }), config, 'member-a')).status, 403);
  assert.equal((await handleApi(request('/pulse', 'POST', body), config, 'member-a')).status, 200);
  const changed = await read<Pulse>(await handleApi(request('/pulse', 'POST', { ...body, choiceId: 'unsure' }), config, 'member-a'));
  assert.equal(changed.total, 1); assert.equal(changed.choiceId, 'unsure'); assert.equal(changed.counts, null);
  const publicPulse = await read<Pulse>(await handleApi(request('/pulse'), config, null)); assert.equal(publicPulse.choiceId, null);
  assert.equal('votes' in publicPulse, false); assert.equal('users' in publicPulse, false);
});

test('pulse rotates at Singapore midnight and has seven distinct authored daily questions', () => {
  const before = pulseForDate(Date.parse('2026-10-27T15:59:59.999Z'));
  const after = pulseForDate(Date.parse('2026-10-27T16:00:00.000Z'));
  assert.equal(before.id, 'pulse.v1:2026-10-27'); assert.equal(before.closesAt, '2026-10-27T16:00:00.000Z');
  assert.equal(after.id, 'pulse.v1:2026-10-28'); assert.equal(after.closesAt, '2026-10-28T16:00:00.000Z');
  const questions = Array.from({ length: 7 }, (_, day) => pulseForDate(Date.parse('2026-10-28T00:00:00.000Z') + day * 86400000).question);
  assert.equal(new Set(questions).size, 7);
  assert.equal(pulseForDate(Date.parse('2026-11-04T00:00:00.000Z')).question, questions[0]);
});

test('pulse reveals choice counts only at five distinct active voters and upserts cannot inflate totals', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  const initial = await read<Pulse>(await handleApi(request('/pulse'), config, null));
  for (let i = 0; i < 4; i++) {
    const result = await read<Pulse>(await handleApi(request('/pulse', 'POST', { pollId: initial.id, choiceId: 'unsure' }), config, `member-${i}`));
    assert.equal(result.total, i + 1); assert.equal(result.counts, null);
  }
  const fifth = await read<Pulse>(await handleApi(request('/pulse', 'POST', { pollId: initial.id, choiceId: initial.choices[0].id }), config, 'member-4'));
  assert.equal(fifth.total, 5); assert.equal(fifth.counts?.unsure, 4); assert.equal(fifth.counts?.[initial.choices[0].id], 1);
  const repeated = await read<Pulse>(await handleApi(request('/pulse', 'POST', { pollId: initial.id, choiceId: 'unsure' }), config, 'member-4'));
  assert.equal(repeated.total, 5); assert.equal(repeated.counts?.unsure, 5);
  fixture.sqlite.prepare("UPDATE pulse_votes SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id='member-0'").run();
  const expired = await read<Pulse>(await handleApi(request('/pulse'), config, null)); assert.equal(expired.total, 4); assert.equal(expired.counts, null);
});

test('delete-all covers owned learner records and votes while preserving another account', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db } satisfies RuntimeConfig;
  const pulse = await read<Pulse>(await handleApi(request('/pulse'), config, null));
  for (const user of ['member-a', 'member-b']) {
    await handleApi(request('/learner', 'POST', saveBody()), config, user);
    await handleApi(request('/pulse', 'POST', { pollId: pulse.id, choiceId: 'unsure' }), config, user);
  }
  const deleted = await handleApi(request('/activity', 'DELETE'), config, 'member-a'); assert.equal(deleted.status, 200);
  const report = await read<{deleted:{learnerRecords:number;pulseVotes:number};retained:{enrollmentSecurityCounters:number}}>(deleted);
  assert.equal(report.deleted.learnerRecords, 1); assert.equal(report.deleted.pulseVotes, 1); assert.equal(report.retained.enrollmentSecurityCounters, 0);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM learner_records WHERE user_id=?').get('member-b')!.n, 1);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM pulse_votes WHERE user_id=?').get('member-b')!.n, 1);
});

test('moderator cleanup physically removes expired learner records and votes without deleting active rows', async t => {
  const fixture = createTestDb(); t.after(() => fixture.close()); const config = { DB: fixture.db, STAFF_USER_ROLES: '{"tutor":"tutor"}' } satisfies RuntimeConfig;
  const pulse = await read<Pulse>(await handleApi(request('/pulse'), config, null));
  for (const user of ['expired', 'active']) {
    await handleApi(request('/learner', 'POST', saveBody()), config, user);
    await handleApi(request('/pulse', 'POST', { pollId: pulse.id, choiceId: 'unsure' }), config, user);
  }
  fixture.sqlite.prepare("UPDATE learner_records SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id='expired'").run();
  fixture.sqlite.prepare("UPDATE pulse_votes SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id='expired'").run();
  // Preserve the existing lab gate for moderator operations.
  fixture.sqlite.prepare("INSERT INTO practice_profiles(user_id,notice_version,updated_at) VALUES('tutor','practice.v1','2099-01-01T00:00:00.000Z')").run();
  fixture.sqlite.prepare("INSERT INTO pilot_memberships VALUES('tutor','groundtruth-pilot.v1','staff','2026-01-01T00:00:00.000Z','2099-01-01T00:00:00.000Z')").run();
  const response = await handleApi(request('/admin/purge-expired', 'POST', {}), config, 'tutor'); assert.equal(response.status, 200);
  const result = await read<{deleted:{learnerRecords:number;pulseVotes:number}}>(response);
  assert.equal(result.deleted.learnerRecords, 1); assert.equal(result.deleted.pulseVotes, 1);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM learner_records').get()!.n, 1);
  assert.equal(fixture.sqlite.prepare('SELECT count(*) AS n FROM pulse_votes').get()!.n, 1);
});
