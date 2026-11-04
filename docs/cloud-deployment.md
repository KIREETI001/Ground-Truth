# GroundTruth cloud release

The current target is native Next.js on Vercel (Node 24, Singapore region), Supabase PostgreSQL in Singapore and Meta Model API `muse-spark-1.3`. The former local Qwen/Vinext runtime is historical; it is not a hidden production fallback.

## Server configuration

Set these encrypted Vercel variables in the intended deployment environment:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase transaction-pooler connection for restricted `groundtruth_app` role |
| `SUPABASE_CA_CERT` | Official Supabase CA PEM; server verifies TLS certificates |
| `META_API_KEY` | Meta Model API key, never a `NEXT_PUBLIC_` variable |
| `DEVELOPER_PASSWORD_HASH` | Salted scrypt hash for reserved developer bootstrap; no plaintext password in deployment |
| `MODEL_CALLS_ENABLED` | `true` to use Meta; missing credentials fail visibly |
| `PILOT_ID` | Stable deployment data scope, initially `groundtruth-live.v1` |

The standard model ID avoids the Contributor model mode. API access, pricing, data handling and event credit terms remain governed by Meta's actual account terms. The application does not assert zero provider retention.

The ignored `.env.production.local` supports cloud rehearsal. It and private operator credentials in `.sites-runtime` must never be published. `scripts/cloud-next.mjs` loads local environment inputs without forwarding unsupported Node flags. In Vercel, platform environment values are used.

## Database provisioning

Apply `supabase/migrations/20261104170149_groundtruth_cloud_schema.sql` once to a new Supabase project. It creates 32 normalized tables in private `groundtruth`, foreign keys, indexes, RLS and a NOLOGIN backend role. Provision a high-entropy runtime password separately and enable LOGIN for `groundtruth_app`; do not put a real password in a migration file. Use the exact project pooler host shown by Supabase. The server's role has explicit access to GroundTruth tables, not general database administration privileges.

The browser has no direct database credential and no privileged Supabase key. Authentication remains GroundTruth username/password authentication stored in Supabase: salted scrypt hashes, hashed opaque sessions and HttpOnly/Secure/SameSite Strict cookies on HTTPS. This release does not use Supabase Auth, email verification or password reset. Student/teacher/developer authorization is checked on the server against current database assignments; signing up as a teacher creates a pending request. Client role selection never grants privileges.

The PostgreSQL adapter retains parameterized prepared-query contracts, uses unnamed pg queries suitable for transaction pooling, and executes multi-statement updates atomically. Guarded writes share a transaction advisory lock to preserve quota and immutable-submission behavior across instances. No privileged SQL endpoint is exposed by the application.

## Cloud drafts and public source

Public GitHub reads verify repository metadata, pinned commits, ordinary-file tree entries and Git blob identities. Source is bounded and potentially sensitive files are rejected. Production public GET responses can use Next's shared five-minute cache. Model and account requests are never put in that cache.

Cloud drafts persist selected original/current files, proposal diffs and backups in Supabase. Apply is explicit, hash-checked, version-guarded and idempotent. Files are downloadable; no automatic repository push or imported-code execution exists. Reference-learning paths are read-only. Independent attempts block study assistance and draft apply account-wide. External AI tools are outside this control.

## Release gates

Run typecheck, tests, lint, native Next production build and `verify:release`. The latter inspects authored tracked/untracked files for private runtime paths and high-confidence credential patterns. Never upload `.env*`, `.dev.vars*`, `.sites-runtime`, `.wrangler` or a database dump.

Deploy the reviewed commit, then verify `/api/health`, signup/login, role boundaries, source import, real Meta generation, MCQ and short coding formats, assistance lock/end-attempt, cloud diffs, teacher approval/class enrollment/explicit sharing, and mobile layout. Configuration alone does not prove that a live Meta call succeeds.

Record the actual deployment, checks and pending assets in `submission/release-manifest.json`. Submission remains a separate action through the official event portal. Check final form requirements and account eligibility; do not replace a missing demo video or team authorization with invented details.
