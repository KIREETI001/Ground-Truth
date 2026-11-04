import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { PostgresD1, type QueryClient } from '../lib/cloud/postgres-d1.ts';
import { createTestDb } from './sqlite-d1.ts';
import { handleDemo } from '../lib/server/demo.ts';
import { handleApi } from '../lib/server/index.ts';
import { handleLocalAuth, localIdentity } from '../lib/server/local-auth.ts';
import { handleStudy } from '../lib/study/server.ts';
import { platformRole } from '../lib/server/access.ts';
import { requestIdentity } from '../lib/demo/security.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';

const origin = 'https://groundtruth.example';
const pass = 'Synthetic signup password 123';
const config = (DB: D1Database): RuntimeConfig => ({
  DB, CLOUD_ENABLED: 'true', LOCAL_ACCOUNTS_ENABLED: 'true', PILOT_ID: 'demo-tests',
  DEMO_ENABLED: 'true', DEMO_SEED_PROJECT_ID: 'operator-seed', TRUSTED_PROXY: 'vercel',
  DEMO_IDENTITY_SECRET: 'synthetic-test-only-identity-secret-with-32-characters',
  STAFF_USER_ROLES: '{"local_seedy":"owner"}', DEVELOPER_PASSWORD_HASH: 'synthetic-operator-hash',
});
const request = (path: string, options: { ip?: string; cookie?: string; method?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
  const method = options.method || 'POST';
  return new Request(origin + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json',
    'x-vercel-forwarded-for': options.ip ?? '198.51.100.1', ...(options.cookie ? { Cookie: options.cookie } : {}), ...options.headers },
    ...(method === 'GET' ? {} : { body: JSON.stringify(options.body || {}) }) });
};
const cookie = (response: Response) => response.headers.get('set-cookie')!.split(';')[0];
const authStub = async (action: string, input: Record<string, unknown>): Promise<Record<string, unknown>> => action === 'auth-hash' ? { hash: 'synthetic-hash' } : { valid: input.password === pass };
async function seed(c: RuntimeConfig) {
  const at = new Date().toISOString(), expiry = new Date(Date.now() + 86400_000).toISOString();
  const snapshot = { repository: 'example/tasks', url: 'https://github.com/example/tasks', commit: 'a'.repeat(40), analysedAt: at,
    files: [{ path: 'src/tasks.ts', language: 'TypeScript', excerpt: 'export const normalize = (title: string) => title.trim();' }],
    signals: [], suggestedMissionId: null, warnings: ['Synthetic source fixture for automated tests.'] };
  await c.DB.batch([
    c.DB.prepare('INSERT INTO local_auth_users(user_id,username,password_hash,display_name,created_at) VALUES(?,?,?,?,?)').bind('operator', 'operator', 'synthetic-hash', 'Synthetic operator', at),
    c.DB.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,analysis_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)')
      .bind('operator-seed', 'operator', c.PILOT_ID, 'Read source', JSON.stringify(snapshot), JSON.stringify({ version: 4, report: { summary: 'The fixture trims a title.', filePaths: ['src/tasks.ts'], checks: [] } }), at, expiry),
    ...['input', 'output'].map((id, ordinal) => c.DB.prepare('INSERT INTO study_concepts(id,project_id,local_id,title,description,category,file_paths_json,prerequisites_json,ordinal) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind('seed:' + id, 'operator-seed', id, id === 'input' ? 'Read the input' : 'Trace the output', 'Inspect the selected expression.', 'behavior', '["src/tasks.ts"]', ordinal ? '["input"]' : '[]', ordinal)),
    c.DB.prepare('INSERT INTO study_events(id,project_id,kind,detail_json,created_at) VALUES(?,?,?,?,?)')
      .bind('seed-ready', 'operator-seed', 'demo-seed-ready', JSON.stringify({ provider: 'meta', model: 'muse-spark-1.3', commit: snapshot.commit, tasks: ['analyse', 'concepts'], publicRepository: true, license: 'MIT', licenseCommit: 'b'.repeat(40) }), at),
  ]);
}
async function start(c: RuntimeConfig, ip = '198.51.100.1') {
  const response = await handleDemo(request('/api/demo/start', { ip }), c, {});
  assert.ok(response); assert.equal(response.status, 200);
  const token = cookie(response), identity = await localIdentity(request('/api/demo/session', { cookie: token }), c);
  assert.ok(identity);
  return { response, token, userId: identity.userId, result: await response.json() as { projectId: string; expiresAt: string; next: string } };
}

test('two visitors receive isolated short-lived user sessions and owned pinned sample copies', async () => {
  const d = createTestDb(); try {
    const c = config(d.db); await seed(c);
    const first = await start(c), second = await start(c, '198.51.100.2');
    assert.notEqual(first.userId, second.userId); assert.notEqual(first.result.projectId, second.result.projectId);
    assert.match(first.response.headers.get('set-cookie')!, /HttpOnly; SameSite=Strict; Max-Age=7200; Secure/);
    assert.equal(await platformRole(c, first.userId), 'user');
    assert.equal(await platformRole(c, second.userId), 'user');
    assert.equal(first.result.next, '/user');
    const firstProject = await d.db.prepare('SELECT owner_id,teacher_id,snapshot_json,expires_at FROM study_projects WHERE id=?').bind(first.result.projectId)
      .first<{ owner_id: string; teacher_id: string | null; snapshot_json: string; expires_at: string }>();
    assert.equal(firstProject?.owner_id, first.userId); assert.equal(firstProject.teacher_id, null);
    assert.equal(JSON.parse(firstProject.snapshot_json).commit, 'a'.repeat(40)); assert.equal(firstProject.expires_at, first.result.expiresAt);
    const map = await d.db.prepare('SELECT m.owner_id,l.purpose FROM study_learning_paths l JOIN study_repository_maps m ON m.id=l.map_id WHERE l.project_id=?')
      .bind(first.result.projectId).first<{ owner_id: string; purpose: string }>();
    assert.equal(map?.owner_id, first.userId); assert.equal(map?.purpose, 'improve');
    assert.equal((await d.db.prepare('SELECT requested_role,application_status FROM account_profiles WHERE user_id=?').bind(first.userId).first<{ requested_role: string }>())?.requested_role, 'user');
    assert.equal(await d.db.prepare('SELECT notice_version FROM practice_profiles WHERE user_id=?').bind(first.userId).first(), null);
    assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_exercises WHERE project_id=?').bind(first.result.projectId).first<{ n: number }>())?.n, 0);
    await assert.rejects(() => handleStudy(request('/api/study/projects/' + first.result.projectId, { method: 'GET' }), c, second.userId, {}), /PROJECT_NOT_FOUND/);
    assert.ok(await localIdentity(request('/api/demo/session', { cookie: first.token }), c), 'A second visitor does not revoke the first visitor.');
  } finally { d.close(); }
});

test('teacher preview resolves only its own authenticated demo and withholds private keys and uncommitted answers', async () => {
  const d = createTestDb(); try {
    const c = config(d.db); await seed(c); const visitor = await start(c);
    await d.db.prepare("INSERT INTO study_exercises(id,project_id,prompt_json,rubric_json,status,answer,created_at) VALUES(?,?,?,?,'guided',?,?)")
      .bind('private-question', visitor.result.projectId, JSON.stringify({ title: 'Trace', prompt: 'Which expression trims input?', kind: 'trace', format: 'mcq', filePaths: ['src/tasks.ts'],
        options: [{ id: 'A', text: 'trim' }, { id: 'B', text: 'map' }], correctOption: 'should-never-copy-from-prompt', reviewPoints: ['private prompt field'] }),
        JSON.stringify({ reviewPoints: ['PRIVATE_RUBRIC'], mcq: { correctOption: 'A', answerExplanation: 'PRIVATE_KEY_EXPLANATION' } }), 'UNCOMMITTED_ANSWER', new Date().toISOString()).run();
    const preview = await handleDemo(request('/api/demo/teacher', { method: 'GET', cookie: visitor.token }), c, {});
    assert.ok(preview); const text = await preview.text();
    assert.match(text, /own-demo-preview/); assert.match(text, /Trace/);
    for (const secret of ['PRIVATE_RUBRIC', 'PRIVATE_KEY_EXPLANATION', 'UNCOMMITTED_ANSWER', 'correctOption', 'private prompt field', 'operator-seed', 'token_hash']) assert.ok(!text.includes(secret), secret);
    await d.db.prepare("UPDATE study_exercises SET status='submitted',submitted_at=?,answer='COMMITTED_ANSWER' WHERE id='private-question'").bind(new Date().toISOString()).run();
    assert.match(await (await handleDemo(request('/api/demo/teacher', { method: 'GET', cookie: visitor.token }), c, {}))!.text(), /COMMITTED_ANSWER/);
    await assert.rejects(() => handleDemo(request('/api/demo/teacher', { method: 'GET' }), c, {}), /AUTH_REQUIRED/);
    await assert.rejects(() => handleDemo(request('/api/demo/teacher?projectId=operator-seed', { method: 'GET', cookie: visitor.token }), c, {}), /UNKNOWN_FIELD/);
    await assert.rejects(() => handleDemo(request('/api/demo/teacher', { cookie: visitor.token }), c, {}), /METHOD_NOT_ALLOWED/);
  } finally { d.close(); }
});

test('demo quotas use verified ingress identity, ignore spoofable headers and enforce a global budget', async () => {
  const d = createTestDb(); try {
    const c = config(d.db); await seed(c);
    const firstIdentity = await requestIdentity(request('/api/demo/start', { headers: { 'x-forwarded-for': '203.0.113.1' } }), c, true);
    assert.equal(firstIdentity, await requestIdentity(request('/api/demo/start', { headers: { 'x-forwarded-for': '203.0.113.9' } }), c, true));
    assert.notEqual(firstIdentity, await requestIdentity(request('/api/demo/start', { ip: '198.51.100.2' }), c, true));
    assert.equal(firstIdentity, await requestIdentity(request('/api/demo/start', { ip: '::ffff:198.51.100.1' }), c, true));
    assert.equal(await requestIdentity(request('/api/demo/start', { ip: '2001:db8::1' }), c, true), await requestIdentity(request('/api/demo/start', { ip: '2001:0DB8:0:0:0:0:0:1' }), c, true));
    for (let i = 0; i < 3; i++) await start(c);
    await assert.rejects(() => handleDemo(request('/api/demo/start', { headers: { 'x-forwarded-for': '203.0.113.99' } }), c, {}), /temporary visitor limit/);
    await start(c, '198.51.100.2');
    await assert.rejects(() => handleDemo(request('/api/demo/start', { ip: '198.51.100.3' }), { ...c, DEMO_MAX_STARTS_PER_WINDOW: '4' }, {}), /temporary visitor limit/);
    const counters = await d.db.prepare("SELECT bucket FROM local_auth_attempts WHERE bucket LIKE 'demo:identity:%'").all<{ bucket: string }>();
    assert.ok(counters.results.every(row => !row.bucket.includes('198.51.100')));
    for (const invalid of ['', '198.51.100.1, 198.51.100.2', 'forged', '999.1.1.1']) {
      await assert.rejects(() => handleDemo(request('/api/demo/start', { ip: invalid }), c, {}), /temporarily unavailable|temporary sample is unavailable/);
    }
    await assert.rejects(() => handleDemo(request('/api/demo/start'), { ...c, TRUSTED_PROXY: undefined }, {}), /temporary sample is unavailable/);
  } finally { d.close(); }
});

test('atomic active cap prevents orphaned accounts and an existing visitor reuses its own session', async () => {
  const d = createTestDb(); try {
    const c = { ...config(d.db), DEMO_MAX_ACTIVE: '1' }; await seed(c); const visitor = await start(c);
    const reused = await handleDemo(request('/api/demo/start', { cookie: visitor.token }), c, {});
    assert.equal((await reused!.json() as { projectId: string }).projectId, visitor.result.projectId);
    assert.equal(reused!.headers.get('set-cookie'), null);
    await assert.rejects(() => handleDemo(request('/api/demo/start', { ip: '198.51.100.2' }), c, {}), /temporary visitor limit/);
    assert.equal((await d.db.prepare("SELECT count(*) AS n FROM local_auth_users WHERE substr(user_id,1,5)='demo_'").first<{ n: number }>())?.n, 1);
    assert.equal((await d.db.prepare("SELECT count(*) AS n FROM account_profiles WHERE substr(user_id,1,5)='demo_'").first<{ n: number }>())?.n, 1);
  } finally { d.close(); }
});

test('expired temporary sessions deny access and the next start removes their data without touching real users', async () => {
  const d = createTestDb(); try {
    const c = config(d.db); await seed(c); const visitor = await start(c);
    await d.db.prepare("UPDATE pilot_memberships SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id=?").bind(visitor.userId).run();
    await d.db.prepare("UPDATE local_auth_sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id=?").bind(visitor.userId).run();
    assert.equal(await localIdentity(request('/api/demo/session', { cookie: visitor.token }), c), null);
    await assert.rejects(() => handleDemo(request('/api/demo/teacher', { method: 'GET', cookie: visitor.token }), c, {}), /AUTH_REQUIRED/);
    await start(c, '198.51.100.2');
    assert.equal(await d.db.prepare('SELECT user_id FROM local_auth_users WHERE user_id=?').bind(visitor.userId).first(), null);
    assert.equal(await d.db.prepare('SELECT id FROM study_projects WHERE id=?').bind(visitor.result.projectId).first(), null);
    assert.ok(await d.db.prepare("SELECT user_id FROM local_auth_users WHERE user_id='operator'").first());
    assert.ok(await d.db.prepare("SELECT id FROM study_projects WHERE id='operator-seed'").first());
  } finally { d.close(); }
});

test('seed readiness, pinned public source, fixed operator choice and origin checks fail closed', async () => {
  const d = createTestDb(); try {
    const c = config(d.db); await seed(c);
    await assert.rejects(() => handleDemo(request('/api/demo/start'), c, { projectId: 'operator-seed', role: 'teacher' }), /UNKNOWN_FIELD/);
    await assert.rejects(() => handleDemo(request('/api/demo/start'), { ...c, DEMO_SEED_PROJECT_ID: 'unknown' }, {}), /being prepared/);
    await d.db.prepare("UPDATE study_events SET detail_json='{}' WHERE id='seed-ready'").run();
    await assert.rejects(() => handleDemo(request('/api/demo/start'), c, {}), /being prepared/);
    assert.equal((await d.db.prepare("SELECT count(*) AS n FROM local_auth_users WHERE substr(user_id,1,5)='demo_'").first<{ n: number }>())?.n, 0);
    const attack = request('/api/demo/start', { headers: { Origin: 'https://attacker.example' } });
    assert.equal((await handleApi(attack, c, null)).status, 403);
    assert.equal((await handleApi(request('/api/demo/start'), { ...c, DEMO_ENABLED: 'false' }, null)).status, 404);
  } finally { d.close(); }
});

test('reserved demo names cannot register or sign in and normal signups no longer share the eight-person quota', async () => {
  const d = createTestDb(); try {
    const c = config(d.db); await seed(c); const visitor = await start(c);
    for (const role of ['user', 'teacher']) await assert.rejects(() => handleLocalAuth(request('/api/local-auth/register'), c, { username: 'gt-demo-claimed', password: pass, displayName: 'No', role }, authStub), /username is unavailable/);
    await assert.rejects(() => handleLocalAuth(request('/api/local-auth/login'), c, { username: 'gt-demo-claimed', password: pass }, authStub), /username or password/);
    for (let i = 0; i < 9; i++) {
      const registered = await handleLocalAuth(request('/api/local-auth/register', { ip: '203.0.113.' + (i + 1) }), c, { username: 'judge-' + i, password: pass, displayName: 'Synthetic learner', role: 'user' }, authStub);
      assert.equal(registered?.status, 200);
    }
    const normalLogin = await handleLocalAuth(request('/api/local-auth/login', { ip: '203.0.113.1' }), c, { username: 'judge-0', password: pass }, authStub);
    await assert.rejects(() => handleDemo(request('/api/demo/teacher', { method: 'GET', cookie: cookie(normalLogin!) }), c, {}), /temporary sample/);
    assert.equal(await platformRole(c, visitor.userId), 'user');
    assert.equal((await d.db.prepare('SELECT count(*) AS n FROM platform_access WHERE user_id=?').bind(visitor.userId).first<{ n: number }>())?.n, 0);
  } finally { d.close(); }
});

test('temporary demo accounts do not consume the real account cap and questions are never copied or faked', async () => {
  const d = createTestDb(); try {
    const c = config(d.db); await seed(c); const visitor = await start(c);
    // Fill the remaining normal slots except one (operator + developer + 61).
    await handleLocalAuth(request('/api/local-auth/login'), c, { username: 'developer', password: pass }, authStub);
    await d.db.batch(Array.from({ length: 61 }, (_, i) => d.db.prepare('INSERT INTO local_auth_users(user_id,username,password_hash,display_name,created_at) VALUES(?,?,?,?,?)')
      .bind('local_capacity_' + i, 'capacity-' + i, 'synthetic-hash', 'Synthetic capacity', new Date().toISOString())));
    assert.equal((await handleLocalAuth(request('/api/local-auth/register', { ip: '203.0.113.9' }), c, { username: 'last-real', password: pass, displayName: 'Last real slot', role: 'user' }, authStub))?.status, 200);
    await assert.rejects(() => handleLocalAuth(request('/api/local-auth/register', { ip: '203.0.113.10' }), c, { username: 'over-cap', password: pass, displayName: 'No slot', role: 'user' }, authStub), /account limit/);
    let calls = 0;
    await assert.rejects(() => handleStudy(request('/api/study/projects/' + visitor.result.projectId + '/exercise'), c, visitor.userId, { questionFormat: 'mcq' }, async task => {
      calls++; assert.equal(task, 'exercise'); throw new Error('SYNTHETIC_MODEL_UNAVAILABLE');
    }), /SYNTHETIC_MODEL_UNAVAILABLE/);
    assert.equal(calls, 1);
    assert.equal((await d.db.prepare('SELECT count(*) AS n FROM study_exercises WHERE project_id=?').bind(visitor.result.projectId).first<{ n: number }>())?.n, 0);
  } finally { d.close(); }
});

test('demo creation, preview, quotas and expiry cleanup execute through the production PostgreSQL adapter', async () => {
  const pg = new PGlite();
  try {
    const folder = new URL('../supabase/migrations/', import.meta.url);
    await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
    for (const migration of readdirSync(folder).filter(name=>name.endsWith('.sql')).sort()) await pg.exec(readFileSync(new URL(migration, folder), 'utf8'));
    await pg.exec('SET ROLE groundtruth_app');
    const client: QueryClient = {
      async query(sql, values = []) {
        if (sql.startsWith('SELECT pg_advisory_xact_lock')) return { rows: [], rowCount: 0, command: 'SELECT' };
        const result = await pg.query<Record<string, unknown>>(sql, values);
        return { rows: result.rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value]))),
          rowCount: result.affectedRows ?? 0, command: /^\s*(\w+)/.exec(sql)?.[1].toUpperCase() };
      }, release() {},
    };
    const adapter = new PostgresD1({ async connect() { return client; } });
    const c = config(adapter.db); await seed(c);
    const first = await start(c), second = await start(c, '198.51.100.2');
    assert.notEqual(first.userId, second.userId);
    assert.equal((await handleDemo(request('/api/demo/teacher', { cookie: first.token, method: 'GET' }), c, {}))?.status, 200);
    await c.DB.prepare("UPDATE pilot_memberships SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id=?").bind(first.userId).run();
    await start(c, '198.51.100.3');
    assert.equal(await c.DB.prepare('SELECT user_id FROM local_auth_users WHERE user_id=?').bind(first.userId).first(), null);
    assert.ok(await c.DB.prepare('SELECT user_id FROM local_auth_users WHERE user_id=?').bind(second.userId).first());
    await assert.rejects(() => handleDemo(request('/api/demo/start', { ip: '198.51.100.4' }), { ...c, DEMO_MAX_ACTIVE: '2' }, {}), /temporary visitor limit/);
  } finally { await pg.close(); }
});
