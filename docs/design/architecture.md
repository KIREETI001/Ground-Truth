# GroundTruth execution and backend architecture

Design for approval only. This file defines the proposed MVP; it does not report a built, deployed, or tested product. It incorporates the supplied GroundTruth proposal and hackathon guide, with the narrower campus event signup experiment agreed during design.

## Decision

Build one full-stack TypeScript application using the Sites Vinext starter, React, Cloudflare Workers, and one D1 database. Use the starter's Drizzle migration workflow but parameterized D1 statements for the small execution transaction. Keep the supplied `sites()` build integration. No Redis, queues, containers, separate execution service, R2, vector database, arbitrary repository imports, or arbitrary code execution are needed for this MVP.

The browser runs a small, fixed HTTP harness. Every experiment step sends an actual same-origin `fetch` to an authenticated lab route. The route executes a compiled, instructor-reviewed signup handler and writes real registration rows to D1. An explicit fault adapter discards the first successful handler response after the transaction commits and delivers a synthetic HTTP 504. This avoids relying on unsupported Worker-to-itself fetch, service bindings, browser cancellation timing, or a real network outage.

Student repairs select and apply reviewed variants of the supplied application. The displayed source and executed variant share a version and source digest. An editable code viewer must not imply that arbitrary submitted TypeScript is compiled or executed. Product copy: **“Apply a reviewed patch to this supplied application.”**

The conceptual prediction is authored before a run and kept separate from observed database state. Counts, replay decisions, conflicts, and evidence come from the executor and D1, never from an AI completion or browser-submitted result.

## Learning contract and exact fixtures

Canonical lab ID: `campus-signup.v1`.

Synthetic business payload: one attendee reference and one event reference. No real names, emails, seat inventory, payments, campus integration, or production reservations. Deliberately omit a separate `UNIQUE(attendee,event)` constraint: adding it would conceal the naive duplicate-creation bug being taught. The run namespace is the isolation boundary.

| Phase | Fixture | Client variant | Server variant | Real HTTP requests and observed result |
| --- | --- | --- | --- | --- |
| `baseline` | `lost-success.v1` | `disabled-button.v1` | `naive-signup.v1` | A commits; its handler 201 is discarded and HTTP 504 is delivered. Button re-enables after the failed response. Retry A is another request and another commit. **2 rows, 1 duplicate.** |
| `repair` | `lost-success.v1` | `stable-intent-key.v1` | `idempotent-signup.v1` | A/key A commits; success is discarded and HTTP 504 delivered. Retry A/key A replays the stored response. **1 row, 1 replay, 0 duplicates.** |
| `transfer` | `intent-lifecycle.v1` | `browser-session-key.v1` | `idempotent-signup.v1` | Fresh run: A/key A creates, retry A/key A replays, then different event B incorrectly reuses key A. **HTTP 201, 201, 409; 1 row.** No injected response loss. |
| `transfer_repair` | `intent-lifecycle.v1` | `stable-intent-key.v1` | `idempotent-signup.v1` | Fresh run after the independent explanation is locked: A/key A creates, retry A/key A replays, different event B/key B creates. **HTTP 201, 201, 201; 2 rows.** |

Two additional real, allowlisted probes are available in baseline and repair. These support meaningful model-guided test selection rather than merely changing a text label:

| Probe | Compiled harness recipe | Naive handler result | Repaired handler result |
| --- | --- | --- | --- |
| `concurrent-retry.v1` | Two actual fetches in one parallel group, same intent/payload/key, no injected fault | 2 committed rows | 1 committed row; one creates, one replays |
| `fail-before-commit.v1` | First request fault adapter returns explicitly injected HTTP 503 before invoking handler; second request retries the same intent | First stage 0 rows; final 1 row | First stage 0 rows; final 1 row |

The concurrent probe represents two independent in-flight requests for one intent, such as a second client or transport retry. It does not claim that two clicks passed through one disabled button. The supplied harness openly drives that HTTP condition.

`lost-success.v1` remains required for the core before/after demonstration. These three main probes are the complete runnable coach allowlist; free-text suggested cases outside it remain discussion ideas. The coach can select among them and generate a short, teacher-grounded follow-up only after a prediction is locked. The student records whether they accepted/changed/rejected the suggestion. Accepting a different probe opens a separate case and requires a prediction specific to that case before it can run. It never reuses an unrelated prediction or rewrites earlier evidence.

Main guided patch ID: `idempotent-intent.v1`; it installs `stable-intent-key.v1` plus `idempotent-signup.v1`. Transfer client patch ID: `new-intent-new-key.v1`; it changes the client key scope while retaining the already-idempotent server. `button-only.v1` identifies the baseline implementation, not a successful repair.

An intent is a semantic signup action. Retrying an unresolved signup keeps its token; starting a signup for a different event creates a new intent and token. Tokens are not regenerated per fetch and are not shared for an entire browser session. Instructor fixtures give each run fresh event IDs, intent IDs and tokens; the vetted client implementation reads the active intent mapping from the run plan, so refresh can resume without silently changing a token.

