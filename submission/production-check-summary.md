# Verified GroundTruth MVP — participant review

**Nothing has been submitted. Kireeti will review every item before submission; publishing consent remains unchecked.**

## Release

- Application: https://groundtruth-meta.vercel.app
- Narrated demo: https://groundtruth-meta.vercel.app/demo
- Pitch: https://groundtruth-meta.vercel.app/pitch.html
- Public source: https://github.com/KIREETI001/Ground-Truth
- Deployed code: `4fe6afdc960bcb2d9f7b0e099b8bca0854fb20a5`
- Vercel production deployment: `dpl_9CP3vXAdyNcf6zq3e68ErmNy9SBJ`, READY, Singapore.

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
| Video | 178.5 seconds; 9,400,939 bytes; H.264/AAC 1080p; 64 caption cues; decode, timing and frame checks passed |
| Hosted video | HTTP 200; downloaded SHA256 matches V2; HTTP 206 byte ranges verified |
| Browser playback | 178.5s, 1920×1080; playback advanced beyond 25s; no media error; optional sidecar avoids duplicate burned-in captions |

The public checks cover signup, Secure session cookies, teacher approval, developer-signup rejection, classes, owner isolation, complete pinned source, manual and Meta cloud proposals, explicit approval/idempotent apply, sharing, generated maps/overviews/concepts/MCQ/coding/hints/feedback, in-app independent assistance lock and voluntary exit. The final live concurrency check confirmed that an active learner Meta request prevents independent start, a released lease permits it, independent mode denies another hint, and ending the attempt restores access.

## Interpretation

These are engineering acceptance checks, not evidence of educational effectiveness, grading fairness, marking-time savings, production uptime or complete security certification. Demonstration accounts and answers are synthetic. Observed in-app activity does not detect outside AI or establish authorship. Teacher quiz authoring, assignment distribution and cohort analytics remain future work.

The official form has prepared answers within its limits and participant-confirmed solo/track/theme/preferences. No Submit action or publishing declaration was accepted. See [REVIEW_FIRST.md](REVIEW_FIRST.md), [form copy](official-form-copy.md), [video transcript](video/transcript.md), [research](research-evidence.md) and [manifest](release-manifest.json).
