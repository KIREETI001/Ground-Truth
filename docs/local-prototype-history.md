# Historical local prototype

This describes the earlier laptop-only build. The live cloud architecture supersedes its runtime and storage claims. See cloud-deployment.md for the current release.

# GroundTruth

Build with AI. Understand enough to make the next change yourself.

The local MVP uses a consistent learning journey: **Repository overview → Choose a workflow → Concepts → Practice → Changes / Apply skills → Progress**. Content comes from the selected public GitHub source, the learner's goal and the local Qwen3.5 9B model. There is no cloud inference fallback or live deployment in the current scope.

## Run on this configured laptop

```powershell
corepack pnpm start:local
```

Open [GroundTruth](http://127.0.0.1:5173/login). The launcher starts the model and private companion, then runs the website. If the website is already running it leaves it in place. Model loading takes a moment. Closing the website terminal stops that website process; the two hidden companion processes remain running.

All roles use the same local username/password login. The private preconfigured developer credentials are in ignored `.sites-runtime/local-login.json`. Do not commit or share this file. Users can sign up normally; teachers request approval and initially receive ordinary access. Developer signup is unavailable. Developer operations include a labelled learner preview.

This laptop already has dependencies, private configuration, model/runtime and database migrations **0000–0011**. Do not replay applied migrations. Node 24, Git and Corepack/pnpm 11.25.0 are used. See [the local setup and architecture](docs/local-project-mvp.md) for fresh setup and boundaries. VS Code also has a “GroundTruth: start everything locally” task.

## Current workflow

- Paste a public repository URL to generate a bounded map of its key features and concepts. Choose an area such as Backend and a workflow; relevant source files are selected automatically at a pinned commit. No file picker is required.
- Choose “Understand & improve my project” for controlled local edits, or “Learn from a public project” for read-only study and a generated adaptation challenge tailored to your own project goal.
- Generate a concept tree, pick a focus and complete a short exercise. Independent mode pauses new study AI assistance account-wide until the answer is committed or the learner ends the attempt. Optional reflection comes after the saved answer.
- For repositories you own or have permission to modify, create a separate managed working copy. Edit manually or request one AI proposal with a short summary. Review its diff, explicitly approve and apply. Hash checks protect intervening IDE edits; backups and idempotent receipts are retained. Nothing is pushed to GitHub.
- Generate understanding questions against the current edited file. Progress distinguishes unreviewed independent attempts from human-reviewed evidence. The index is provisional, not a validated mastery measure.
- Explicitly share projects with approved teachers. Teachers review original answers and observed in-app activity. Developers approve teacher requests and manage roles.

## Verification

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Tests cover SQLite ownership/role isolation, authentication, explicit sharing, immutable submissions, model-output validation, concept evidence and controlled local edits. Browser checks use real local inference and clearly labelled synthetic answers.

## Boundaries

Fetching a public Git snapshot requires internet; cached study and inference stay on the laptop. Repository snapshots are cached separately on disk and retained when learning records are deleted. Imported code and project tests are never executed. Selected-source review is not a complete audit, security scan or standards certification. Generated explanations can still be wrong.

Saved project records are available for 30 days. Physical expiry cleanup is an operator action. Deleting a project cascades its database learning evidence, but **retains separate working-copy files and backups on disk** to preserve edits. Authentication, operational roles and access audits are separate. Activity counts do not detect external AI use or establish authorship, dependence or learning gains.

- [Local setup, model and database architecture](docs/local-project-mvp.md)
- [Focused three-minute demo pitch](docs/live-mvp-pitch.md)

The earlier GroundTruth educational proposal by Attili Kireeti, Delfine Yew, V Narthananilaa and Dr. Wesley Tan supplied prior ideation. This attribution does not identify the hackathon team or establish educational effectiveness.

## Leaving an activity

Use **End attempt** in the active-attempt banner, including on the new-path screen, to release independent-mode restrictions without submitting an answer. Practice and the change/transfer stages also offer **End this attempt** for a guided or independent activity. Ended activities retain their question, original phase and ended timestamp, but do not earn completion or mastery credit. Committed answers remain immutable. The additive 0010 migration adds `ended_at` and updates the one-open-exercise index; no records are deleted or converted into fake submissions.

## Beginner learning and source viewing

The source viewer loads complete selected files at the pinned commit instead of displaying a 1,500-character excerpt as if it were complete. Existing saved paths use the same authenticated source endpoint. The prototype still supports ordinary files up to 12 KiB; unsupported/unsafe files show an error rather than silent truncation. Full-source viewing is separate from model context, which is bounded to 10,000 source characters across the selected workflow. Larger context ends at a line boundary when possible and is labelled as bounded.

Before new practice, learners see a locally generated plain-language overview, a clickable conceptual reading flow and key terms. Engineering review questions stay in a separate disclosure. Multiple choice is the default ordinary practice option, with a written-answer alternative. Transfer-plan challenges remain open-ended. Four choices and a private suggested answer/explanation are generated locally, choices are shuffled, and the key is revealed only after an immutable submission. Keys may be incorrect and matching them is not verified mastery. Ending an activity still releases the lock without submitting.

Practice now offers MCQs (default) or short coding tasks only. Open-ended exercise requests are rejected. No written reasoning or reflection question is requested after MCQs. Code snippets are stored for teacher review and are never executed or applied automatically. Older activity history remains available.
