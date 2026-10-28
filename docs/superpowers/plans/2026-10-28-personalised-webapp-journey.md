# Personalised web-app journey implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first complete personalised GroundTruth journey for students building AI-assisted web apps.

**Architecture:** Extend the current Vinext app with deterministic learner evidence/recommendations, explicit optional D1 persistence, bounded public-source adapters and a unified four-destination interface. Preserve live-lab APIs and independent-task boundaries. Source adapters and learner persistence use separate files and narrow interfaces.

**Tech Stack:** Existing React/TypeScript, Vinext, Cloudflare Worker/D1, Node test runner. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-28-personalised-webapp-journey-design.md`

## Global constraints

- Preserve the existing Site audience, project ID, draft branch, lab contracts and Meta configuration.
- Do not send source to AI, execute imported code, infer mastery from a repository, or impersonate visitor authorization.
- Browser-local first; account saving is explicit and native-identity-owned, with 30-day availability and manual physical cleanup disclosure.
- Main text 16–18px; supporting text >=14px; targets >=44px. No new dependencies.
- Keep three existing missions and checkpoint IDs; add three original web-app missions without transfer-task answers.

## Review focus

- Reloading or switching identities must not upload or merge another learner's local profile.
- Concurrent or expired account saves must not silently overwrite a different revision.
- Malicious repository URLs/paths, oversized source and changed commits must not bypass fixed-host reads.
- Source outages, stale dates and opt-in polls must not appear as current, representative market facts.
- Point farming, imported repository signals and guided choices must not become independent mastery claims.

### Task 1: Learner domain and owned persistence

**Files:** Create `lib/learner/{types,model,store}.ts`, `lib/server/learner.ts`, `tests/learner.test.ts`, `tests/learner-server.test.ts`; modify schema/migrations, server routing, retention, test DB schema.

**Interfaces:** Expose `LearnerState`, `LearnerProfile`, `SkillId`, `ProjectSnapshot`, `emptyLearnerState`, `parseLearnerState`, `recommendMission`, `skillEvidence`, `baselineQuestions`. Add GET/POST/DELETE `/api/learner` with revision-checked `{state,revision,noticeVersion:'learner.v1'}` saves and GET export. Expose daily pulse GET/POST `/api/pulse` with singleton native-account votes. Return safe API error codes through existing helpers.

- [ ] Write failing domain/storage/API tests for corrupt records, baseline choice validation, progress evidence, recommendations, explicit native ownership, stale revision, expiry/delete, poll deduplication and minimum aggregate threshold.
- [ ] Run those tests and verify the missing behavior fails.
- [ ] Implement strict allowlists, derivation, D1 rows and routing; no trusted client mastery fields. Add migration and delete/purge coverage.
- [ ] Run targeted tests and the full existing suite; commit only task-owned files.

### Task 2: Bounded project and field-feed adapters

**Files:** Create `lib/discovery/{types,github,radar}.ts`, `lib/server/discovery.ts`, `tests/discovery.test.ts`. Root integrator owns `lib/server/index.ts` routing.

**Interfaces:** `projectTree(input, fetcher?)`, `analyseProject(input, fetcher?)`, `readRadar(fetcher?)` return JSON-safe typed results. API POST `/api/projects/tree` `{url}`, POST `/api/projects/analyse` `{url,commit,paths}`, GET `/api/radar`; errors use existing `ApiError`. Root wires to dispatcher. Use shared `ProjectSnapshot` from Task 1; coordinate exact fields before implementation.

- [ ] Write failing tests for GitHub host/URL/path abuse, source/response limits, redirect refusal, explicit selected-file reads and provenance; feed parse dates, safe links, unavailable sources and bounded text.
- [ ] Implement fixed-host no-credential public reads with deadlines and honest partial/error states. No fetch during import/build.
- [ ] Run targeted tests and full suite; commit only task-owned files.

### Task 3: Personalised UI and web-app practice

**Files:** New `app/components/learner-*`, `app/projects/page.tsx`, `app/radar/page.tsx`, `app/profile/page.tsx`, `app/journey.css`; modify Today, navigation/layout, learning renderer/catalog/progress and related tests.

**Interfaces:** Consume Task 1 domain and APIs and Task 2 source result types. Guest storage is versioned, validated and clearable; explicit account saving and conflicts are visible. Reuse existing `Modal`/`AreaTour` and do not touch protected workspace reasoning.

- [ ] Add meaningful tests for new mission IDs/progress and reference-safe rendering/selection logic before behavior changes. Do not write tests mirroring decorative markup.
- [ ] Implement goal-first onboarding and baseline, one explained recommendation, inspectable skill map, profile/settings and explicit account persistence.
- [ ] Implement Projects file selection, public-only scope, source excerpts, provenance, removal and mission link; Radar source filters, Refresh, per-source errors and optional real pulse.
- [ ] Add async, SQL and server ownership missions (18 total checkpoints), with readable examples, feedback, hints, once-only points and next actions; preserve old progress.
- [ ] Browser-test the journey and all navigable states; run TypeScript and suite; commit task-owned files.

### Task 4: Language reference shelf and operator docs

**Files:** Create `public/reference/`, `lib/learning/reference.ts`, `app/learn/library/page.tsx`, reference component and safe renderer; modify README and pilot instructions.

**Interfaces:** Generated allowlisted index maps exact language/slug/title to static Markdown URL. Fetch one note on selection; safe text-only Markdown renderer, optional heading search, no raw HTML.

- [ ] Verify ZIP names and file sizes; import only its 100 Markdown files and generate the bounded index with provenance.
- [ ] Add usable language/topic navigation, clear reference/practice distinction, safe code rendering and failure states.
- [ ] Verify traversal/XSS-safe indexing and representative notes; update operator testing steps and external setup limits.

### Task 5: Integration, fresh review and delivery

**Files:** Final integration changes and verification record under this plan's ignored work ledger.

- [ ] Run all tests, TypeScript and production build. Exercise the public UI in the managed browser without fabricating native authentication.
- [ ] Dispatch a fresh independent reviewer against the full change and the Review focus above; fix substantive findings with appropriate regression checks.
- [ ] Commit all verified source, publish exact tree to current draft PR, observe CI, package/deploy existing owner-private Site, and record exact hashes/IDs.
- [ ] Handoff deployed URL, what users can test, and remaining private-GitHub/live-Meta/authentication limits.
