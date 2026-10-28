# GroundTruth: MVP design and agent build brief

**Prepared:** 27 October 2026, Singapore time.  
**Status:** Approved by the user on 27 October 2026. Implementation in progress in KIREETI001/Ground-Truth. The design sections below record the approved target; actual delivery and verification status belongs in README and release notes.  
**Product owner:** Kireeti.  
**Delivery owner:** CTO/integration agent (the main conversation).

## 1. Outcome and product decision

Build one complete, reliable learning investigation that a student can finish in approximately 15–20 minutes. The student should make a prediction, examine real HTTP and database evidence, revise an explanation, change a reviewed implementation, and attempt a related case without AI help. The pilot tests usability and reasoning signals; it does not establish that GroundTruth improves learning.

The core claim is **"Understand AI-generated software by testing what it actually does."** GroundTruth is a verification workbench. AI suggests investigations; executed application behavior supplies observations. Do not describe an AI explanation, a passing test, or a tutor summary as proof that the whole program is correct or that the learner understands every part of it.

### Approaches considered — CTO recommendation, not a decision already approved by the user

| Approach | Advantage | Cost or limitation | Decision proposed |
|---|---|---|---|
| Full arbitrary-repository workbench with executable editing | Closest to the long-term vision | Sandbox infrastructure, dependency failures, resource abuse and isolation multiply the work before anyone can test the learning loop | Defer |
| Controlled application with real HTTP/SQL, reviewed implementation patches and adaptive Meta coaching | Complete verifiable product loop quickly; strongest demo and smallest infrastructure surface | Supports one application and guided implementation changes initially | **Build this MVP** |
| Chat tutor or scripted click-through | Quick to render | Does not establish actual application behavior and weakens the hackathon distinction | Do not use as the shipped MVP |

### First scenario: campus event signup

A student examines a small event signup application. The UI disables the button while submitting. The initial backend inserts a registration each time it receives a request.

The harness sends a real HTTP request. The reviewed handler commits a real D1 registration and constructs a successful response. A deliberately configured fault adapter discards that success and delivers a simulated upstream-response-loss error. The client retries the same signup. The naive backend creates a duplicate.

The UI must say **"Injected lost response after commit"**. It must distinguish the handler's successful result, the delivered fault response, and an actual browser/network failure. We are not claiming to reproduce every real network outage.

The learner chooses and justifies a reviewed patch that adds server-side idempotency with a stable key per logical signup intent. The same experiment now yields one registration and a replayed result. Additional probes verify simultaneous retries and a failure before commit. Both inspected source and exported evidence identify the exact executed implementation version.

### Independent transfer case

A fresh case uses an idempotent backend but a deliberately faulty client that keeps one key for the whole browser session. Signup A commits; retry A replays; a new signup for event B incorrectly reuses A's key. A correctly protective backend returns a payload-conflict error and leaves one registration.

The learner commits predicted row count, expected request outcomes and a rationale before running. Afterwards, the mandatory independent explanation must identify the same-intent replay, explain why the new event conflicts with the reused key, and propose when a key should be kept or replaced. No correctness gate forces an answer to match a gold response: freeze the learner's attempt as written. Only after that response is committed can the debrief reveal the distinction and offer the corrected key lifecycle: retry of the same intent reuses a key; a new intent gets a new key. Verification then yields two distinct registrations. This is an ungraded practice check, not a secure examination; the eventual public source may contain solutions.

## 2. Scope contract

### Required for the pilot

1. Branded, responsive introduction with a clear time commitment and entry path.
2. Native ChatGPT sign-in, platform identity preserved; application-level pilot membership and per-record ownership.
3. Prediction and explanation commitment before experiment results or diagnostic AI help are revealed.
4. Controlled sample application, readable code, reviewed patches, real request execution and real SQL rows.
5. Evidence panel with run IDs, timestamps, request/response trace, fault label, before/after rows and source version.
6. Meta-powered, evidence-grounded test suggestions and follow-up questions, constrained to allowed actions.
7. Explain/repair/retest loop and a separate AI-free transfer case.
8. Save/resume in the same Site account; safe repeated-click/retry behavior in GroundTruth itself.
9. Role-protected read-only tutor evidence view, structured JSON export and printable report. Human rubric judgements are recorded manually in the pilot kit; no in-app grade/notes editor is required.
10. Minimal first-party pilot events and optional research consent, deletion and a release runbook.

