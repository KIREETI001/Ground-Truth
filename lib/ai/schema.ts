import type { CoachContext, CoachDecision, FixtureId } from '../contracts.ts';

export const MODEL = 'muse-spark-1.3';
export const VERSION = 'groundtruth.coach.v1';
export const FIXTURES = ['lost-success.v1', 'concurrent-retry.v1', 'fail-before-commit.v1'] as const;
const PROBES = ['committed_registration_count', 'duplicate_registration_count', 'request_count', 'created_count', 'replayed_count', 'injected_loss_count', 'injected_precommit_failure_count'];
export const ALL_PROBES = [...PROBES, 'distinct_intent_count', 'conflict_count', 'same_intent_reuses_token', 'new_intent_rotates_token'];
const ACTIONS = ['clarify', 'propose_experiment', 'ask_followup', 'abstain'];
const FOCUSES = ['ui_request_boundary', 'handler_delivery_boundary', 'commit_delivery_boundary', 'retry_effect', 'intent_identity', 'insufficient_evidence'];
const REASONS = ['compare_response_and_state', 'test_retry_effect', 'test_concurrent_retry', 'distinguish_precommit_failure', 'compare_completed_runs'];
const QUESTIONS = ['clarification', 'evidence_comparison', 'falsification', 'probe_selection'];
const UNCERTAINTY = ['none_stated', 'ambiguous_prediction', 'missing_observation', 'out_of_scope'];

export class CoachFailure extends Error {
  code: string;
  retryable: boolean;
  retryAfterMs: number | null;
  constructor(code: string, retryable = false, retryAfterMs: number | null = null) {
    super(code); this.name = 'CoachFailure'; this.code = code; this.retryable = retryable; this.retryAfterMs = retryAfterMs;
  }
}

