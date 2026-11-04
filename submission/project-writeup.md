# GroundTruth

**Participant review draft. Revised release: `1e1bcfaa848150f90caf890e8d32471336f5e084` / `dpl_23T8RW7JX4r21MZ5zoLuTUZo86nE` (READY).** The application is verified at [the canonical deployment](https://groundtruth-meta.vercel.app/login). A following documentation/evidence commit does not change that runtime. No official form was updated or submitted in this goal; the current local copy and publishing declaration remain for participant review.

## Tagline

Let AI cook. Know the recipe.

## One sentence

GroundTruth connects actual code to a small independent change and an original attempt that a teacher can review.

## The problem

AI can produce a working application before its builder understands the system. When a one-line requirement changes, the builder may still need an assistant to reread the repository. The missing piece is a mental model: where a request enters, which component owns validation, and what must hold before persistence.

Teachers face a connected problem. A polished AI-assisted take-home artifact reveals the final software, but may reveal little about the learner's independent reasoning. Responsible AI learning needs space for guided exploration and a separate opportunity to try independently. The teacher needs inspectable evidence to choose a useful follow-up without treating software polish or an AI-use guess as a grade.

## The journey

A judge opens `/login` and chooses Try sample learning path. The revised implementation creates a separate synthetic learner session, pinned sample project and private practice copy for that visitor. It expires after two hours. The overview and concepts were prepared with Meta; requesting a new question still makes a live model call. No shared password or teacher approval is needed for sample entry.

The learner follows request → validation → persistence in a small public task application. They inspect selected source, read the workflow overview and choose a concept. An MCQ or short coding task gives them one concrete decision. Starting an independent attempt pauses new in-app study assistance; submission preserves the original response before feedback. End attempt is available when the learner needs to stop.

Next, the learner manually raises the title limit from 80 to 100 in an owned private cloud draft, reviews the one-line diff and explicitly applies it. An understanding check uses the owned applied proposal, before/after source hashes and reconstructed diff. A linked fresh variation supplies another task using the same idea. Initial, practice and variation attempts remain separate records. This linkage makes evidence inspectable; it does not by itself prove transfer or improvement.

The visitor can open `/demo/teacher` to inspect their own synthetic record in a read-only teacher-shaped view. It grants no Teacher role, exposes no other visitor and cannot save an assessment. In the classroom workflow, an enrolled learner explicitly selects an approved teacher and shares a chosen path. The teacher sees learner/class context, filters work awaiting review, inspects the committed answer and relevant source, and records a qualified human judgement and next step.

A teacher's review is evidence about that task. Displayed concept states distinguish unattempted, submitted/unreviewed and human-reviewed work; they do not award a mastery percentage because an answer was submitted. Class enrollment does not automatically share every project.

## What Meta contributes

GroundTruth calls Muse Spark 1.3 Standard through Meta Model API for repository/workflow maps, beginner overviews, concepts, MCQs, small coding prompts, source-grounded hints, formative follow-up questions and controlled edit proposals. Structured output keeps task interfaces consistent. Application validation checks shape and permitted source references; semantic correctness still needs review.

For an applied edit, Meta receives trusted before/after context and the reconstructed diff. For a fresh variation, the application links the earlier submitted task while retaining both original answers. The model supplies contextual teaching content; the application controls access, state, budgets, immutable submissions and the independent-mode boundary. See [why-meta.md](why-meta.md).

## How it is built

Next.js on Vercel serves the browser and authorized API. Supabase PostgreSQL stores accounts, private paths, exercises, class enrollment, explicit shares and human reviews. Credentials remain server-side. Public GitHub source is tied to a commit; inference uses bounded relevant selection rather than a claim of complete repository understanding.

Cloud drafts preserve original/current source and reviewed proposals with hash checks. They do not push to GitHub or execute imported/student code. Separately reported fixed sample-fixture checks are operator-run engineering evidence, not arbitrary code execution in the web app.

Sanitized inference receipts retain task, provider/model, status, latency and available numeric usage. They omit prompts and learner answers. These help distinguish a prepared artifact, a successful new provider request and a visible failure. Exact final results, migration and deployment IDs belong in the [release manifest](release-manifest.json).

## What has and has not been evaluated

The final application suite passed 288 tests; four separate trusted-fixture guards and 120 helper behavior checks passed. The actual browser-downloaded 100-limit file matched its trusted hash without execution. [Preview acceptance](evaluation/live-acceptance.json) passed 13/13 checks with six Meta requests on its recorded preview release; [final production acceptance](evaluation/production-acceptance.json) passed 6/6 checks with two new requests on the application release above. It preserved earlier answers and confirmed private guidance before commitment, captured 100-limit hints and own-record preview.

The [small content review](evaluation/model-evaluation.md) retained its 12-output baseline: Codex inspection recorded eight pass and four concern. Four separate mitigation rechecks passed, for 16 total provider requests in that content evaluation. These are not head-to-head model results or external teacher validation. An independent Codex release review passed 33 focused checks without a release blocker. Historical [Meta adapter evidence](meta-verification.json) remains separate.

[Hosted media verification](video-publication-verification.json) and [normal-browser observations](evaluation/browser-verification.json) identify the 178.5-second V3 video. Playback advanced to 36.94 seconds, seeked to 178.5 and back to 176.715 with readyState 4; full linear playback/listening review was not performed. The approved narration remains verbatim with a current-state clarification at 156.4–165.4 seconds. TinyFish’s reported teacher-preview redirect was not reproduced in normal authenticated browser/API checks; the discrepancy is retained in [tooling QA](evaluation/tooling-qa.json).

There are no external user-study participants or collected feedback: **not conducted, n = 0**. Automated tests, operator review and TinyFish browser checks are engineering/QA evidence. A future [usability protocol and response sheet](evaluation/user-study-plan.md) is prepared. None establishes learning gains, retention, assessment validity, fairer grades, reduced marking time, lower token spending or superiority over another model.

## Scope and limits

GroundTruth cannot detect outside AI use, establish authorship or prevent external tools during an independent attempt. Suggested MCQ keys and model review guidance can be wrong. A fresh question is an observable opportunity to reason; a human must decide what the response supports.

Public source coverage is bounded; the reading flow is not a complete call graph, security audit or standards certification. Selected code and contextual inputs leave the device for Meta processing. Normal saved paths and temporary demos have different expiry rules; visibility expiry is not a blanket claim of scheduled physical deletion.

Teacher-side AI quiz authoring, assignment distribution, cohort analytics, private-repository OAuth, arbitrary-code execution and model comparison studies remain future work.

## Original work and license

The participant confirmed a solo hackathon entry as Kireeti Kumar and authorized the [MIT license](../LICENSE) for the submitted implementation. Earlier GroundTruth ideation is credited to Attili Kireeti, Delfine Yew, V Narthananilaa and Dr. Wesley Tan, separately from the hackathon roster. [NOTICE](../NOTICE) retains that attribution and third-party notices.

Codex assisted implementation, debugging, tests and documentation. Earlier local work used Qwen via llama.cpp; that is not Meta usage. Third-party components retain their own licenses. External research motivates the problem but does not evaluate GroundTruth; see [research-evidence.md](research-evidence.md).