### Explicitly deferred

Arbitrary repository import, unrestricted uploaded code execution, general coding agents, a full code editor, LTI/LMS integration, course management, payments, public classroom analytics, official automated grades, SOLO-level certification, broad case libraries, voice/image features, multi-agent runtime theater, collaborative editing and production student data.

Guided repair means choosing/applying a reviewed implementation patch that really changes execution. It must not be marketed as arbitrary code editing. AI-created sample claims are not observations. Static demo fixtures may support development but must be labelled and cannot pass the live-Meta release gate.

## 3. User journey and interface

### Core journey

| Step | Learner action | Product response | Completion requirement |
|---|---|---|---|
| Enter | Sign in, enter moderator-supplied pilot code, read data notice | Create or resume an owned practice session | Authentication and membership verified server-side |
| Predict | Choose expected registration count and explain why | Freeze a versioned prediction before exposing results | Nonempty explanation; no correctness feedback yet |
| Run | Accept or choose an allowed experiment | Execute real requests and display actual stored evidence | Run ends complete or explicitly incomplete, never fabricated success |
| Investigate | Compare prediction and evidence; explain discrepancy | Meta suggests a discriminating next probe and an evidence-linked question | Learner can accept, change or reject a suggestion with a reason |
| Repair | Choose a reviewed code change and explain its effect | Show source diff and execute that exact version | Baseline and repaired runs have isolated data |
| Verify | Rerun loss/retry and boundary cases | Compare measured rows and outcomes side by side | Correct behavior under tested conditions, limits stated |
| Transfer | Predict/interpret the fresh key-lifecycle case independently | Reject coaching requests until the independent response is committed | Separate immutable attempt and no-AI marker |
| Review | Read a tutor summary or export the session | Preserve original predictions, observations and revisions | No model-invented evidence or automatic final grade |

### Screen design direction

An understated scientific workbench: warm off-white canvas, dark ink, restrained teal for interactive actions, amber for injected faults and red for actual errors. Typography should make explanations easy to read and code easy to scan. Use text and icons together; color never carries meaning alone.

Desktop: left investigation rail, central sample application/code, right evidence panel, with a compact coaching area attached to the current step. Tablet/mobile: step-based stacked panels with persistent access to evidence. Avoid a large conversational feed becoming the primary product.

Always distinguish **Prediction**, **AI suggestion**, **Observed execution** and **Learner explanation**. A count must say whether it is predicted or measured. Display source/model versions and run provenance unobtrusively in a details section. The novice-facing interface explains idempotency through examples rather than exposing internal service configuration.

Keyboard completion, visible focus, labelled fields, sensible focus after runs, screen-reader announcements, readable contrast, 200% zoom, reduced motion and no horizontal page overflow at 375 px are required. Code panes may scroll internally. Disabled states explain the next prerequisite. Failed model calls keep typed work and completed experiments intact.

## 4. Architecture and trust boundaries

### Recommended stack

One TypeScript full-stack application using the Sites Vinext starter (React and Next-style routing), Cloudflare Workers, D1/SQLite persistence and the starter's native ChatGPT authentication helpers. Use the starter's migration and source/deployment workflow. No extra backend service, Redis, vector database, message queue or custom OAuth system is needed for five moderated users.

The hosting guidance confirms D1 and runtime secrets are supported; exact starter APIs and dependency versions must be verified when the build is bootstrapped. This document selects architecture, not an untested dependency lockfile.

### Responsibility boundaries

- **Browser:** renders the lab; submits predictions; issues approved same-origin lab requests; displays server evidence. It cannot declare final observed counts or tutor roles.
- **Application server:** authenticates and authorizes every operation, enforces the phase machine and quotas, runs only reviewed fixture handlers, records evidence and exposes owned rows.
- **Database:** supplies actual row state and uniqueness constraints. Scope every lab row to a run and every run to an owned learning session. A global table wipe/reset is forbidden.
- **Meta adapter:** receives the minimum authorized explanation, versioned sample code and evidence snapshot. It proposes structured actions. It has no database-write authority, shell, arbitrary URL fetch, arbitrary code execution, session administration or grading authority.
- **Tutor view:** server-authorized owner/instructor role; learner-facing endpoints never include other users' data or unreleased transfer answers.

