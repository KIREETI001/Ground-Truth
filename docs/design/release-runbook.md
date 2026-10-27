# GroundTruth MVP release and developer experience runbook

Status: pre-build plan, 2026-10-27. No application, repository, CI job, database, secret, or deployment has been created by this work. Commands and application controls below are planned requirements, not existing capabilities. The release owner is the agent in the owning conversation; the user supplies only the human-only inputs listed at the end.

## Release target

Deliver one TypeScript full-stack app using the Sites Vinext starter, Cloudflare Workers, Drizzle, and one D1 database. Preserve the starter's Sites build integration and hosted ChatGPT sign-in. Use server-side HTTP calls to the selected Meta/Llama provider; no separate API service, OAuth stack, Redis, queue, object storage, custom domain, or external monitoring service is needed for the first five-person pilot.

Use one Site: first deploy it with its default owner-private audience for verification, then make the landing page public after the launch gates pass. This is a staging **phase**, not a separate staging environment. Every Sites deployment URL is a production URL. The protected application and all data/model APIs still require native ChatGPT sign-in and application membership. The five initial student memberships require a moderator-supplied enrollment code; the moderator supplies it verbally. The agents do not email invitations or send other external messages. The requested pilot publication authorizes this release path; verification gates do not introduce another conversational approval step.

## Verified platform contracts and limits

| Area | Verified contract | Consequence for this MVP |
| --- | --- | --- |
| Runtime | Sites server code runs in Cloudflare Workers; 128 MB per isolate; HTTP external connections; no raw TCP. | Use D1 and server `fetch`; keep requests bounded. |
| Identity | Sites owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, cookies, and identity header injection. | Preserve `app/chatgpt-auth.ts`; do not implement these routes or add another session stack. |
| User key | `oai-authenticated-user-id` is stable within a Site and differs across Sites. | Key ownership, enrollment, staff roles, and deletion by this opaque ID. Email/name are optional display/contact fields. |
| Public audience | A public Site can receive anonymous requests with no identity headers. | Protect server-rendered app pages and every API/action independently. Sign-in proves identity, not pilot membership. |
| Hosted storage | Sites provisions declared logical D1 bindings; unused R2 can remain `null`. | Use `DB`; no manual Cloudflare resource provisioning is assumed. |
| Migrations | Sites applies hosted migrations before uploading the Worker; a failed deployment may already have applied them. | Schema changes must support the current and previous app version. A code rollback is not a database rollback. |
| Secrets | Native environment updates support `is_secret: true`; secret values are not returned in plaintext. Runtime values do not belong in the hosting manifest. | Record names and revision only. Apply a new environment revision by deploying a saved version. |
| Source | Site creation can return a dedicated source Git repository and credential. `work_proxy` requires no token in the executor. | The agent provisions and maintains Site source through the supported helper. This is separate from the hackathon's public GitHub repository. |
| Versioning | A deployment consumes a saved version; the source SHA must identify the exact pushed state used to build its archive. | Keep one release record linking SHA, archive, saved version, deployment, and environment revision. |

No claim is made that Sites provides application membership, tutor authorization, a five-seat cap, product analytics, or data erasure automatically. Those are application work items to implement and verify.

## Repository and source provision

1. In the build phase, create a new checkout using the Sites Vinext setup helper. Register the new Site exactly once, persist its returned opaque ID in `.openai/hosting.json`, and use only the returned Site source repository. Do not invent project IDs, remote URLs, versions, or slugs. Recover uncertain registration rather than retrying creation.
2. Keep Git credentials in session memory and pass them through the Sites helper's hidden stdin. Never place tokens in Git remotes, arguments, files, logs, screenshots, the public repository, or the final response. For `work_proxy`, use the supplied remote normally and let Work authenticate.
3. Keep the source root small: `app/`, domain/model server modules, `db/`, immutable `drizzle/` migrations, tests, the maintained starter integration, `README.md`, `.env.example`, and CI definition. Commit the lockfile. Ignore local environments, `.sites-runtime/`, `.wrangler/`, caches, build output, archives, database dumps, and test artifacts containing user content.
4. The connected GitHub search did not expose an accessible `KIREETI001/groundtruth` repository. The available GitHub tools can create branches/files/commits/PRs, but expose no repository-creation operation. This is an access/provisioning gap, not proof that no such repository exists.
5. The user must either provide an existing writable repository or create an empty public repository under the intended account, then grant the connector access. Use a proposed name such as `groundtruth`; never report that it exists until confirmed. The agent then owns source population, branches, CI files, PRs, and release documentation. Do not ask the user to implement or upload code.
6. Preserve one source history and mirror the reviewed app source to GitHub; do not maintain a second hand-edited implementation. The pushed Site source SHA and public source revision must be recorded together. Keep the Sites remote required for publication. Avoid force-pushing published history.
7. Public-source review must exclude credentials, enrollment codes, staff IDs/rosters, participant content, raw logs, fixtures derived from pilot work, and private proposal attachments. Keep starter/third-party license notices. Add the chosen project license after checking the applicable hackathon requirement and ownership; do not assume that a public repo automatically grants a particular license.
8. The README must identify the earlier GroundTruth proposal as prior ideation and credit its authors/source accurately. New implementation receives new, truthful commit history. Do not import earlier implementation as newly written work, backdate commits, or imply the proposal originated during the build. Only publish proposal material when its owner has authorized it.

