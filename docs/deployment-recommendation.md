> Historical notes, superseded by the local-only implementation. See [current setup and architecture](local-project-mvp.md). Live deployment is outside the current scope.

# Backend and live deployment recommendation

Recommendation dated 4 November 2026.

## Hackathon / live MVP: keep the current Cloudflare backend
The existing Vinext application already builds a Cloudflare Worker with D1. Keep the website, protected API, relational records and migrations on Workers + D1 rather than rewriting them for the demo. D1 supports prepared SQL, indexes and foreign keys: https://developers.cloudflare.com/d1/

Use the existing Sites-hosted identity boundary if deploying through Sites. The local simulated identity is development-only; publishing the raw app elsewhere does not supply that trusted identity service automatically. Do not trust client-supplied identity headers. A standalone deployment needs an actual authentication integration before public access.

The local Qwen model cannot run inside Workers and a deployed Worker cannot access the laptop's loopback address. The current fixed loopback adapter is for local development only.

For a live demo powered by the laptop:
1. Website authenticates the learner and creates a bounded inference job.
2. A local agent, using a narrowly scoped server credential, polls an authenticated queue.
3. The agent calls the loopback model, validates the output and posts the result back.
4. The website polls job status and shows queued / running / completed / failed states.

Cloudflare Queues supports pull consumers: https://developers.cloudflare.com/queues/configuration/pull-consumers/
Use explicit job ownership, lease expiry, request idempotency, output validation, quotas and a dead-letter path. Laptop offline means inference unavailable; never silently replace generation with preset questions. The queue agent is a deployment recommendation, not implemented in this local version. Do not expose an unauthenticated model port publicly.

## Broader teaching pilot: Supabase is a strong alternative
Supabase Postgres + Auth can support GitHub/Google/email sign-in, relational classes and memberships, consent and teacher assignments, and row-level access policies. It is an alternative requiring a deliberate migration, not a drop-in switch for the present D1 code.
- Auth: https://supabase.com/docs/guides/auth
- Postgres row-level security: https://supabase.com/docs/guides/database/postgres/row-level-security

For a standalone product I would consider a Node-hosted Next.js app plus Supabase, retaining a separate inference worker. Do not migrate solely for the hackathon if the existing Cloudflare deployment path works.

## Always-on inference
The laptop is suitable for local demonstration and supervised use, subject to measured latency. For an always-on public service, move the same model to a secured GPU host or explicitly configure a paid API provider. That is independent of where the website and database run. There is no automatic cloud fallback in this implementation and no live deployment was performed.

## Data boundaries
Keep accounts, roles, teacher approvals, project ownership, pinned snapshots, exercises and event records in the relational database. Use object storage only when larger consented source bundles are needed. Public GitHub import does not require GitHub OAuth; private repository access would require a separate least-privilege OAuth flow and retention agreement.

