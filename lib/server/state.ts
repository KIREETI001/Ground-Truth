import type { CoachResult, InvestigationCase, LearningSession, Phase, RuntimeConfig } from '../contracts.ts';
import type { ProviderReceipt } from '../ai/coach.ts';
import { ApiError, requestId } from './http.ts';

export const NOTICE_VERSION = 'practice.v1';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1_000;
export interface Profile { notice_version: string | null; research_opt_in: number }
export interface Membership { user_id: string; pilot_id: string; role: 'student' | 'staff'; expires_at: string }
export interface SessionRow { id: string; owner_id: string; status: string; phase: Phase; revision: number; document_json: string; created_at: string; expires_at: string }
interface SavedRequest { id: string; action: string; fingerprint: string; result: unknown; status: number }
export interface SessionDocument {
  session: LearningSession;
  requests: SavedRequest[];
  coaching?: { caseId: string; phase: Phase; result: CoachResult; at: string; receipt?: ProviderReceipt }[];
  selections?: { caseId: string; selectionSource: 'student' | 'coach'; reason: string; at: string }[];
}

export function now(): string { return new Date().toISOString(); }
export function expiresIn30Days(): string { return new Date(Date.now() + THIRTY_DAYS).toISOString(); }
export function pilotId(config: RuntimeConfig): string { return config.PILOT_ID || 'groundtruth-pilot.v1'; }
export function isInstructor(config: RuntimeConfig, userId: string): boolean {
  if (!config.STAFF_USER_ROLES) return false;
  try {
    const roles: unknown = JSON.parse(config.STAFF_USER_ROLES);
    if (!roles || typeof roles !== 'object' || Array.isArray(roles)) return false;
    const role = Object.hasOwn(roles, userId) ? (roles as Record<string, unknown>)[userId] : null;
    return role === 'owner' || role === 'tutor';
  } catch { return false; }
}

export function getProfile(db: D1Database, userId: string): Promise<Profile | null> {
  return db.prepare('SELECT notice_version,research_opt_in FROM practice_profiles WHERE user_id=?').bind(userId).first<Profile>();
}

export async function requireMember(config: RuntimeConfig, userId: string): Promise<Membership> {
  const member = await config.DB.prepare('SELECT user_id,pilot_id,role,expires_at FROM pilot_memberships WHERE user_id=? AND pilot_id=?')
    .bind(userId, pilotId(config)).first<Membership>();
  if (!member) throw new ApiError(403, 'ENROLLMENT_REQUIRED');
  if (member.expires_at <= now()) throw new ApiError(410, 'ACCESS_EXPIRED');
  if ((await getProfile(config.DB, userId))?.notice_version !== NOTICE_VERSION) throw new ApiError(403, 'NOTICE_REQUIRED');
  return member;
}

export function makeCase(phase: Exclude<Phase, 'complete'>, fixtureId = phase === 'baseline' || phase === 'repair' ? 'lost-success.v1' : 'intent-lifecycle.v1'): InvestigationCase {
  return { id: crypto.randomUUID(), phase, fixtureId: fixtureId as InvestigationCase['fixtureId'], prediction: null, runId: null, evidence: null, explanation: null };
}

export async function loadSession(db: D1Database, id: string, ownerId?: string): Promise<{ row: SessionRow; doc: SessionDocument }> {
  const row = await db.prepare(`SELECT * FROM sessions WHERE id=?${ownerId === undefined ? '' : ' AND owner_id=?'}`)
    .bind(...(ownerId === undefined ? [id] : [id, ownerId])).first<SessionRow>();
  if (!row || row.status !== 'active') throw new ApiError(404, 'NOT_FOUND');
  if (row.expires_at <= now()) throw new ApiError(410, 'ACTIVITY_EXPIRED');
  const doc = JSON.parse(row.document_json) as SessionDocument;
  return { row, doc };
}

