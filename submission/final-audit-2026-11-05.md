# GroundTruth — completed strengthening pass

Verified 5 November 2026, Singapore time. The deployed application commit is `1e1bcfaa848150f90caf890e8d32471336f5e084`; Vercel deployment `dpl_23T8RW7JX4r21MZ5zoLuTUZo86nE` is READY at [GroundTruth](https://groundtruth-meta.vercel.app/login). The [release manifest](release-manifest.json) owns the exact version, checks and media facts. Later evidence-only commits do not change the deployed runtime trees.

The MVP now demonstrates one connected journey: understand the source and responsibilities, make a small reviewed change, answer independently, try a fresh variation, explicitly share the path and inspect a qualified teacher review. This is a stronger submission because the central claim can be inspected in the product, rather than inferred from a finished project or a numerical mastery score.

## Findings addressed

| Earlier gap | Completed change | Verification |
| --- | --- | --- |
| Judges needed accounts and a long setup | One-click private two-hour sample; prepared Meta overview/concepts labelled; questions remain live | Two isolated API visitors; public mobile entry; namespace, expiry, quota and cleanup regressions |
| Teacher could not easily identify or assess shared work | Learner/class identity, explicit named-teacher sharing, Needs review/Reviewed queue, original answers, captured source/diff and saved review | [13 preview checks](evaluation/live-acceptance.json), browser save and [6 final production checks](evaluation/production-acceptance.json) |
| Submitting work could look like mastery | Removed displayed percentages; show attempts, awaiting-review counts and review states | UI captures and state regressions; an incorrect answer remains incorrect and immutable |
| Questions did not establish understanding of an actual edit | Server reconstructs an owned applied proposal with before/after source, hashes and diff; linked fresh variation retains its parent | Live manual 80→100 change, MCQ, coding task and variation; stale/foreign/no-op guards |
| Hints/preview could show original code after a change | Hint and own-record preview retain the question’s captured changed source | Regression and live production hint quotes the 100-character comparison |
| Shuffled MCQ review notes could refer to old letters | Remap explicit answer/option references consistently while preserving code/source literals | Six deterministic shuffle regressions. The final live MCQ had no letter references, so live remapping coverage is not claimed |
| Useful code later in a file could be lost | Focus source windows before truncating; distribute evidence across selected files | Source-selection regressions, complete-file viewer and bounded-coverage labels |
| Valid JSON was being treated as enough evidence | Separate schema/citation checks from source-assisted content review and retain concerns | [12 baseline outputs: 8 pass / 4 concern; four separate passing rechecks](evaluation/model-evaluation.md), 16 actual Meta requests |
| Independent changes lacked a behavioral example | Hash-checked owned helper, prescribed 80→100 change and fresh minimum-three fixture; downloaded cloud draft matched exact expected bytes | [120/120 behavior checks and 4 guard tests](evaluation/trusted-title-boundary-proof.md). The downloaded file was compared as data, not executed |
| Demo reached product/teacher evidence too late | New V3 edit: product at 0s, teacher evidence at 17.75s, readable source close-ups, synthetic labels and closing URL | 178.5s, 1080p/24fps, full decode; public byte/range/caption checks and browser playback/seek |
| Source rights and packet consistency were incomplete | MIT implementation and sample licensing; collaborator/upstream notices; refreshed story, pitch, architecture, form copy and evidence manifest | LICENSE, NOTICE, pinned fixture licenses and packet validation |

The teacher queue also opens attempts on demand, and the short-code editor has room for a small function. Public landing checks at 1440, 768 and 375 pixels show an entry action above the fold and no horizontal overflow. The mobile workspace and own-record teacher preview were also observed in the public release.

## Evidence boundaries

- **288 application tests**, **4 separate trusted-fixture guard tests**, typecheck, lint, local production build and Vercel build passed. A separate Codex review ran 33 focused checks and found no release blockers in its scope. These are engineering checks, not human validation.
- Supabase has **33 tables with RLS enabled** and no security-advisor findings in the recorded check. The private backend uses a restricted server role; end-user authorization is enforced in application predicates. This is not per-user database RLS or a security certification.
- The final production recheck used two existing synthetic sessions and exactly two new Meta calls. Original answers and the earlier labelled operator review remained unchanged. Model receipts contain numeric timing/usage and status, without raw prompts, source, answers or credentials.
- TinyFish completed the learner flow but reported a teacher-preview redirect. Normal browser clicks and authenticated page/API requests on preview and production did not reproduce it. The discrepancy remains recorded in [tooling QA](evaluation/tooling-qa.json), rather than being silently counted as a pass.
- The video uses edited real captures and approved, unchanged Alyssa audio. Public MP4/VTT/poster hashes match the reviewed files; playback advanced and seeking reached the ending. Full linear browser playback and a full audible listening review were not performed. The old spoken provisional-index line is retained verbatim with an explicit current-state clarification.

## Remaining product and validation limits

There are **no external learners, educators, feedback quotes or measured learning outcomes (n = 0)**. The participant confirmed that no participants are available before the deadline. A [future protocol](evaluation/user-study-plan.md) and [not-conducted record](evaluation/user-study-results.json) are included. Operator-authored answers, synthetic teacher reviews, source-assisted model inspection and automation do not establish learning gains, fairer grades, authorship, outside-AI detection, teacher time savings or model superiority.

The small content review covers three deliberately small JavaScript repositories. It does not establish broad repository/language coverage or repeated-run reliability. Historical stored MCQ notes are not rewritten. Imported project code and submitted snippets are not executed by the website. Teacher quiz authoring, assignment distribution and cohort analytics remain future work.

## Participant handoff

The current deliverables are in [REVIEW_FIRST.md](REVIEW_FIRST.md). The local form copy is current; the official portal was not edited or submitted during this strengthening pass, and an earlier prepared portal draft may require replacement. Publishing consent remains unchecked. The participant reviews the video, wording, rights and final declaration before submitting personally.
