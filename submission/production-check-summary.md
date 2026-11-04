# Verified GroundTruth MVP — participant review

**Nothing has been submitted. Kireeti will review every item before submission; publishing consent remains unchecked.**

## Release

- Application: https://groundtruth-meta.vercel.app
- Narrated demo: https://groundtruth-meta.vercel.app/demo
- Pitch: https://groundtruth-meta.vercel.app/pitch.html
- Public source: https://github.com/KIREETI001/Ground-Truth
- Deployed code: `0b37fa2529cc561050b19e08613827ffb2a4e79d`
- Vercel production deployment: `dpl_G3NM77EGFnn8Zvgffz1bt7ACCr92`, READY, Singapore.

## Checks

| Check | Observed result |
| --- | --- |
| Automated tests | 246 passed |
| Type checks | Passed |
| Lint | Passed, zero errors/warnings |
| Native production build | Passed |
| Vercel production build | Passed |
| Authored source credential scan | Passed |
| Supabase schema | 32 private tables; RLS enabled on every table |
| Supabase security advisor | Zero findings at the checked checkpoint |
| Database transport | Restricted backend role; certificate-verified TLS |
| Real Meta adapter tasks | 8/8 passed, Muse Spark 1.3 Standard |
| Public API checks | 44 passed across the checked releases, including final deployed concurrency/exit checks |
| Video | 175.02 seconds; 3,681,860 bytes; H.264/AAC 720p; captions; full decode/audio/frame checks passed |
| Hosted video | HTTP 200; downloaded SHA256 matches the local artifact |
| Browser playback | Video metadata loaded; one caption track; no media error |

The public checks cover signup, Secure session cookies, teacher approval, developer-signup rejection, classes, owner isolation, complete pinned source, manual and Meta cloud proposals, explicit approval/idempotent apply, sharing, generated maps/overviews/concepts/MCQ/coding/hints/feedback, in-app independent assistance lock and voluntary exit. The final live concurrency check confirmed that an active learner Meta request prevents independent start, a released lease permits it, independent mode denies another hint, and ending the attempt restores access.

## Interpretation

These are engineering acceptance checks, not evidence of educational effectiveness, grading fairness, marking-time savings, production uptime or complete security certification. Demonstration accounts and answers are synthetic. Observed in-app activity does not detect outside AI or establish authorship. Teacher quiz authoring, assignment distribution and cohort analytics remain future work.

The official form has prepared answers within its limits and participant-confirmed solo/track/theme/preferences. No Submit action or publishing declaration was accepted. See [REVIEW_FIRST.md](REVIEW_FIRST.md), [form copy](official-form-copy.md), [video transcript](video/transcript.md), [research](research-evidence.md) and [manifest](release-manifest.json).
