# GroundTruth — current-state submission audit

Audited 5 November 2026, Singapore time. Live application: https://groundtruth-meta.vercel.app. Deployed application commit: `4fe6afdc960bcb2d9f7b0e099b8bca0854fb20a5`; repository HEAD `cba597f` adds publication evidence. This audit created only local report/screenshot artifacts. No application features, learner answers, teacher reviews or submission fields were changed.

## Assessment

GroundTruth is a credible working MVP. Its strongest idea is the transition from contextual AI guidance to a preserved independent attempt that a teacher can inspect. The most consequential gap is completing and validating that transition: can a learner make a correct fresh change, and can a teacher identify the learner, inspect the evidence and choose a useful next step?

The highest-return work now is judge access, a complete learning-and-review example, question-quality evidence, submission consistency and a faster demonstration. Expanding the number of models, adding an IDE extension or building a classroom-management suite would dilute the remaining time.

## Official judging and time constraint

The authenticated official rules were read in the browser. Project scoring is **impact 30%, Meta AI tooling 25%, technical depth/execution 20%, demo 25%**. These are project judging weights, distinct from application-selection criteria. The public landing page and current authenticated announcements agree on **5 November 2026, 10:00 a.m. Singapore time**. No extension was observed.

Sources: [Official rules](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver), [event and deadline](https://cerebralvalley.ai/e/meta-ai-developer-hackathon), [authenticated announcements](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon).

| Criterion | Current useful evidence | Best addition |
| --- | --- | --- |
| Impact — 30% | A clear learner/teacher problem and relevant external research | Observations from actual learners and an educator using GroundTruth |
| Meta — 25% | Genuine Muse Spark calls across eight task types, structured/source validation | A source → diff → question → fresh attempt → human review example, plus semantic quality checks |
| Technical — 20% | 246 passing tests at the latest release, server authorization, immutable answers, independent-state locks, verified hosting | Close specific teacher/judge usability gaps; accurately describe the source and database boundaries |
| Demo — 25% | Working public application, 178.5-second 1080p video, captions and verified hosted playback | Reach the actual product sooner and provide a fast, isolated judge journey |

## What is already solid

- Real Meta inference is integrated; provider failure is not silently replaced with preset questions or local output.
- Selected GitHub source is pinned and checked. The interface supports workflow-first entry, an overview, source inspection, concepts, MCQs and short coding tasks.
- New in-app assistance pauses during an independent attempt; ending an attempt is supported; original submitted responses are preserved.
- Student/teacher/developer access is controlled on the server. Sharing is explicit, and class enrollment does not automatically reveal every project.
- Cloud drafts have diff review, explicit application, source-hash/concurrency checks and backups. They do not push to GitHub or execute arbitrary imported code.
- The new video and its 64 caption cues are genuinely published. The latest publication verification records a matching MP4 hash, HTTP 206 seeking and browser playback at 1920×1080.

These are engineering and workflow observations, not a full security certification, model-quality benchmark or proof of learning gains.

## Point-in-time production evidence

Read-only database aggregates found **3 accounts, 2 learning projects, 1 class, 2 submitted exercises and 0 saved teacher reviews**. Both projects are shared. No independent exercise was active. There was no active global registration throttle at the checked instant.

This is consistent with a synthetic demo. It is not evidence of a real external pilot or improved learning. The teacher-review capability exists, but the example data does not yet complete it with a saved human judgement.

## Ranked findings and concrete fixes

### P0 — Resolve the open-source license before submission

The organizer announcement explicitly calls an open-source GitHub project mandatory. The repository is public, but its tracked license files cover a build plugin and vendored UI components; there is no project-level license or first-party license declaration in the README/package.

**Next step:** choose and add an appropriate license for code the entrant has the right to license, retain dependency notices and preserve the prior-ideation attribution. Ownership/rights cannot be determined from this code audit. Do not silently license earlier collaborators' material or accept the competition's representations for them.

[GitHub explains why public visibility alone is insufficient for an open-source project](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository). The official rules also contain entrant ownership/originality representations; those remain the participant's responsibility to review.

### P0 — Make the judge's first useful experience immediate and isolated

The landing page offers login/signup but no visible sample-path or demo entry. The judge guide asks a visitor to register, import a repo, wait for several model calls, create exercises and arrange a separate approved teacher account.

Registration has one global bucket of eight requests per ten minutes and a 64-account ceiling. These are pilot limits, not a current outage: there are only three accounts. However, one shared demo password is also fragile because login replaces that account's earlier session.

**Next step:** provide an obvious sample-repository route with an isolated visitor session, a cached genuinely Meta-generated map and a clear action to generate a fresh question from the visitor's goal. Offer a separate read-only synthetic teacher example. Keep actual teacher/developer permissions intact. Do not substitute canned questions or expose developer credentials.

**Acceptance:** an unfamiliar judge reaches a useful source-linked question in under two minutes without operator approval, and two judges can explore concurrently without invalidating each other.

Evidence: [landing](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/app/login/page.tsx:8>), [registration limits](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/lib/server/local-auth.ts:58>), [session replacement](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/lib/server/local-auth.ts:36>).

### P1 — Finish the teacher's basic review workflow

Shared cards identify a repository and goal, but do not identify the student. The API view omits learner identity. Students sharing the same assignment repository would be difficult to distinguish. Sharing also asks the learner to type a raw teacher account ID, even when a class already identifies the teacher. Teacher evidence is largely an accordion list and raw activity JSON; MCQ alternatives/rationale are not presented as a review bundle.

**Next step:** add a privacy-scoped learner display name/class, an explicit enrolled-teacher selector, a needs-review filter and a compact evidence summary containing original answer, source, question alternatives and relevant assistance. Complete one saved human review and follow-up note in the demo.

**Acceptance:** a teacher distinguishes two learners working on the same repository, reviews the intended original answer and saves a qualified next step. Keep broad cohort charts and automated grading outside this change.

Evidence: [project view response](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/lib/study/server.ts:35>), [teacher interface](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/app/components/teacher-projects.tsx:15>), [sharing form](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/app/components/study-panels.tsx:60>).

### P1 — Tie understanding checks to the actual edit and a fresh transfer task

After an edit, “Check my understanding” sends the current file path. Meta receives current source, goal and concept, but not the original content, applied diff or change summary. It can therefore ask a general file question unrelated to the change. Coding answers are stored rather than executed, and there is no explicit baseline/post-learning linkage.

**Next step:** attach the original/current source hashes and relevant diff to the generated MCQ or short coding task. Follow guided practice with a new variation requiring the same concept. Preserve both original attempts and the teacher's interpretation.

**Acceptance example:** study the title-validation helper; independently change its maximum from 80 to 100; check 100/101-character and blank inputs in the trusted demo fixture; then solve a fresh small boundary variation. Show the downloaded/manual change and expected behavior. This can be demonstrated without adding arbitrary-code execution to the web app.

Evidence: [understanding action](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/app/components/controlled-changes.tsx:24>), [exercise generation context](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/lib/study/server.ts:229>).

### P1 — Validate the generated content, not only its JSON shape

Current MCQ validation checks four distinct alternatives and key membership. It does not establish factual correctness or one uniquely defensible answer. The successful eight-task Meta checkpoint uses one small demo repository. It is not a semantic evaluation across projects.

Source context is also narrow: up to 48 catalogued paths, three sampled files, a 10,000-character prefix budget and an allowed evidence list using the first eight qualifying lines. A valid source reference can still miss the relevant responsibility or later function.

**Next step:** human-review a small disclosed set of dynamically generated MCQs, coding tasks and hints over several pinned small repositories. Check answer correctness/ambiguity, task feasibility, relevant source citations and answer leakage. Record denominators and failures. Select relevant functions before truncation, rather than simply increasing the context window.

**Acceptance:** publish an honest compact evaluation such as “N outputs reviewed across M repositories,” with actual error counts and examples. Do not invent a success percentage or claim superiority to other models without a comparison.

Evidence: [MCQ checks](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/lib/study/model.ts:169>), [evidence selection](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/lib/study/model.ts:81>), [context selection](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/lib/study/source.ts:20>), [actual Meta checkpoint](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/submission/meta-verification.json>).

### P1 — Gather a small amount of GroundTruth-specific user evidence

Published studies motivate the problem. They do not evaluate this product. The current write-up puts usability and independent-change evaluation in future work, and production aggregates do not establish external participation.

**Next step:** if available before the deadline, observe two or three learners and an educator/reviewer on one brief task. Record whether they find the responsible source, make the requested change, where they get stuck and whether the teacher can identify a useful follow-up. Use permission for any attributable quote.

**Acceptance:** report the actual small sample, completion observations and changes made from feedback. A small usability pilot is useful evidence of usability; it is not a causal study of retention or learning improvement. If people are unavailable, keep the validation plan explicit and report the limitation.

### P1 — Replace the prominent /100 index with interpretable evidence

An unreviewed submitted attempt gets 25 points regardless of correctness. Human labels map to 0/40/70/100, and the overall index averages generated concepts. A wrong answer can therefore increase the number; generating a different number of concept nodes changes the denominator. Tooltips disclose the provisional meaning, but the display still resembles a measured mastery score.

**Next step:** show states such as not attempted, original attempt saved, needs support and demonstrated on a fresh task, alongside attempt count, reviewer/date and source context. A task-completion fraction can be shown separately if it measures actual completion.

Evidence: [index calculation](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/lib/study/server.ts:31>), [concept display](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/app/components/concept-tree.tsx:5>).

### P1 — Put working product evidence earlier in the video

The current 178.5-second cut works and is captioned. However, the first actual product UI appears at 51.631 seconds; independent practice at 114.75; teacher evidence at 134.7. The edit contains 57 seconds of demonstration breaks around 118.465 seconds of speech. It has explanatory animation and screenshots, rather than an uninterrupted interaction recording.

**Next step:** put actual product interaction inside the first 15–20 seconds and the teacher payoff before approximately 90 seconds. Record one coherent action sequence succeeding, then use the remaining time to show the problem, relevant research and implementation. Reuse approved assets/audio when suitable. Another generative-video upgrade has lower value than showing a completed action.

Evidence: [scene timing](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/submission/video-v2/scene-cues.json>), [audio/demonstration map](<C:/Users/Kireeti/Desktop/Ground Truth/Meta Global AI Developers Hackathon/prototype/submission/video-v2/source-to-final-map.json>).

### P2 — Shorten mobile entry and make reliability observable

Live first-time entry was inspected at 1440×900, 768×1024 and 375×812 on the exact deployed build. No horizontal overflow was measured. At 375 pixels, role selection begins around y=1085, username entry around y=1450 and the sign-in action around y=1618. The first screen contains story/animation but no entry action.

**Next step:** add an immediately visible sign-in/start action on mobile and collapse or move the animation below entry. Keep current readable type rather than applying another global font increase.

The existing Meta checkpoint records roughly 11–16-second calls for map/overview/concepts/MCQ. This is not a fresh end-to-end latency benchmark. Production saves attempt reservations but not complete success/failure/latency/token receipts; most provider failures become a generic error.

**Next step:** measure an actual first journey and retain sanitized per-task timing/status/usage. Show truthful loading stages, clear retry and preserved inputs. Reuse genuinely generated map/context where appropriate while retaining fresh question generation.

Screenshots: [desktop](landing-1440.jpg), [tablet](landing-768.jpg), [mobile](landing-375.jpg). This was not a full WCAG audit, screen-reader test or Core Web Vitals benchmark; visual regression is inconclusive without an identical current baseline.

### P0 — Reconcile the submission packet

Several judge-facing files still describe an earlier release:

- `judge-guide.md:4,6,25`: an old code checkpoint, a pending final commit, 2:55 video and an obsolete proposal-verification caveat.
- `official-form-copy.md:45,49`: old commit and 2:55/720p media.
- `submission/README.md:10,22`: old video and an earlier check count.
- `release-checklist.md:18–41`: completed checks/media still marked pending.
- The new working video project remains untracked, although the published MP4/captions/poster are committed.

**Next step:** reconcile these against `release-manifest.json`, make the current transcript/media canonical and explicitly archive historical material. Preserve prior-work and AI assistance attribution. Verify the participant's accepted account/rights/declarations; the participant must retain final submission control.

## Suggested remaining-work order

1. Resolve license/rights and stale packet facts; make judge access instructions reliable.
2. Fix learner identity and sharing selection; complete one saved teacher review.
3. Demonstrate a real independent change, linking the comprehension question to its diff.
4. Obtain a small amount of actual usability/content-quality evidence within the time and budget available.
5. Recut the video around that completed journey and freeze one verified release.

If time is tight, prioritize access and one complete, convincing example over widening the feature list. Defer IDE packaging, private-repo OAuth, billing, model routing, generic cohort charts and arbitrary-code execution.

## Technical wording to keep accurate

RLS is enabled, but the restricted server role has a `USING (true)` policy; end-user isolation depends primarily on application authorization and owner predicates, not per-user database policies. No bypass was demonstrated in this audit. The selected-source reading flow is not a verified full call graph. The app cannot detect outside AI, prove authorship, certify mastery or claim measured token/marking-time/learning gains.

## Stronger submission story

Show one builder going from “the app works, but I do not know which component owns this rule” to an observable small independent change. Show Meta grounding the guidance and task in the actual code. Then show a teacher identifying the learner, reviewing the preserved answer and choosing a targeted next step. Present observed completion and remaining uncertainty plainly. That directly connects the systems-thinking goal, the classroom assessment problem and the Build for Your World theme.