Public GitHub source is a hackathon release gate. A successful private Sites prototype alone does not satisfy that gate.

## Environment contract

These are proposed application names. Only `.env.example` key names and non-sensitive examples go into source. Read bindings on the server through the starter's Worker environment convention; never expose them through client environment prefixes.

| Name or binding | Treatment | Purpose and readiness condition |
| --- | --- | --- |
| `DB` | Sites D1 binding, not an API key | Durable members, product records, model request state, and minimal events. Declare in the hosting manifest and matching types. |
| `MODEL_API_KEY` | Required runtime secret | Key for the selected Meta/Llama inference provider. The owner provisions access and supplies the key through a supported secure secret-entry path. Do not request a paste into ordinary chat. |
| `MODEL_BASE_URL` | Server runtime configuration | Exact verified provider endpoint; validate the configured host. Never accept a provider URL from a browser request. |
| `MODEL_ID` | Server runtime configuration | Exact available Meta/Llama model identifier. Verify it against the selected provider before live release. |
| `MODEL_CALLS_ENABLED` | Server runtime configuration; default `false` | Kill switch for model-backed writes. `false` produces a clear unavailable state and performs no provider call. |
| `PILOT_ID` | Server runtime configuration | Identifies this pilot's membership and records. |
| `PILOT_MAX_MEMBERS` | Server runtime configuration; fixed at `5` | Five-student cap enforced by concurrency-safe database allocation. Staff do not consume student seats. |
| `PILOT_ENROLLMENT_CODE` | Runtime secret | Pilot membership only; native ChatGPT sign-in still establishes identity. Never log, render, persist in URLs, or commit the code. |
| `PILOT_ENROLLMENT_ENABLED` | Server runtime configuration; default `false` | Explicit enrollment gate; enable only for moderated onboarding and close afterward. |
| `STAFF_USER_ROLES` | Runtime secret; server-parsed allowlist | Explicit mapping of observed Site user IDs to `owner` or `tutor`. No self-selected roles or email-based durable keys. Fail closed on invalid configuration. |

The frozen AI budget is 12 total provider HTTP attempts per session, including preflight calls, failures, and retries; at most three attempts per coaching turn, including the final call; at most 16,000 input tokens and 4,096 output tokens including reasoning per call; one in-flight request per user; and a 30-second total coaching-turn deadline. Permit only one bounded transient retry, consuming both the 12-attempt session budget and the three-attempt turn budget. Tests must enforce these limits. The application checkpoint is USD 15 total across development, pilot, and demo, allocated USD 5 each; estimated or actual usage tracking does not guarantee provider billing. Do not add retries that can silently duplicate a saved attempt.

Use native `update_environment_variables` with sensitive entries marked `is_secret: true`; it changes only listed keys. Do not print whole tool responses containing plaintext non-secret configuration or incidental credentials. Read back sanitized key presence, secret flags, and revision. Record the environment revision and deploy a saved version to apply changes. Never record secret values in the release ledger.

**Current live gate is blocked:** no Meta provider credential or successful live call is established by this plan. A model selector, fixture response, or successful Worker build does not prove live Meta access. If no supported secure key-entry path is available, report that concrete blocker and finish all other authorized build work.

## Identity, staff, and pilot access