Server guards enforce the sequence: baseline prediction and rationale → baseline run → baseline explanation → main patch selection and repair prediction → repair run and explanation → **fresh, AI-free transfer prediction and rationale** → transfer execution → **independent transfer explanation lock** → transfer key-scope patch → fresh verification run. Transfer patch diagnosis and the corrected variant are withheld by the server until the explanation is locked. Hiding a button in the browser is insufficient. AI endpoints refuse transfer and transfer-repair sessions.

The transfer run can expose actual receipts after execution; the student must be able to inspect the observed 409. It must not expose a model-written explanation or gold answer before the student's explanation is frozen. Before execution, the client displays the request sequence and supplied code, without anticipated outcomes.

## Execution and fault semantics

1. Authenticate and authorize the caller against membership, session owner, phase and run state.
2. Load the immutable run plan. Accept only a declared step whose prerequisites have completed, with its exact supplied payload and key policy. Never accept an arbitrary URL, source file, SQL, shell command, timeout program or fixture definition from the browser.
3. Execute the selected compiled handler unless this is the declared fail-before-commit step. Registration mutation (when any), immutable step receipt, and advancement of the run's completed-step count commit atomically in one D1 `batch()` transaction. For the parallel fixture, both steps have no prerequisites and race at the actual database constraint.
4. For the designated first step of `lost-success.v1`, construct the real handler response from the committed row, then deliberately discard that response. Return HTTP 504 with `{ "error": { "code": "INJECTED_RESPONSE_LOSS" } }`. The client does not receive a registration ID in this response.
5. The harness sends the next actual HTTP request. A logical retry has a different experiment step ID but, after repair, the same business idempotency key.
6. Finalization closes the run to writes, reads its committed rows and receipts, and creates the immutable evidence snapshot. The browser renders this snapshot.

The 504 is a controlled, immediate fault, not a TCP failure or a measured timeout. UI and evidence must say **“Simulated loss of a successful response after commit; fault adapter delivered HTTP 504.”** The receipt records `handlerStatus:201`, `deliveredStatus:504`, and `deliveryPolicy:"discard-success"`. It does not claim to know whether a real remote browser received bytes. Actual unplanned infrastructure failures are recorded separately and never counted as the injected fault.

The fail-before-commit probe is separately typed: `handlerStatus:null`, `deliveredStatus:503`, `decision:"not_executed"`, `deliveryPolicy:"fail-before-handler"`, error code `INJECTED_PRECOMMIT_FAILURE`. It inserts a receipt but **no registration**; that receipt permits the next retry stage. An unplanned real 503 has no completed injected-fault receipt and must not masquerade as this result.

The button lock is real UI state during the first in-flight request. It cannot prevent a later retry after the failed response. The harness demonstrates that sequence using real requests, not a decorative animation or precomputed table.

## Type and API contracts

The following are design contracts, not implementation files. JSON timestamps use ISO 8601 UTC. IDs are opaque UUIDs; browser-provided IDs never establish ownership. Server routes validate lengths, enum membership and unknown fields.

```ts
type Phase = "baseline" | "repair" | "transfer" | "transfer_repair";
type FixtureId = "lost-success.v1" | "concurrent-retry.v1"
  | "fail-before-commit.v1" | "intent-lifecycle.v1";
type RunStatus = "running" | "finalizing" | "complete" | "infra_error" | "abandoned";
type Decision = "created" | "replayed" | "payload_conflict" | "not_executed";
type AIMode = "live-meta" | "approved-fixture" | "unavailable";

interface SignupPayload {
  eventId: string;         // supplied synthetic event, <= 80 chars
  attendeeRef: string;     // supplied synthetic attendee, <= 80 chars
}
interface PlannedStep {
  stepId: string;
  index: 0 | 1 | 2;
  group: 0 | 1 | 2;        // same group executes with Promise.all; groups run in order
  requiresStepIds: string[];
  intentId: string;        // correlation for evidence, not a uniqueness constraint
  action: "signup" | "retry" | "new-signup";
  payload: SignupPayload;
  idempotencyKey: string | null;
  // No expected count, replay decision, or expected HTTP outcome in this response.
}
interface RunPlan {
  runId: string;
  caseId: string;
  phase: Phase;
  fixtureId: FixtureId;
  sourceDigest: string;
  steps: PlannedStep[];
  expiresAt: string;
}
interface FrozenPrediction {
  predictionId: string;
  caseId: string;
  phase: Phase;
  fixtureId: FixtureId;
  rowsAfterEachGroup: number[]; // one entry per visible action stage, each 0..3
  requestOutcomes: {
    stepIndex: 0 | 1 | 2;
    outcome: "created" | "replayed" | "created_or_replayed" | "payload_conflict"
      | "failed_before_commit" | "failed_after_commit" | "uncertain";
    httpStatus: number | null; // 100..599; null explicitly means uncertain
  }[]; // exactly one prediction for each request; concurrent winner can be uncertain
  rationale: string;           // 20..2000 chars; this is the student's explanation of prediction
  confidence: 1 | 2 | 3 | 4 | 5;
  lockedAt: string;
}
interface SignupSuccess {
  registrationId: string;
  eventId: string;
  attendeeRef: string;
  registeredAt: string;
}
interface StepReceipt {
  receiptId: string;
  runId: string;
  stepId: string;
  index: number;
  intentId: string;
  requestPayloadHash: string;
  idempotencyKeyFingerprint: string | null;
  decision: Decision;
  registrationId: string | null;
  handlerStatus: 201 | 409 | null;
  deliveredStatus: 201 | 409 | 503 | 504;
  deliveryPolicy: "normal" | "discard-success" | "fail-before-handler";
  committedRowCountAfter: number;
  committedAt: string;
}
interface RunEvidence {
  schemaVersion: "groundtruth-evidence.v1";
  runId: string;
  caseId: string;
  sessionId: string;
  phase: Phase;
  fixtureId: FixtureId;
  executionMode: "live-fixture";
  sourceDigest: string;
  deploymentCommit: string;
  planDigest: string;
  predictionId: string;
  receipts: StepReceipt[];
  registrations: SignupSuccess[];
  probes: {
    committed_registration_count: number;
    distinct_intent_count: number;
    duplicate_registration_count: number;
    request_count: number;
    created_count: number;
    replayed_count: number;
    conflict_count: number;
    injected_loss_count: number;
    injected_precommit_failure_count: number;
    same_intent_reuses_token: boolean | null; // null in baseline
    new_intent_rotates_token: boolean | null; // null when there is no new intent
  };
  finalizedAt: string;
  evidenceHash: string;
}
interface APIError {
  error: {
    code: string;
    message?: string;
    requestId?: string;
    retryable?: boolean;
  };
}
```

