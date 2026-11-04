# GroundTruth

The submitted implementation is [MIT licensed](LICENSE). [NOTICE](NOTICE) preserves earlier ideation attribution and third-party notices.

**Understand your code. Think in systems. Make the next change yourself.**

GroundTruth connects selected public GitHub source to a workflow, concepts, focused practice and a small independent change. New in-app study assistance pauses during an independent attempt. The original response, source and relevant activity can support an explicitly authorized human review.

The revised implementation is awaiting final release verification: **PENDING_FINAL_COMMIT / PENDING_PRODUCTION_DEPLOYMENT**. The [release manifest](submission/release-manifest.json) is authoritative for final deployment/check/media evidence; historical checks do not certify later changes.

## Judge entry and learning loop

After deployment, open [the sign-in page](https://groundtruth-meta.vercel.app/login) and choose Try sample learning path. Each visitor receives an isolated two-hour synthetic learner session and private practice copy. The pinned overview/concepts were prepared with Meta; new questions still request live generation. No shared demo password is required.

Study the code, submit an initial independent task, make a permitted private edit, review/apply its diff and request a task grounded in the owned applied change. A linked fresh variation preserves the earlier answer. The sample's `/demo/teacher` page shows only the current visitor's own record, read-only, without granting a Teacher role.

Approved teachers receive explicitly shared paths with learner/class context, original committed answers, relevant source, a review queue and saved human notes. Enrollment alone does not share every project. Concept evidence uses observed/reviewed states; submitting an answer does not award a mastery percentage. Teacher-side AI quiz authoring, assignment distribution and cohort analytics remain future work.

## Cloud architecture

- **Meta Model API — Muse Spark 1.3 Standard:** repository maps, overviews, concepts, MCQs, small coding tasks, source-grounded hints, formative follow-up and controlled edit proposals. Structured output/source validation controls shape and references, not semantic truth. No silent preset/local fallback.
- **Next.js on Vercel:** opaque account sessions, isolated temporary demo sessions, role/owner authorization, independent-state enforcement and API budgets. Students can register, teacher signup requires approval and developer registration is closed.
- **Supabase PostgreSQL:** private application schema, restricted backend connection, persistent attempts/shares/reviews and sanitized inference timing/status/usage receipts. End-user isolation depends on server authorization and owner predicates; RLS alone is not a per-user permission guarantee.
- **Private drafts:** pinned original source, reviewed changes, reconstructed before/after diff and hash/concurrency checks. No arbitrary source/snippet execution or automatic GitHub push.

## Run and verify

Use Node 24 and Corepack/pnpm. Install with `corepack pnpm install --frozen-lockfile`. Configure server-only values from `.env.example` in ignored `.env.production.local`; never commit real credentials. Apply the Supabase migrations and provision the restricted runtime login/developer hash. See [deployment instructions](docs/cloud-deployment.md).

```powershell
corepack pnpm dev
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm verify:release
```

Local cloud rehearsal opens on http://localhost:5174. Production uses encrypted server environment variables. Health reports connectivity/configuration, not model answer quality. Anonymous demo provisioning requires its operator-approved seed, readiness event and verified ingress configuration; see `.env.example` and the release checklist.

## Demo, evaluation and submission

The [MIT-licensed public study-task sample](https://github.com/KIREETI001/groundtruth-demo-study-tasks) is a deliberately small application for request → validation → persistence and a small rule change. It is separate from GroundTruth. Any fixed trusted-fixture behavior check is operator engineering evidence, not a web feature that executes visitor code.

The [submission packet](submission/README.md) contains the judge guide, project story, local official-form copy, architecture, Meta fit and release checklist. Edited/prerecorded media and prepared model outputs are labelled; neither proves a fresh generation. The participant must review the final packet before submission. Publishing consent remains unchecked.

No external user study or participant feedback has been collected (**not conducted, n = 0**). The [future protocol and blank response sheet](submission/evaluation/user-study-plan.md) are prepared. Automated tests, source review, operator demonstrations and TinyFish browser QA remain separate evidence. They do not establish learning gains, fairer grading, reduced marking time, token savings or model superiority.

## Boundaries and attribution

Only public repositories and bounded selected source are supported. Selected code/context may be processed by Meta, after the applicable notice. Generated content and suggested keys can be wrong. Imported code and submitted snippets are not executed. Independent mode cannot detect outside AI, prove authorship or stop external tools. Availability expiry is not a blanket claim of scheduled physical deletion; temporary demo cleanup occurs opportunistically on subsequent starts.

Earlier local work is documented in [historical notes](docs/local-prototype-history.md). Prior GroundTruth ideation is credited to Attili Kireeti, Delfine Yew, V Narthananilaa and Dr. Wesley Tan, separately from the participant-confirmed solo hackathon roster. Codex assisted implementation/debugging/tests/docs; earlier Qwen/llama.cpp work is not Meta usage. See [architecture and attribution](submission/architecture-and-attribution.md).