1. Use `requireChatGPTUser(returnTo)` on protected server pages, mark identity-dependent pages `dynamic = "force-dynamic"`, and use a normal top-level sign-in anchor with a same-origin return path. Use `getChatGPTUser()` in APIs/actions and reject missing identity before reading or writing user data.
2. The owner signs in once so the application can display their own authenticated opaque Site user ID. Bind this ID to the server staff allowlist through a supported secure configuration path. A tutor also signs in once and is added by the owner by observed ID. A service bypass bearer token is not a visitor identity and must never enroll a user or grant tutor privileges.
3. Enrollment requires authenticated identity plus the correct code. Validate/rate-limit code attempts on the server. Allocate a unique pilot seat atomically in D1; repeated enrollment by the same user is idempotent. Concurrent requests must never admit a sixth student. At capacity, show a clear pilot-full state without exposing the roster.
4. Once admitted, all product records are scoped by the authenticated user ID. Every read, mutation, export, and deletion checks membership and ownership server-side. Staff-only actions check the staff allowlist. Tutor access is read-only evidence review and authorized export. Human rubric scoring uses the manual kit; there is no score create/update/delete workflow in the app. A hidden button is not authorization.
5. Reject suspended/revoked members on every request. Revoke the enrollment code after onboarding or rotate it if disclosed. Removing a student does not automatically reopen a slot unless the owner deliberately decides to replace that pilot participant.

### Supported audience change

Before publication, read `get_site`, preserve its exact ID, and inspect `current_user_role`, `available_access_modes`, and current access. At the approved launch gate, call `update_site_access` with `access_mode: "public"` only if the mode is supported, then confirm its returned state. This exposes the landing/sign-in surface; it does not bypass application authorization. Use the general saved-version deployment operation after the Site is no longer owner-private.

The verified `update_site_access` input modes are `public`, `workspace_all`, and `custom`; `admins_only` can appear in responses but is not an input mode. Do not promise a one-call switch back to `admins_only`. The owner always remains allowed. `allowed_user_emails` replaces the complete email allowlist; it must not be combined with `viewer_changes`. External visitor additions require `get_site.external_visitor_invites_enabled === true` and may send email. This pilot does not use those additions. No group policy is planned; group IDs would require supported discovery and explicit selection.

If public mode is unavailable, keep the private deployment and report the access blocker. Do not silently substitute workspace-wide access or send external invitations. Public availability and native sign-in remain launch acceptance checks.

## Developer commands and CI

Adopt the starter's actual package manager and lockfile during setup. The following script names are planned contracts to add; none are claimed to run today.

| Planned command | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript check without emitting application output. |
| `npm run test` | Vitest unit and integration tests, non-watch mode in CI. |
| `npm run test:e2e` | Browser flow checks only on a runner with a supported browser path. |
| `npm run db:generate` | Existing starter migration generation after schema changes; inspect output. |
| `npm run db:check` | Planned check that schema/migration metadata are committed and an empty local database migrates in order. |
| `npm run build` | Starter standalone build. Sites publication uses its documented `build-site.mjs` entrypoint. |

GitHub CI on PRs and the release branch should perform one locked dependency install, typecheck, unit/integration checks, migration validation, and production build. Pin the Node version supported by the current starter (documented minimum `22.13.0`) and commit the lockfile. No production provider key or Site deploy credential is needed in ordinary PR CI. Tests use deterministic provider fixtures; fork PRs receive no secrets. Configure a required CI check when repository settings permit it; otherwise the release owner manually verifies the exact commit's status.

Meaningful tests must cover:

- Anonymous, signed-in nonmember, student, tutor, and owner behavior; cross-user read/write denial; revoked access; staff escalation attempts.
- Idempotent enrollment and at least six concurrent valid-code attempts admitting exactly five distinct student IDs; wrong-code rate limits.
- Provider timeout, rate limit, malformed output, absent key, disabled-model mode, and cancellation/retry behavior; enforce the frozen attempt/token/time/spend checkpoints; no false success or partial saved result.
- The core product lifecycle, persistence across reload, one completed attempt, read-only tutor evidence/export, expiry-aware reads, and synchronous deletion using synthetic content.
- Migrations on a fresh local D1 database and compatibility of the previous app against the expanded schema.

In managed Linux, use the Sites preview daemon and exact returned URL. Browser QA is supported only through the documented `cua_repl` path. If it is unavailable, do not install a browser or invent another control path. CI browser E2E is optional only until a supported runner is confirmed; a human browser check of deployed authentication, enrollment, and the core flow remains required before real-user launch. Document skipped coverage rather than calling it passed. Never inject production identity headers from browser code to simulate sign-in.