export async function createSession(config: RuntimeConfig, userId: string, idempotencyId: string): Promise<string> {
  const existing = await config.DB.prepare('SELECT id FROM sessions WHERE owner_id=? AND request_id=? AND status=? AND expires_at>?')
    .bind(userId, idempotencyId, 'active', now()).first<{ id: string }>();
  if (existing) return existing.id;
  const session: LearningSession = { id: crypto.randomUUID(), labId: 'campus-signup.v1', phase: 'baseline', revision: 0,
    createdAt: now(), expiresAt: expiresIn30Days(), cases: [makeCase('baseline')], patches: [] };
  const doc: SessionDocument = { session, requests: [] };
  await config.DB.prepare(`INSERT OR IGNORE INTO sessions(id,owner_id,status,phase,revision,document_json,request_id,created_at,expires_at)
    SELECT ?,?,'active','baseline',0,?,?,?,?
    WHERE EXISTS(SELECT 1 FROM pilot_memberships m JOIN practice_profiles p ON p.user_id=m.user_id
      WHERE m.user_id=? AND m.pilot_id=? AND m.expires_at>? AND p.notice_version=?)
    AND (SELECT count(*) FROM sessions WHERE owner_id=?)<10`)
    .bind(session.id, userId, JSON.stringify(doc), idempotencyId, session.createdAt, session.expiresAt,
      userId, pilotId(config), now(), NOTICE_VERSION, userId).run();
  const saved = await config.DB.prepare('SELECT id FROM sessions WHERE owner_id=? AND request_id=? AND status=? AND expires_at>?')
    .bind(userId, idempotencyId, 'active', now()).first<{ id: string }>();
  if (!saved) throw new ApiError(409, 'SESSION_LIMIT_OR_ACCESS_CHANGED');
  return saved.id;
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function saveDocument(db: D1Database, row: SessionRow, doc: SessionDocument): Promise<boolean> {
  doc.session.revision = row.revision + 1;
  const result = await db.prepare(`UPDATE sessions SET document_json=?,revision=?,phase=?
    WHERE id=? AND owner_id=? AND revision=? AND status='active' AND expires_at>?`)
    .bind(JSON.stringify(doc), doc.session.revision, doc.session.phase, row.id, row.owner_id, row.revision, now()).run();
  return result.meta.changes === 1;
}

export async function mutateSession(
  db: D1Database, id: string, ownerId: string, action: string, body: Record<string, unknown>,
  update: (doc: SessionDocument) => Promise<{ result: unknown; status?: number }> | { result: unknown; status?: number },
): Promise<{ result: unknown; status: number }> {
  const idempotencyId = requestId(body);
  const fingerprint = await digest(body);
  for (let retry = 0; retry < 4; retry++) {
    const { row, doc } = await loadSession(db, id, ownerId);
    const saved = doc.requests.find((item) => item.id === idempotencyId);
    if (saved) {
      if (saved.action !== action || saved.fingerprint !== fingerprint) throw new ApiError(409, 'REQUEST_ID_REUSED');
      return { result: saved.result, status: saved.status };
    }
    if (doc.requests.length >= 128) throw new ApiError(429, 'ACTIVITY_REQUEST_LIMIT');
    const change = await update(doc);
    const status = change.status ?? 201;
    doc.requests.push({ id: idempotencyId, action, fingerprint, result: change.result, status });
    if (await saveDocument(db, row, doc)) return { result: change.result, status };
  }
  throw new ApiError(409, 'STATE_CHANGED', 'Activity changed; refresh and retry.');
}

export function currentCase(doc: SessionDocument, id: unknown): InvestigationCase {
  const selected = doc.session.cases.find((item) => item.id === id);
  if (!selected) throw new ApiError(404, 'CASE_NOT_FOUND');
  if (selected.phase !== doc.session.phase) throw new ApiError(409, 'PHASE_CHANGED');
  return selected;
}

export function requiredExplanation(doc: SessionDocument): void {
  const fixture = doc.session.phase === 'baseline' || doc.session.phase === 'repair' ? 'lost-success.v1' : 'intent-lifecycle.v1';
  const required = doc.session.cases.find((item) => item.phase === doc.session.phase && item.fixtureId === fixture);
  if (!required?.explanation || !required.evidence) throw new ApiError(409, 'REQUIRED_EXPLANATION');
}