All listed endpoints require native ChatGPT identity except the public landing page and the sign-in handoff. Participant learning endpoints additionally require enrolled pilot membership and practice notice acknowledgment. Explicit staff authorization permits only their own staged activity and read-only participant proof review. Admin endpoints require the separate instructor allowlist. Protected responses use `Cache-Control: private, no-store`; no CDN, framework static caching, or cross-user prefetch for evidence.

| Method and path | Request | Response and server rule |
| --- | --- | --- |
| `GET /api/me` | None | `{userId,enrolled,instructor,pilotOpen,aiMode,practiceNoticeVersion,noticeAcknowledged,researchOptIn,accessExpiresAt,dataExpiresAt}`. Opaque Site user ID only, no stored email/name. Does not reveal enrollment code or allowlists. |
| `POST /api/pilot/enroll` | `{code:string}` | 201 membership, 200 existing membership, 403 invalid/expired code, 409 pilot full, 429 limited. Identity is read from Sites, never the body. |
| `POST /api/notices/practice` | `{version:string,acknowledged:true}` | 200 saved acknowledgment of the current notice about saved activity, named tutor review, retention and Meta disclosure. Required before starting an activity; not research consent. |
| `PATCH /api/me/research-consent` | `{optIn:boolean}` | 200 own optional research choice. Defaults false, may be withdrawn, never gates practice. No raw text enters a research export. |
| `DELETE /api/activity` | No user ID in body | 200 deletion counts after synchronous deletion of all own activity, derivatives and membership. Native sign-in remains platform-owned. In-flight requests cannot recreate deleted rows. |
| `POST /api/sessions` | `{requestId:string}` | 201 `{sessionId,labId,phase}`. Repeating request ID for same owner returns the same session. |
| `GET /api/sessions/:sessionId` | None | Owner's current phase, frozen submissions, available reviewed source, own completed evidence summaries, active run. Does not release future patch or answer material. |
| `POST /api/sessions/:sessionId/cases` | `{phase,fixtureId,selectionSource:"student"\|"coach",suggestionId?:string,selectionReason:string,requestId}` | 201 `{caseId,fixtureId,phase,stages}`. Main phases allow the three compiled probes; transfer fixture is server-selected. Validate any suggestion belongs to this member/session and allowlist. The required lost-success case is created automatically when each main phase opens. |
| `POST /api/sessions/:sessionId/predictions` | `{caseId,rowsAfterEachGroup,requestOutcomes,rationale,confidence,requestId}` | 201 immutable `FrozenPrediction`; counts and expected status/outcome for each request, only a case in the server-authorized phase. Existing matching request returns the original result; different overwrite attempt is 409. |
| `POST /api/sessions/:sessionId/patches` | `{patchId,reason:string,requestId}` | 201 frozen patch selection. Main patch requires baseline explanation; transfer patch requires locked independent transfer explanation. No source string accepted. |
| `POST /api/sessions/:sessionId/runs` | `{caseId,predictionId,requestId}` | 201 `RunPlan`. Server resolves fixture and variants from the approved case and phase; client cannot supply variant names or a plan. One active run per session. |
| `POST /api/lab/runs/:runId/registrations` | Headers `X-GT-Step-Id`, optional `Idempotency-Key`; body `SignupPayload` | Actual signup handler response: 201 `SignupSuccess`, 409 `IDEMPOTENCY_PAYLOAD_CONFLICT`, designated injected 504, or designated precommit 503. Step ID binds intent through stored plan. `X-GT-Receipt-Id` identifies the server receipt. |
| `GET /api/runs/:runId` | None | Own run status, completed receipt indices, permitted remaining steps. Allows resume/reconciliation after connection loss without re-executing completed steps. |
| `POST /api/runs/:runId/finalize` | `{requestId}` | 200 `RunEvidence` after all planned requests; 409 incomplete; idempotent across retries. |
| `GET /api/runs/:runId/evidence` | None | 200 own finalized `RunEvidence`; 409 while incomplete. Server rechecks owner on every call. |
| `POST /api/sessions/:sessionId/explanations` | `{caseId,runId,body:{claim,evidence,reasoning},requestId}` | 201 locked student explanation, 20..4000 chars total. Server verifies run belongs to this case/phase/session and is complete. Required-case explanation gates progression. |
| `GET /api/sessions/:sessionId/proof.json` | None | Authenticated download assembling locked submissions, selections and immutable evidence. Redact native user ID, raw tokens and secrets. |
| `GET /api/admin/pilot` | None | Instructor-only participant pseudonyms and submitted evidence. No marks are awarded automatically. |
| `GET /api/admin/sessions/:sessionId/proof.json` | None | Instructor-only pilot-scoped proof download. A student or enrollment code never grants this role. |
| `POST /api/coach` | Bounded approved action/lesson/evidence references | Defined by AI contract. Returns structured advice only, never an executor verdict. 403 during transfer and transfer repair; provider failure leaves completed execution intact. |

