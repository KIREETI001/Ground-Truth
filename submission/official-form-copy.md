# Official form copy — current local review copy

**Local copy ready for participant review/paste. No official portal fields were updated or submitted in this goal, and no publishing consent was accepted.** An earlier populated portal draft may be stale. The values below match [form-values.json](form-values.json); they are not a statement that the portal currently matches.

Application runtime: `1e1bcfaa848150f90caf890e8d32471336f5e084`. Production: `dpl_23T8RW7JX4r21MZ5zoLuTUZo86nE` (**READY**) at [the canonical app](https://groundtruth-meta.vercel.app/login). A following documentation/evidence-only commit leaves this deployed runtime unchanged. [Production evidence](evaluation/production-acceptance.json), [media HTTP verification](video-publication-verification.json) and [browser observations](evaluation/browser-verification.json) are complete.

The form was previously inspected on 5 November 2026. The participant must recheck current required fields and declarations before any authorized submission. Local narrative limits are 3,000 characters each and partner feedback 150.

## Participant-confirmed fields

- Team: GroundTruth
- Solo entrant: Kireeti Kumar (`kireeti2`)
- Track: Indie Developer Track
- Problem: Build for Your World
- Likelihood of building with Meta Model API: Very likely
- Overall opinion: Very favorable

## Project Description

2217 / 3000 characters.

```text
AI can produce a working app before its builder understands the system. When a small requirement changes, the builder may still need an assistant to reread the repository. GroundTruth helps them trace actual code, think in system responsibilities and try the next change independently.

A judge starts with Try sample learning path: an isolated two-hour synthetic learner session and private practice copy, with no shared password. The pinned overview and concepts were prepared with Meta; new questions still make live requests. The learner follows request → validation → persistence, chooses a concept and answers an MCQ or tiny coding task. New in-app study assistance pauses during an independent attempt, and the original submission is preserved before feedback.

The learner can manually raise a title limit from 80 to 100 in an owned cloud draft, review and apply its diff, then request a task grounded in the stored before/after source and hashes. A linked fresh variation retains both attempts. The hosted app does not execute imported code or submitted snippets, or push changes to GitHub. Separate fixed demo checks are operator engineering evidence.

For human review, a learner explicitly shares a chosen path with an enrolled approved teacher selected by name. The teacher sees privacy-scoped learner/class context, filters answers awaiting review, inspects original responses and source, and saves a qualified judgement and next step. Enrollment alone does not share projects. A read-only teacher perspective lets each demo visitor inspect only their own sample without receiving teacher privileges.

Concept evidence uses observed/reviewed states, not a mastery percentage. GroundTruth cannot detect outside AI, prove authorship or automatically grade understanding. Teacher-side AI quiz authoring, assignment distribution and cohort analytics remain future work.

The implementation uses Muse Spark 1.3 Standard through Meta Model API, Next.js/Vercel and Supabase PostgreSQL. There are no external user-study participants or feedback (n = 0); tests and operator/TinyFish QA do not establish learning gains, fairer grading or reduced marking time.

Live demo: https://groundtruth-meta.vercel.app/login
```

## Describe your use of Meta products to build the submitted project

2481 / 3000 characters.

```text
GroundTruth uses Muse Spark 1.3 Standard through Meta Model API to turn selected public source and a learner goal into workflow maps, beginner overviews, concept suggestions, MCQs, small coding tasks, source-grounded hints, formative follow-up questions and controlled edit proposals.

The same direct structured-output integration supports code → concepts → independent practice → a small applied change → human review. The server validates output shape and allowed source references. Relevant-line selection prioritizes useful code within a bounded context; valid JSON is not proof of factual correctness or one unambiguous answer.

Change-linked questions receive before/after source, hashes and a reconstructed diff from an owned stored applied proposal. Fresh-variation tasks link an earlier submitted attempt while retaining both original answers. The model cannot create the provenance by accepting arbitrary client text.

The application owns opaque sessions, roles, private projects, explicit teacher shares, budgets, independent-mode transitions and immutable answers. Starting an independent attempt pauses new study assistance. A teacher reviews authorized committed evidence; Meta does not grant access, infer outside AI use, certify mastery or award a grade. Teacher quiz authoring and assignment management are future work.

The judge sample reuses a validated Meta-prepared overview and concepts, clearly labelled. New questions require new Meta calls. Sanitized receipts record task/provider/model/status/timing and available numeric usage without prompts or learner answers. Prerecorded video is demonstration material, not fresh inference evidence.

Earlier workflow development used local Qwen via llama.cpp. That is not Meta usage. Codex assisted coding, debugging, tests and documentation; it is not Muse Code. Runtime credentials remain server-only and no silent local or canned-question fallback is used. Selected context leaves the device; Standard mode's no-training policy is not a zero-retention claim.

Verification separates 12 baseline content-review outputs (8 pass, 4 concern), four successful separate rechecks (16 total requests), 13/13 preview checks with six Meta calls, and 6/6 final-production checks with two new calls. Earlier answers remained intact; private guidance stayed hidden before commitment. Codex/operator review and engineering checks do not establish educational effectiveness, assessment validity or comparative model quality.
```

## Why are Meta's models important to your solution?

2179 / 3000 characters.

```text
GroundTruth needs contextual code reasoning and small, consistent teaching outputs. Muse Spark 1.3 supports the coding and structured-output workflow we use: selected source becomes an overview, concepts and one focused task through a validated integration.

The meaningful use is a question about the learner's actual code and applied diff. It creates something a human can inspect alongside a polished take-home artifact: the learner's original response. GroundTruth pauses new in-app study assistance during that attempt and keeps the response. Meta scaffolds exploration; a teacher decides what the evidence supports and which fresh follow-up would help.

Structured output keeps the interface consistent across repositories. Source-reference checks constrain citations, and trusted change context ties a task to a real saved edit. Generated explanations, MCQ keys and review suggestions can still be wrong. The model cannot award mastery, change roles or bypass independent mode.

Frequent small interactions also need bounded context and observable failure. We use selected relevant source and record sanitized provider timing/status/usage where available. Prepared sample context reduces entry friction, while fresh questions remain live. These are design choices, not measured token savings or a guarantee of latency.

We use the Standard model ID, for which Meta states content is not used for model training. Selected inputs still leave the device, and we make no zero-retention claim. The direct server-side integration has no silent preset/local fallback.

A small Codex source/content review recorded 8 pass and 4 concern across 12 baseline outputs; four separate rechecks passed (16 requests total), with baseline concerns retained. There is no provider-comparison benchmark and no external user study (n = 0). We do not claim Meta is faster, cheaper, more accurate or safer than alternatives, or that GroundTruth improves grades or saves marking time. Teacher-side AI quiz authoring and cohort analytics are future work.

Meta supplies contextual teaching content; GroundTruth contributes the source-to-change-to-independent-attempt-to-human-review loop around it.
```

## Partner technology feedback

122 / 150 characters.

```text
Meta supplies contextual practice; Vercel hosts the app; Supabase stores source-linked attempts for optional human review.
```

## Public GitHub repository

https://github.com/KIREETI001/Ground-Truth

Verified **application** release: `1e1bcfaa848150f90caf890e8d32471336f5e084`. The public study-task sample is a demo input, not the GroundTruth implementation source submission. MIT licensing, NOTICE and [pinned upstream licenses](evaluation/licenses/README.md) are retained.

## Three-minute demo video

https://groundtruth-meta.vercel.app/demo

V3: **178.5 seconds, 1920×1080, 24 fps, 8,538,917 bytes**. SHA-256 `f6dbbb920be896a4311ec187dd597cd4dae92ec48e808d862b2043543e6e3a94`; 64 caption cues. Public HTTP/hash/range checks passed. Actual browser playback advanced to 36.94 seconds and seeked to 178.5/back to 176.715 with readyState 4. Full linear playback and listening review were **not performed**.

Edited/prerecorded captures and prepared Meta outputs are labelled; they do not demonstrate a fresh inference request at playback. Approved narration/captions remain verbatim, including the legacy provisional-index line, with an explicit current-state clarification at 156.4–165.4 seconds. All shown accounts/classes/reviews are synthetic operator QA, not external educator validation.

## Local controls and participant review

- `publishingConsent`: **false**.
- `submitted`: **false**.
- `participantReviewRequired`: **true**.
- `localCopyOnly`: **true**.
- `officialPortalUpdatedThisGoal`: **false**.
- `officialPortalSubmittedThisGoal`: **false**.
- `existingPortalDraftMayBeStale`: **true**.
- Optional viral X post URL stays blank unless the participant supplies a relevant real post. Optional personal ratings/declarations must reflect their actual experience; Codex is not Muse Code.
- No external usability sessions or feedback: not conducted, n = 0. Operator/Codex/TinyFish QA is separate from participant evidence and learning outcomes.
- TinyFish reported a teacher-preview sign-in redirect that normal authenticated browser/API checks did not reproduce; the discrepancy remains documented.
- A local copy, deployment, video or old portal draft is not a submission receipt. Final participant review, listening review and any official portal action remain theirs.