export function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function text(value: unknown, limit: number, empty = false): value is string {
  return typeof value === 'string' && (empty || value.trim().length > 0) && [...value].length <= limit;
}
export function token(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(value);
}
export function enumValue(value: unknown, allowed: readonly string[]): value is string {
  return typeof value === 'string' && allowed.includes(value);
}
const integer = (value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const date = (value: unknown): value is string => text(value, 40) && Number.isFinite(Date.parse(value));
function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function ids(value: unknown, allowed: readonly string[], max: number): value is string[] {
  return Array.isArray(value) && value.length <= max && new Set(value).size === value.length && value.every(id => enumValue(id, allowed));
}

export function evidenceRefs(context: CoachContext): string[] {
  const e = context.evidence;
  return e ? [e.runId, e.evidenceHash, ...e.receipts.map(r => r.receiptId)] : [];
}
export function questionProbes(context: CoachContext): string[] {
  return context.phase === 'repair' ? [...PROBES, 'same_intent_reuses_token'] : PROBES;
}
export function reasoningText(context: CoachContext): string {
  return [context.prediction.rationale, ...(context.explanation ? [context.explanation.claim, context.explanation.evidence, context.explanation.reasoning] : [])].join('\n');
}

// The API authorizes ownership and persisted phase. These checks are an additional
// adapter boundary, including rejection of accidentally stale assembled context.
export function validateContext(value: unknown): asserts value is CoachContext {
  if (object(value) && enumValue(value.phase, ['transfer', 'transfer_repair', 'complete'])) throw new CoachFailure('phase_forbidden');
  if (!object(value) || !enumValue(value.phase, ['baseline', 'repair'])) throw new CoachFailure('invalid_context');
  const p = value.prediction, s = value.source, x = value.explanation;
  if (!token(value.sessionId) || !token(value.caseId) || !integer(value.stateRevision) || !enumValue(value.fixtureId, FIXTURES) ||
    !Array.isArray(value.allowedFixtures) || value.allowedFixtures.length < 1 || !ids(value.allowedFixtures, FIXTURES, 3) ||
    !object(p) || !token(p.id) || !date(p.lockedAt) || !integer(p.confidence, 100) ||
    !Array.isArray(p.rowsAfterEachGroup) || p.rowsAfterEachGroup.length < 1 || p.rowsAfterEachGroup.length > 16 || !p.rowsAfterEachGroup.every(n => integer(n, 1000)) ||
    !Array.isArray(p.requestOutcomes) || p.requestOutcomes.length < 1 || p.requestOutcomes.length > 32 || !p.requestOutcomes.every(o => enumValue(o, ['created', 'replayed', 'conflict', 'fault', 'unsure'])) ||
    !object(s) || !token(s.sourceDigest) || !text(s.title, 200) || !integer(s.groups, 16) || !integer(s.requestCount, 32) ||
    !Array.isArray(s.stages) || s.stages.length > 16 || !s.stages.every(stage => text(stage, 160)) ||
    (x !== null && (!object(x) || !date(x.lockedAt)))) throw new CoachFailure('invalid_context');
  for (const field of [p.rationale, ...(object(x) ? [x.claim, x.evidence, x.reasoning] : [])]) {
    if (typeof field === 'string' && [...field].length > 4000) throw new CoachFailure('input_too_large');
    if (!text(field, 4000)) throw new CoachFailure('invalid_context');
  }
  for (const field of [s.client, s.server]) {
    if (typeof field === 'string' && [...field].length > 12000) throw new CoachFailure('input_too_large');
    if (!text(field, 12000)) throw new CoachFailure('invalid_context');
  }
  const e = value.evidence;
  if (e !== null) {
    if (!object(e) || e.schemaVersion !== 'groundtruth-evidence.v1' || e.executionMode !== 'live-fixture' ||
      e.phase !== value.phase || e.sessionId !== value.sessionId || e.caseId !== value.caseId || e.fixtureId !== value.fixtureId ||
      e.predictionId !== p.id || e.sourceDigest !== s.sourceDigest || !date(e.finalizedAt) ||
      !token(e.runId) || !token(e.evidenceHash) || !token(e.planDigest)) throw new CoachFailure('stale_context');
    if (!Array.isArray(e.receipts) || !e.receipts.length || e.receipts.length > 32 || !Array.isArray(e.registrations) || e.registrations.length > 32 || !object(e.probes)) throw new CoachFailure('invalid_context');
    const receiptIds = new Set<string>();
    for (const r of e.receipts) {
      if (!object(r) || !token(r.receiptId) || receiptIds.has(r.receiptId) || r.runId !== e.runId || !token(r.stepId) || !integer(r.index, 31) ||
        !enumValue(r.decision, ['created', 'replayed', 'payload_conflict', 'not_executed']) ||
        !enumValue(r.deliveryPolicy, ['normal', 'discard-success', 'fail-before-handler']) ||
        !(r.handlerStatus === null || (integer(r.handlerStatus, 599) && r.handlerStatus >= 100)) ||
        !integer(r.deliveredStatus, 599) || r.deliveredStatus < 100 || !integer(r.committedRowCountAfter, 1000) || !date(r.committedAt)) throw new CoachFailure('invalid_context');
      receiptIds.add(r.receiptId);
    }
    for (const [id, probe] of Object.entries(e.probes)) if (!ALL_PROBES.includes(id) || !(probe === null || typeof probe === 'boolean' || integer(probe, 1000))) throw new CoachFailure('invalid_context');
  }
  const learnerAndSource = [p.rationale, ...(object(x) ? [x.claim, x.evidence, x.reasoning] : []), s.title, s.client, s.server].join('\n');
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:sk|mapi)[_-][A-Z0-9_-]{16,}\b|\bBearer\s+[A-Z0-9._-]{12,}|\bMODEL_API_KEY\s*[:=]|\bstudent\s*(?:number|id)\s*[:=#]?\s*\d{6,}/i.test(learnerAndSource)) throw new CoachFailure('sensitive_input');
}

const enumString = (values: readonly string[]) => ({ type: 'string', enum: [...values] });
const arrayOf = (items: unknown) => ({ type: 'array', items });
const closed = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });

export function outputSchema(context: CoachContext) {
  const experiment = closed({ fixture_id: enumString(context.allowedFixtures), patch_id: enumString([context.phase === 'repair' ? 'idempotent-intent.v1' : 'button-only.v1']), target_probe_ids: arrayOf(enumString(PROBES)), reason_code: enumString(REASONS) });
  const question = closed({ question_type: enumString(context.phase === 'repair' ? [...QUESTIONS, 'retry_identity'] : QUESTIONS), question_text: { type: 'string', maxLength: 240 }, target_probe_ids: arrayOf(enumString(questionProbes(context))) });
  return closed({ schema_version: enumString([VERSION]), action: enumString(ACTIONS), rationale: { type: 'string', maxLength: 160 }, evidence_refs: arrayOf(enumString(evidenceRefs(context).length ? evidenceRefs(context) : ['__no_evidence_available__'])), reasoning_focus: enumString(context.phase === 'repair' ? FOCUSES : FOCUSES.filter(f => f !== 'intent_identity')), claim_spans: arrayOf(closed({ start: { type: 'integer' }, end: { type: 'integer' } })), experiment: { anyOf: [{ type: 'null' }, experiment] }, question: { anyOf: [{ type: 'null' }, question] }, lesson_refs: arrayOf(enumString([context.source.sourceDigest])), uncertainty: enumString(UNCERTAINTY) });
}

