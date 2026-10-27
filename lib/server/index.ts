import type { FixtureId, Me, Outcome, Prediction, RunPlan, RuntimeConfig } from '../contracts.ts';
import { createRun, executeStep, finalizeRun, getEvidence, getRunSource, getRunState, LabError, sourceFor } from '../lab/engine.ts';
import { runCoaching } from './coaching.ts';
import { ENROLLMENT_WINDOW_MS, purgeExpired } from './retention.ts';
import type { ApiOptions } from './coaching.ts';
import { ApiError, fields, json, readMutation, requestId, string } from './http.ts';
import { createSession, currentCase, digest, expiresIn30Days, getProfile, isInstructor, loadSession, makeCase,
  mutateSession, NOTICE_VERSION, now, pilotId, requiredExplanation, requireMember } from './state.ts';
import type { SessionDocument } from './state.ts';

const MAIN_FIXTURES: FixtureId[] = ['lost-success.v1', 'concurrent-retry.v1', 'fail-before-commit.v1'];
const OUTCOMES: Outcome[] = ['created', 'replayed', 'conflict', 'fault', 'unsure'];

function pilotOpen(config: RuntimeConfig): boolean {
  return config.PILOT_ENROLLMENT_ENABLED === 'true' && !!config.PILOT_ENROLLMENT_CODE;
}

function codeMatches(a: string, b: string): boolean {
  let different = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) different |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return different === 0;
}

async function me(request: Request, config: RuntimeConfig, userId: string | null): Promise<Me> {
  const profile = userId ? await getProfile(config.DB, userId) : null;
  const member = userId ? await config.DB.prepare('SELECT expires_at FROM pilot_memberships WHERE user_id=? AND pilot_id=?')
    .bind(userId, pilotId(config)).first<{ expires_at: string }>() : null;
  return { authenticated: !!userId, userId, enrolled: !!member && member.expires_at > now(), instructor: !!userId && isInstructor(config, userId),
    noticeAcknowledged: profile?.notice_version === NOTICE_VERSION, researchConsent: profile?.research_opt_in === 1,
    aiAvailable: !!userId && config.MODEL_CALLS_ENABLED === 'true' && !!config.MODEL_API_KEY &&
      (config.MODEL_BASE_URL === undefined || ['https://api.meta.ai/v1', 'https://api.meta.ai/v1/'].includes(config.MODEL_BASE_URL)) &&
      (config.MODEL_ID === undefined || config.MODEL_ID === 'muse-spark-1.3'),
    pilotOpen: pilotOpen(config), localDevelopment: ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname) };
}

