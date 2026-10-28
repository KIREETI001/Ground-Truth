import assert from 'node:assert/strict';
import test from 'node:test';
import type { CoachContext, RuntimeConfig } from '../lib/contracts.ts';

const config = { MODEL_API_KEY: 'test-only-provider-secret', MODEL_CALLS_ENABLED: 'true' } as RuntimeConfig;
const context = (): CoachContext => ({
  phase: 'baseline', sessionId: 'session-a', stateRevision: 2, caseId: 'case-a', fixtureId: 'lost-success.v1',
  prediction: { id: 'prediction-a', rowsAfterEachGroup: [0, 1], requestOutcomes: ['fault', 'created'], rationale: 'A failed response may mean the request did not finish.', confidence: 70, lockedAt: '2026-10-27T10:00:00.000Z' },
  explanation: null,
  source: { title: 'Campus signup', client: 'async function signup() { return sendSignup(); }', server: 'async function handler() { return createRegistration(); }', sourceDigest: 'source-a', stages: ['signup', 'retry'], groups: 2, requestCount: 2 },
  evidence: null, allowedFixtures: ['lost-success.v1', 'concurrent-retry.v1', 'fail-before-commit.v1'],
});

const observed = (): CoachContext => {
  const value = context();
  value.evidence = {
    schemaVersion: 'groundtruth-evidence.v1', runId: 'run-a', caseId: 'case-a', sessionId: 'session-a', phase: 'baseline', fixtureId: 'lost-success.v1', executionMode: 'live-fixture', sourceDigest: 'source-a', planDigest: 'plan-a', predictionId: 'prediction-a', finalizedAt: '2026-10-27T10:01:00.000Z', evidenceHash: 'evidence-a',
    receipts: [{ receiptId: 'receipt-a', runId: 'run-a', stepId: 'step-a', index: 0, intentId: 'intent-a', decision: 'created', registrationId: 'registration-a', handlerStatus: 201, deliveredStatus: 504, deliveryPolicy: 'discard-success', committedRowCountAfter: 1, committedAt: '2026-10-27T10:01:00.000Z' }],
    registrations: [{ registrationId: 'registration-a', eventId: 'event-a', attendeeRef: 'synthetic-a', registeredAt: '2026-10-27T10:01:00.000Z' }], probes: { committed_registration_count: 1, injected_loss_count: 1 },
  };
  return value;
};

const decision = () => ({
  schema_version: 'groundtruth.coach.v1', action: 'propose_experiment', rationale: 'Compare a delivered response with the state recorded by the experiment.', evidence_refs: [], reasoning_focus: 'commit_delivery_boundary', claim_spans: [],
  experiment: { fixture_id: 'lost-success.v1', patch_id: 'button-only.v1', target_probe_ids: ['committed_registration_count', 'injected_loss_count'], reason_code: 'compare_response_and_state' },
  question: null, lesson_refs: ['source-a'], uncertainty: 'none_stated',
});

const envelope = (value: unknown = decision(), changes: Record<string, unknown> = {}) => ({
  id: 'resp-a', object: 'response', created_at: 1793095260, model: 'muse-spark-1.3', status: 'completed', error: null, incomplete_details: null,
  output: [{ type: 'reasoning', id: 'reason-a', summary: [], status: 'completed' }, { type: 'message', id: 'message-a', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(value), annotations: [] }] }],
  usage: { input_tokens: 450, output_tokens: 80, total_tokens: 530, input_tokens_details: { cached_tokens: 100 }, output_tokens_details: { reasoning_tokens: 40 } }, ...changes,
});
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
interface CapturedBody extends Record<string, unknown> {
  text: { format: { strict: boolean; schema: { additionalProperties: boolean } } };
  input: { role: string }[];
}

async function load() { return import('../lib/ai/coach.ts'); }
function responseSequence(values: Response[]): typeof fetch {
  return (async () => { const next = values.shift(); assert.ok(next, 'unexpected provider HTTP attempt'); return next; }) as typeof fetch;
}

