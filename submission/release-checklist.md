# Release and submission checklist

Do not mark a task complete without its named evidence. This is a release checklist, not a record that the work has happened.

## Entry and official form

- [ ] Confirm accepted participation and correct logged-in Cerebral Valley account.
- [ ] Confirm the entrant, actual team roster, representative and rights to the prior GroundTruth work. Recommended fit: Indie Developer / Build for Your World; record the user's actual selection.
- [ ] Read the final portal fields and announcements. Record exact video length, supported URL hosts, repo visibility, file limits, live-access requirements and declarations.
- [ ] Confirm the live deadline. Public page: 5 November 2026, 10:00 a.m. Singapore time. [Official event](https://dev.meta.ai/events/global-hackathon)

## Cloud release

- [ ] Freeze release commit and record the Vercel production URL.
- [ ] Verify Meta API access with the deployed server, correct model ID and actual completed structured output. Save only sanitized status/model/usage evidence; no key or learner payload.
- [ ] Apply and verify the Supabase schema using the deployment's real connection. Check public table/function exposure and server-only credentials.
- [ ] Run type checks, relevant tests, lint and production build. Link check results to the release commit. The earlier local 213-test run is not a substitute for new cloud checks.
- [ ] Smoke-test a fresh student account on the public URL: login → import → workflow → beginner overview → concepts → MCQ → independent short code attempt → saved Progress.
- [ ] Verify separate-owner isolation, pending-teacher denial, approved-teacher explicit-share access, class enrollment and developer signup denial.
- [ ] Verify independent mode, voluntary End attempt, immutable submission, post-answer feedback and no silent provider fallback.
- [ ] Verify which Changes actions work in cloud. Hide or clearly disable unsupported laptop-only actions. Do not expose the local companion.
- [ ] Confirm readable desktop/mobile layout and keyboard operation on the deployed build.
- [ ] Check published source and deployment uploads for secrets, personal records, generated local databases, caches and private runtime files.
- [ ] Verify judge links open without the entrant's cookies or inappropriate deployment protection.

## Media

- [ ] Record and upload the final demo; insert the accessible video URL in the manifest and form. Label cuts, generated wait shortening and prepared states.
- [ ] Capture final-deployment screenshots rather than recycling local screenshots as live proof.
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
