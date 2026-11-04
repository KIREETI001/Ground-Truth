# GroundTruth — local project learning MVP

## Product structure

Start with a repository overview and choose an area and workflow, rather than selecting individual files. Local AI proposes key features and concepts from a balanced bounded catalogue and representative source. The map is explicitly partial. Each selected workflow automatically imports its relevant source at the pinned commit.

Choose “Understand & improve my project” to follow the controlled editing path, or “Learn from a public project” to study a read-only reference and apply its patterns to a target project goal. The backend blocks working-copy reads and all editing operations for reference paths.

Each focused path then uses five familiar views. Workflow holds pinned source and goal-based review. Concepts shows generated prerequisite nodes grouped into Behavior, Structure and Validation. Practice holds guidance, generated exercises, committed independent answers and reflection. Changes provides controlled manual edits and AI proposals for improvement paths; Apply skills generates an original adaptation-plan challenge for reference paths. Progress shows concept evidence, app activity and explicit teacher sharing.

Questions use the actual selected source, goal and chosen concept. Working-copy exercises freeze the edited file, hash and source label. Failed inference shows an error, never a preset question. Validated schemas bound shape/length, file references and source quotations; they cannot establish semantic correctness. Challenge model mistakes against the source.

## Services and startup

Run `corepack pnpm start:local` or the matching VS Code task. The website stays in the terminal; model and companion run hidden and remain available when that terminal closes. Logs/PIDs are in ignored `.sites-runtime`. Do not expose these development services publicly.

| Service | Address | Responsibility |
| --- | --- | --- |
| Website/backend | http://127.0.0.1:5173 | Shared login, server permissions, SQLite and learning workflow |
| llama.cpp | 127.0.0.1:8081 | Local inference, one slot, private bearer key |
| Node companion | 127.0.0.1:8082 | scrypt operations and restricted Git/filesystem operations, separate private bearer key |

The companion rejects unauthenticated requests and browser Origin headers. Repository mapping uses a private local bare Git cache (no checkout or code execution) and reuses a pinned snapshot for 24 hours. It avoids repeated anonymous GitHub REST API reads; the legacy REST import adapter remains available for old flows and tests. Public repository contents are cached on disk, including files outside the bounded study catalogue, and are not removed by deleting a saved learning path. Git fetch has a 90-second timeout; this prototype is intended for small public projects. Keys stay server-side. Public GitHub import needs internet; model inference does not use a cloud provider.

Dependencies: Node 24 recommended, Git and Corepack/pnpm 11.25.0. Install with `corepack pnpm install --frozen-lockfile`. The recovered stack is React/Next-compatible Vinext, Wrangler local Worker runtime and local D1 SQLite. This is IDE-friendly hosting, not a published IDE extension.

For a fresh machine, copy `.env.example` to ignored `.dev.vars`. Enable `LOCAL_ACCOUNTS_ENABLED` and `LOCAL_LLM_ENABLED`. Generate separate private random tokens (at least 32 characters) for `LOCAL_WORKSPACE_TOKEN` and `LOCAL_LLM_TOKEN`; put matching values in `.sites-runtime/workspace-key.txt` and `llm-key.txt`. Configure `STAFF_USER_ROLES='{"local_seedy":"owner"}'` for the reserved initial developer. Keep legacy `MODEL_CALLS_ENABLED=false`. Never commit private configuration. Install the verified model/runtime and check the GPU device name. The current laptop already has these configured.

Build using `corepack pnpm build`. For a fresh local database, apply each SQL file in `drizzle` in filename order (0000–0011), using `corepack pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/<filename>.sql` for each file. The recovered database was migrated by SQL files, not a Wrangler migration ledger: inspect existing schema before applying only missing files, and never replay applied files. The current laptop is already migrated.

## Accounts and tiered access

Local mode uses real username/password accounts and ignores the old simulated Sites identity. Usernames are unique normalized identifiers. Passwords are 12–128 characters, salted scrypt N=131072,r=8,p=1. Opaque 7-day sessions use hashed database tokens and HttpOnly/SameSite Strict cookies. Login/signup attempts are throttled. Logout invalidates the session. There is no password reset or email verification feature in this MVP.

The private companion bootstraps `.sites-runtime/local-login.json`; first developer login seeds the reserved account. Public developer signup is closed. User registration grants ordinary access; teacher signup creates a pending request. Developer approval is needed for teacher access. One login resolves the persisted profile and redirects to its assigned workspace. Both layouts and APIs enforce permissions server-side. Approved teachers see only projects explicitly shared with their account ID. Revocation blocks future reads, but cannot recall screenshots or downloads.

The legacy Sites adapter remains for compatibility when local mode is disabled. It is not used by the configured MVP. Old fixed campus/static curriculum routes redirect to the current user workspace.

## Local model

Observed laptop: Core Ultra 9 275HX, about 64 GB RAM, RTX 5070 Laptop GPU with 8151 MiB VRAM. The initial 4B model produced inadequate guidance, so the active model is **Qwen3.5 9B Q4_K_M**. Warm generation observed about 45–50 tokens/second, with about 5.5 GiB total GPU memory use during the check. These are local observations, not a throughput or accuracy guarantee.

