# GroundTruth — verified application release

**Engineering verification complete; participant review remains required.** No official portal fields were updated or submitted in this goal. The current local form copy is ready for participant review/paste; an earlier populated portal draft may be stale. Local publishing consent remains false.

## Release identity

- Application runtime: `1e1bcfaa848150f90caf890e8d32471336f5e084`.
- Vercel production deployment: `dpl_23T8RW7JX4r21MZ5zoLuTUZo86nE`, **READY**.
- Canonical [application](https://groundtruth-meta.vercel.app/login), [demo](https://groundtruth-meta.vercel.app/demo) and [pitch](https://groundtruth-meta.vercel.app/pitch.html).
- Unique verified deployment: [groundtruth-meta-o8j3e4u38](https://groundtruth-meta-o8j3e4u38-kireeti001s-projects.vercel.app).
- [Original MIT implementation](https://github.com/KIREETI001/Ground-Truth), [LICENSE](../LICENSE), [NOTICE](../NOTICE) and [pinned upstream evaluation licenses](evaluation/licenses/README.md).

The [release manifest](release-manifest.json) owns exact version, migration, check and media provenance. A following documentation/evidence-only commit records these observations without changing the deployed runtime above. Historical release evidence is preserved separately.

## Engineering and provider evidence

| Check | Actual result and scope |
| --- | --- |
| Automated suite | **288 tests passed**. Typecheck, lint and production build passed; authored/tracked secret inventory passed. |
| Trusted harness guards | **4 separate guard tests passed**, separate from the 288-test suite. |
| Trusted helper behavior | **120/120 checks passed** across the pinned 80 limit, prescribed 100 limit and minimum-three variation. The actual browser-downloaded `validation.js` matched SHA-256 `1ba3ba6185074ec97465e605516ced8229614346b9ce47a23e8ff588c9789570`; it was compared as data and never executed. [Report](evaluation/trusted-title-boundary-proof.md). |
| Database | Release operator verified RLS on **33/33** private tables and **zero security-advisor findings**. The restricted server role is not per-user RLS; application authorization and owner predicates remain essential. |
| Preview acceptance | **13/13 checks passed, six Meta calls**, on its recorded preview commit. Two isolated synthetic HTTP clients, source-linked coding/variation, sharing and synthetic teacher review. [Record](evaluation/live-acceptance.json). |
| Final production acceptance | **6/6 checks passed, two new Meta calls**, on the application release above. Previous MCQ/coding answers preserved; captured 100-limit hint/source agreed; private guidance hidden before commitment; own preview retained captured source while omitting keys. [Record](evaluation/production-acceptance.json). |
| Independent release review | Codex found no blockers across **33 focused checks**, including SQLite and PGlite paths. Engineering review, not external human or educational validation. |
| Small model content review | **12 baseline outputs: 8 Codex pass, 4 concern**. Four separate mitigation rechecks passed; **16 actual requests** in that content evaluation. Baseline concerns retained; no head-to-head comparison. [Report](evaluation/model-evaluation.md). |

The preview and final-production call counts are separate from the 16-request content review. The final live private guidance contained no explicit option-letter references, so that call did not establish remapping coverage; six deterministic MCQ tests cover the supported letter/prose forms. Expiry, quota, role and stale/concurrent-edit protections were exercised with regression fixtures; no two-hour wall-clock expiry wait is claimed.

All class counts, learner accounts, teacher records and saved reviews used in QA are **synthetic operator activity**. The final production pass retained the existing labelled operator review and wrote no new teacher review. No imported repository or learner snippet is executed by the web app.

## Browser, media and presentation

| Check | Actual result and scope |
| --- | --- |
| Responsive entry | `/login` at **1440, 768 and 375 pixels**: no horizontal overflow and sample CTA visible above the fold. A 375-pixel sample workspace and own preview also passed. [Layouts](evaluation/browser-layouts.json), [browser observations](evaluation/browser-verification.json). |
| V3 encoded artifact | **8,538,917 bytes; 178.5 seconds; 1920×1080; 24 fps**. SHA-256 `f6dbbb920be896a4311ec187dd597cd4dae92ec48e808d862b2043543e6e3a94`. Local decode/encoding checks passed. [Validation](video-v3/media-validation.json). |
| Public media | Page/video/VTT/poster URLs returned **200**; video range returned **206**. Exact video, caption and poster hashes matched. **64 VTT cues** were ordered and in bounds. [HTTP verification](video-publication-verification.json), reproduced by `node scripts/verify-published-media.mjs`. |
| Actual player observation | 1080p, duration 178.5 seconds; playback advanced to **36.94 seconds**, seeked to **178.5** and back to **176.715**, readyState **4**. Native caption track defaults off to avoid duplicating observed burned-in captions. [Browser record](evaluation/browser-verification.json). |
| Listening limit | **Full linear playback and audible listening review were not performed.** Technical decode, partial playback and seek checks do not substitute for listening. |
| Narration | Approved narration/captions remain verbatim. The legacy provisional-index line is retained with an explicit **156.4–165.4-second** clarification that the current release uses observed/reviewed states and no validated mastery score. |
| Editorial assets | Matching architecture 1600×900, thumbnail 1280×720 and pitch-cover 1600×900 PNGs regenerated from exact sources. Visually inspected; five-slide desktop footer bounds and narrower-layout overflow checked. These illustrations are not product screenshots. |

TinyFish reported a teacher-preview redirect to sign-in. Normal authenticated same-host browser navigation and API checks did not reproduce it. The cause remains unproven; the discrepancy is retained in [tooling QA](evaluation/tooling-qa.json) and the [preview record](evaluation/live-acceptance.json), rather than hidden or called a resolved bug.

## Interpretation and participant handoff

External user study: **not conducted, n = 0**. No external learner/educator feedback or learning outcomes were collected. Operator activity, Codex source/content review, automated tests and browser QA do not establish learning gains, retention, authorship, outside-AI detection, fairer grading, reduced marking time or token savings.

The current journey is repository → workflow/source → concept → reviewed private 80→100 edit → Meta-linked MCQ/coding task → immutable independent answer → fresh variation → explicit named-teacher share → qualified human review. Concepts show observed/reviewed states rather than mastery percentages. Enrollment alone grants no project access. Teacher quiz authoring, assignment distribution and cohort analytics remain future work.

Historical [V2 verification](video-v2/previous-release-verification.json) remains separate. The [review packet](REVIEW_FIRST.md), [local form copy](official-form-copy.md), [JSON values](form-values.json), [project story](project-writeup.md) and [checklist](release-checklist.md) are ready for the participant. Their final review, optional declarations and official submission remain intentionally unchecked and do not block engineering completion.
