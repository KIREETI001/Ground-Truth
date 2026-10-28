import type { CoachContext, CoachResult, RuntimeConfig } from '../contracts.ts';
import { coach } from '../ai/coach.ts';
import type { CoachRuntimeConfig, ProviderReceipt } from '../ai/coach.ts';
import { getRunSource, sourceFor } from '../lab/engine.ts';
import { ApiError, fields, string } from './http.ts';
import { currentCase, loadSession, now, requireMember, saveDocument } from './state.ts';

export interface ApiOptions { coach?: typeof coach }

export async function runCoaching(request: Request, config: RuntimeConfig, userId: string, body: Record<string, unknown>, options: ApiOptions): Promise<CoachResult> {
  fields(body, ['sessionId', 'caseId']);
  const sessionId = string(body.sessionId, 'sessionId', 1, 120);
  const { row, doc } = await loadSession(config.DB, sessionId, userId);
  if (doc.session.phase !== 'baseline' && doc.session.phase !== 'repair') throw new ApiError(403, 'INDEPENDENT_TRANSFER');
  const selected = currentCase(doc, body.caseId);
  if (!selected.prediction) throw new ApiError(409, 'PREDICTION_REQUIRED');
  if ((doc.coaching?.length ?? 0) >= 12) throw new ApiError(429, 'COACH_TURN_LIMIT');

  const token = crypto.randomUUID();
  const locked = await config.DB.prepare(`INSERT INTO coach_locks(user_id,token,expires_at) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at
    WHERE coach_locks.expires_at<=? RETURNING token`)
    .bind(userId, token, new Date(Date.now() + 40_000).toISOString(), now()).first<{ token: string }>();
  if (locked?.token !== token) throw new ApiError(429, 'COACH_IN_PROGRESS');
  let reserved = 0;
  let attempts = 0;
  let receipt: ProviderReceipt | undefined;
  try {
    await config.DB.prepare(`INSERT OR IGNORE INTO coach_usage(session_id,provider_attempts)
      SELECT id,0 FROM sessions WHERE id=? AND owner_id=? AND status='active' AND revision=? AND expires_at>?`)
      .bind(sessionId, userId, row.revision, now()).run();
    const usage = await config.DB.prepare('SELECT provider_attempts FROM coach_usage WHERE session_id=?').bind(sessionId).first<{ provider_attempts: number }>();
    if (!usage) throw new ApiError(409, 'COACH_STATE_CHANGED');
    const allowance = Math.min(3, 12 - usage.provider_attempts);
    if (allowance < 2) throw new ApiError(429, 'COACH_BUDGET_EXHAUSTED');
    const reservation = await config.DB.prepare(`UPDATE coach_usage SET provider_attempts=provider_attempts+?
      WHERE session_id=? AND provider_attempts=? AND EXISTS(SELECT 1 FROM sessions WHERE id=? AND owner_id=?
      AND status='active' AND revision=? AND phase IN ('baseline','repair') AND expires_at>?)`)
      .bind(allowance, sessionId, usage.provider_attempts, sessionId, userId, row.revision, now()).run();
    if (reservation.meta.changes !== 1) throw new ApiError(409, 'COACH_STATE_CHANGED');
    reserved = allowance;
    const context: CoachContext = {
      phase: doc.session.phase, sessionId, stateRevision: row.revision, caseId: selected.id, fixtureId: selected.fixtureId,
      prediction: selected.prediction, explanation: selected.explanation, evidence: selected.evidence,
      source: selected.runId ? await getRunSource(config.DB, selected.runId, userId) : await sourceFor(selected.phase, selected.fixtureId),
      allowedFixtures: ['lost-success.v1', 'concurrent-retry.v1', 'fail-before-commit.v1'],
    };
    const coachConfig: CoachRuntimeConfig = { ...config,
      onProviderAttempt: () => { if (attempts >= reserved) throw new Error('Attempt allowance exhausted.'); attempts++; },
      onProviderReceipt: (value) => { receipt = value; },
    };
    const value = await (options.coach ?? coach)(context, coachConfig, request.signal);
    // Copy only the validated public DTO; accounting stays in the persisted event.
    const result: CoachResult = { status: value.status, mode: value.mode, decision: value.decision,
      ...(value.code === undefined ? {} : { code: value.code }), ...(value.model === undefined ? {} : { model: value.model }),
      ...(value.usage === undefined ? {} : { usage: value.usage }) };
    const latest = await loadSession(config.DB, sessionId, userId);
    await requireMember(config, userId);
    if (latest.row.revision !== row.revision || latest.doc.session.phase !== doc.session.phase) throw new ApiError(409, 'COACH_STATE_CHANGED');
    (latest.doc.coaching ??= []).push({ caseId: selected.id, phase: doc.session.phase, result, at: now(), ...(receipt ? { receipt } : {}) });
    if (!await saveDocument(config.DB, latest.row, latest.doc)) throw new ApiError(409, 'COACH_STATE_CHANGED');
    return result;
  } finally {
    // A terminated process conservatively retains its reservation. A completed turn
    // releases only slots for HTTP attempts which never started; deleted rows stay deleted.
    if (reserved > attempts) await config.DB.prepare('UPDATE coach_usage SET provider_attempts=max(0,provider_attempts-?) WHERE session_id=?')
      .bind(reserved - attempts, sessionId).run();
    await config.DB.prepare('DELETE FROM coach_locks WHERE user_id=? AND token=?').bind(userId, token).run();
  }
}
