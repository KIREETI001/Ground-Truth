# GroundTruth learning experience implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GroundTruth immediately playable and easy to navigate, with three concept missions and a guided live playground.

**Architecture:** Retain the Vinext app and all server APIs. Add a small original lesson catalog and browser-local progress helpers, reuse one interactive mission view, and reshape the existing live workspace through presentation and procedural guidance. Public practice and finalized lab evidence remain separate.

**Tech Stack:** React 19, TypeScript, existing Lucide icons, CSS, Node test runner, Vinext/Cloudflare.

**Spec:** `docs/superpowers/specs/2026-10-28-learning-experience-design.md`

## Global Constraints

- Preserve all existing server contracts, native sign-in, enrollment, consent, retention, run recovery, and saved evidence.
- Main text/controls 16–18px; secondary instructions at least 14px; code at least 14px; metadata at least 12px; interactive targets at least 44px.
- Three public original missions, three checkpoints each, ten local practice points per checkpoint, ninety maximum; repeat completion awards nothing extra.
- Public practice stays browser-local; validate storage and handle unavailable/corrupt storage. No grading, certification, external-account linkage, or copied platform problems.
- Independent phases `transfer` and `transfer_repair` allow procedural help only. No answer-bearing hints or earlier reasoning; no model coaching.
- Preserve private Site access, enrollment code, disabled model state, and all database contents. No arbitrary execution or new runtime dependencies.

## Review Focus

- Refresh or browser storage denial during a mission must not silently award points twice, skip checkpoints, or crash.
- Wrong choice, repeated check, replay, and reset must have clear feedback and predictable progression.
- Optional unfinished lab runs, resumed activity, source switching, and repaired phases retain existing run and prediction dependencies.
- Guide/tour dismissal, focus, narrow viewports, and independent-case transitions must not obstruct controls or disclose solutions.
- External practice labels must reflect the linked resource, with no affiliation, certification guarantee, or reported completion.

---

### Task 1: Complete experience rebuild

**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/components/brand.tsx`, `app/workspace/page.tsx`, `app/components/lab-ui.tsx` as needed.
- Create: `app/learn/page.tsx`, lesson/guide components and CSS as needed.
- Create: `lib/learning/*.ts` for catalog and validated progress behavior.
- Create: meaningful `tests/learning.test.ts` and guide-state boundary tests if new guide logic needs them.

**Interfaces:**
- Consumes existing `LearningSession`, `InvestigationCase`, `Me`, `SourceView`, and workspace helper contracts unchanged.
- Produces `/learn`, three reusable concept missions, browser-local checkpoint progress, playable home warmup, contextual workspace guidance, and responsive typography.
- Use stable checkpoint IDs and export the exact catalog/progress helpers used by the UI so tests exercise real behavior.

- [ ] Write and run failing tests for duplicate checkpoint awards, unknown/corrupt stored progress, reset behavior, and procedural-only independent guidance before implementing those behaviors.
- [ ] Implement the minimal validated learning/guide helpers and make those tests pass.
- [ ] Replace the landing copy and visual structure; build `/learn` with answer feedback, hints, retry, explicit Continue, local progress/path, reset, and verified external handoffs.
- [ ] Rework the workspace presentation and navigation; add phase-aware next action, readable source/evidence, milestone progress, and replayable dismissible tour/help. Preserve all existing mutations and integrity checks.
- [ ] Test interactions in the existing cloud preview; check visible feedback and keyboard labels. Root coordinates browser testing and handles hosted publication.
- [ ] Run `npm test` and `npm run typecheck`. Record command outcomes and any limits in the task report. Do not commit unrelated files or deploy.

### Task 2: Review, verify, and deliver

**Files:**
- Modify: README and pilot moderator guidance to match the new entry flow.
- Review all Task 1 changed source and tests; keep unrelated backend source unchanged.

**Interfaces:**
- Consumes Task 1 implementation and test evidence.
- Produces reviewed commits, exact GitHub tree, successful CI and private Site update.

- [ ] Run focused whole-change review for design acceptance, learning correctness, state restoration, independent guidance boundaries, and live-run regression hazards.
- [ ] Fix material findings with focused verification; inspect home, public mission completion, progress restoration, and live gate in cloud browser.
- [ ] Run the full test suite, typecheck, and production build. Save logs in ignored task workspace.
- [ ] Update README/pilot navigation and commit exact source. Publish to existing draft PR branch and private Site without changing audience or runtime secrets.
- [ ] Report the working link, concrete new interactions, validation, and any external-account verification still outstanding.
