# GroundTruth

**Understand your code. Think in systems. Make the next change yourself.**

GroundTruth turns a public GitHub project into a focused learning path: choose a feature, trace its architecture, learn the concepts, practise with an MCQ or a short coding task, and make a small change you understand. During an independent attempt, new in-app AI assistance pauses until you submit or end the attempt.

## Cloud architecture

- **Meta Model API — Muse Spark 1.3:** source-grounded repository maps, beginner overviews, concept trees, hints, MCQs, short coding tasks, formative feedback and controlled edit proposals. Strict structured output and server validation keep the interface consistent. No silent model fallback.
- **Next.js on Vercel:** shared username/password login, role-based student/teacher/developer workspaces, server authorization and API limits.
- **Supabase PostgreSQL:** 32 normalized tables in a private schema, RLS, restricted backend role, pooled TLS connections, immutable original submissions, classes and explicit teacher sharing.
- **Cloud drafts:** pinned original source, saved edits, reviewed diffs, hash/concurrency checks and backups. Download a changed file to apply it yourself. No code execution or automatic GitHub push.

Students can register. Teacher registration requests approval. Developer registration is closed. Teachers see only explicitly shared learning paths; joining a class does not automatically share project records.

## Run and verify

Use Node 24 and Corepack/pnpm. Install with `corepack pnpm install --frozen-lockfile`. Configure the server-only values from `.env.example` in ignored `.env.production.local`; never commit real credentials. Apply the Supabase migration to a new database, then provision the restricted runtime login and developer password hash. See [deployment instructions](docs/cloud-deployment.md).

```powershell
corepack pnpm dev
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm verify:release
```

Local cloud rehearsal opens on http://localhost:5174. Production uses encrypted Vercel environment variables. The health endpoint reports database connectivity and configuration, not model answer quality.

## Demo and submission

Use https://github.com/KIREETI001/groundtruth-demo-study-tasks, a deliberately small study-task application. Follow request → validation → persistence, then independently change a small validation rule. The demo example is separate from this application.

The [submission packet](submission/README.md) contains the project narrative, three-minute script, judge guide, architecture, Meta model fit, attribution and release checklist. The manifest distinguishes verified release evidence from pending assets. A demo video and actual team details must be supplied truthfully.

## Boundaries

Only public repositories are supported. Imported code is never executed. Up to three selected ordinary source files (12 KiB each, 32 KiB combined) are viewed in full; inference context remains bounded. This is not a whole-repository security audit or standards certification. Selected source and prompts go to Meta, after consent. Generated content can be wrong. Saved learning records have a 30-day availability window; physical retention cleanup is an operator action.

The concept index is provisional evidence for human review, not a validated mastery score or automatic grade. Activity does not detect external AI use, prove authorship or demonstrate learning gains. Reduced repeated repo analysis and token spending are design goals, not measured outcomes.

The earlier local prototype is documented in [historical notes](docs/local-prototype-history.md). Prior GroundTruth ideation is attributed to Attili Kireeti, Delfine Yew, V Narthananilaa and Dr. Wesley Tan; that list is not a claim about the hackathon team. See [attribution](submission/architecture-and-attribution.md).
