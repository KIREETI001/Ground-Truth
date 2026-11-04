# GroundTruth submission packet

**Engineering verification complete; participant review remains required. No official portal update or submission was performed in this goal, and local publishing consent remains false.** An earlier populated portal draft may be stale; the current local copy is ready for participant review/paste.

Revised release: **`1e1bcfaa848150f90caf890e8d32471336f5e084` / `dpl_23T8RW7JX4r21MZ5zoLuTUZo86nE` (READY)**. The code and narrative have been reconciled around one journey: understand actual code, make a small independent change, retain the original attempt and support human review. The canonical deployment is [groundtruth-meta.vercel.app](https://groundtruth-meta.vercel.app/login); [this unique deployment](https://groundtruth-meta-o8j3e4u38-kireeti001s-projects.vercel.app) identifies the verified build. A following documentation/evidence commit leaves its runtime unchanged.

| File | Purpose |
| --- | --- |
| [judge-guide.md](judge-guide.md) | One-click isolated sample and code-to-change-to-review route |
| [project-writeup.md](project-writeup.md) | Project story, implementation and limits |
| [official-form-copy.md](official-form-copy.md) | Local copy of observed form fields and answers |
| [form-values.json](form-values.json) | Matching local field values; no submission action |
| [why-meta.md](why-meta.md) | Direct Meta integration, model fit and evaluation boundaries |
| [architecture-and-attribution.md](architecture-and-attribution.md) | Authorization, source/data boundaries, licensing and prior work |
| [release-checklist.md](release-checklist.md) | Evidence gates for this revised release |
| [release-manifest.json](release-manifest.json) | Canonical final version, checks and media provenance |
| [production-check-summary.md](production-check-summary.md) | Production observations recorded by the release operator |
| [evaluation/user-study-plan.md](evaluation/user-study-plan.md) | Future optional usability protocol and response sheet |
| [evaluation/user-study-results.json](evaluation/user-study-results.json) | Explicit not-conducted status, n = 0 |
| [research-evidence.md](research-evidence.md) | External research context, distinct from product validation |

## Revised implementation

- `/login` offers Try sample learning path before the marketing story. Each visitor receives an isolated two-hour synthetic learner session and private practice copy.
- Prepared sample overview/concepts come from validated Meta output at a pinned public source commit. New questions still call Meta; prepared artifacts are labelled.
- An applied change provides trusted before/after source, hashes and diff for an understanding check. Linked initial/practice/fresh-variation attempts retain their original answers.
- Teachers get privacy-scoped learner/class context, explicit sharing, a review queue, readable committed evidence and saved human reviews. Displayed states replace a mastery percentage.
- `/demo/teacher` is a read-only view of the current visitor's own sample, with no teacher privilege or access to another visitor.
- Source selection prioritizes relevant lines within bounded context. Sanitized inference receipts record provider/model, task, status, timing and available usage metadata, not prompts or answers.

Verification is recorded separately: [13/13 preview checks with six Meta calls](evaluation/live-acceptance.json), [6/6 final-production checks with two new Meta calls](evaluation/production-acceptance.json), [public media HTTP verification](video-publication-verification.json) and [actual browser playback/layout checks](evaluation/browser-verification.json). The final suite passed 288 tests; four trusted-fixture guard tests and 120 helper behavior checks are separate counts. The [downloaded 100-limit draft](evaluation/trusted-title-boundary-proof.md) matched its exact trusted hash without executing the downloaded file. Historical [Meta acceptance evidence](meta-verification.json) is retained separately.

## Review and media

Application target: [groundtruth-meta.vercel.app](https://groundtruth-meta.vercel.app/login). Public source: [Ground-Truth](https://github.com/KIREETI001/Ground-Truth). Verified V3 video: [walkthrough page](https://groundtruth-meta.vercel.app/demo). The video is edited/prerecorded material; its presence does not demonstrate a new live inference request. V3 is 178.5 seconds, 1920×1080 at 24 fps, 8,538,917 bytes, with 64 caption cues. Public hashes/range requests and observed browser playback/seeking passed; full linear listening review was not performed. The exact approved narration remains verbatim, including its legacy provisional-index line; an explicit clarification at 156.4–165.4 seconds states that the current release uses observed/reviewed states with no validated mastery score. Historical [V2 verification](video-v2/previous-release-verification.json) is preserved separately.

The participant confirmed a solo entry as Kireeti Kumar, Indie Developer Track, Build for Your World. The observed official portal has three narrative limits of 3,000 characters and a partner-feedback limit of 150. The [official event](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) and [official rules](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver) remain the organizer's authority; later changes must be checked before submission.

## Evidence and licensing

There are **no external user-study participants or collected feedback (n = 0)**. Automated tests, operator source review, controlled sample checks and TinyFish browser QA are labelled separately. TinyFish reported a teacher-preview redirect that normal authenticated browser and API checks did not reproduce; the discrepancy is retained in [tooling QA](evaluation/tooling-qa.json). None establishes causal learning gains, assessment validity, reduced marking time or model superiority.

The submitted implementation is [MIT licensed](../LICENSE). [NOTICE](../NOTICE) preserves prior GroundTruth ideation and third-party attribution. Third-party components retain their own licenses. Teacher-side AI quiz authoring, assignment distribution and cohort analytics remain future work.