test('missing key and disabled calls return an explicitly authored unavailable question', async () => {
  const { createCoach } = await load();
  const coach = createCoach({ fetch: (async () => assert.fail('must not contact provider')) as typeof fetch });
  for (const settings of [{ MODEL_CALLS_ENABLED: 'true' }, { ...config, MODEL_CALLS_ENABLED: 'false' }]) {
    const result = await coach(context(), settings as RuntimeConfig);
    assert.equal(result.status, 'unavailable');
    assert.equal(result.mode, 'instructor-authored');
    assert.ok(result.code);
    assert.match(result.decision!.question, /prediction/);
    assert.equal(result.receipt.attemptCount, 0);
  }
});

test('every AI-free phase is forbidden even if the rest of the context is malformed', async () => {
  const { createCoach } = await load();
  const coach = createCoach({ fetch: (async () => assert.fail('phase gate must run first')) as typeof fetch });
  for (const phase of ['transfer', 'transfer_repair', 'complete']) {
    const result = await coach({ phase } as CoachContext, config);
    assert.equal(result.code, 'phase_forbidden');
    assert.equal(result.decision, null);
    assert.equal(result.mode, 'instructor-authored');
  }
});

test('host, model variant, and enabled flag cannot silently redirect Meta inference', async () => {
  const { createCoach } = await load();
  const coach = createCoach({ fetch: (async () => assert.fail('invalid configuration must not send secrets')) as typeof fetch });
  for (const changes of [
    { MODEL_BASE_URL: 'https://evil.test/v1' }, { MODEL_BASE_URL: 'http://api.meta.ai/v1' },
    { MODEL_BASE_URL: 'https://api.meta.ai/v1?relay=evil' }, { MODEL_BASE_URL: 'https://user:secret@api.meta.ai/v1' },
    { MODEL_ID: 'muse-spark-1.3-contributor' }, { MODEL_ID: 'muse-spark-1.2' }, { MODEL_CALLS_ENABLED: 'yes' },
  ]) assert.equal((await coach(context(), { ...config, ...changes })).code, 'invalid_configuration');
});

test('valid completed Meta output is mapped only after exact preflight and closed-schema validation', async () => {
  const { createCoach } = await load();
  const requests: { url: string; body: CapturedBody; init: RequestInit }[] = [];
  const coach = createCoach({ fetch: (async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)), init: init! });
    return String(url).endsWith('/input_tokens') ? json({ object: 'response.input_tokens', input_tokens: 600 }) : json(envelope());
  }) as typeof fetch });
  const result = await coach(context(), config);
  assert.equal(result.status, 'ready');
  assert.equal(result.mode, 'live-meta');
  assert.deepEqual(result.decision, { action: 'propose_experiment', fixtureId: 'lost-success.v1', question: '', rationale: 'Compare a delivered response with the state recorded by the experiment.', evidenceRefs: [] });
  assert.deepEqual(result.usage, { inputTokens: 450, outputTokens: 80 });
  assert.equal(result.receipt.attemptCount, 2);
  assert.equal(result.receipt.providerResponseId, 'resp-a');
  assert.equal(result.receipt.usage?.reasoningTokens, 40);
  assert.equal(result.receipt.usage?.cachedInputTokens, 100);
  assert.equal(result.receipt.unknownBilledUsage, false);
  assert.match(result.receipt.requestDigest!, /^[a-f0-9]{64}$/);
  assert.deepEqual(requests.map(r => r.url), ['https://api.meta.ai/v1/responses/input_tokens', 'https://api.meta.ai/v1/responses']);
  assert.deepEqual(requests[0].body, requests[1].body);
  const body = requests[1].body;
  assert.equal(body.model, 'muse-spark-1.3');
  assert.equal(body.store, false);
  assert.equal(body.background, false);
  assert.equal(body.stream, false);
  assert.equal(body.max_output_tokens, 4096);
  assert.deepEqual(body.reasoning, { effort: 'low' });
  assert.equal(body.text.format.strict, true);
  assert.equal(body.text.format.schema.additionalProperties, false);
  assert.equal(body.tools, undefined);
  assert.equal(body.tool_choice, undefined);
  assert.equal(body.previous_response_id, undefined);
  assert.equal(requests[1].init.redirect, 'error');
  assert.ok(Array.isArray(body.input));
  assert.equal(body.input[0].role, 'developer');
  assert.equal(body.input[1].role, 'user');
  assert.ok(!JSON.stringify(result).includes(config.MODEL_API_KEY!));
  assert.ok(!JSON.stringify(body).includes('session-a'));
});

