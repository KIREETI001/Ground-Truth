# GroundTruth MVP Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Execute in the active conversation; user approved the design and agent method on 27 October 2026.

**Goal:** A real campus-signup investigation with prediction, HTTP/SQL evidence, adaptive Meta coaching, guided repair, independent transfer and tutor export.
**Architecture:** One Sites Vinext TypeScript application, native platform identity, D1 persistence. Reviewed fixture handlers only; no arbitrary code evaluation. Business rows and receipts are relational; the bounded learner state can be a versioned JSON document with compare-and-swap writes.
**Tech Stack:** React, TypeScript, Vinext, Cloudflare D1/Drizzle, native Node tests with SQLite, Meta Responses API.
**Spec:** ../specs/2026-10-27-groundtruth-mvp-design.md; detailed contracts in ../../design/architecture.md and lib/contracts.ts.

## Global Constraints
- Preserve Sites build/auth integration. Work in branch codex/groundtruth-mvp in the newly cloned empty repository.
- Opaque native identity and server-side authorization on every private API. Optional research consent never gates practice.
- Real SQL rows/HTTP requests; synthetic 504 only after an actual commit, explicitly labelled.
- Transfer and transfer_repair cannot call Meta. Require frozen prediction and explanation before debrief.
- No unrestricted code execution, grades, cryptographic attestations or unrelated features.
- Twelve total provider HTTP attempts per session; three per turn; 16k input/4096 output; 30-second turn; one in flight/user. No secret in source.
- Test runner uses Node's built-in TypeScript stripping and SQLite; no new test framework required.

## Review Focus
1. Concurrent retries must hit SQL uniqueness, not a UI lock; test two simultaneous attempts and conflicting payloads.
2. Reload/racing mutations cannot overwrite a frozen response; test version conflict and repeated request IDs.
3. Foreign identities and learner-to-tutor escalation must fail for read/write/export/delete.
4. Transfer answers cannot arrive in a coaching response that started in a previous phase; recheck session revision after model call.
5. Deletion during an in-flight experiment/coaching request must not recreate data; foreign-key and state guards apply.

## Task 1 — Foundation and contracts (CTO)
Files: lib/contracts.ts; package.json; .openai/hosting.json; docs; .gitignore.
- [x] Clone empty user repo; create feature branch; use supplied Sites starter.
- [x] Persist exact private Site identity; install locked starter dependencies.
- [ ] Freeze DTOs and API paths; enable DB binding; add typecheck/test scripts.
- [ ] Verify clean starter build and record baseline; commit foundation.

## Task 2 — SQL experiment engine (execution agent)
Files: lib/lab/*, db/schema.ts, drizzle/*, tests/lab.test.ts, tests/sqlite-d1.ts.
Interfaces: createRun(db,input), executeStep(db,runId,owner,stepId,payload,key), finalizeRun(db,runId,owner), getRunPlan(db,runId,owner), getEvidence(db,runId,owner), sourceFor(phase,fixtureId).
- [ ] Write failing tests for real duplicate, corrected replay, different-payload conflict, concurrent replay, precommit fault and transfer outcomes.
- [ ] Implement parameterized D1 batches, run-step deduplication and immutable source/evidence digests.
- [ ] Generate reviewed schema-only migration. Real tables for memberships, sessions, runs, registrations, receipts, evidence, coach limits.
- [ ] Run focused tests and report SQL/platform verification limits; no arbitrary evaluator.

## Task 3 — Application/API state (application agent)
Files: lib/server/*, app/api/[...path]/route.ts, tests/server.test.ts.
Consumes frozen contracts plus lab functions; produces handleApi(request,config,userId,options?) for a thin hosted route.
- [ ] Test native identity absence, membership, five-seat concurrency, ownership, phase gates, immutable submissions and delete.
- [ ] Implement /me, notice/consent, enrollment, sessions/cases/predictions/patches/runs/explanations/advance, real lab requests, evidence/source/export, tutor read-only and own deletion.
- [ ] Preserve source/evidence visibility gates, reload state and origin/JSON/size guards.
- [ ] Integrate Meta adapter with persisted attempt quota and post-call revision check; test unavailable mode.

## Task 4 — Product/frontend (frontend agent)
Files: app/page.tsx, app/layout.tsx, app/globals.css, app/components/*, app/workspace/page.tsx, app/tutor/page.tsx, lib/client/* if needed.
- [ ] Build complete responsive workbench against frozen API, no stub observed data.
- [ ] Prediction counts+outcomes+rationale; real fetch harness grouped for concurrency; evidence table/timeline; source/diff; explanation and patch/advance gates.
- [ ] Complete independent transfer and report/export/print; accessible loading/error/reload states; native sign-in and membership entry.
- [ ] Use sober ink/teal/warm-white design. Keyboard, labels, focus, 375px layout. No solution before gate.

## Task 5 — Meta adapter (AI agent)
Files: lib/ai/*; tests/ai.test.ts.
Interface: coach(context,config,signal?) -> CoachResult; no DB writes or execution authority.
- [ ] Test strict structured output/references/allowed fixtures, malicious inputs, phase prohibition, timeout/refusal/bad schema and absent key.
- [ ] Implement verified Meta Responses contract and token preflight, plain-text bounded generated questions and rationale.
- [ ] Provide visibly instructor-authored fallback, no silent provider switch; usage receipt and config validation.
- [ ] Live API validation stays pending actual owner key; never claim fixture test as live success.

## Task 6 — Release/docs (release agent)
Files: README.md, .github/workflows/ci.yml, docs/pilot/*, .env.example, scripts local setup helper as agreed.
- [ ] Document Windows Desktop clone/start, compatible Node, local D1 migration/preview and native local sign-in.
- [ ] Add CI install/typecheck/Node tests/build with no production secrets; add pilot script/observation sheet/manual rubric.
- [ ] Provide secret setup, private staging, public pilot gate, cleanup and recovery instructions; credit prior ideation accurately without publishing the source proposal.

## Task 7 — Integrated QA/review and delivery (CTO + fresh reviewer)
- [ ] Run full typecheck/tests/build; migrate empty local D1 and execute real HTTP smoke via supported preview.
- [ ] Fresh reviewer checks spec/security/quality. Fix confirmed blocking findings and recheck.
- [ ] Commit and push exact source to user repository; public-source access confirmed. Prepare PR when a base branch exists.
- [ ] Sync exact source to private Site, package/build, deploy and verify returned state.
- [ ] Live Meta and multi-user pilot remain explicitly gated if owner key/identities absent; finish every independent task anyway.
- [ ] Return actual source branch/commit, deployed private URL, Desktop command, tested behavior and remaining owner actions.