export async function handleApi(request: Request, config: RuntimeConfig, userId: string | null, options: ApiOptions = {}): Promise<Response> {
  try {
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) throw new ApiError(405, 'METHOD_NOT_ALLOWED');
    const body = request.method === 'GET' ? {} : await readMutation(request);
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/api/me' && request.method === 'GET') return json(await me(request, config, userId));
    if (!userId) throw new ApiError(401, 'AUTH_REQUIRED');

    if (path === '/api/notices/practice' && request.method === 'POST') {
      fields(body, ['version', 'acknowledged']);
      if (body.version !== NOTICE_VERSION || body.acknowledged !== true) throw new ApiError(400, 'NOTICE_VERSION_REQUIRED');
      await config.DB.prepare(`INSERT INTO practice_profiles(user_id,notice_version,notice_acknowledged_at,research_opt_in,updated_at)
        VALUES(?,?,?,0,?) ON CONFLICT(user_id) DO UPDATE SET notice_version=excluded.notice_version,
        notice_acknowledged_at=excluded.notice_acknowledged_at,updated_at=excluded.updated_at`).bind(userId, NOTICE_VERSION, now(), now()).run();
      return json(await me(request, config, userId));
    }
    if (path === '/api/me/research-consent' && request.method === 'PATCH') {
      fields(body, ['optIn']);
      if (typeof body.optIn !== 'boolean') throw new ApiError(400, 'INVALID_CONSENT');
      await config.DB.prepare(`INSERT INTO practice_profiles(user_id,research_opt_in,updated_at) VALUES(?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET research_opt_in=excluded.research_opt_in,updated_at=excluded.updated_at`)
        .bind(userId, body.optIn ? 1 : 0, now()).run();
      return json(await me(request, config, userId));
    }
    if (path === '/api/pilot/enroll' && request.method === 'POST') {
      fields(body, ['code']);
      const code = string(body.code, 'code', 1, 128);
      if ((await getProfile(config.DB, userId))?.notice_version !== NOTICE_VERSION) throw new ApiError(403, 'NOTICE_REQUIRED');
      const attemptedAt = Date.now();
      const windowMs = ENROLLMENT_WINDOW_MS;
      // One atomic statement counts simultaneous attempts before comparing any code.
      const attempt = await config.DB.prepare(`INSERT INTO enrollment_attempts(user_id,pilot_id,window_started_at,attempts)
        VALUES(?,?,?,1) ON CONFLICT(user_id,pilot_id) DO UPDATE SET
        attempts=CASE WHEN enrollment_attempts.window_started_at<=? THEN 1 ELSE enrollment_attempts.attempts+1 END,
        window_started_at=CASE WHEN enrollment_attempts.window_started_at<=? THEN excluded.window_started_at ELSE enrollment_attempts.window_started_at END
        RETURNING attempts,window_started_at`)
        .bind(userId, pilotId(config), attemptedAt, attemptedAt - windowMs, attemptedAt - windowMs)
        .first<{ attempts: number; window_started_at: number }>();
      if (!attempt) throw new ApiError(503, 'ENROLLMENT_UNAVAILABLE');
      if (attempt.attempts > 5) return json({ error: { code: 'ENROLLMENT_RATE_LIMITED', message: 'Too many enrollment attempts. Try again after the indicated wait.' } }, 429,
        { 'Retry-After': String(Math.max(1, Math.ceil((attempt.window_started_at + windowMs - attemptedAt) / 1_000))) });
      if (!pilotOpen(config) || !codeMatches(code, config.PILOT_ENROLLMENT_CODE!)) throw new ApiError(403, 'ENROLLMENT_CLOSED_OR_INVALID');
      const existing = await config.DB.prepare('SELECT user_id FROM pilot_memberships WHERE user_id=? AND pilot_id=? AND expires_at>?')
        .bind(userId, pilotId(config), now()).first();
      if (existing) return json(await me(request, config, userId));
      const configuredLimit = Number(config.PILOT_MAX_MEMBERS || 5);
      const cap = Number.isInteger(configuredLimit) ? Math.max(0, Math.min(configuredLimit, 5)) : 5;
      const role = isInstructor(config, userId) ? 'staff' : 'student';
      const saved = await config.DB.prepare(`INSERT OR IGNORE INTO pilot_memberships(user_id,pilot_id,role,enrolled_at,expires_at)
        SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM practice_profiles WHERE user_id=? AND notice_version=?)
        AND (?='staff' OR (SELECT count(*) FROM pilot_memberships WHERE pilot_id=? AND role='student' AND expires_at>?)<?)`)
        .bind(userId, pilotId(config), role, now(), expiresIn30Days(), userId, NOTICE_VERSION, role, pilotId(config), now(), cap).run();
      if (saved.meta.changes !== 1) throw new ApiError(409, 'PILOT_FULL');
      return json(await me(request, config, userId), 201);
    }
    if (path === '/api/activity' && request.method === 'DELETE') {
      const securityCutoff = Date.now() - ENROLLMENT_WINDOW_MS;
      const results = await config.DB.batch([
        config.DB.prepare("UPDATE sessions SET status='deleting' WHERE owner_id=?").bind(userId),
        config.DB.prepare('DELETE FROM sessions WHERE owner_id=?').bind(userId),
        config.DB.prepare('DELETE FROM coach_locks WHERE user_id=?').bind(userId),
        config.DB.prepare('DELETE FROM practice_profiles WHERE user_id=?').bind(userId),
        config.DB.prepare('DELETE FROM pilot_memberships WHERE user_id=?').bind(userId),
        // Preserve an active cooldown so deletion cannot reset enrollment attempts.
        config.DB.prepare('DELETE FROM enrollment_attempts WHERE user_id=? AND window_started_at<=?').bind(userId, securityCutoff),
        config.DB.prepare('SELECT count(*) AS counters,max(window_started_at) AS latest_window_started_at FROM enrollment_attempts WHERE user_id=?').bind(userId),
      ]);
      const security = results[6].results[0] as { counters: number; latest_window_started_at: number | null };
      return json({ deleted: { sessions: results[1].meta.changes, coachLocks: results[2].meta.changes,
        profiles: results[3].meta.changes, memberships: results[4].meta.changes, enrollmentAttempts: results[5].meta.changes },
        retained: { enrollmentSecurityCounters: security.counters,
          enrollmentSecurityWindowEndsAt: security.latest_window_started_at === null ? null : new Date(security.latest_window_started_at + ENROLLMENT_WINDOW_MS).toISOString(),
          enrollmentSecurityCleanup: 'Active enrollment security counters are retained for their ten-minute window. Expired counters are removed during moderator cleanup or a later deletion request; cleanup is not automatic.' } });
    }

    await requireMember(config, userId);
    if (path === '/api/coach' && request.method === 'POST') return json(await runCoaching(request, config, userId, body, options));
    if (path === '/api/sessions' && request.method === 'POST') {
      fields(body, ['requestId']);
      return json({ sessionId: await createSession(config, userId, requestId(body)) }, 201);
    }
    if (path === '/api/sessions' && request.method === 'GET') {
      const result = await config.DB.prepare("SELECT id,phase,created_at,expires_at FROM sessions WHERE owner_id=? AND status='active' AND expires_at>? ORDER BY created_at DESC")
        .bind(userId, now()).all<{ id: string; phase: string; created_at: string; expires_at: string }>();
      return json({ sessions: result.results.map((row) => ({ id: row.id, phase: row.phase, createdAt: row.created_at, expiresAt: row.expires_at })) });
    }

    if (path.startsWith('/api/admin/')) {
      if (!isInstructor(config, userId)) throw new ApiError(403, 'INSTRUCTOR_REQUIRED');
      if (path === '/api/admin/purge-expired' && request.method === 'POST') {
        fields(body, []);
        return json(await purgeExpired(config));
      }
      if (path === '/api/admin/pilot' && request.method === 'GET') {
        const rows = await config.DB.prepare(`SELECT s.id,s.owner_id,s.phase,s.created_at FROM sessions s
          JOIN pilot_memberships m ON m.user_id=s.owner_id WHERE m.pilot_id=? AND s.status='active' AND s.expires_at>? AND m.expires_at>? ORDER BY s.created_at DESC`)
          .bind(pilotId(config), now(), now()).all<{ id: string; owner_id: string; phase: string; created_at: string }>();
        const sessions = await Promise.all(rows.results.map(async (row) => ({ id: row.id, alias: `Learner-${(await digest([pilotId(config), row.owner_id])).slice(0, 10)}`, phase: row.phase, createdAt: row.created_at })));
        return json({ sessions });
      }
      const adminProof = path.match(/^\/api\/admin\/sessions\/([^/]+)\/proof\.json$/);
      if (adminProof && request.method === 'GET') {
        const { row, doc } = await loadSession(config.DB, adminProof[1]);
        const member = await config.DB.prepare('SELECT user_id FROM pilot_memberships WHERE user_id=? AND pilot_id=? AND expires_at>?')
          .bind(row.owner_id, pilotId(config), now()).first();
        if (!member) throw new ApiError(404, 'NOT_FOUND');
        return proof(config, doc);
      }
      throw new ApiError(404, 'NOT_FOUND');
    }

    const sessionRoute = path.match(/^\/api\/sessions\/([^/]+)(?:\/([^/]+))?$/);
    if (sessionRoute) {
      const [, sessionId, action] = sessionRoute;
      if (!action && request.method === 'GET') return json((await loadSession(config.DB, sessionId, userId)).doc.session);
      if (action === 'source' && request.method === 'GET') {
        const { doc } = await loadSession(config.DB, sessionId, userId);
        const selected = doc.session.cases.find((item) => item.id === url.searchParams.get('caseId'));
        if (!selected) throw new ApiError(404, 'CASE_NOT_FOUND');
        if (selected.runId) {
          try { return json(await getRunSource(config.DB, selected.runId, userId)); }
          catch (error) {
            // A reserved case link can survive a transient run INSERT failure.
            // Source stays available while the resume POST repairs that reservation.
            if (!(error instanceof LabError) || error.code !== 'RUN_NOT_FOUND' || selected.evidence) throw error;
          }
        }
        return json(await sourceFor(selected.phase, selected.fixtureId));
      }
      if (action === 'proof.json' && request.method === 'GET') {
        const { doc } = await loadSession(config.DB, sessionId, userId);
        return proof(config, doc);
      }
      if (action === 'runs' && request.method === 'POST') {
        fields(body, ['caseId', 'predictionId', 'requestId']);
        const linked = await mutateSession(config.DB, sessionId, userId, 'runs', body, (doc) => {
          const selected = currentCase(doc, body.caseId);
          if (!selected.prediction || selected.prediction.id !== body.predictionId) throw new ApiError(409, 'PREDICTION_REQUIRED');
          if (doc.session.cases.some((item) => item.id !== selected.id && item.runId && !item.evidence)) throw new ApiError(409, 'RUN_IN_PROGRESS');
          selected.runId ??= crypto.randomUUID();
          return { result: { runId: selected.runId, caseId: selected.id, phase: selected.phase, fixtureId: selected.fixtureId, predictionId: selected.prediction.id } };
        });
        const link = linked.result as { runId: string; caseId: string; phase: RunPlan['phase']; fixtureId: FixtureId; predictionId: string };
        let plan: RunPlan;
        try { plan = (await getRunState(config.DB, link.runId, userId)).plan; }
        catch (error) {
          if (!(error instanceof LabError) || error.code !== 'RUN_NOT_FOUND') throw error;
          plan = await createRun(config.DB, { ...link, sessionId, ownerId: userId });
        }
        return json(plan, 201);
      }
      if (action === 'explanations' && request.method === 'POST') {
        fields(body, ['caseId', 'runId', 'body', 'requestId']);
        const explanationBody = body.body;
        if (!explanationBody || typeof explanationBody !== 'object' || Array.isArray(explanationBody)) throw new ApiError(400, 'INVALID_EXPLANATION');
        const explanation = explanationBody as Record<string, unknown>;
        fields(explanation, ['claim', 'evidence', 'reasoning']);
        const claim = string(explanation.claim, 'claim', 1, 4_000), evidenceText = string(explanation.evidence, 'evidence', 1, 4_000), reasoning = string(explanation.reasoning, 'reasoning', 1, 4_000);
        if (claim.length + evidenceText.length + reasoning.length > 4_000) throw new ApiError(400, 'INVALID_EXPLANATION');
        const runId = string(body.runId, 'runId', 1, 120);
        const evidence = await getEvidence(config.DB, runId, userId);
        if (evidence.sessionId !== sessionId || evidence.caseId !== body.caseId) throw new ApiError(409, 'RUN_CASE_MISMATCH');
        const result = await mutateSession(config.DB, sessionId, userId, 'explanations', body, (doc) => {
          const selected = currentCase(doc, body.caseId);
          if (selected.explanation) throw new ApiError(409, 'EXPLANATION_LOCKED');
          if (selected.runId !== runId || selected.evidence?.evidenceHash !== evidence.evidenceHash) throw new ApiError(409, 'FINALIZED_EVIDENCE_REQUIRED');
          selected.explanation = { claim, evidence: evidenceText, reasoning, lockedAt: now() };
          return { result: selected.explanation };
        });
        return json(result.result, result.status);
      }
      if (request.method === 'POST' && ['cases', 'predictions', 'patches', 'advance', 'suggestion-decisions'].includes(action ?? '')) {
        const allowed: Record<string, string[]> = {
          cases: ['fixtureId', 'selectionSource', 'selectionReason', 'requestId'],
          predictions: ['caseId', 'rowsAfterEachGroup', 'requestOutcomes', 'rationale', 'confidence', 'requestId'],
          patches: ['patchId', 'reason', 'requestId'], advance: ['requestId'],
          'suggestion-decisions': ['caseId', 'decision', 'reason', 'requestId'],
        };
        fields(body, allowed[action!]);
        const result = await mutateSession(config.DB, sessionId, userId, action!, body, (doc) => {
          const session = doc.session;
          if (action === 'cases') {
            if (session.phase !== 'baseline' && session.phase !== 'repair') throw new ApiError(403, 'INDEPENDENT_TRANSFER');
            if (!MAIN_FIXTURES.includes(body.fixtureId as FixtureId)) throw new ApiError(400, 'FIXTURE_NOT_ALLOWED');
            if (body.selectionSource !== 'student' && body.selectionSource !== 'coach') throw new ApiError(400, 'INVALID_SELECTION_SOURCE');
            const reason = string(body.selectionReason, 'selectionReason', 1, 1_000);
            if (session.cases.some((item) => item.phase === session.phase && item.fixtureId === body.fixtureId)) throw new ApiError(409, 'CASE_ALREADY_EXISTS');
            const selected = makeCase(session.phase, body.fixtureId as string);
            session.cases.push(selected);
            (doc.selections ??= []).push({ caseId: selected.id, selectionSource: body.selectionSource, reason, at: now() });
            return { result: { caseId: selected.id } };
          }
          if (action === 'predictions') {
            const selected = currentCase(doc, body.caseId);
            if (selected.prediction) throw new ApiError(409, 'PREDICTION_LOCKED');
            const groups = selected.fixtureId === 'concurrent-retry.v1' ? 1 : selected.fixtureId === 'intent-lifecycle.v1' ? 3 : 2;
            const requests = selected.fixtureId === 'intent-lifecycle.v1' ? 3 : 2;
            if (!Array.isArray(body.rowsAfterEachGroup) || body.rowsAfterEachGroup.length !== groups ||
              body.rowsAfterEachGroup.some((n) => !Number.isInteger(n) || (n as number) < 0 || (n as number) > 3)) throw new ApiError(400, 'INVALID_ROW_PREDICTION');
            if (!Array.isArray(body.requestOutcomes) || body.requestOutcomes.length !== requests || body.requestOutcomes.some((value) => !OUTCOMES.includes(value as Outcome))) throw new ApiError(400, 'INVALID_OUTCOME_PREDICTION');
            if (!Number.isInteger(body.confidence) || (body.confidence as number) < 1 || (body.confidence as number) > 5) throw new ApiError(400, 'INVALID_CONFIDENCE');
            const prediction: Prediction = { id: crypto.randomUUID(), rowsAfterEachGroup: body.rowsAfterEachGroup as number[], requestOutcomes: body.requestOutcomes as Outcome[],
              rationale: string(body.rationale, 'rationale', 1, 2_000), confidence: body.confidence as number, lockedAt: now() };
            selected.prediction = prediction;
            return { result: prediction };
          }
          if (action === 'suggestion-decisions') {
            if (session.phase !== 'baseline' && session.phase !== 'repair') throw new ApiError(403, 'INDEPENDENT_TRANSFER');
            const selected = currentCase(doc, body.caseId);
            if (!['accepted', 'changed', 'rejected'].includes(body.decision as string)) throw new ApiError(400, 'INVALID_DECISION');
            if ((session.suggestionDecisions?.length ?? 0) >= 12) throw new ApiError(429, 'DECISION_LIMIT');
            const entry = { caseId: selected.id, decision: body.decision as 'accepted' | 'changed' | 'rejected', reason: string(body.reason, 'reason', 1, 1_000), at: now() };
            (session.suggestionDecisions ??= []).push(entry);
            return { result: entry };
          }
          if (session.cases.some(item => item.runId && !item.evidence)) throw new ApiError(409, 'RUN_IN_PROGRESS', 'Finish the saved unfinished probe before moving to the next phase.');
          requiredExplanation(doc);
          if (action === 'patches') {
            const expected = session.phase === 'baseline' ? 'idempotent-intent.v1' : session.phase === 'transfer' ? 'new-intent-new-key.v1' : null;
            if (!expected || body.patchId !== expected) throw new ApiError(409, 'PATCH_NOT_AVAILABLE');
            const patch = { phase: session.phase, patchId: expected, reason: string(body.reason, 'reason', 1, 1_000), selectedAt: now() };
            session.patches.push(patch);
            session.phase = session.phase === 'baseline' ? 'repair' : 'transfer_repair';
            session.cases.push(makeCase(session.phase));
            return { result: patch };
          }
          if (session.phase === 'repair') { session.phase = 'transfer'; session.cases.push(makeCase('transfer')); }
          else if (session.phase === 'transfer_repair') session.phase = 'complete';
          else throw new ApiError(409, 'ADVANCE_NOT_AVAILABLE');
          return { result: { phase: session.phase } };
        });
        return json(result.result, result.status);
      }
    }
    const runRoute = path.match(/^\/api\/runs\/([^/]+)(?:\/(finalize|evidence))?$/);
    if (runRoute) {
      const [, runId, action] = runRoute;
      if (!action && request.method === 'GET') return json(await getRunState(config.DB, runId, userId));
      if (action === 'evidence' && request.method === 'GET') return json(await getEvidence(config.DB, runId, userId));
      if (action === 'finalize' && request.method === 'POST') {
        fields(body, ['requestId']); requestId(body);
        const evidence = await finalizeRun(config.DB, runId, userId);
        const result = await mutateSession(config.DB, evidence.sessionId, userId, `finalize:${runId}`, body, (doc) => {
          const selected = doc.session.cases.find((item) => item.id === evidence.caseId && item.runId === runId);
          if (!selected || (!selected.evidence && selected.phase !== doc.session.phase)) throw new ApiError(409, 'PHASE_CHANGED');
          if (selected.evidence && selected.evidence.evidenceHash !== evidence.evidenceHash) throw new ApiError(409, 'EVIDENCE_LOCKED');
          selected.evidence = evidence;
          return { result: evidence, status: 200 };
        });
        return json(result.result, result.status);
      }
    }
    const registrationRoute = path.match(/^\/api\/lab\/runs\/([^/]+)\/registrations$/);
    if (registrationRoute && request.method === 'POST') {
      fields(body, ['eventId', 'attendeeRef']);
      string(body.eventId, 'eventId', 1, 80); string(body.attendeeRef, 'attendeeRef', 1, 80);
      const stepId = string(request.headers.get('x-gt-step-id'), 'stepId', 1, 120);
      const key = request.headers.get('idempotency-key');
      if (key !== null) string(key, 'idempotencyKey', 1, 120);
      const response = await executeStep(config.DB, registrationRoute[1], userId, stepId,
        { eventId: body.eventId as string, attendeeRef: body.attendeeRef as string }, key);
      return json(response.body, response.status, response.receipt.decision === 'replayed' ? { 'Idempotency-Replayed': 'true' } : {});
    }
    throw new ApiError(404, 'NOT_FOUND');
  } catch (error) {
    if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message } }, error.status);
    if (error instanceof LabError) return json({ error: { code: error.code } }, error.status);
    return json({ error: { code: 'SERVICE_UNAVAILABLE' } }, 503);
  }
}

async function proof(config: RuntimeConfig, doc: SessionDocument): Promise<Response> {
  const sessionId = doc.session.id;
  const usage = await config.DB.prepare('SELECT provider_attempts FROM coach_usage WHERE session_id=?').bind(sessionId).first<{ provider_attempts: number }>();
  return json({ schemaVersion: 'groundtruth-proof.v1', exportedAt: now(), session: doc.session, coach: { providerAttempts: usage?.provider_attempts ?? 0, events: doc.coaching ?? [] }, selections: doc.selections ?? [],
    redaction: { nativeIdentity: 'omitted', rawIdempotencyKeys: 'omitted', secrets: 'omitted' } }, 200,
    { 'Content-Disposition': `attachment; filename="groundtruth-${sessionId}.json"` });
}