test('the model can select each real approved fixture rather than a hardcoded proposal', async () => {
  const { createCoach } = await load();
  for (const fixture of ['lost-success.v1', 'concurrent-retry.v1', 'fail-before-commit.v1']) {
    const wire = decision(); wire.experiment.fixture_id = fixture;
    const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(envelope(wire))]) })(context(), config);
    assert.equal(result.status, 'ready');
    assert.equal(result.decision?.fixtureId, fixture);
  }
});

test('post-run questions may cite only current immutable evidence and source refs', async () => {
  const { createCoach } = await load();
  const wire = { ...decision(), action: 'ask_followup', evidence_refs: ['receipt-a', 'run-a'], experiment: null, question: { question_type: 'evidence_comparison', question_text: 'How does the delivered response compare with the committed state?', target_probe_ids: ['committed_registration_count'] } };
  const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(envelope(wire))]) })(observed(), config);
  assert.equal(result.status, 'ready');
  assert.equal(result.decision?.question, 'How does the delivered response compare with the committed state?');
  assert.deepEqual(result.decision?.evidenceRefs, ['receipt-a', 'run-a']);
});

test('unknown evidence, fixture, lesson, probe, and repair-only IDs fail closed', async () => {
  const { createCoach } = await load();
  const variants = [
    { ...decision(), evidence_refs: ['run-other-session'] },
    { ...decision(), lesson_refs: ['hidden-repair'] },
    { ...decision(), experiment: { ...decision().experiment, fixture_id: 'intent-lifecycle.v1' } },
    { ...decision(), experiment: { ...decision().experiment, target_probe_ids: ['arbitrary_sql'] } },
    { ...decision(), experiment: { ...decision().experiment, patch_id: 'idempotent-intent.v1' } },
  ];
  for (const value of variants) {
    const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(envelope(value))]) })(context(), config);
    assert.equal(result.code, 'invalid_output');
    assert.equal(result.mode, 'instructor-authored');
  }
});

test('extra fields, invalid action combinations, bad spans, empty prose, and overlength Unicode are rejected', async () => {
  const { createCoach } = await load();
  for (const value of [
    { ...decision(), observed_count: 2 }, { ...decision(), action: 'clarify' },
    { ...decision(), rationale: '🙂'.repeat(161) }, { ...decision(), rationale: '' },
    { ...decision(), claim_spans: [{ start: 0, end: 99999 }] },
    { ...decision(), action: 'ask_followup', experiment: null, question: { question_type: 'clarification', question_text: '🙂'.repeat(241), target_probe_ids: [] } },
  ]) {
    const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(envelope(value))]) })(context(), config);
    assert.equal(result.code, 'invalid_output');
  }
});

test('generated code, markup, URLs, known answers, and premature solution instructions never render', async () => {
  const { createCoach } = await load();
  for (const rationale of ['```sql INSERT INTO registrations VALUES (1);```', '<script>alert(1)</script>', 'Read https://example.test/answer', 'There will be 2 rows after the retry.', 'Use a stable idempotency key and return the cached response.', 'The committed count is one.']) {
    const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(envelope({ ...decision(), rationale }))]) })(context(), config);
    assert.equal(result.code, 'invalid_output');
    assert.ok(!JSON.stringify(result.decision).includes(rationale));
  }
});

test('refusals, incomplete responses, unknown tools, malformed JSON, missing usage, and mismatched models are unavailable', async () => {
  const { createCoach } = await load();
  const cases: [unknown, string][] = [
    [envelope(null, { output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'refusal', refusal: 'cannot help' }] }] }), 'refused'],
    [envelope(null, { status: 'incomplete' }), 'incomplete'],
    [envelope(null, { output: [{ type: 'function_call', name: 'execute_sql', arguments: '{}' }] }), 'invalid_output'],
    [envelope(null, { output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: '{bad' }] }] }), 'invalid_output'],
    [envelope(null, { usage: null }), 'invalid_output'],
    [envelope(null, { model: 'muse-spark-1.3-contributor' }), 'invalid_output'],
  ];
  for (const [body, code] of cases) {
    const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(body)]) })(context(), config);
    assert.equal(result.code, code);
    assert.equal(result.mode, 'instructor-authored');
    assert.equal(result.receipt.attemptCount, 2);
  }
});

