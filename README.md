# GroundTruth

GroundTruth helps learners read code, choose a useful concept, and test their understanding. Start with a short interactive challenge, practise through three concept missions, then investigate a real web app in the live playground.

## Learning path

- **Home:** an unscored, playable warmup with a clear next action.
- **Learn (`/learn`):** three original JavaScript missions covering loops and conditions, exact-key lookup, and sorted two-pointer reasoning. Each has three checkpoints, specific answer feedback, hints, and retries. The nine checkpoints award up to ninety local practice points, once per checkpoint; these are completion markers, not grades or certification.
- **Live playground (`/workspace`):** one synthetic campus signup investigation. Commit a prediction, send real HTTP requests, inspect persisted SQL rows, explain the result, verify a reviewed repair, and complete an independent task. The guide shows the next control to use; independent phases have procedural help only.
- **Continue practising:** ordinary outbound links to relevant official LeetCode, Codewars, and Exercism resources, with an optional HackerRank assessment destination. GroundTruth does not import platform results, issue their certifications, or claim affiliation.

Concept practice needs no app-level enrollment. The current private hosted Site still requires its platform access/sign-in. Mini-mission progress is stored only in the current browser; use its reset control to clear it. It is separate from signed-in lab work and tutor evidence. It is not account-synced and is not proof of mastery.

The live investigation deliberately discards a successful response **after a real database commit**. This is a labeled injected fault. Evidence comes from requests, server receipts, and database rows. Public practice examples are authored exercises, not live SQL evidence. Meta can propose a bounded next experiment in the live lab; the learner chooses whether to run it. Transfer, debrief, and transfer repair have no AI calls. Tutor evidence review is read-only; scoring is manual.

A successful build does not establish live Meta access or pilot readiness. Owner configuration, a genuine live-provider check, hosted identity checks, and [operator release gates](docs/pilot/operator-checklist.md) are required before participant use. No participant results or learning-effectiveness claims are reported here.

## Run on Windows Desktop

Install Git and **Node.js 24 LTS** with Corepack. The minimum supported Node version is `22.13.0`; Node 24 is the CI runtime and recommended local version. Use the pinned `pnpm@11.25.0` through Corepack and keep `pnpm-lock.yaml`. No Bash is needed for these PowerShell commands.

These commands create a checkout on your computer. A cloud checkout does not create a Desktop folder. PowerShell resolves your actual Desktop, including a redirected or OneDrive Desktop:

```powershell
$desktopPath = [Environment]::GetFolderPath('Desktop')
Set-Location -LiteralPath $desktopPath
git clone --branch codex/groundtruth-mvp https://github.com/KIREETI001/Ground-Truth.git
Set-Location -LiteralPath (Join-Path $desktopPath 'Ground-Truth')
node --version
corepack pnpm --version
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .dev.vars
notepad .dev.vars
```

