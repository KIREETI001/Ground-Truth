import type { RuntimeConfig } from '../contracts.ts';
import { validateLearnerState } from '../learner/model.ts';
import type { LearnerRecord, LearnerState, Pulse } from '../learner/types.ts';
import { ApiError, fields, json } from './http.ts';

export const LEARNER_NOTICE_VERSION = 'learner.v1';
const DAY = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type LearnerRow = { state_json: string; revision: string; notice_version: string; expires_at: string };
const absent = (): LearnerRecord => ({ state: null, revision: null, expiresAt: null });

// The supplied account is a precondition only. Ownership always comes from native identity.
export function requireBoundAccount(request: Request, userId: string | null): string {
  if (!userId) throw new ApiError(401, 'AUTH_REQUIRED');
  const expected = request.headers.get('X-GroundTruth-Account');
  if (expected === null || expected === '') throw new ApiError(428, 'ACCOUNT_PRECONDITION_REQUIRED', 'Choose the current account before loading or changing saved activity.');
  if (expected !== userId) throw new ApiError(409, 'ACCOUNT_CHANGED', 'The signed-in account changed. Keep this draft separate and choose the current account before continuing.');
  return userId;
}

async function readLearner(config: RuntimeConfig, userId: string): Promise<LearnerRecord> {
  const row = await config.DB.prepare('SELECT state_json,revision,notice_version,expires_at FROM learner_records WHERE user_id=?')
    .bind(userId).first<LearnerRow>();
  if (!row || row.expires_at <= new Date().toISOString()) return absent();
  try {
    if (!UUID.test(row.revision) || row.notice_version !== LEARNER_NOTICE_VERSION || !Number.isFinite(Date.parse(row.expires_at))) throw new Error('corrupt row');
    return { state: validateLearnerState(JSON.parse(row.state_json)), revision: row.revision, expiresAt: row.expires_at };
  } catch { throw new ApiError(503, 'LEARNER_STATE_UNAVAILABLE', 'This saved profile could not be read. Your device work is unchanged; delete the saved profile to start again.'); }
}

async function saveLearner(config: RuntimeConfig, userId: string, body: Record<string, unknown>): Promise<LearnerRecord> {
  fields(body, ['state', 'revision', 'noticeVersion']);
  if (body.noticeVersion !== LEARNER_NOTICE_VERSION) throw new ApiError(400, 'LEARNER_NOTICE_REQUIRED');
  if (!(body.revision === null || (typeof body.revision === 'string' && UUID.test(body.revision)))) throw new ApiError(400, 'INVALID_LEARNER_REVISION');
  let state: LearnerState;
  try { state = validateLearnerState(body.state); } catch { throw new ApiError(400, 'INVALID_LEARNER_STATE'); }
  const savedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * DAY).toISOString();
  const revision = crypto.randomUUID();
  const serialized = JSON.stringify(state);
  const statement = body.revision === null
    ? config.DB.prepare(`INSERT INTO learner_records(user_id,state_json,revision,notice_version,notice_acknowledged_at,updated_at,expires_at)
        VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json,revision=excluded.revision,
        notice_version=excluded.notice_version,notice_acknowledged_at=excluded.notice_acknowledged_at,updated_at=excluded.updated_at,expires_at=excluded.expires_at
        WHERE learner_records.expires_at<=?`).bind(userId, serialized, revision, LEARNER_NOTICE_VERSION, savedAt, savedAt, expiresAt, savedAt)
    : config.DB.prepare(`UPDATE learner_records SET state_json=?,revision=?,notice_version=?,notice_acknowledged_at=?,updated_at=?,expires_at=?
        WHERE user_id=? AND revision=? AND expires_at>?`).bind(serialized, revision, LEARNER_NOTICE_VERSION, savedAt, savedAt, expiresAt, userId, body.revision, savedAt);
  if ((await statement.run()).meta.changes !== 1) throw new ApiError(409, 'LEARNER_REVISION_CONFLICT', 'The account profile changed or expired. Keep your device work, then load the current account profile before saving again.');
  return { state, revision, expiresAt };
}