## Migration policy

Generate migrations before the build; inspect and commit SQL plus Drizzle snapshots/journal. Applied SQL and metadata are immutable. Use additive schema changes for the pilot. Migrations are schema-only and bounded: no seeds, bulk backfills, or request-time schema mutation. An added ordinary column's default must be constant; `NOT NULL` needs a non-null constant default; added references must be nullable with a null default.

Apply pending migrations to local preview state once, in order, using the starter's documented local D1 command with the built `dist/server/wrangler.json` and `.wrangler/state`. Local and hosted D1 are separate. Do not manually replay local or hosted applied migrations. Sites applies the committed hosted migrations during publication. Because migration application can precede a failed Worker upload, inspect deployment failure evidence and resolve uncertain migration state before retrying. Repair only a proven failed, unapplied migration; never rewrite applied history.

## Release procedure and evidence

1. **Source ready:** complete source, relevant tests, attribution, environment documentation, and migration review. Confirm the public repository provision path. Record the candidate commit and test evidence; browser verification limits must be explicit.
2. **Private deployment:** preserve owner-private access from Site creation. Use the source workflow helper to run remaining checks/builds, push the exact source, and package an unchanged archive outside the checkout or in ignored `outputs/`. Use its returned SHA/archive directly with `save_version_and_deploy_private` for a confirmed owner-private Site. Keep an existing `saved_version_id` on a partial failure instead of saving duplicate versions.
3. **Deployment result:** poll `get_deployment_status` only while pending/building/publishing; stop on succeeded/failed. A native succeeded response and literal URL verify deployment, but do not prove the application's auth, provider, or data behavior. Record the deployment ID and saved version ID.
4. **Private smoke:** owner opens the deployed Site; verifies native sign-in/out and identity, initial schema, staff binding, enrollment behavior with synthetic identities where supported, and a synthetic product flow. Check that client assets and error messages contain no secrets. Validate safe unavailable behavior before enabling live calls.
5. **Live-provider gate:** securely configure `MODEL_API_KEY`, exact endpoint/model, and enabled mode; redeploy to apply the environment revision. Execute one synthetic request against the deployed app. Require a genuine successful provider response, expected Meta/Llama model provenance where the provider returns it, successful schema validation, recorded latency/usage when supplied, persisted output, and safe failure behavior. Report precise evidence without the key or prompt contents. If this fails, continue repair privately; the real-user pilot is not ready.
6. **Public-source gate:** populate the confirmed public GitHub repo with reviewed source, license/attribution, README, CI, setup instructions, and the release commit. Verify public read access without credentials. No pilot data or secret-bearing history may be present.
7. **Participant launch:** confirm `public` is an available audience and apply the requested public landing/site audience. Recheck that anonymous and signed-in nonmembers cannot access protected app data or model routes. The moderator tests sign-in and enrollment as a non-owner; verify durable membership and cap, then tests the student flow. A tutor verifies read-only evidence/export and denied mutations. If these identities cannot be exercised by the agent, the moderator performs these concrete checks before inviting the five participants.
8. **Handoff:** return the literal successful deployed URL and public repository URL in the owning conversation, plus known limitations. Give the moderator the code only via an approved private channel. Do not claim delivery to participants, send invitations, or auto-publish elsewhere.

Keep a small private release record: source SHA, corresponding public source revision, saved version ID, deployment ID/URL, environment revision, highest migration, audience/access revision, test results, live-provider smoke result, and time. IDs and results are sufficient; exclude secret values and participant content.

## Narrow pilot monitoring and incident response

Store only small structured operational events: event type, random request ID, pseudonymous membership ID, timestamp, latency, result/error category, model ID, and provider usage/cost fields when supplied. Do not log student text, prompts, evidence, feedback bodies, email, auth headers, API keys, or enrollment attempts' code values. Track enrolled students, started/completed attempts, model failures, and feedback submitted; show the counts only to staff. Research export is restricted to structured, consented counts, timing, and manual-rubric results; exclude raw answers, quotations, and notes. Do not add session replay or third-party analytics.

For the first five-person session, the release owner checks after the first completed attempt and at session end. Use `get_site_worker_logs` with `errors_only: true`, a short time window, and a small limit (for example 15 minutes/20 events). Native error logs are diagnostic evidence, not a guaranteed analytics/alerting service. No unattended monitoring schedule is assumed.

