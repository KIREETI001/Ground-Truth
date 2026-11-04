# Production candidate — verification checkpoint

Checkpoint: **5 November 2026**. This is an evidence summary, not a claim of final production or competition submission success.

## Verified baseline

| Item | Result |
| --- | --- |
| Source | Public `KIREETI001/Ground-Truth`, branch `codex/groundtruth-mvp` |
| Baseline commit | `bcbe7dcf01e2310cac945760f7560646707e56e0` |
| Type checks | Passed |
| Automated tests | 240 passed |
| Lint | Passed, zero findings |
| Production build | Passed |
| Supabase project | Active |
| Schema | 32 tables, RLS enabled on all tables |
| Security advisors | Zero findings at checkpoint |
| Runtime DB connection | Private application role, CA-verified TLS |
| Login rehearsal | Actual local server → Supabase path passed |

These results were supplied by the release operator from the working session. They apply to the named baseline and are not educational efficacy, production uptime or complete security claims.

## In progress or blocked

| Item | State |
| --- | --- |
| Vercel deployment | READY, production Singapore: `dpl_3ZdoWefXb7mmZCjVGiqntMYC7qP1` |
| Production URL | https://groundtruth-meta.vercel.app — public login 200; `/api/health` 200, database connected |
| Meta API runtime | Key not yet configured; no successful real Meta request recorded |
| Public student journey | Browser login, full pinned source and cloud draft UI verified; complete Meta-generated learning journey pending |
| Public teacher journey | Public API checks verified pending access, approval, classes, enrollment and explicit-share reads; full browser teacher walkthrough pending |
| Hosted changes | Manual draft editing, review confirmation and idempotent apply verified on public API; draft UI verified; AI proposals await Meta access |
| Video | Script prepared; actual presenter recording and upload pending |
| Final assets | Deck, SVG/PNG illustrations and actual live screenshots prepared; landing screenshot to be refreshed after role-card styling fix |
| Official submission | Form inspected; no submission receipt |

The final release may have a later commit. Update [release-manifest.json](release-manifest.json) and this summary after the final build, deployment and Meta smoke test. Do not remove pending labels without corresponding evidence.

Twenty actual public API checks passed: Supabase-backed writes; signup and Secure session cookie; login; pending-teacher denial and developer approval; class creation and idempotent joining; cross-owner 404; full pinned source; cloud manual drafts; explicit review confirmation; idempotent apply; and explicitly shared teacher reads. Browser verification covered an actual student login and cloud draft interface. Those checks do not substitute for a real Meta generation.

## Shareable assets

- [Five-slide HTML pitch deck](pitch-deck.html): standalone, keyboard arrows, responsive layout and landscape print styling.
- [Project thumbnail SVG](thumbnail.svg) / [PNG](thumbnail.png): 1280×720 concept artwork, explicitly not a product screenshot.
- [Architecture SVG](architecture.svg) / [PNG](architecture.png): 1600×900 diagram, explicitly not proof of a successful deployed inference call.
- [Official form answers](official-form-copy.md): three main narrative answers within the observed 3,000-character limit, plus concise partner feedback.