Mutations reject missing/mismatched same-origin `Origin`, inappropriate `Sec-Fetch-Site`, non-JSON media type and oversized bodies. Do not enable wildcard CORS. Use same-origin browser credentials for Sites authentication. If the platform requires another CSRF mechanism, use the supported starter mechanism; this is an integration check, not a reason to invent OAuth or custom auth cookies.

Use HTTP 401 for missing native identity; 403 for unenrolled or wrong phase permissions; 404 for unknown or not-owned object IDs; 409 for state conflict and the separately typed idempotency payload conflict; 422 for plan/payload mismatch; 429 with `Retry-After` for a limit; 503 `INFRASTRUCTURE_UNAVAILABLE` for real infrastructure failure. A real 503 does not complete a planned test step. The separately named injected precommit 503 does complete its declared step with no business effect.

## Data model

One D1 database contains these tables. All foreign keys are enforced. UUIDs and timestamps are generated server-side. JSON columns contain bounded, schema-validated JSON serialized canonically for hashing. The definitions below are logical migration requirements, not a runnable migration.

| Table | Required columns | Keys and constraints |
| --- | --- | --- |
| `pilot_memberships` | `pilot_id`, `user_id`, `enrolled_at`, `access_expires_at`, `practice_notice_version`, `notice_acknowledged_at`, `research_opt_in`, `research_choice_at` | PK `(pilot_id,user_id)`. No user-supplied role column. Research flag defaults false and is not an access condition. |
| `learning_sessions` | `id`, `pilot_id`, `owner_user_id`, `lab_id`, `phase`, `state`, `created_at`, `expires_at`, `create_request_id`, `participant_alias` | PK `id`; unique `(owner_user_id,create_request_id)`; index `(pilot_id,owner_user_id,created_at)`. Membership checked when accessed. |
| `cases` | `id`, `session_id`, `phase`, `fixture_id`, `required`, `selection_source`, `suggestion_id`, `selection_reason`, `created_at`, `request_id` | PK `id`; FK session; unique `(session_id,phase,fixture_id)` and `(session_id,request_id)`; instructor-defined configuration immutable. Max three cases in each main phase, one in each transfer phase. |
| `predictions` | `id`, `session_id`, `case_id`, `rows_json`, `request_outcomes_json`, `rationale`, `confidence`, `locked_at`, `request_id` | PK `id`; FKs session/case; unique `case_id` and `(session_id,request_id)`; immutable after insert. |
| `explanations` | `id`, `session_id`, `case_id`, `run_id`, `body_json`, `locked_at`, `request_id` | PK `id`; FKs session/case/run; unique `case_id` and `(session_id,request_id)`; immutable. |
| `patch_selections` | `id`, `session_id`, `stage`, `patch_id`, `reason`, `selected_at`, `request_id` | PK `id`; FK session; unique `(session_id,stage)` and `(session_id,request_id)`; immutable. |
| `runs` | `id`, `session_id`, `case_id`, `phase`, `fixture_id`, `client_variant`, `server_variant`, `source_digest`, `plan_json`, `plan_digest`, `prediction_id`, `patch_selection_id`, `status`, `completed_step_count`, `expected_step_count`, `started_at`, `closed_at`, `finalized_at`, `expires_at`, `create_request_id` | PK `id`; FKs session/case/prediction/optional patch; unique `(case_id,create_request_id)`; partial unique active-run index on `session_id` for running/finalizing; immutable config columns, guarded state/count updates only. |
| `registrations` | `id`, `run_id`, `intent_id`, `event_id`, `attendee_ref`, `idempotency_key`, `payload_sha256`, `response_status`, `response_json`, `registered_at` | PK `id`; FK run; **unique `(run_id,idempotency_key)`**; index `(run_id,intent_id)`. Key nullable only for naive variant. Response status 201; stored body is immutable. |
| `request_receipts` | `id`, `run_id`, `step_id`, `step_index`, `intent_id`, `request_payload_sha256`, `key_fingerprint`, `decision`, `registration_id`, `handler_status`, `delivered_status`, `delivery_policy`, `row_count_after`, `committed_at`, `delivered_body_json` | PK `id`; FK run/optional registration; unique `(run_id,step_id)` and `(run_id,step_index)`; immutable. Stored delivered body supports exact control-plane replay. |
| `run_evidence` | `run_id`, `evidence_json`, `evidence_sha256`, `finalized_at` | PK/FK `run_id`; insert once; no update route; deleted only with own activity/retention cleanup. |
| `rate_limit_buckets` | `scope_key`, `window_start`, `count`, `expires_at` | PK `(scope_key,window_start)`; atomic increments; expiry index. Never store a raw IP. |
| `coach_events` | `id`, `session_id`, `run_id`, `action`, `provider`, `model`, `mode`, `lesson_version`, `input_digest`, `response_json`, `created_at`, `usage_json` | PK `id`; FKs; bounded append-only events. Separate from execution receipts and evidence. Record mode honestly. |