- [Model source](https://huggingface.co/unsloth/Qwen3.5-9B-GGUF), pinned revision `3885219b6810b007914f3a7950a8d1b469d598a5`.
- GGUF SHA256: `03b74727a860a56338e042c4420bb3f04b2fec5734175f4cb9fa853daf52b7e8`.
- [Official llama.cpp b12099](https://github.com/ggml-org/llama.cpp/releases/tag/b12099), Windows Vulkan runtime.

Model/runtime live outside source under `%USERPROFILE%\.groundtruth-runtime`. Startup checks the model checksum and uses Vulkan1 (NVIDIA on this laptop), 8192-token context, one inference slot and reasoning budget zero. Recheck GPU selection on other devices. Requests have a 90-second timeout, a global database lease, bounded responses and per-account daily limits. No automatic external API fallback exists.

## Database architecture

Migrations 0000–0002 retain the original prototype tables. New normalized tables:

| Tables | Purpose / relationship |
| --- | --- |
| local_auth_users, local_auth_sessions, local_auth_attempts | Unique username/password hash, hashed-token sessions and throttle buckets |
| platform_access, access_audit | Persisted pilot role and append-only access history |
| account_profiles | Display name, requested signup role and teacher approval status |
| study_repository_maps | Private owner/pilot-scoped structural map, representative sample paths and suggested workflows, available for 24 hours |
| study_learning_paths | One-to-one project FK, improvement/transfer purpose, selected area/workflow/concepts and target goal; cascades on project deletion |
| study_projects | Owner/pilot, pinned source snapshot, goal, generated report, teacher share and expiry |
| study_exercises | Project FK, frozen prompt/rubric, guided/independent/submitted state, immutable answer and reflection |
| study_concepts, study_exercise_concepts | Project nodes/prerequisites and exercise-to-concept evidence links |
| study_reviews | Append-only human review of the original exercise response |
| study_events, study_usage | Project activity/approved-change receipts and persisted inference quotas |
| session_scopes | Pilot scope for retained legacy sessions |

Reads require ownership, current pilot and expiry; teacher reads require a current explicit share. Foreign keys cascade project exercises, links, reviews and events. Key queries and open-exercise constraints are indexed. Sensitive access updates and linked exercise creation use database batches. Versioned reports hide obsolete output structures.

## Controlled changes and evidence

Permission is asserted before creating a separate pinned copy under `%USERPROFILE%\.groundtruth-workspaces\<owner hash>\<project ID>\repo`. Git hooks/credentials/global config are disabled for these operations. No project code, install scripts, tests or submodules run. Original checkouts and GitHub stay unchanged; there is no push endpoint.

Only selected ordinary source files are editable. Traversal and symlinks are rejected. Both manual edits and AI proposals produce a reviewable diff. AI proposals include a short summary and currently support files up to 4,000 characters. Apply requires explicit checkbox approval and rejects stale file hashes. Backups and idempotent receipts are retained. IDE changes can be reloaded. Backups are files, not a one-click rollback feature.

Independent mode blocks new study AI assistance account-wide and pauses change application until the answer is committed or the learner ends the attempt. External tools are outside its control. A concept receives 0 before evidence, 25 for an unreviewed committed attempt, or the latest human review value: insufficient=0, supported=40, explained=70, transferred=100. The project index is the equally weighted average of nodes. This is a transparent **provisional evidence index**, not a validated mastery measure or an automatic grade. Unlinked exercises do not affect nodes. Manual declarations and app counts do not prove absence of external AI.

## Standards and retention

The registry includes official OWASP authorization/input-validation/testing guidance, W3C WCAG 2.2, ECMAScript array semantics and Node.js assertions. Only references relevant to selected-source patterns are offered. Outputs are review-needed/not-assessed questions; no compliance pass or security certification is assigned.

Repository maps are available for 24 hours, up to six active maps per account; source catalogues are balanced across detected areas and bounded to 48 paths / 6,500 path characters. Up to three representative source excerpts inform mapping. Each workflow uses up to three automatically selected small files within the importer budget. Maps infer suggested workflows from structure and samples, not complete execution or dependency analysis.

Project records are available for 30 days. Physical expired-record cleanup is an operator action, not scheduled. Deleting a project cascades database learning records, but **keeps local working-copy files and backups** to preserve edits. Authentication, operational roles and audits are separate. Deleting learning activity cannot reset quotas.

Private repositories, whole-repository indexing, arbitrary-code execution, automated tests of imported code, public deployment, cloud inference and causal learning-effectiveness claims remain outside this MVP.

## Leaving an activity

Use **End attempt** in the active-attempt banner, including on the new-path screen, to release independent-mode restrictions without submitting an answer. Practice and the change/transfer stages also offer **End this attempt** for a guided or independent activity. Ended activities retain their question, original phase and ended timestamp, but do not earn completion or mastery credit. Committed answers remain immutable. The additive 0010 migration adds `ended_at` and updates the one-open-exercise index; no records are deleted or converted into fake submissions.

## Beginner learning and source viewing

The source viewer loads complete selected files at the pinned commit instead of displaying a 1,500-character excerpt as if it were complete. Existing saved paths use the same authenticated source endpoint. The prototype still supports ordinary files up to 12 KiB; unsupported/unsafe files show an error rather than silent truncation. Full-source viewing is separate from model context, which is bounded to 10,000 source characters across the selected workflow. Larger context ends at a line boundary when possible and is labelled as bounded.

Before new practice, learners see a locally generated plain-language overview, a clickable conceptual reading flow and key terms. Engineering review questions stay in a separate disclosure. Multiple choice is the default ordinary practice option, with a written-answer alternative. Transfer-plan challenges remain open-ended. Four choices and a private suggested answer/explanation are generated locally, choices are shuffled, and the key is revealed only after an immutable submission. Keys may be incorrect and matching them is not verified mastery. Ending an activity still releases the lock without submitting.

Practice now offers MCQs (default) or short coding tasks only. Open-ended exercise requests are rejected. No written reasoning or reflection question is requested after MCQs. Code snippets are stored for teacher review and are never executed or applied automatically. Older activity history remains available.