### Execution invariants

The baseline naive handler can generate duplicates intentionally, but GroundTruth's orchestration endpoints must remain idempotent. Keep harness action IDs distinct from the sample application's intentionally varied idempotency keys.

The fixed handler must scope uniqueness to the run plus the logical intent key, return the original result on same-key/same-payload replay, reject same-key/different-payload reuse, and support parallel retries without duplicate rows. Implement the registration and idempotency record atomically using supported SQL/D1 primitives; do not rely on a read-before-write check alone. Use canonical payload hashing, not untrusted client claims that two payloads match.

No requested run, patch or experiment can escape its owned session. Reloading cannot erase committed predictions, accidentally rerun a write or change completed evidence. Interrupted runs are marked incomplete with the partial trace and can be restarted into a new run namespace.

Keep evidence append-only during normal operation; a correction creates a new attempt/version. Explicit participant deletion is a separate authorized retention operation and removes the owned records. Evidence references do not imply tamper-proof logs or high-stakes assessment security.

### Identity, pilot membership and release audience

Private owner staging first. At the pilot release gate, expose a public landing with native ChatGPT sign-in required for app use. A moderator-supplied enrollment code grants practice membership, initially capped at five student users. The code is membership, not a replacement for platform authentication. Enrollment must be rate-limited and capped transactionally. Owner/instructor authorization comes from a configured opaque Site user-ID allowlist, never a client role field.

Do not call platform external-invite tools or send recruitment messages. Some access tools email people; the user has not authorized those messages. The user recruits and shares the pilot entry path. Every route must distinguish signed-in visitor, enrolled learner and authorized tutor.

## 5. Meta integration and honest degraded behavior

Official documentation reviewed on 27 October 2026 describes `POST https://api.meta.ai/v1/responses`, Bearer authentication and the model identifier `muse-spark-1.3`. Use Standard mode rather than a contributor variant for participant content. The API key is a server runtime secret named `MODEL_API_KEY`. A successful live call with the user's account is still required; documentation verification is not account access or integration verification.

Use a small bounded reasoning loop. The server loads authorized, phase-limited code, the frozen explanation and finalized evidence, then requests one structured model decision. The decision selects a meaningful next experiment from real lost-success/retry, concurrent-retry and precommit-failure fixtures and supplies a short evidence-linked rationale or question. The learner accepts/chooses a probe; the fixed harness executes it; the next coaching turn adapts to the new trace. Native model tool loops are not required in this MVP and must not be claimed if unused. Novelty comes from causal test selection and adaptation, not the number of model calls.

Version prompts and validate outputs against a schema. Include phase, evidence version and run ID in each request. Reject unsupported experiment IDs, references to absent evidence, stale results, oversized text and disallowed tool arguments. The server controls tool permissions; a valid JSON schema is not an authorization boundary. Treat student text and code comments as untrusted content, not developer instructions.

Use `store:false` where supported, but do not equate that request option with a comprehensive zero-retention/legal promise. Retain only the small context needed; do not send account email, pilot credentials or secret values. Prefer transparent short justifications to exposing hidden model reasoning.

During transfer, the coaching API is blocked server-side until independent submission. Before main-case prediction commitment, expose only nondiagnostic orientation. A timeout/refusal/schema failure shows a clear failure state and allows real experiments to continue with labelled authored prompts. Never silently substitute another provider or present prerecorded output as live Meta.

Live acceptance: one real Meta call selects an allowed discriminating probe for a sample misconception, a real experiment supplies evidence, a second call asks a relevant follow-up citing actual evidence IDs, and the session records provider/model/usage/mode without secrets. Evaluate at least two different mistaken explanations to establish that the selected probe/rationale responds to the learner's reasoning instead of always returning the same script. These are required checks, not results achieved today.

### Budget defaults (targets, not current spending)

Cap all provider HTTP attempts, including token preflights and retries: at most 12 per session and at most 3 per coaching turn, with one in flight per user. Cap each generation at 16,000 input tokens and 4,096 output tokens including internal reasoning. A token-count preflight plus a structured generation leaves room for at most one transient retry; that retry consumes the same session/turn quota. Bound the total coaching turn to 30 seconds and preserve the authored/manual continuation on timeout. Record actual reported token usage and estimated cost; do not assume a notification from the provider is a hard spending cap.