The instructor allowlist, enrollment code, membership cap and optional Meta provider key are runtime secrets/configuration, not fields the browser can set. Initial `PILOT_MAX_MEMBERS=5`; enrollment defaults disabled. The fixed pilot ID is server configuration; avoid adding a course management system. Practice notice acknowledgment is required; optional research consent defaults false and never gates practice, coaching, transfer or proof access.

### Atomic enrollment

Native Sites identity is the prerequisite. Enrollment code is a membership gate, not authentication and not a custom session. Check enrollment is enabled, compare digests computed server-side from supplied code and the configured enrollment code in constant time, check attempt limit, then use one conditional insert:

```sql
INSERT INTO pilot_memberships(pilot_id, user_id, enrolled_at, access_expires_at)
SELECT ?, ?, ?, ?
WHERE (SELECT COUNT(*) FROM pilot_memberships WHERE pilot_id = ?) < ?
ON CONFLICT(pilot_id,user_id) DO NOTHING;
```

Read the membership afterward. Existing members succeed even when full; a new identity with no inserted membership receives `PILOT_FULL`. The count and insert are in one SQL statement, so concurrent enrollment cannot exceed five. Instructor access comes exclusively from the server allowlist and does not consume a participant seat. Never accept `userId`, `role`, `isInstructor` or a membership count in the request body. Do not send email invites; the moderator shares the code orally.

Compute membership access expiry as 30 days after enrollment. Research opt-in defaults false; acknowledgment and research choice are separate fields. Guard session creation with membership/notice checks inside its database write as well as request authorization, so an in-flight request cannot recreate activity after membership deletion.

### Atomic idempotency without a dual-write race

The registration row itself is the idempotency record because this fixture's only side effect is inserting that row. Generate the candidate row ID and exact success body before the write. On the repaired handler, attempt an insert with `ON CONFLICT(run_id,idempotency_key) DO NOTHING`, then select the winning row by that same namespace and key. Compare its server-canonicalized payload hash before returning anything:

- New row: `created`, HTTP 201 and stored response.
- Existing row with same canonical payload: `replayed`, the **same HTTP 201 status and exact stored success body**, with `Idempotency-Replayed: true`.
- Existing row with a different payload: `payload_conflict`, HTTP 409, no new row and no unrelated registration details.

Canonical payload hashes cover the validated event and attendee fields in a fixed field order. Ignore JSON whitespace/property order. Intent correlation IDs and transport step IDs are not business payload fields. Reject missing/invalid keys for the repaired handler. Keys are bounded UUID-shaped strings. Never perform “SELECT absent, then INSERT” without a database uniqueness constraint.

Within the D1 batch, select the winning row and insert the immutable receipt using SQL, not a JavaScript read followed by an independent write. The batch must include the registration effect, receipt and guarded completed-step count increment. A duplicate step receipt uniqueness failure rolls back every effect in that attempted batch. Handle only a verified known-step collision as a replay; unknown SQL errors become infrastructure failures. SQL predicates must enforce that the run is still open and all declared prerequisite receipts exist, even if authorization was read before a concurrent request. For a precommit fault, omit the business insert but transact the receipt and count together.

