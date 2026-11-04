# Revised release and submission checklist

**Status: PENDING_FINAL_COMMIT / PENDING_PRODUCTION_DEPLOYMENT.** This checklist requests evidence for the revised release; previous green checks do not automatically close these items. The official form remains unsubmitted and publishing consent unchecked until the participant's final review.

## Version and rights

- [x] Participant confirmed solo entry: Kireeti Kumar; Indie Developer Track; Build for Your World.
- [x] Participant authorized MIT licensing of the submitted implementation; project LICENSE and NOTICE exist locally.
- [ ] Freeze and publish the final source commit; record exact SHA, source branch, deployed version and migration identifiers in release-manifest.json.
- [ ] Verify LICENSE/NOTICE and third-party attribution in published source and confirm sample reuse permission.
- [ ] Check tracked files and deployment uploads for secrets, private records, runtime databases and local caches.

## Judge entry and account isolation

- [ ] Open deployed `/login` at 1440, 768 and 375 pixels; sample action is visible before story/animation, roles remain readable and no horizontal overflow appears.
- [ ] Start two separate browser sessions. Each receives its own learner identity, project and private practice copy; signing in or attempting work in one does not invalidate the other.
- [ ] Verify prepared overview/concepts against the operator-approved pinned public seed and Meta provenance event. Record that these are prepared assets.
- [ ] Verify a newly requested MCQ/coding task reaches Meta and persists; retain a sanitized receipt and source review.
- [ ] Verify per-identity/global creation budgets, active cap, reserved namespace, two-hour expiry and cleanup; synthetic accounts do not consume the real signup cap.
- [ ] Confirm normal signup/login/logout, pending-teacher denial, closed developer registration and cross-owner project denial.
- [ ] Verify `/demo/teacher` requires the current visitor's valid sample session, exposes only their record, stays read-only and never returns private pre-commit rubric/key data.

## Complete code → change → human-review loop

- [ ] Trace the pinned sample's request → validation → persistence responsibilities in the deployed overview/source.
- [ ] Generate and submit an initial independent attempt. New in-app guidance pauses across tabs until submission or voluntary exit; the original answer remains immutable.
- [ ] Create a private permitted draft; make a small manual edit, review the exact diff, explicitly apply and verify stale-source/concurrent-apply protections.
- [ ] Generate an understanding task tied to the stored applied proposal, before/after hashes and reconstructed diff. Client-supplied source/proposal IDs cannot bypass ownership checks.
- [ ] Submit a linked fresh variation; preserve the earlier response and label its phase. Repeated wording alone must not be presented as independent transfer validation.
- [ ] If reporting trusted demo behavior checks, record fixed fixture version, exact inputs, expected/observed results and operator role. Do not imply arbitrary visitor snippets were executed.
- [ ] Enroll synthetic learners in a synthetic class, select the approved teacher by name and explicitly share only the chosen project.
- [ ] In an approved teacher session, distinguish two learners using the same repo, filter Needs review/Reviewed, inspect original answers/source and save a qualified human review/follow-up.
- [ ] Confirm enrollment alone grants no project access; revocation/expiry blocks further access. No public teacher/developer credentials appear.
- [ ] Confirm evidence states replace mastery percentages and imply no correctness or learning verdict for unreviewed answers.

## Model and release checks

- [ ] Apply final database migration and verify restricted server connection, RLS/revocations and application owner predicates. RLS alone is not the end-user authorization boundary.
- [ ] Run typecheck, appropriate tests, lint and production build on the exact final commit; record results without carrying forward obsolete totals.
- [ ] Check actual Meta model identity, structured output/source validation, visible failure/retry, independent-mode enforcement and absence of silent preset/local fallback.
- [ ] Verify relevant source later in a file survives context selection; record bounded-coverage limits.
- [ ] Verify sanitized model receipts contain task/provider/model/status/timing and available numeric usage, with no prompt, learner answer, key or raw error payload.
- [ ] Record actual semantic-output sample, pinned repositories, outcome-specific review dimensions, failures and denominators. JSON validity alone is not semantic correctness.
- [ ] Keep operator tests, automated tests, TinyFish QA and future external study in separate categories. External study currently not conducted, n = 0.

## Media and official form

- [ ] Refresh real product captures for visible sample entry, source/overview, independent attempt, applied diff, fresh variation and teacher evidence. Label synthetic records and operator review.
- [ ] Verify revised public video is within the observed three-minute limit; record exact duration, dimensions, hash, captions/transcript and browser playback/seek checks.
- [ ] State that edited/prerecorded captures and prepared model output are not fresh generation. Show actual current product evidence early.
- [ ] Reconcile judge guide, write-up, local form copy, JSON values, main README, production summary, transcript and release manifest.
- [ ] Confirm three narrative fields remain at most 3,000 characters and partner feedback at most 150 after final editing.
- [ ] Recheck current organizer deadline, announcements, required fields and participant declarations in the actual portal.
- [ ] Present final local packet to participant. Do not submit, change publishing consent or claim a receipt without their authorized final action.

## Current external-evaluation status

No external participants are available. No sessions, quotes or feedback have been fabricated. The prepared [future protocol](evaluation/user-study-plan.md) and [not-conducted record](evaluation/user-study-results.json) remain explicit limitations. Operator or TinyFish completion is product QA, not a user study or causal evidence.