Recommended initial account spending allocation: at most US$5 for integration/evaluations, US$5 for the first pilot and US$5 for demo rehearsals, with a US$15 application budget checkpoint. Provider billing may include in-flight or retried requests; the application estimate is not an exact billing guarantee. The expected pilot should cost far less, but the first live run must establish real usage before projections are trusted.

## 6. Agent team and human ownership

Use six continuing lanes plus one fresh reviewer slot, with the CTO included in the six. Avoid running two agents on the same files or spawning agents merely to restate a plan.

| Lane | Accountable deliverable | Files/domain | Required review evidence |
|---|---|---|---|
| **CTO / integration lead — main agent** | Scope, contracts, integration, final release decision and status | Shared contracts, shell/config, integrated branch | Every release gate below has evidence; no unresolved blocker hidden by a summary |
| **Product designer / frontend engineer** | Complete learning flow, responsive accessible interface and interaction copy | Pages, components, styles, authored case content | Learner can complete the flow; clear prediction/AI/observation distinction; no transfer spoilers |
| **Execution / backend engineer** | Real lab, SQL isolation, phase transitions and idempotency repair | Lab handlers, evidence, database/schema, domain services | Deterministic trace/row assertions, concurrency and isolation tests |
| **Meta AI systems engineer** | Provider adapter, constrained reasoning loop, prompts and evaluation fixtures | AI adapter, schemas, tools and evals | Live Meta smoke, hostile-input tests, grounded output and honest failure modes |
| **QA / learning-evidence reviewer** | Independent API/browser tests, accessibility review and pilot instruments | Tests, issue ledger and pilot kit | Happy path and negative paths verified; no auto-grade or efficacy inflation |
| **Release / developer-experience engineer** | Public source readiness, CI, migrations, secrets/runbook and deployment | CI, release/deployment docs and packaging | Clean checkout builds, private smoke, restricted pilot access, rollback/recovery instructions |
| **Fresh independent reviewer — temporary seventh slot** | Challenge the design and later inspect the integrated build | Read-only review unless assigned a bounded fix | Blocking questions/findings ranked; CTO verifies resolutions |

**Kireeti — founder, pilot lead and final product judge:** claim the Meta credits and create/configure the account payment/API access; recruit five actual learners and obtain consent; observe sessions and capture quotations without coaching; validate which problems matter and decide the next case; verify authorship/contributor attribution; record the final human-facing pitch. Agents prepare the instruments, draft materials and fix observed problems. Agents cannot substitute for users' lived experience, informed consent or actual observations.

If repository creation is not available through the connected environment, create an empty public `KIREETI001/GroundTruth` repository and grant the GitHub app access. The current connector exposes repository editing/PR operations but no repository-creation action, and the initial search found no accessible GroundTruth repository. Agents should do all branch, source, CI and README work once a destination exists. Do not ask the user to perform coding or deployment commands that the agents can execute.

The named planning agents are real dispatched tasks in this conversation. Continuing build work runs in the active conversation after approval; this brief does not establish an unattended background service or scheduled work.

## 7. Work order, dependencies and verification

### Gate 0 — approved scope and usable environment

Approve this design, including the controlled fixture/guided-patch limitation and the proposed stack. Establish source destination and hosting access. Confirm the Meta account/key can be configured securely. The execution engine/UI can be built before the key arrives, but the live-Meta gate cannot pass without it. No secret should be pasted into a public issue, document, repository or client bundle.

### Gate 1 — foundation and real evidence before polished screens

CTO freezes versioned shared types and API contracts; Release creates the baseline build/check pipeline; Backend implements ownership, session state and the real naive signup experiment. Prove a committed registration followed by an injected lost response and duplicate retry in the database. Test empty input, invalid phase, foreign session and repeated orchestration calls. This is the critical technical spike; change architecture now if the deployed platform cannot support it.

### Gate 2 — three parallel implementation lanes

- Frontend builds all required screens against the same contracts, including errors and resume.
- Backend implements patch variants, atomic idempotency, provenance and fresh transfer execution.
- AI implements the provider adapter, schema/phase guardrails and bounded tools, with deterministic fixtures explicitly marked as test-only.