If Corepack is absent, follow its [official installation instructions](https://github.com/nodejs/corepack#how-to-install). Use one dependency installer at a time.

In the ignored `.dev.vars`, leave `MODEL_CALLS_ENABLED="false"` for the first run. Set a local-only enrollment code and `PILOT_ENROLLMENT_ENABLED="true"`. For local tutor access, set `STAFF_USER_ROLES='{"local_seedy":"owner"}'`. Hosted identities and secrets are configured separately.

Build to generate the Worker configuration, then apply both committed migrations, in order, to a **new** local database:

```powershell
corepack pnpm build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_groundtruth.sql
if ($LASTEXITCODE -ne 0) { throw 'Initial migration failed' }
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_enrollment_throttle.sql
if ($LASTEXITCODE -ne 0) { throw 'Enrollment throttle migration failed' }
corepack pnpm dev
```

Open the loopback URL printed by the server, normally `http://localhost:5173`. Use the app's sign-in control, or visit `/signin-with-chatgpt?return_to=/workspace` on that URL. Portable development simulates sign-in as `local_seedy` on loopback only. A development cookie preserves that identity across restarts. Use `/signout-with-chatgpt?return_to=/` to sign out.

This simulation runs only in the portable development profile. Managed Work previews and built production output use hosted authentication; `pnpm start` does not simulate sign-in. Keep local development on loopback.

For an existing checkout, save your work before updating:

```powershell
git fetch origin
git switch codex/groundtruth-mvp
git pull --ff-only origin codex/groundtruth-mvp
corepack pnpm install --frozen-lockfile
```

If this checkout's local database already has `0000_groundtruth.sql`, apply only the new enrollment-throttle migration once:

```powershell
corepack pnpm build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_enrollment_throttle.sql
if ($LASTEXITCODE -ne 0) { throw 'Enrollment throttle migration failed' }
corepack pnpm dev
```

Rebuild after source or binding changes. Apply only unapplied migrations, in filename order; do not replay either migration against existing state. Local D1 state under `.wrangler/state` is separate from hosted D1. Use `.wrangler/state` without appending `/v3`.

## Commands and verification

Run commands from the project root:

| Command | Purpose |
| --- | --- |
| `corepack pnpm dev` | Portable Vinext development and local sign-in simulation. |
| `corepack pnpm typecheck` | TypeScript check without emitted output. |
| `corepack pnpm test` | Node test runner, TypeScript stripping, and real SQLite integration tests. |
| `corepack pnpm build` | Build the Worker and `dist/server/wrangler.json`. |
| `corepack pnpm run start --env-file .dev.vars` | Built Worker preview with local D1; no mock sign-in. |
| `corepack pnpm db:generate` | Generate a migration after an intentional schema change; inspect SQL and metadata. |

CI performs a frozen pnpm install, typecheck, Node tests, and production build on Node 24. It needs no production secrets and makes no live provider calls. Provider fixtures test validation and failure paths; they do not prove live Meta access. Local SQLite tests do not replace hosted D1, native sign-in, browser accessibility, or multi-user checks.

Standalone commands select the portable profile when no local profile exists. Sites maintainers must preserve the starter's managed execution profile and use the plugin's installation, preview, build, and publication helpers. The Linux-only `install:ci` helper is for that managed environment; use the Corepack commands above on Windows. Keep `.sites-runtime`, `.vinext`, `.wrangler`, build output, local environments, and participant records out of source control.

## Server configuration

Copy [.env.example](.env.example) to `.dev.vars` locally. Use either `.dev.vars` or `.env`. Hosted values use Sites environment configuration; a local file does not configure a deployment. Never use client environment prefixes for these values.

| Name | Purpose |
| --- | --- |
| `DB` | D1 binding declared in `.openai/hosting.json`; not a string credential. |
| `MODEL_API_KEY` | Server-only Meta credential entered through a supported secure secret path. |
| `MODEL_BASE_URL`, `MODEL_ID` | Exact adapter-supported endpoint/model; confirm [the integration contract](docs/design/meta-integration.md). |
| `MODEL_CALLS_ENABLED` | Default `false`; enable for a synthetic live check after owner configuration. |
| `PILOT_ID` | Pilot namespace. |
| `PILOT_MAX_MEMBERS` | Student limit, fixed at `5`; staff do not consume student seats. |
| `PILOT_ENROLLMENT_CODE` | Secret required after native sign-in for pilot membership. |
| `PILOT_ENROLLMENT_ENABLED` | Default `false`; open for moderated onboarding and close afterward. |
| `STAFF_USER_ROLES` | Secret JSON mapping of observed Site user IDs to `owner` or `tutor`. |

Sites owns hosted authentication. Preserve `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, and `app/chatgpt-auth.ts`. The opaque Site user ID establishes ownership; email, an enrollment code, a URL ID, or a client-selected role does not grant staff access. Server routes check membership, ownership, phase, and staff authorization independently.

Model coaching is bounded to 12 provider HTTP attempts per session, three per turn, a 30-second turn deadline, 16,000 input tokens and 4,096 output tokens per call, and one in-flight call per user. Failed attempts and retries consume the budget. Instructor-authored fallback is labeled. Transfer remains usable with zero provider calls.

## Release and pilot materials

Use [the pilot kit](docs/pilot/README.md) for recruitment, consent, neutral moderation, observations, and the human 0–3 rubric. Filled records and reference answer keys belong in the owner's private records, outside this repository. Research analysis and exports exclude raw answers, quotations, and notes, including for research-consenting participants.

Own deletion removes learning activity and related derivatives synchronously. Native-account-linked enrollment code-attempt count/window metadata is separate: an active ten-minute security counter survives deletion so deletion cannot reset enrollment throttling. After the window expires, physical removal occurs through an authenticated operator `POST /api/admin/purge-expired` or a later own `DELETE /api/activity`; cleanup is manual, not automatic. The deletion response reports removed `deleted.enrollmentAttempts` and any `retained.enrollmentSecurityCounters`, window end, and cleanup instructions.

The [operator checklist](docs/pilot/operator-checklist.md) covers configuration, private verification, publication, deletion, purge, and recovery. The detailed [release design](docs/design/release-runbook.md) and [quality plan](docs/design/qa-and-pilot.md) preserve planning rationale; their pre-build script examples are superseded by the actual commands above.

## Origin and attribution

The earlier *GroundTruth* proposal by **Attili Kireeti, Delfine Yew, V Narthananilaa, and Dr. Wesley Tan** supplied prior educational ideation. This credit identifies the proposal's authors; it does not identify the hackathon team or claim the proposal was created during this implementation. The proposal is not reproduced here.

This MVP narrows that concept to one synthetic investigation. Its implementation and commit history identify new work. Earlier research claims are not evidence that this MVP improves learning, retention, assessment validity, or tutor workload.

The application uses the Sites Vinext starter, [Vinext](https://github.com/cloudflare/vinext), React, Cloudflare D1, Drizzle, and dependencies in `package.json`. Preserve existing dependency license notices, including the vendored Sites Vite plugin notice in `scripts/vite/`.