test('input and exact token limits reject instead of silently truncating reasoning', async () => {
  const { createCoach } = await load();
  const oversized = context(); oversized.prediction.rationale = 'x'.repeat(4001);
  const local = await createCoach({ fetch: (async () => assert.fail('oversized input must not leave server')) as typeof fetch })(oversized, config);
  assert.equal(local.code, 'input_too_large');
  assert.equal(local.decision, null);
  const counted = await createCoach({ fetch: responseSequence([json({ object: 'response.input_tokens', input_tokens: 16001 })]) })(context(), config);
  assert.equal(counted.code, 'input_too_large');
  assert.equal(counted.receipt.attemptCount, 1);
});

test('seeded personal identifiers and secrets do not enter provider requests', async () => {
  const { createCoach } = await load();
  for (const text of ['Contact student@example.edu', 'MODEL_API_KEY=sk-abcdefghijklmnopqrstuvwx', 'student number 12345678', 'Authorization: Bearer abcdefghijklmnopqrst']) {
    const value = context(); value.prediction.rationale = text;
    const result = await createCoach({ fetch: (async () => assert.fail('sensitive input must stay local')) as typeof fetch })(value, config);
    assert.equal(result.code, 'sensitive_input');
    assert.equal(result.receipt.attemptCount, 0);
  }
});

test('stale, foreign, and unfinalized evidence are rejected before provider work', async () => {
  const { createCoach } = await load();
  for (const patch of [{ sessionId: 'session-other' }, { predictionId: 'old-prediction' }, { sourceDigest: 'old-source' }, { finalizedAt: '' }, { caseId: 'other-case' }]) {
    const value = observed(); Object.assign(value.evidence!, patch);
    const result = await createCoach({ fetch: (async () => assert.fail('unauthorized evidence must stay local')) as typeof fetch })(value, config);
    assert.equal(result.code, 'stale_context');
  }
});

test('phase or revision changes during inference discard a late successful answer', async () => {
  const { createCoach } = await load();
  for (const change of ['phase', 'revision']) {
    const value = context();
    const result = await createCoach({ fetch: (async (url) => {
      if (String(url).endsWith('/input_tokens')) return json({ input_tokens: 100 });
      if (change === 'phase') value.phase = 'transfer'; else value.stateRevision++;
      return json(envelope());
    }) as typeof fetch })(value, config);
    assert.equal(result.code, change === 'phase' ? 'phase_forbidden' : 'stale_context');
    assert.equal(result.decision, null);
  }
});

test('transient failures share one retry across preflight and generation and account every HTTP attempt', async () => {
  const { createCoach } = await load();
  let reserved = 0;
  const result = await createCoach({ fetch: responseSequence([json({ error: {} }, 503), json({ input_tokens: 100 }), json(envelope())]), sleep: async () => {} })(context(), { ...config, onProviderAttempt: () => { reserved++; } });
  assert.equal(result.status, 'ready');
  assert.equal(result.receipt.attemptCount, 3);
  assert.equal(reserved, result.receipt.attemptCount);
  assert.equal(result.receipt.unknownBilledUsage, false);
  const exhausted = await createCoach({ fetch: responseSequence([json({ error: {} }, 503), json({ input_tokens: 100 }), json({ error: {} }, 503)]), sleep: async () => {} })(context(), config);
  assert.equal(exhausted.code, 'upstream_unavailable');
  assert.equal(exhausted.receipt.attemptCount, 3);
});

test('long Retry-After preserves a manual fallback while a short delay permits only one retry', async () => {
  const { createCoach } = await load();
  const limited = await createCoach({ fetch: responseSequence([json({ error: {} }, 429, { 'retry-after': '60' })]), sleep: async () => assert.fail('long delay cannot fit') })(context(), config);
  assert.equal(limited.code, 'rate_limited');
  assert.equal(limited.receipt.retryAfterMs, 60000);
  assert.equal(limited.receipt.attemptCount, 1);
  const short = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json({ error: {} }, 429, { 'retry-after': '0' }), json(envelope())]), sleep: async () => {} })(context(), config);
  assert.equal(short.status, 'ready');
  assert.equal(short.receipt.attemptCount, 3);
  assert.equal(short.receipt.unknownBilledUsage, true);
});