QA writes independent acceptance cases while these lanes work. Shared-contract changes go through the CTO; agents do not silently rename response fields. The Release lane keeps clean-checkout instructions and migrations current.

### Gate 3 — integrated alpha

Join prediction -> real run -> evidence -> Meta question -> repair -> verification -> AI-free transfer -> tutor export. Use real failures to verify recovery. An export must reconstruct what the learner predicted and what the app actually observed without depending on the model's prose. Root tests the deployed build rather than relying only on an agent's completion claim.

### Gate 4 — release candidate and two internal dry runs

Pass typecheck, focused unit/integration tests and supported browser E2E. Verify data isolation, tutor access, secret exclusion, keyboard flow, mobile layout, provider outage and budget behavior. Run two end-to-end dry runs with fresh accounts/session namespaces. Fix all blocker/major defects and repeat the affected checks. Verify the live Meta path and confirm a fresh deployment handles migrations.

### Gate 5 — first five real learners

Invite no one automatically. The user supplies the approved pilot URL/code and moderates five sessions of about 20–25 minutes. Collect task completion, intervention count, evidence comprehension, independent transfer explanations, friction and trust concerns. Triage after the first two sessions and again after five; fix a blocker before exposing more learners. Publish no efficacy claim from this convenience sample.

### Gate 6 — hackathon submission candidate

Use the guide's rubric: Impact 30%, Meta tooling 25%, Technical execution 20%, Demo 25%. Public repo, accessible live product/video, clear new-work attribution, contributor list and a three-minute demo. Final submission deadline in the supplied guide is 5 November 2026 at 10:00 a.m. Singapore time (4 November 9:00 p.m. EST). Keep at least one full day for deployment recovery and video/README verification. Submission itself is not authorized by this build request.

### Target schedule, not a completion promise

Aim for the first complete alpha within one focused build day after Gate 0, and first moderated users within the following day if hosting and Meta access work. Scope the first pilot for 28–29 October where feasible, then reserve 30 October–2 November for observed issues and 3–4 November for demo/submission checks. Do not compress verification to preserve these targets. Re-estimate after the deployed real-execution spike, and report actual gate status rather than invented percentage completion.

## 8. Release acceptance checklist

- [ ] Baseline: one logical intent, committed first attempt, injected lost success, real retry -> two stored registrations.
- [ ] Repair: same intent/key and payload -> one registration, same returned registration identity on replay.
- [ ] Concurrent replay -> one registration; different keys for distinct intents remain independent.
- [ ] Same key/different payload -> explicit conflict without overwriting original data.
- [ ] Failure before commit -> no row until successful retry.
- [ ] Printed code/diff version equals the handler and client-key strategy actually run.
- [ ] Evidence is server-derived, run-scoped and not accepted as authoritative from browser/model input.
- [ ] Foreign learner/session IDs, unauthenticated calls and learner-to-tutor access are rejected.
- [ ] A committed prediction cannot be silently overwritten; retries/reloads do not duplicate orchestration actions.
- [ ] Transfer prediction and interpretation are completed before hints/debrief; coaching is unavailable server-side in the independent phase.
- [ ] At least one real live-Meta complete investigation passes, with model/mode recorded and no false fallback labels.
- [ ] Tutor view and JSON/printable export preserve original and revised explanations plus evidence references.
- [ ] Optional research refusal does not deny practice; delete removes owned practice records and derived reports.
- [ ] Keyboard, contrast, 200% zoom, 375 px layout and clear loading/failure states verified with limitations reported.
- [ ] Clean checkout build, D1 migration and deployed smoke pass; secrets absent from source, logs and client assets.
- [ ] No unresolved blocker or major bug on the complete primary journey before pilot release.

## 9. Pilot protocol and success criteria

Recruit students who have recently used AI to build a database-backed web app. Start with at least two who are uncertain about retries, not only experienced hackathon peers. Include one more experienced student as a ceiling check. These are purposeful usability participants, not a representative research sample.

Opening statement: "We are testing the product, not your ability. Please say what you think is happening. I will mostly stay quiet. You can stop at any time. Use only the supplied sample app."