Two distinct requests with the same key race at the unique database constraint. Exactly one can create the registration; equal payloads replay the winner, unequal payloads conflict. Do not use an in-memory JavaScript mutex or a per-isolate map. The lost-success case is sequential so its first commit definitely precedes its retry. The concurrent-retry case has two independent step IDs with no prerequisite between them and sends both real HTTP requests in one `Promise.all` group. Its results must remain correct regardless of which request wins. Do not relabel sequential fetches as a concurrency test.

For the parallel fixture, a prediction is the row count after the **whole parallel group**, not an assumed completion order of individual requests. Receipts include each committed transaction's row count and timestamp, but step index is a plan label, not proof of temporal ordering. The display can order actual commits or label overlapping requests without inventing which network response arrived first.

Naive mode sets `idempotency_key=NULL`, so SQLite's uniqueness semantics allow both supplied calls to insert independent rows. The experiment's intent correlation field is deliberately not another hidden deduplication constraint.

### Control-plane retries are separate from the taught behavior

The exact same experiment `stepId` can be re-sent after an actual connection failure. If its receipt exists, return that receipt's stored delivered status/body without executing the business handler again. Two concurrent copies of one step cannot create two effects because receipt uniqueness and side effect share the transaction.

The intentional business retry is **a different declared step ID**, so it reaches the naive or repaired handler. This distinction prevents a double-click on “Run” or an infrastructure retry from corrupting the experiment without accidentally fixing the baseline bug.

Never blindly rerun a write after a D1 exception. Reconcile by step receipt first. A committed batch has both the side effect and receipt; a rolled-back batch has neither. If the outcome cannot be reconciled, stop the run as infrastructure error rather than inventing the expected result.

## Isolation, finalization and evidence

Each case has its own frozen prediction; each run has its own namespace and empty initial registration state. Different probes, baseline, repair, transfer and transfer repair retain separate rows and evidence; “rerun” creates a new namespace rather than deleting earlier data. A session cannot point at another owner's prediction or another run's registration. Every read/write query authorizes through `runs → learning_sessions.owner_user_id` and pilot membership, or an explicitly authorized instructor path. Guess-resistant IDs are not access control.

The run plan, handler variants, source digest and prediction are frozen before request one. Only signed-in owners can drive their own declared steps. Client-supplied counts, timestamps, decisions, patch source or evidence objects are rejected. Run plan values are not exposed to the model as executable instructions.

Finalization first conditionally changes a fully executed run from `running` to `finalizing` only when the receipt count equals the complete planned step count, and freezes its `closed_at`. No signup writes are accepted afterward. Read the stable run rows and receipts from the primary D1 binding, compute the snapshot and digest, then atomically insert `run_evidence` and set `complete`. A crash in `finalizing` is resumable because the data is already closed and `run_evidence.run_id` is unique. Snapshot content uses the saved close time so repeated finalizers produce identical bytes. Do not enable read replicas for the MVP; if introduced later, preserve explicit read-after-write consistency with supported D1 sessions/bookmarks.

Required evidence probes:

- `committed_registration_count`: actual rows scoped to run ID.
- `distinct_intent_count`: distinct declared intents that created registrations.
- `duplicate_registration_count`: sum of `max(count_for_intent - 1, 0)` over committed registration rows.
- `request_count`, `created_count`, `replayed_count`, `conflict_count`, `injected_loss_count`, `injected_precommit_failure_count`: derived from immutable receipts.
- `same_intent_reuses_token` and `new_intent_rotates_token`: comparison of executed plan-bound request keys, with null where inapplicable.

Hash the canonical evidence content excluding `evidenceHash`. Include source, plan and evidence digests for reproducibility and accidental-change detection. These hashes are not signatures or a tamper-proof attestation. The MVP has no signing secret, signing-key lifecycle, public verification endpoint or share token.

Use schema/migration triggers to reject updates to predictions, locked explanations, selections, registration contents, receipts and finalized evidence. The precise promise is **immutable while retained, with server provenance**; own-activity deletion and retention cleanup remove whole retained records rather than editing outcomes. This is not independent cryptographic proof against the hosting operator, database administrator or a malicious deployment. Include the deployed commit and reviewed source digest to support inspection and reproducibility. An AI explanation is never an execution verdict.

The participant sees only their own proof. The instructor sees pilot-scoped submitted proofs. Proof downloads omit native identity, raw idempotency keys, membership code and API secrets. Raw keys may be visible in the participant's supplied lab plan because they are synthetic test inputs, not authorization tokens.

## Hosting authentication and deployment boundary

Use Sites native ChatGPT sign-in (`getChatGPTUser`, protected dynamic pages, top-level native sign-in link). Use the stable opaque Site user ID for ownership. Do not implement OAuth, custom authentication cookies, credential entry or a parallel login/session system. Do not retain participant email or full name.

First stage is owner-private staging, using the platform access boundary plus the application checks. Pilot release, after approval and capability verification, may have a public landing page with sign-in, enrollment code and app membership gate. All participant lab/data APIs still require native identity and enrolled membership. `STAFF_USER_ROLES` is a server-only JSON map of opaque native user IDs to authorized staff role; staff can test their own staged activity without taking a participant seat and can only review participant proofs through the read-only instructor routes. Native sign-in proves identity, not pilot membership. A service bypass token does not supply visitor identity and must not be treated as a participant or instructor.

