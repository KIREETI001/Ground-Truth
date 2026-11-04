# Verified release and participant handoff checklist

**Engineering gates closed for app runtime `1e1bcfaa848150f90caf890e8d32471336f5e084`**, deployment `dpl_23T8RW7JX4r21MZ5zoLuTUZo86nE` (READY). The [verification summary](production-check-summary.md) and [manifest](release-manifest.json) identify the evidence. A following documentation/evidence commit does not change that deployed runtime.

Checked items below state the actual method. Synthetic fixtures, automated HTTP clients and partial browser observation are not silently relabelled as human study or full-duration observation. Participant-owned review/submission actions remain unchecked intentionally; they do not block engineering completion.

## Version, rights and build

- [x] Participant-confirmed solo entry: Kireeti Kumar; Indie Developer Track; Build for Your World.
- [x] Original implementation MIT licensed and published; LICENSE/NOTICE retained. Pinned upstream MIT evaluation licenses are retained in [the license folder](evaluation/licenses/README.md), with the evidence-only documentation commit to follow.
- [x] Frozen app SHA and READY production deployment recorded above; canonical and unique deployment identities supplied to the owning manifest.
- [x] Final suite: **288 tests passed**; typecheck, lint and production build passed. Authored/tracked secret inventory passed. Local runtime caches/databases are excluded.
- [x] Database verification: **33/33 private tables with RLS, zero security-advisor findings**; restricted server role and application owner predicates retained. This is not a per-user RLS guarantee or complete security certification.

## Judge entry and isolation

- [x] Normal production browser checked `/login` at 1440/768/375 pixels: sample CTA above the fold, readable roles and no horizontal overflow. 375-pixel workspace and own preview also passed. [Browser evidence](evaluation/browser-verification.json).
- [x] Preview acceptance used **two separate synthetic HTTP clients with private cookie jars**, confirming separate accounts/projects and cross-owner denial. This is not a claim that two manual browser contexts were tested. [Preview record](evaluation/live-acceptance.json).
- [x] Operator-approved pinned public seed and genuine Meta-prepared overview/concepts have a provenance event and are labelled prepared, not fresh generation.
- [x] Preview acceptance: **13/13 checks, six Meta calls**. Final production: **6/6 checks, two new Meta calls**, with sanitized receipts. [Final production record](evaluation/production-acceptance.json).
- [x] Per-identity/global budgets, active cap, reserved namespace, signup-cap separation, expiry and cleanup protections passed **regression fixtures with simulated expiry**; no two-hour wall-clock wait is claimed.
- [x] Signup/login/logout, pending-teacher denial, closed developer registration and cross-owner access protections passed regression checks. No public teacher/developer credentials are provided.
- [x] Own `/demo/teacher` preview requires its visitor session and retains captured changed source/diff and linkage while excluding other visitors, private keys/rubrics, model feedback and assessment writes. Normal browser/API checks passed.
- [x] TinyFish's reported teacher-preview redirect remains documented; normal same-host authenticated browser/API checks did not reproduce it. Cause unproven. [Discrepancy](evaluation/tooling-qa.json).

## Code → change → independent attempt → human review

- [x] Pinned sample request → validation → persistence source and overview inspected in operator QA; bounded coverage is disclosed.
- [x] Independent mode denied new in-app hints/generation; original answers remained immutable after feedback/review, in regression and preview/production checks. Voluntary exit protections also passed regression tests.
- [x] Manual **80→100** owned cloud draft edit was reviewed/applied in preview QA; stale-hash denial and idempotent apply were observed. Concurrent-edit protections passed regression tests.
- [x] Change-linked tasks use the stored owned proposal, before/after hashes and reconstructed diff. Final-production hint/source agreed with the captured **100** boundary and had no original-80 mismatch.
- [x] Fresh-variation parent/source linkage and retained submitted responses passed regression tests. The preview generated a fresh variation and **ended it without submission**; no live submitted transfer result or learner improvement is claimed.
- [x] **120 trusted helper behavior checks** passed; **four separate harness guard tests** passed. The actual browser-downloaded file matched the trusted 100-limit hash and was compared as data, never executed. [Proof](evaluation/trusted-title-boundary-proof.md).
- [x] Synthetic class/share/teacher review was exercised in preview QA. Two different learners sharing the same repository and correct class/teacher scopes passed route regression tests. These are operator records, not external participants.
- [x] Enrollment alone grants no project access; explicit sharing, revocation, role and expiry boundaries passed regression/preview checks. Final production retained the existing labelled synthetic review and wrote no new teacher review.
- [x] Observed/submitted-unreviewed/human-reviewed states replace visible mastery percentages; unreviewed answers receive no correctness or learning verdict.

## Model checks and limits

- [x] Actual Muse Spark 1.3 Meta requests and sanitized receipts observed. Structured/source validation, visible failure and in-app independent-mode enforcement passed checks; no silent preset/local fallback is claimed.
- [x] Relevant later source windows and bounded evidence selection passed regression tests; no full-repository understanding claim is made.
- [x] Private guidance is hidden before commitment and authorized after commitment; own preview still omits it. Receipts omit prompts, learner answers, credentials and raw provider errors.
- [x] Six deterministic MCQ tests cover supported option-letter remapping and source-literal/code preservation. The final live response had **no explicit option-letter references**, so that call did not establish remapping coverage.
- [x] Content review retains **12 baseline outputs: 8 Codex pass, 4 concern**, plus **four separate passing rechecks**; **16 requests** in that evaluation, separate from preview/production calls. [Report](evaluation/model-evaluation.md).
- [x] External study remains **not conducted, n = 0**. Operator/automated/browser evidence is separate from human validation and does not establish learning effectiveness or comparative model quality.

## Media and local copy

- [x] V3 uses current hosted product captures, explicitly labelled synthetic operator activity and prepared model content; no replacement product UI or new spoken claims were fabricated.
- [x] Final artifact: **178.5 seconds, 1920×1080, 24 fps, 8,538,917 bytes**; video SHA-256 recorded in [media verification](video-publication-verification.json). Local decode/encoding checks passed.
- [x] Public page/video/VTT/poster returned 200; video range 206; exact hashes matched; 64 caption cues valid. Reproducible read-only HTTP verifier passed.
- [x] Actual browser player advanced to **36.94 seconds**, seeked to **178.5** and back to **176.715**, readyState 4. Native captions default off alongside observed burned-in captions. **Full linear playback was not performed.**
- [x] Approved narration/captions unchanged; the legacy provisional-index line is retained with the explicit current observed/reviewed-state clarification at **156.4–165.4 seconds**.
- [x] Judge guide, story, local form copy/JSON, main README and production summary reconciled with this verified app release; historical V2 evidence remains separate.
- [x] Local form narratives remain within 3,000 characters and partner feedback within 150; Markdown text and JSON values match exactly. No official portal fields were updated or submitted in this goal; an earlier populated draft may be stale.

## Participant-owned actions — intentionally open

- [ ] Complete the participant's final review of the packet, including a full audible listening review. **Listening review was not performed** by this engineering workflow.
- [ ] Recheck current organizer deadline/announcements, required portal fields and participant declarations before any authorized submission.
- [ ] Review and paste the current local form copy into the portal if desired; an earlier portal draft is not assumed to match.
- [ ] Decide optional personal survey/publishing declarations personally. Local `publishingConsent` remains **false**; no consent was accepted on the participant's behalf.
- [ ] Submit the official form only through a later participant-authorized action. No submission receipt is claimed by this goal.