Ask the learner to explain the opening screen in their own words; predict; investigate; repair; then try the fresh case without help. Do not name idempotency, give the correct row count or suggest the next button unless the learner is blocked. Record any intervention exactly. Ask afterwards: "What evidence changed your mind?", "When would you keep or replace the key?", "What did you distrust?" and "Where would this have helped in a real project?"

Usability targets for iteration: at least 4/5 finish the core journey without a major moderator rescue; at least 4/5 correctly distinguish AI suggestions from observed execution; no lost work or cross-user exposure; median session fits the planned 20-minute learning portion. Failing a target triggers a design/code fix and another small pilot, not a claim of success. Independent transfer explanations should be scored by a human using the attached rubric; do not set a learning-effect claim from five users.

For consenting research participants, keep a row containing pseudonymous ID, prior experience, consent choice, build SHA, model/mode, start/end, prediction, tests chosen, interventions, failure points, transfer explanation, trust comments and suggested fix. No name/email in the default export. Do not record audio/video by default.

**Consent decision:** Core saved practice, the participant's own export, and named pilot tutor review are part of the disclosed practice service. A learner declining optional research can still use that service. Optional research analysis/export uses only consent-eligible structured counts, timings, choices and manual rubric dimensions; raw answers, quotations and tutor notes are excluded even when research consent is given. A particular quotation needs separate participant permission later. Keep optional research consent versioned; withdrawal excludes subsequent use and triggers owner-managed deletion of controlled research copies. Do not equate optional research refusal with inability to practise.

**Retention decision:** Product availability expires 30 days from session creation; generating a report does not restart that clock. Content-free operational events expire seven days after each event. Own-data deletion removes active application records and derived reports synchronously. Session expiry must be enforced in reads, mutations and exports; the owner must run the tested purge at pilot close and before the 30-day deadline unless a supported scheduled purge is independently verified. Do not advertise automatic physical erasure without such a scheduler. Downloaded copies cannot be technically recalled; the moderator must delete controlled research exports/notes on request and at pilot cleanup. Provider/native logs/backups are governed by their actual controls, not an invented instant-erasure promise.

**Human reasoning rubric:** Rate each dimension 0–3: conceptual accuracy, linkage to actual evidence, and reasoning about the same-intent/new-intent boundary. A 0 means absent/contradicted, 1 means a relevant assertion without a sound explanation, 2 means a substantially correct explanation with one important gap, and 3 means a correct explanation tied to the trace and its limits. Record the three dimensions separately; do not turn this into an automated grade or a claim of measured learning improvement.

### Independent builder review and resolutions

A fresh reviewer identified two material omissions: research-consent/retention semantics, and what the transfer response must demonstrate. The explicit decisions immediately above and in the transfer section resolve both. These are proposed CTO implementation choices for the user's approval, not facts about an already-built application.

## 10. Decision and blocker ledger

| Item | Current state | Owner | Blocks |
|---|---|---|---|
| MVP design | Proposed; approval required by workflow | User + CTO | Product implementation |
| Repository destination | No accessible GroundTruth repo found; creation action unavailable in current GitHub tools | User if native provisioning cannot provide destination | Public GitHub delivery, not design |
| Hosting | Architecture supported by Sites guidance; no Site created yet | Release + CTO | Deployed pilot |
| Meta API | Official endpoint/model docs checked; no key/live request verified | User provisions; AI agent integrates | Live-Meta release gate |
| Learners | None recruited/contacted by agents | User | Human validation |
| Prior proposal attribution | Four contributors named in source proposal; current competition team not asserted | User | Final authorship/submission claims |

## 11. Source notes

The supplied participant guide and GroundTruth proposal are the product/hackathon source material. This brief does not independently validate the proposal's external education-research claims; verify those before publishing numerical claims in the README or pitch.

Official Meta references reviewed: [Responses API](https://dev.meta.ai/docs/protocols/responses) and [pricing/rate limits](https://dev.meta.ai/docs/pricing-rate-limits). Protocol/model access remains subject to the user's account and a live test. Native Sites skill references establish the hosting, D1, identity and runtime-secret capabilities used in this recommendation.

The specialist implementation notes, UX specification, AI adapter details, QA/pilot kit and release runbook are attached below after review. Where an appendix conflicts with this approved master scope, resolve it through the CTO before coding; do not silently combine incompatible variants.