const questions = [
  { question: 'When AI suggests a code change, what would help you understand it next?', choices: [{ id: 'trace', label: 'Trace one example through it' }, { id: 'test', label: 'Check a test and its expected result' }] },
  { question: 'Which web-app topic would you like to practise next?', choices: [{ id: 'async', label: 'Async requests and their order' }, { id: 'data', label: 'Reading and filtering data' }] },
  { question: 'Before using a response from a server, which question would you check first?', choices: [{ id: 'status', label: 'Did the request succeed?' }, { id: 'shape', label: 'Does the data have the expected shape?' }] },
  { question: 'Which way of exploring unfamiliar code helps you most today?', choices: [{ id: 'small', label: 'Follow one small input' }, { id: 'map', label: 'Map the functions and their roles' }] },
  { question: 'Which check would you like more practice explaining?', choices: [{ id: 'boundary', label: 'What happens at an empty or boundary input' }, { id: 'owner', label: 'Who may read or change a record' }] },
  { question: 'After a guided example, what would you choose to try next?', choices: [{ id: 'variation', label: 'A small variation with feedback' }, { id: 'independent', label: 'A separate task before seeing help' }] },
  { question: 'When debugging a web app, which evidence do you want to read more confidently?', choices: [{ id: 'network', label: 'Request and response details' }, { id: 'query', label: 'The rows returned by a query' }] },
];

export function pulseForDate(at = Date.now()): Omit<Pulse, 'total' | 'counts' | 'choiceId'> {
  const day = new Date(at + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dayStart = Date.parse(`${day}T00:00:00.000+08:00`);
  const question = questions[Math.floor(Date.parse(`${day}T00:00:00.000Z`) / DAY) % questions.length];
  return { id: `pulse.v1:${day}`, question: question.question, choices: [...question.choices, { id: 'unsure', label: 'Not sure yet' }],
    closesAt: new Date(dayStart + DAY).toISOString(), minimumResponses: 5 };
}

async function readPulse(config: RuntimeConfig, userId: string | null): Promise<Pulse> {
  const pulse = pulseForDate();
  const cutoff = new Date().toISOString();
  const rows = await config.DB.prepare('SELECT choice_id,count(*) AS total FROM pulse_votes WHERE poll_id=? AND expires_at>? GROUP BY choice_id')
    .bind(pulse.id, cutoff).all<{ choice_id: string; total: number }>();
  const counts = Object.fromEntries(pulse.choices.map(choice => [choice.id, 0]));
  for (const row of rows.results) if (Object.hasOwn(counts, row.choice_id)) counts[row.choice_id] = row.total;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const own = userId ? await config.DB.prepare('SELECT choice_id FROM pulse_votes WHERE user_id=? AND poll_id=? AND expires_at>?')
    .bind(userId, pulse.id, cutoff).first<{ choice_id: string }>() : null;
  return { ...pulse, total, counts: total >= pulse.minimumResponses ? counts : null, choiceId: own && Object.hasOwn(counts, own.choice_id) ? own.choice_id : null };
}

async function votePulse(config: RuntimeConfig, userId: string, body: Record<string, unknown>): Promise<Pulse> {
  fields(body, ['pollId', 'choiceId']);
  const pulse = pulseForDate();
  if (body.pollId !== pulse.id) throw new ApiError(400, 'INVALID_POLL', 'Refresh the current daily question before answering.');
  if (!pulse.choices.some(choice => choice.id === body.choiceId)) throw new ApiError(400, 'INVALID_POLL_CHOICE');
  const at = new Date().toISOString();
  await config.DB.prepare(`INSERT INTO pulse_votes(user_id,poll_day,poll_id,choice_id,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(user_id,poll_day) DO UPDATE SET poll_id=excluded.poll_id,choice_id=excluded.choice_id,updated_at=excluded.updated_at,expires_at=excluded.expires_at`)
    .bind(userId, pulse.id.slice('pulse.v1:'.length), pulse.id, body.choiceId, at, at, new Date(Date.now() + 30 * DAY).toISOString()).run();
  return readPulse(config, userId);
}

// Runs before the lab membership gate. The dispatcher supplies only trusted native identity.
export async function handleLearnerRoutes(request: Request, config: RuntimeConfig, userId: string | null, body: Record<string, unknown>): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!['/api/learner', '/api/learner/export', '/api/pulse'].includes(path)) return null;
  if (path === '/api/pulse' && request.method === 'GET') {
    const owner = request.headers.has('X-GroundTruth-Account') ? requireBoundAccount(request, userId) : null;
    return json(await readPulse(config, owner));
  }
  const owner = requireBoundAccount(request, userId);
  if (path === '/api/pulse' && request.method === 'POST') return json(await votePulse(config, owner, body));
  if (path === '/api/learner' && request.method === 'POST') return json(await saveLearner(config, owner, body));
  if (path === '/api/learner' && request.method === 'DELETE') {
    await config.DB.prepare('DELETE FROM learner_records WHERE user_id=?').bind(owner).run();
    return json({ deleted: true });
  }
  if (request.method === 'GET' && ['/api/learner', '/api/learner/export'].includes(path)) return json(await readLearner(config, owner), 200,
    path.endsWith('/export') ? { 'Content-Disposition': 'attachment; filename="groundtruth-learner.json"' } : {});
  throw new ApiError(405, 'METHOD_NOT_ALLOWED');
}