test('provider auth, permission, and schema errors do not retry or expose upstream bodies', async () => {
  const { createCoach } = await load();
  for (const [status, code] of [[401, 'auth_failed'], [403, 'access_denied'], [400, 'invalid_configuration'], [404, 'invalid_configuration']] as const) {
    const result = await createCoach({ fetch: responseSequence([json({ error: { message: 'secret upstream diagnostics' } }, status)]) })(context(), config);
    assert.equal(result.code, code);
    assert.equal(result.receipt.attemptCount, 1);
    assert.ok(!JSON.stringify(result).includes('secret upstream diagnostics'));
  }
});

test('deadline rejects late results and never begins another provider attempt', async () => {
  const { createCoach } = await load();
  let time = 0;
  const result = await createCoach({ now: () => time, fetch: (async () => { time = 30001; return json({ input_tokens: 100 }); }) as typeof fetch })(context(), config);
  assert.equal(result.code, 'timeout');
  assert.equal(result.receipt.attemptCount, 1);
  time = 0;
  const aborted = await createCoach({ now: () => time, fetch: (async (url, init) => {
    if (String(url).endsWith('/input_tokens')) { time = 29999; return json({ input_tokens: 100 }); }
    return new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    });
  }) as typeof fetch })(context(), config);
  assert.equal(aborted.code, 'timeout');
  assert.equal(aborted.receipt.attemptCount, 2);
  assert.equal(aborted.receipt.unknownBilledUsage, true);
  assert.equal(aborted.mode, 'instructor-authored');
});

test('cancellation aborts in-flight provider work and budget reservation rejection makes no HTTP call', async () => {
  const { createCoach } = await load();
  const controller = new AbortController();
  const pending = createCoach({ fetch: (async (_url, init) => new Promise((_resolve, reject) => {
    init!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    controller.abort();
  })) as typeof fetch })(context(), config, controller.signal);
  const cancelled = await pending;
  assert.equal(cancelled.code, 'cancelled');
  assert.equal(cancelled.receipt.attemptCount, 1);
  const blocked = await createCoach({ fetch: (async () => assert.fail('reservation denied')) as typeof fetch })(context(), { ...config, onProviderAttempt: () => { throw new Error('no budget'); } });
  assert.equal(blocked.code, 'budget_exhausted');
  assert.equal(blocked.receipt.attemptCount, 0);
});

test('unapproved reasoning extensions are stripped from the provider payload', async () => {
  const { createCoach } = await load();
  const value = context();
  Object.assign(value.prediction, { internal_note: 'unapproved-field-must-stay-local' });
  const result = await createCoach({ fetch: (async (url, init) => {
    assert.ok(!String(init?.body).includes('unapproved-field-must-stay-local'));
    return String(url).endsWith('/input_tokens') ? json({ input_tokens: 100 }) : json(envelope());
  }) as typeof fetch })(value, config);
  assert.equal(result.status, 'ready');
});

test('spelled-out observed counts with adjectives or different verbs fail closed', async () => {
  const { createCoach } = await load();
  for (const rationale of ['Two duplicate registrations were committed.', 'The registration count reaches two.']) {
    const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(envelope({ ...decision(), rationale }))]) })(context(), config);
    assert.equal(result.code, 'invalid_output');
  }
});