The platform must inject and protect its identity headers. Use the starter helper rather than accepting a custom browser `userId` header. Confirm the deployed edge does not allow spoofing an instructor ID; no production “dev auth” switch. Local auth mocks are only local preview behavior.

### Proposed environment names

Canonical names: `DB`, `MODEL_API_KEY`, `MODEL_BASE_URL`, `MODEL_ID`, `MODEL_CALLS_ENABLED`, `PILOT_ID`, `PILOT_MAX_MEMBERS` (5), `PILOT_ENROLLMENT_CODE`, `PILOT_ENROLLMENT_ENABLED` (defaults false), and `STAFF_USER_ROLES` (JSON opaque-ID role map). No additional authentication, hashing or signing secret is needed. Derive the UI AI status from key/configuration, enabled flag and verified provider health/result; no separate `AI_MODE` secret. Practice notice version and 30-day availability are versioned application constants. `.env.example` contains names and descriptions only. Configure secret values through supported Sites runtime secret tools, never source or the browser bundle. The D1 manifest binding is `DB`; unused R2 binding remains null. Never create/alter migration-owned tables during a request.

## Limits, errors and cleanup

Initial application limits are design budgets, not claims about a hosting plan: membership attempts 5 failures/hour per native user; 20 run creations/hour per member; 120 lab/control requests/minute per member; one active run/session; 20 sessions/member for the pilot; 16 KB maximum normal JSON body; 4,000-character explanation; maximum 3 required steps/run and eight distinct cases/session. Run expiry is 15 minutes; expired or abandoned runs retain available receipts and cannot be finalized as successful evidence. Check configured membership and run expiry server-side on every mutation; return status/expiry to the browser without implying an expired run completed.

Use D1 atomic rate-limit bucket increments scoped to native identity and a global budget, not per-isolate counters or raw-IP limits. Set a global model-call budget in addition to per-member limits (suggested initial cap: 100 provider attempts/day; the AI contract caps 12 total provider HTTP attempts/session, at most three per coaching turn including final output, and one in flight/user). Bound input to 16,000 tokens/call and total provider output including reasoning to 4,096 tokens/call; cap the whole turn at 30 seconds. At most one transient retry is allowed within these same hard attempt limits. Provider/account credit limits and billing require verification; a notification is not a hard spend cap. No unlimited background agent loops.

Critical registration writes and receipts are awaited before sending a response; do not put them in `waitUntil`. AI calls run outside execution transactions. D1 unavailability, unknown commit outcome, model errors and expired identity all have explicit retry/reconciliation states. Never fall back to an array of expected rows when live execution fails.

Pilot learning activity is available for 30 days from creation; operational records and disposable counters are available for at most seven days. `dataExpiresAt` is visible to the member, and every protected read/write enforces it. The operator purges expired records at pilot close unless a supported scheduler has actually been configured and verified. Do not claim automatic physical erasure, assume cron support or create an unauthenticated cleanup API. Database recovery/backups can retain provider-managed history for their own window; verify that policy before promising immediate erasure everywhere. Do not delete or reset evidence automatically when a student starts another run.

`DELETE /api/activity` authenticates the native caller, marks their sessions deleting to close concurrent mutation paths, and synchronously deletes their evidence, coach events, request receipts, registrations, explanations, runs, predictions, patch selections, cases, sessions, identity-scoped disposable counters and membership in a bounded D1 batch before reporting success. Delete children before parents; exact FK order is verified in integration tests. Exports are generated on demand, so there are no hidden stored report files to clean up. Any concurrent finalizer/coach write must recheck session state and fail safely after deletion, never recreate a deleted session. The response reports deletion counts. Native sign-in and copies already downloaded by the user are outside app deletion. Provider-managed request retention is disclosed under the coaching notice and must not be described as synchronously erased by this operation.

Optional research choice governs only structured counts/timing for a separately approved pilot analysis. Raw predictions, explanations, coach text and source code are excluded from research exports. Refusal or withdrawal never changes access to practice. Instructor review is read-only proof review; the human 0–3 rubric is scored manually in the pilot kit, with no persistent grading UI or automatic marks in this application.

## Live fixture execution versus demonstration

`executionMode:"live-fixture"` means real HTTP calls and D1 writes against the supplied synthetic signup application. It does not mean a real campus signup service or arbitrary student code. Deterministic seeding controls inputs and injected faults; it never supplies fabricated observations.

AI mode is independent: `live-meta` requires a verified provider, model and working server secret; `approved-fixture` labels instructor-vetted scripted coaching; `unavailable` disables coaching while execution continues. A scripted coach must not be shown as a live Meta model. Do not claim the hackathon Meta-model requirement is met until the live provider integration is actually tested. The supplied participant guide lists model/provider options, but their endpoint/model/key availability is unverified here.