Stop enrollment and disable model calls on any ownership leak, role bypass, unexpected provider charging loop, or repeated failure blocking the core task. Keep an understandable unavailable page and preserve only necessary sanitized diagnostic evidence. A provider failure must not produce fabricated successful work.

### Rollback and recovery

1. Capture the failing deployment/version and sanitized error evidence. Disable model-backed writes and enrollment using the planned application switches; environment changes require a deployment to take effect.
2. Identify a known-good saved version using `list_site_versions`/`get_site_version` and the release record. Confirm it is compatible with the **current** D1 schema and environment. Deploy that saved version using the private or general operation appropriate to the Site's current audience. A redeploy uses the current environment revision; it does not restore old secrets automatically.
3. Do not upload an old source archive with a mismatched SHA, recreate the Site, discard participant records, or assume migrations rolled back. If the database changed incompatibly, keep writes stopped and ship a forward repair.
4. If access must be narrowed, inspect supported access modes first. A supported `custom` policy with deliberately empty non-owner allowlists can be considered as a separate access repair; confirm the returned audience and do not claim that setting `admins_only` is supported. Do not silently widen access to restore availability.
5. Repeat deployment smoke and the failed scenario before reopening enrollment/model calls. Record the recovery deployment. A rotated key requires deliberate secret replacement and redeployment; never recover secrets from logs.

## Retention, deletion, and pilot close

Product records are available for 30 days from session creation; reads enforce expiry, and expired sessions are terminal and cannot resume. Operational logs expire after seven days. Explain these periods and provider data handling in the enrollment notice before participants submit content. Verify the selected inference provider's actual retention settings before accepting real participant content; no provider retention guarantee is established by this plan.

Provide an authenticated own-data deletion action and an owner-assisted path. The application call synchronously revokes membership, deletes the user's product records and related derivatives, and deletes or irreversibly de-identifies their operational events before reporting success. Test the deletion path with synthetic records before launch. Avoid soft-delete-only behavior presented as erasure. Keep any audit evidence content-free.

At pilot close, disable enrollment, stop new model calls when testing ends, invoke the authenticated operator purge endpoint, and verify counts. The operator also purges expiring records before their 30-day deadline and logs before their seven-day deadline unless a scheduler has been implemented and verified. No automation has been created and automatic erasure is not promised; expiry-aware reads alone do not physically delete records. Do not claim immediate erasure from infrastructure backups, native logs, or the provider; those systems' controls and retention are not exposed by the verified tool contract. Public repository artifacts and screenshots must contain synthetic examples only.

## Human-only inputs and launch blockers

| Needed from the user/moderator | Why it cannot currently be completed by the agent |
| --- | --- |
| Existing writable GitHub repository, or creation of an empty public repo and connector access | The exposed GitHub connector has no repository-creation tool; search did not yield accessible source. The agent does the code/CI/publication work afterward. |
| Meta inference account/billing access and secure entry of the intended provider key | No secret or live provider access has been established. Agents must not invent or expose credentials. |
| Owner/tutor first sign-in and confirmation of their observed Site IDs | Sites user IDs are per-Site and cannot be safely inferred from email or GitHub identity. |
| Non-owner browser smoke when the agent cannot obtain a legitimate second identity | Authenticated participant/tutor access is a real account-bound behavior; a forged header is not evidence. |
| Verbal enrollment-code delivery and moderation of the five-person session | No external messaging is authorized. |

Everything else in the build—source, migration files, tests, CI definition, Sites registration/source synchronization, private deployment, supported audience publication, app gates, documentation, and release evidence—is agent-owned within the authorized build scope. Do not turn a missing secret/repository into a request for the user to write code.

## Evidence consulted

- Sites skill: `skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md`.
- Sites references: `references/identity-and-secrets.md`, `references/storage.md`, `references/preview/managed.md`, and `templates/vinext-starter/README.md` from the same package.
- Available native tool schemas inspected without mutation: `create_site`, `create_source_repository_write_credential`, `get_site`, `update_site_access`, `get_environment_variables`, `update_environment_variables`, version save/deploy/list/read operations, and `get_site_worker_logs`.
- Parent evidence: GitHub connector search for `user:KIREETI001 groundtruth` yielded no accessible repository; available tool inventory includes source/PR operations but no `create_repository`.
