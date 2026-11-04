import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { PostgresD1, translateSql } from '../lib/cloud/postgres-d1.ts';
import type { QueryClient } from '../lib/cloud/postgres-d1.ts';
import { handleApi } from '../lib/server/index.ts';
import { endAttempts } from '../lib/study/attempts.ts';
import { handleClasses } from '../lib/study/classes.ts';
import { createRun, executeStep, finalizeRun } from '../lib/lab/engine.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';

test('SQL translation keeps literal question marks and repeated numbered binds intact', () => {
  assert.deepEqual(translateSql(`SELECT '?',"?",?2,?1,?2,? -- ?4\n`), {
    sql: `SELECT '?',"?",$1,$2,$1,$3 -- ?4`, bindings: [1, 0, 2],
  });
  assert.equal(translateSql('INSERT OR IGNORE INTO t(id) VALUES(?) RETURNING id').sql,
    'INSERT INTO t(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id');
});

test('PostgreSQL migration and adapter preserve transactions, JSON, role isolation and immutable submissions', async () => {
  const pg = new PGlite();
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  const file = readdirSync(migrations).find(name => name.endsWith('_groundtruth_cloud_schema.sql'))!;
  await pg.exec(readFileSync(new URL(file, migrations), 'utf8'));
  // PGlite is a real PostgreSQL engine; advisory locks are single-process here.
  const client: QueryClient = {
    async query(sql, values = []) {
      if (sql.startsWith('SELECT pg_advisory_xact_lock')) return { rows: [], rowCount: 0, command: 'SELECT' };
      const result = await pg.query<Record<string, unknown>>(sql, values);
      const command = /^\s*(\w+)/.exec(sql)?.[1].toUpperCase();
      const rows = result.rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
        typeof value === 'bigint' ? Number(value) : value])));
      return { rows, rowCount: result.affectedRows ?? 0, command };
    }, release() {},
  };
  const adapter = new PostgresD1({ async connect() { return client; } });
  const db = adapter.db;
  const c: RuntimeConfig = { DB: db, PILOT_ID: 'cloud-test', STAFF_USER_ROLES: '{"teacher":"tutor"}' };
  const now = new Date().toISOString(), expires = '2099-01-01T00:00:00.000Z';
  try {
    const safety = await pg.query<{relrowsecurity: boolean}>(`SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='groundtruth' AND c.relkind='r'`);
    assert.equal(safety.rows.length, 32);
    assert.ok(safety.rows.every(row => row.relrowsecurity));
    await pg.exec('CREATE ROLE anon NOLOGIN; SET ROLE anon;');
    await assert.rejects(pg.query('SELECT id FROM groundtruth.study_projects'), /permission denied/);
    await pg.exec('RESET ROLE; SET ROLE groundtruth_app;');
    await db.prepare('INSERT INTO local_auth_attempts(bucket,window_started_at,attempts) VALUES(?,?,?)').bind('test', Date.now(), 1).run();
    const started=await db.prepare('SELECT window_started_at AS windowStartedAt FROM local_auth_attempts').first<{windowStartedAt:number}>();
    assert.ok(started);assert.ok(started.windowStartedAt>2_147_483_647);
    await assert.rejects(db.batch([
      db.prepare('INSERT INTO local_auth_attempts(bucket,window_started_at,attempts) VALUES(?,?,?)').bind('rolled-back', 1, 1),
      db.prepare('INSERT INTO local_auth_attempts(bucket,window_started_at,attempts) VALUES(?,?,?)').bind('test', 1, 1),
    ]));
    assert.equal(await db.prepare("SELECT bucket FROM local_auth_attempts WHERE bucket='rolled-back'").first(), null);

    await db.prepare('INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)')
      .bind('project', 'student', 'cloud-test', 'Learn validation', '{"repository":"owner/repo"}', now, expires).run();
    assert.equal(await db.prepare("SELECT json_extract(snapshot_json,'$.repository') AS repositoryName FROM study_projects WHERE id=?").bind('project').first('repositoryName'), 'owner/repo');
    await db.prepare("INSERT OR IGNORE INTO study_exercises(id,project_id,prompt_json,rubric_json,status,created_at) VALUES(?,?,?,?,'guided',?)")
      .bind('ex', 'project', '{"format":"mcq","options":[{"id":"A","text":"First"},{"id":"B","text":"Second"},{"id":"C","text":"Third"},{"id":"D","text":"Fourth"}]}', '{}', now).run();
    const ignored = await db.prepare("INSERT OR IGNORE INTO study_exercises(id,project_id,prompt_json,rubric_json,status,created_at) VALUES(?,?,?,?,'guided',?)")
      .bind('ex2', 'project', '{}', '{}', now).run();
    assert.equal(ignored.meta.changes, 0);
    await endAttempts(c, 'student', {projectId: 'project', exerciseId: 'ex'});
    assert.equal((await db.prepare("SELECT detail_json FROM study_events WHERE kind='attempt-ended'").first<{detail_json:string}>())?.detail_json.includes('guided'), true);

    await db.prepare("UPDATE study_exercises SET ended_at=NULL,status='independent',started_at=? WHERE id='ex'").bind(now).run();
    const req = (path: string, body?: unknown) => new Request(`https://example.com${path}`, { method: body ? 'POST' : 'GET', headers: { origin: 'https://example.com', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal((await handleApi(req('/api/study/projects/project'), c, 'other')).status, 404);
    const commit = await handleApi(req('/api/study/projects/project/submit', { exerciseId: 'ex', optionId: 'A' }), c, 'student');
    assert.equal(commit.status, 200, await commit.text());
    const overwrite = await handleApi(req('/api/study/projects/project/submit', { exerciseId: 'ex', optionId: 'B' }), c, 'student');
    assert.equal(overwrite.status, 409);
    assert.equal(await db.prepare('SELECT answer FROM study_exercises WHERE id=?').bind('ex').first('answer'), 'A. First');

    const plan = await db.prepare(`SELECT json_array_length(?1,'$.steps') AS steps WHERE NOT EXISTS(SELECT 1 FROM json_each(?2) AS prerequisite WHERE prerequisite.value='missing')`)
      .bind('{"steps":[1,2]}', '["ok"]').first<{steps:number}>();
    assert.equal(plan?.steps, 2);

    const classRequest = (path: string, method = 'GET') => new Request('https://example.com/api/study/classes' + path, {method});
    const createdClass = await (await handleClasses(classRequest('', 'POST'), c, 'teacher', {name: 'Demo class'}))!.json() as {id:string;joinCode:string};
    await handleClasses(classRequest('/join', 'POST'), c, 'student', {code: createdClass.joinCode, confirmed: true});
    await handleClasses(classRequest('/join', 'POST'), c, 'student', {code: createdClass.joinCode, confirmed: true});
    const classList = await (await handleClasses(classRequest(''), c, 'teacher', {}))!.json() as {owned:{joinCode:string;studentCount:number}[]};
    assert.equal(classList.owned[0].joinCode, createdClass.joinCode);
    assert.equal(classList.owned[0].studentCount, 1);

    await db.prepare('INSERT INTO pilot_memberships(user_id,pilot_id,role,enrolled_at,expires_at) VALUES(?,?,?,?,?)').bind('student', 'cloud-test', 'student', now, expires).run();
    await db.prepare("INSERT INTO sessions(id,owner_id,status,phase,revision,document_json,request_id,created_at,expires_at) VALUES(?,?,'active','repair',0,?,?,?,?)")
      .bind('legacy-session', 'student', '{}', 'request-1', now, expires).run();
    assert.equal(await db.prepare('SELECT pilot_id FROM session_scopes WHERE session_id=?').bind('legacy-session').first('pilot_id'), 'cloud-test');
    const lab = await createRun(db, {sessionId: 'legacy-session', caseId: 'case', ownerId: 'student', phase: 'repair', fixtureId: 'lost-success.v1', predictionId: 'prediction'});
    for (const step of lab.steps) await executeStep(db, lab.runId, 'student', step.stepId, step.payload, step.idempotencyKey);
    const evidence = await finalizeRun(db, lab.runId, 'student');
    assert.ok(evidence.evidenceHash);
  } finally { await pg.close(); }
});
