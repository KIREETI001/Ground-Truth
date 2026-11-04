# Release and submission checklist

Do not mark a task complete without its named evidence. This is a release checklist, not a record that the work has happened.

## Entry and official form

- [ ] Confirm accepted participation and correct logged-in Cerebral Valley account.
- [ ] Confirm the entrant, actual team roster, representative and rights to the prior GroundTruth work. Recommended fit: Indie Developer / Build for Your World; record the user's actual selection.
- [x] Read the authenticated official form. Record the required public GitHub URL, three-minute video URL, three main answers (3,000 characters each), partner feedback (150 characters), and participant surveys in official-form-copy.md.
- [ ] Recheck announcements and any unobserved file/media restrictions or declarations before final submission.
- [ ] Confirm the live deadline. Public page: 5 November 2026, 10:00 a.m. Singapore time. [Official event](https://dev.meta.ai/events/global-hackathon)

## Cloud release

- [x] Record the public Vercel production URL: https://groundtruth-meta.vercel.app, READY in Singapore. Login and `/api/health` return 200; database connected.
- [ ] Freeze the final release commit after remaining fixes and Meta verification.
- [ ] Verify Meta API access with the deployed server, correct model ID and actual completed structured output. Save only sanitized status/model/usage evidence; no key or learner payload.
- [x] Apply and verify the Supabase schema: 32 tables with RLS enabled; private app-role connection with CA-verified TLS; zero security advisor findings at checkpoint. Server-to-Supabase login rehearsed.
- [x] Run baseline type checks, tests (240 passed), lint (zero findings) and production build at bcbe7dcf01e2310cac945760f7560646707e56e0.
- [ ] Run or confirm appropriate final checks for later release changes and verify public runtime access boundaries.
- [ ] Smoke-test a fresh student account on the public URL: login → import → workflow → beginner overview → concepts → MCQ → independent short code attempt → saved Progress.
- [x] Verify public API owner isolation, pending-teacher denial, approval, explicit teacher-share access, class enrollment and idempotent joining. Twenty public API checks passed.
- [ ] Verify final developer-signup denial and the complete browser teacher journey on the release.
- [ ] Verify independent mode, voluntary End attempt, immutable submission, post-answer feedback and no silent provider fallback.
- [x] Verify cloud manual drafts, review confirmation and idempotent apply in public API checks; verify the draft UI in a real browser. The cloud draft does not push to GitHub or execute code.
- [ ] Verify Meta-generated change proposals after credentials are configured. Keep the local companion unexposed.
- [ ] Confirm readable desktop/mobile layout and keyboard operation on the deployed build.
- [ ] Check published source and deployment uploads for secrets, personal records, generated local databases, caches and private runtime files.
- [x] Verify the public landing/login and health endpoints are accessible. Judge narrative links to the correct published source branch.

## Media

- [ ] Record and upload the final demo; insert the accessible video URL in the manifest and form. Label cuts, generated wait shortening and prepared states.
- [x] Capture actual public deployment screenshots in `assets/live-landing.png` and `assets/live-cloud-draft.png`.
- [ ] Refresh the landing screenshot after the role-card styling fix; capture generated practice/independent/teacher states after full verification.
- [ ] Choose a project thumbnail and verify dimensions against the portal.
- [ ] Add captions or a transcript to the video. Use synthetic accounts and no private browser tabs.

Recommended screenshot set:

| Filename | Capture | Shows |
| --- | --- | --- |
| `01-landing.png` | Full landing view | Promise, visible roles and clear entry |
| `02-workflow.png` | Beginner overview and source | Repository-specific content and source grounding |
| `03-practice.png` | MCQ with all options visible | Simple, focused practice |
| `04-independent.png` | Short code attempt and assistance-paused state | The central product boundary |
| `05-progress.png` | Saved attempt / provisional evidence | Inspectable progress without fabricated mastery |
| `06-teacher.png` | Approved teacher reviewing explicit share | Real role boundary and human review |

## Final copy

- [ ] Replace pending URLs, cloud status and validation details in the packet with observed facts.
- [ ] Match the write-up and video to the actual release. Keep optional/future capabilities out of shipped-feature claims.
- [ ] Include prior-work/AI-tool/dependency attribution and accurate team contributions.
- [ ] Paste only into the actual official form fields; the packet headings are editorial conveniences.
- [ ] Review required declarations before final submission, then retain the portal's success receipt and timestamp.

## Assets still requiring external action

The packet itself cannot supply unprovided API access, paid-service approval, competition acceptance, team consent, final presenter voice/video, or a submission receipt. Record each blocker precisely rather than reporting the project submitted.