## Acceptance invariants

1. Baseline HTTP run records two different committed registration IDs in D1; receipt 1 shows handler 201/delivered 504, receipt 2 shows created/201. The active button lock existed before retry. No JavaScript array supplies the authoritative row count.
2. Main repaired HTTP run records exactly one D1 registration. Its two receipts reference the same registration ID; second response reproduces original stored body/status, with replay marker. Repeating the exact harness step does not create an extra business call.
3. Independent transfer is inaccessible before the prior explanation, receives a fresh namespace and fixtures, and refuses coach calls. It records 201/create, 201/replay, 409/conflict, one row. The student cannot request the corrective patch before locking their own interpretation.
4. Transfer repair is another namespace, retains the failed transfer evidence, uses a new key for event B, and records two distinct registrations without duplicates. Correct repair is visible as reviewed key-lifecycle code.
5. Equal keys and equal canonical payloads under concurrent D1-backed handler calls create one row; all successful responses identify it. Equal keys and different payloads create one winning row and a 409 for the loser. A different token for a new event creates another row. These are meaningful database integration checks, not mocks of `Map` behavior.
   The live concurrent probe must use two actual simultaneous HTTP requests. The live precommit probe must show an injected 503 with zero rows followed by a successful retry with one row, in both naive and repaired modes. A coach-suggested probe cannot execute without its own case-specific frozen prediction.
6. Receipt insertion failure rolls back registration insertion and completed-step count advancement. A run-finalization crash is resumable without changing its snapshot. Genuine infrastructure failures never become completed pedagogical outcomes.
7. Before-run prediction, after-run explanation and reviewed patch selection cannot be overwritten. A browser cannot submit a row count or change the run's variant. Refresh restores the same run and frozen reasoning.
8. Two signed-in members cannot read, execute, finalize, export or enumerate each other's sessions, runs, receipts or evidence. Anonymous callers and unenrolled identities receive no lab data. A forged user-ID request body/header does not establish identity.
9. With four members enrolled, simultaneous enrollments by different native users add at most one fifth member. Re-enrolling an existing member is harmless. Enrollment code does not grant instructor access.
10. Evidence downloads are server-derived and carry reproducibility digests while retained; no tamper-proof attestation is claimed. AI outages or adversarial AI text cannot alter a registration, receipt or verdict. An owner can delete their activity and derivatives synchronously; later requests cannot recreate it. Practice notice acknowledgment is required, optional research consent defaults false and refusal does not block use.
11. The deployed application explicitly labels the injected 504 and reviewed-code execution boundary. Public source, source digest, deployment commit and live proof make the demo reviewable; no claim of an arbitrary-code sandbox is made.

For required end-to-end checks, drive the actual deployed HTTP routes through an authorized browser and inspect proof/evidence against D1 records through owner tooling. Also run local D1-backed transaction/concurrency and cap tests. Build/type checks, accessibility and responsive UI checks complete implementation verification; none has been run in this pre-build design stage.

## Verified capability references and open checks

Reviewed on 2026-10-27:

- Sites skill and its storage reference describe the Vinext Worker starter, `DB` binding, generated schema migrations and deployment-applied migrations. Identity reference supplies native sign-in helpers, opaque Site user ID and runtime secrets. These are available-host design inputs, not a deployment test. Resources: `skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md`, `.../references/storage.md`, `.../references/identity-and-secrets.md`, `.../templates/vinext-starter/README.md`.
- Cloudflare's [D1 database binding API](https://developers.cloudflare.com/d1/worker-api/d1-database/) documents transactional `batch()` rollback and the prepared-statement interface. This supports the proposed atomic effect-and-receipt design; the exact generated SQL still needs D1 integration tests.
- Cloudflare's [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) describe single-threaded per-database execution and bounded query resources. This is suitable for a small capped pilot; Sites-specific quotas and billing remain unknown.
- Cloudflare's [read replication guidance](https://developers.cloudflare.com/d1/best-practices/read-replication/) describes explicit sessions/bookmarks for consistency. The MVP avoids replica routing.
- Cloudflare's [foreign key documentation](https://developers.cloudflare.com/d1/sql-api/foreign-keys/) confirms enforced foreign keys. Validate migration and trigger behavior in the exact deployed D1 runtime.

Open checks before claiming an operational MVP: supported pilot Site audience change and native identity in that audience; deployed identity-header protection; actual D1 provisioning/migration and transaction behavior; available Sites secret configuration; exact live Meta endpoint/model/key; platform request/CPU/storage quotas; source repository access and public GitHub release path. No speculative model SDK or endpoint is embedded in this architecture. Do not create accounts, add payment methods, expose the pilot, register a Site, install dependencies, create repositories or deploy until the design has been approved.

If a required Sites server capability is unavailable, the concrete alternative is the same TypeScript Worker + D1 architecture deployed through an explicitly authorized Cloudflare account, with a separately approved identity integration. Do not replace D1 with fabricated browser state or silently add a general code sandbox to meet a demo deadline.