test('all model enum fields reject arrays, null, and objects without coercion', async () => {
  const { createCoach } = await load();
  const clarify = { ...decision(), action: 'clarify', experiment: null, question: { question_type: 'clarification', question_text: 'Which outcome does your prediction describe?', target_probe_ids: ['committed_registration_count'] } };
  const followup = { ...clarify, action: 'ask_followup', evidence_refs: ['receipt-a'] };
  const abstain = { ...decision(), action: 'abstain', rationale: '', experiment: null, question: null };
  const cases = [
    { path: ['schema_version'], good: 'groundtruth.coach.v1', base: decision() },
    { path: ['action'], good: 'abstain', base: abstain },
    { path: ['uncertainty'], good: 'none_stated', base: decision() },
    { path: ['reasoning_focus'], good: 'commit_delivery_boundary', base: decision() },
    { path: ['experiment', 'fixture_id'], good: 'lost-success.v1', base: decision() },
    { path: ['experiment', 'patch_id'], good: 'button-only.v1', base: decision() },
    { path: ['experiment', 'reason_code'], good: 'compare_response_and_state', base: decision() },
    { path: ['experiment', 'target_probe_ids', '0'], good: 'committed_registration_count', base: decision() },
    { path: ['question', 'question_type'], good: 'clarification', base: clarify },
    { path: ['question', 'target_probe_ids', '0'], good: 'committed_registration_count', base: clarify },
    { path: ['lesson_refs', '0'], good: 'source-a', base: decision() },
    { path: ['evidence_refs', '0'], good: 'receipt-a', base: followup, observed: true },
  ];
  for (const item of cases) {
    for (const malformed of [[item.good], null, { value: item.good }, { toString: item.good }]) {
      const wire = structuredClone(item.base) as unknown as Record<string, unknown>;
      let parent = wire;
      for (const key of item.path.slice(0, -1)) parent = parent[key] as Record<string, unknown>;
      parent[item.path.at(-1)!] = malformed;
      const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(envelope(wire))]) })(item.observed ? observed() : context(), config);
      assert.equal(result.code, 'invalid_output', `${item.path.join('.')} must reject ${JSON.stringify(malformed)}`);
      assert.equal(result.mode, 'instructor-authored');
    }
  }
});

test('a coerced reasoning focus cannot bypass the baseline identity restriction', async () => {
  const { createCoach } = await load();
  const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(envelope({ ...decision(), reasoning_focus: ['intent_identity'] }))]) })(context(), config);
  assert.equal(result.code, 'invalid_output');
  assert.equal(result.mode, 'instructor-authored');
});

test('context enum fields reject malformed values before any provider attempt', async () => {
  const { createCoach } = await load();
  const cases = [
    { path: ['phase'], good: 'baseline' },
    { path: ['fixtureId'], good: 'lost-success.v1' },
    { path: ['prediction', 'requestOutcomes', '0'], good: 'fault' },
    { path: ['evidence', 'schemaVersion'], good: 'groundtruth-evidence.v1' },
    { path: ['evidence', 'executionMode'], good: 'live-fixture' },
    { path: ['evidence', 'phase'], good: 'baseline' },
    { path: ['evidence', 'fixtureId'], good: 'lost-success.v1' },
    { path: ['evidence', 'receipts', '0', 'decision'], good: 'created' },
    { path: ['evidence', 'receipts', '0', 'deliveryPolicy'], good: 'discard-success' },
    { path: ['allowedFixtures', '0'], good: 'lost-success.v1' },
  ];
  for (const item of cases) {
    for (const malformed of [[item.good], null, { value: item.good }, { toString: item.good }]) {
      const value = observed();
      let parent = value as unknown as Record<string, unknown>;
      for (const key of item.path.slice(0, -1)) parent = parent[key] as Record<string, unknown>;
      parent[item.path.at(-1)!] = malformed;
      const result = await createCoach({ fetch: (async () => assert.fail('malformed context must not leave the server')) as typeof fetch })(value, config);
      assert.ok(['invalid_context', 'stale_context'].includes(result.code!), `${item.path.join('.')} must reject ${JSON.stringify(malformed)} locally; got ${result.code}`);
      assert.equal(result.receipt.attemptCount, 0);
      assert.equal(result.decision, null);
    }
  }
});

test('all nested decision objects remain closed to extra fields', async () => {
  const { createCoach } = await load();
  const variants = [
    { ...decision(), experiment: { ...decision().experiment, observed_count: 1 } },
    { ...decision(), action: 'clarify', experiment: null, question: { question_type: 'clarification', question_text: 'Which outcome does your prediction describe?', target_probe_ids: [], solution: 'hidden' } },
    { ...decision(), claim_spans: [{ start: 0, end: 1, answer: 'hidden' }] },
  ];
  for (const wire of variants) {
    const result = await createCoach({ fetch: responseSequence([json({ input_tokens: 100 }), json(envelope(wire))]) })(context(), config);
    assert.equal(result.code, 'invalid_output');
  }
});
