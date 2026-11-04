# GroundTruth — engineering review and implementation plan

Objective: strengthen the working submission by completing the learner-to-teacher evidence loop, making judge entry immediate and demonstrating correct independent changes. The participant retains final submission control. No portal submission or publishing-consent acceptance is authorized.

## Decisions

- Keep Next.js/Vercel, Supabase and the direct Meta adapter. Extend the current contracts rather than replace authentication or introduce an IDE, arbitrary-code execution or unrelated model integrations.
- Judge entry creates isolated, short-lived synthetic learner sessions. Seed only a pinned public demo snapshot and genuinely generated map/overview/concepts; questions still come from Meta for the current request. A teacher preview exposes only the visitor's own synthetic record and never grants a teacher role.
- Teachers get privacy-scoped student/class identity, an explicit sharing selector, review queue and readable evidence. Replace displayed mastery percentages with observed/reviewed states.
- Comprehension exercises reference the applied change, source hashes and diff. Track initial/fresh-transfer attempts explicitly and retain original responses. Demonstrate expected behavior using the controlled sample fixture; never run arbitrary imported student code on the web server.
- Improve relevant-line selection before truncation and persist sanitized inference receipts for timing/status/usage. Shape checks remain distinct from semantic correctness.
- Reconcile all submission assets, evaluate real Meta outputs over several pinned repositories, prepare consent-based user test tasks and bring actual product evidence earlier in the video.
- The participant confirmed ownership rights and authorized MIT publication while retaining earlier collaborator attribution and third-party notices. No external participants are available before the deadline; publish the study kit and an explicit n = 0 record, without fabricated feedback or learning outcomes.

## Alternatives reviewed

One shared judge account is easy but creates session/independent-mode collisions. Isolated synthetic sessions are preferred. A public teacher account could expose other learners; an own-record read-only preview is preferred. Running arbitrary code would require a new trust boundary; fixed trusted demonstration checks plus human assessment preserve the MVP boundary. More model brands do not establish quality; a small disclosed semantic evaluation directly addresses that uncertainty.

## Parallel ownership

1. Judge entry/auth/mobile: separate demo/auth modules, login/entry UI, auth router and scoped tests.
2. Teacher/evidence UI: teacher component, sharing panel, concept state display, types, helper module and scoped tests.
3. Learning/change grounding: model/context helpers, controlled-change/workbench integration and scoped tests.
4. Root: integration in study/server.ts, shared schema coordination, migrations/telemetry, evaluation, documentation/media, production deployment and final verification.

Agents do not edit the root integration file or each other's owned files. Shared changes require a message before touching them.

## Acceptance criteria

- Two independent visitors can explore without session invalidation, answer leakage or cross-owner access; demo limits are explicit and expiry is enforced.
- Fresh Meta question generation remains real and source-bound; no silent presets/fallback. Normal student/teacher/developer authorization remains enforced.
- Teacher can identify two students using the same repo, filter unreviewed work, inspect original MCQ/coding evidence and save a human review. Joining a class still does not auto-share projects.
- Learner selects an enrolled teacher without typing a UUID. Explicit sharing consent stays separate.
- Displayed evidence states do not award a mastery percentage for merely submitting an incorrect or unreviewed answer.
- An applied edit produces a question tied to that diff; fresh transfer is linked to earlier work without overwriting original attempts or allowing hints during independent mode.
- Relevant evidence later in a file survives source selection; model receipts contain status/timing/usage but no secrets or learner answer text.
- Mobile has an entry action above the fold at 375px; desktop/tablet remain readable and without horizontal overflow.
- Report actual multi-repository Meta output review, controlled independent-change checks and real participant feedback only when received. Clearly label synthetic/reviewer evidence and remaining limits.
- The public video stays under180s, has actual product evidence early, captions/provenance and verified browser playback. All packet paths, version facts and official form copy agree.
- Required tests, typecheck, lint, production build, source credential checks and public role/ownership/independent/judge journeys pass on the exact release. Release manifest records actual production commit/deployment.

## Key risks and checks

Guest provisioning can become an abuse/retention path: rate-limit creation, reserve demo namespaces, expire data and avoid widening server permissions. Teacher evidence can leak answer keys: expose private rubric only to authorized human review or after the relevant answer is committed. Change context must be reconstructed server-side from owned proposals, never trusted client text. Stateful independent/model leases remain transactional across tabs. Content review must report ambiguity and failures rather than treating valid JSON as correctness.

Completion requires evidence against every acceptance item; a green test count alone does not complete this plan.