// Known markup, code, result-answer and premature-repair patterns fail closed.
// This is not a proof against semantic leakage; live tutor evaluation is required.
function safeProse(value: unknown, limit: number, context: CoachContext, empty = false): value is string {
  if (!text(value, limit, empty) || /[<>`\u0000-\u001f\u007f]|\b(?:https?|ftp|javascript|data):|www\.|!\[|\[[^\]]*\]\s*\(|=>|\b(?:INSERT\s+INTO|SELECT\s+.+\s+FROM|UPDATE\s+.+\s+SET|const\s+\w+\s*=|function\s*[\w(])/i.test(value)) return false;
  const number = '(?:\\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)';
  if (new RegExp(`\\b${number}(?:\\s+[a-z]+){0,3}\\s+(?:rows?|registrations?|commits?|records?)\\b|\\b(?:count|total|rows?|registrations?)[^.?!]{0,36}\\b${number}\\b`, 'i').test(value)) return false;
  if (context.phase === 'baseline' && /idempoten|stable.{0,25}(?:key|token)|(?:reuse|persist|cache|store).{0,30}(?:key|token|response)|unique\s+constraint|on\s+conflict|upsert|atomic\s+transaction/i.test(value)) return false;
  return true;
}

export function parseDecision(value: unknown, context: CoachContext): CoachDecision {
  const keys = ['schema_version', 'action', 'rationale', 'evidence_refs', 'reasoning_focus', 'claim_spans', 'experiment', 'question', 'lesson_refs', 'uncertainty'];
  const bad = () => { throw new CoachFailure('invalid_output'); };
  if (!exact(value, keys)) return bad();
  if (!enumValue(value.schema_version, [VERSION]) || !enumValue(value.action, ACTIONS) || !enumValue(value.uncertainty, UNCERTAINTY) ||
    !enumValue(value.reasoning_focus, context.phase === 'baseline' ? FOCUSES.filter(focus => focus !== 'intent_identity') : FOCUSES) ||
    !ids(value.evidence_refs, evidenceRefs(context), 4) || !ids(value.lesson_refs, [context.source.sourceDigest], 1) ||
    !safeProse(value.rationale, 160, context, value.action === 'abstain') || !Array.isArray(value.claim_spans) || value.claim_spans.length > 3) return bad();
  for (const span of value.claim_spans) if (!exact(span, ['start', 'end']) || !integer(span.start) || !integer(span.end) || span.end <= span.start || span.end > [...reasoningText(context)].length) return bad();
  let fixtureId: FixtureId | null = null, question = '';
  if (value.action === 'propose_experiment') {
    const e = value.experiment;
    if (value.question !== null || !exact(e, ['fixture_id', 'patch_id', 'target_probe_ids', 'reason_code']) ||
      !enumValue(e.fixture_id, context.allowedFixtures) || !enumValue(e.patch_id, [context.phase === 'repair' ? 'idempotent-intent.v1' : 'button-only.v1']) ||
      !ids(e.target_probe_ids, PROBES, 3) || e.target_probe_ids.length === 0 || !enumValue(e.reason_code, REASONS)) return bad();
    fixtureId = e.fixture_id as FixtureId;
  } else if (value.action === 'clarify' || value.action === 'ask_followup') {
    const q = value.question;
    if (value.experiment !== null || !exact(q, ['question_type', 'question_text', 'target_probe_ids']) ||
      !enumValue(q.question_type, [...QUESTIONS, ...(context.phase === 'repair' ? ['retry_identity'] : [])]) ||
      !safeProse(q.question_text, 240, context) || !ids(q.target_probe_ids, questionProbes(context), 3) ||
      (value.action === 'ask_followup' && (!context.evidence || value.evidence_refs.length === 0))) return bad();
    question = q.question_text;
  } else if (value.experiment !== null || value.question !== null || value.rationale !== '' || value.evidence_refs.length !== 0) return bad();
  if (context.evidence && value.action !== 'abstain' && value.evidence_refs.length === 0) return bad();
  return { action: value.action as CoachDecision['action'], fixtureId, question, rationale: value.rationale as string, evidenceRefs: value.evidence_refs };
}
