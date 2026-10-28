# Personalised GroundTruth for students building AI-assisted web apps

## Intent and authorization

The learner wants to understand and improve an application they built with AI. Give them one useful next task and a visible, inspectable record of the evidence behind that recommendation. Kireeti selected this first audience and said “fire away” after the proposed Today / Learn / Projects / Radar direction. Proceed within that authorization without another design-approval loop. The implementation choices below are builder decisions.

## Approach

Considered a broad career/course portal, an automatic GitHub-to-mastery scorer, and a goal-first practice journey using explicit evidence. Choose the last: broad portals obscure the next action, and repository presence cannot establish understanding. Keep the existing private deployment, branch, live HTTP/SQL investigation, sign-in, enrollment, independent-task boundaries and Meta configuration.

## The first journey

1. Today (`/`) welcomes the learner with one dominant “Build my path” action. Three small steps choose frontend/full-stack/backend goal, languages/interests and a 10/20/30-minute session. No name, résumé or mandatory GitHub setup.
2. A three-question baseline covers code tracing, async ordering, and reading a simple SQL query. A visible “Not sure yet” choice is valid. Show concrete feedback after a submitted response. Baseline choices are starting evidence, never a mastery percentage or independent certification.
3. Today recommends a specific unfinished mission with a short reason. Goal, baseline, project signals and completed checkpoints affect deterministic recommendations. Explain the reason and allow choosing another mission. When all suitable missions are complete, offer review and the live investigation rather than an empty or locked screen.
4. Learn retains the three original missions and adds original web-app practice for async ordering, SQL filtering, and server-side ownership checks (three checkpoints each). Browser points mark guided practice, never mastery. A separate evidence map groups code reading, collections, async, SQL, testing, access control. Selecting a node reveals its source, limits and next task. Project signals do not promote a node to demonstrated understanding. Explicitly say independent understanding has not been assessed when appropriate.
5. A small floating, dismissible guide explains the next action. Use clear 16–18px text, 14px supporting text, >=44px controls, proper focus, reduced-motion support and responsive stacking. Follow the existing warm white/navy/violet/lime identity and the approved concept's restrained hierarchy. No decorative wall of copy, invented activity, mastery charts or fake streaks.

## State, privacy and persistence

- Anonymous learners can complete the journey immediately using versioned, validated browser storage, including existing practice progress. Corrupt/blocked storage must remain usable and be disclosed.
- Signed-in learners can explicitly save the profile, baseline and selected public-project snapshot to their account with a dedicated notice. Never silently upload an anonymous profile. Load account state separately from local state; do not merge across accounts. Native Site identity owns every server record; no supplied identity headers or IDs.
- Save only allowlisted goals, languages, interests, baseline choices, known checkpoint IDs, and bounded selected-project evidence. Reject derived mastery/points fields. Save with optimistic revision checks and a same-request expected-identity precondition; conflicting saves must keep the current local work and explain recovery. Quarantine unsaved account drafts in tab memory across identity changes, hide them from other identities, and restore only when their original native owner returns. Account requests must not silently apply old responses to a different identity.
- Account learning data expires after 30 days from its last explicit save and is unavailable after expiry. Physical deletion uses existing operator cleanup; do not claim automatic purging. Provide export and delete for the new profile. `/api/activity` and moderator purge must cover new owned records and poll votes too.
- New account profiling does not require a scarce lab pilot seat. Existing live-lab notice/enrollment requirements stay intact. No new AI grading or model requests; Meta remains unavailable without its key.

## Projects

The per-visitor connector eligibility tool is unavailable in this environment. Do not use the builder's GitHub connection or credentials for visitor access. The shipped bridge accepts a public GitHub repository URL, retrieves a bounded file listing from a pinned commit, then reads only the learner's explicitly selected files. This is public-file analysis, not private GitHub account linking. Explain this before reading; never render a misleading Connect button.

- GitHub API URL, owner/repo, 40-character commit SHA and source paths are server validated. HTTPS `github.com/owner/repo` only, no credentials, ports, query or fragments. Fixed `api.github.com` outbound host, no redirects, timeouts, bounded responses and a small maximum of files/bytes. Exclude secrets, generated/vendor/build directories, binaries and lockfiles. No arbitrary HTTP proxy or code execution.
- Inspect selected source as text. Return explicit language/file signals, safe bounded source excerpts and a suggested original mission. Label signals “Found in project · understanding not checked”, with file and commit provenance. Display no security verdict or authorship claim. Do not send source to an AI provider. Disconnect/remove clears the snapshot; selected code is stored only if the learner explicitly saves the profile and the notice explains this.
- Failed reads, rate limits, truncated trees and unsupported/empty files get actionable, honest states. Existing results remain visibly older until a successful replacement.

## Radar and daily pulse

- Read bounded official feeds from a fixed allowlist: GitHub changelog, web.dev and Microsoft TypeScript blog. Refresh on page load/user request; show publisher, publication date, fetched time and original link. This is a developer field brief, not an exhaustively ranked hottest-news feed. An unavailable feed must show its own error and must not turn stale content into a successful empty result.
- Separate source headlines from GroundTruth's general learning angle. Never infer a personal job-loss/hiring forecast from an update. Focus filters select relevant sources and preserve a broad “All” view. No fabricated latest-news cards.
- One optional daily question (Singapore day), with three allowed choices including uncertainty. Signed-in users may answer/change one vote per question. Native account ownership, validated current question, same-origin writes and no public individual answers. Aggregate only; reveal counts per option after at least five responses, otherwise show the total and threshold. Label it self-selected GroundTruth community opinion, not representative market sentiment. Keep votes available for 30 days and include them in account deletion/cleanup.

## Language reference shelf

The uploaded ZIP contains 100 Markdown files: 99 language notes plus a root README, across C++, C#, Java, JavaScript, Python, SQL and TypeScript. Import them as lazy-loaded, read-only reference notes, with an index/search and readable code blocks. Clearly label these supplied notes as reference material whose examples have not all been validated. Do not imply practice or assessed tracks for all seven languages. Ship validated practice for the current JS/SQL web-app path; broader assessed curricula remain later work. Render Markdown as safe text elements without raw HTML or executable content.

## Acceptance and delivery

- A new learner gets from goal to baseline to a specific task and can inspect why it was chosen.
- Completed practice affects the map without earning claims of mastery; a public-repo signal alone never claims understanding.
- Guest storage, account consent/save/conflict/delete/export, cross-user isolation, expiry, bounded source fetches and poll deduplication are meaningfully verified.
- All six missions work, points are awarded once, existing progress survives, and live independent phases retain procedural-only help.
- Browser QA covers onboarding, wrong/not-sure answers, recommendations, map details, profile editing/reset, project selection/error states, Radar failure/empty states, reference browsing and all main navigation. Record real authentication/mobile limits.
- Tests, TypeScript and production build pass. Obtain fresh independent review of the final change; fix substantive issues. Publish to the existing draft PR and owner-private Site. Do not merge or widen sharing.

## Practical limits

Private GitHub linking and live AI source analysis require separately provisioned visitor authorization/provider configuration. No arbitrary repository execution, automated job-market prediction, employer certification, or evidence of learning effectiveness is claimed. Pilot feedback will test whether users can find the next task and explain the evidence shown.
