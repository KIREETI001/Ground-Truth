# Judge guide

Release status: **PENDING_FINAL_COMMIT / PENDING_PRODUCTION_DEPLOYMENT**. These instructions describe the revised implementation. The release operator must verify the deployed journey and fill the [release manifest](release-manifest.json) before presenting it as release evidence.

- Application: [GroundTruth](https://groundtruth-meta.vercel.app/login)
- Source: [Ground-Truth](https://github.com/KIREETI001/Ground-Truth)
- Public sample: [groundtruth-demo-study-tasks](https://github.com/KIREETI001/groundtruth-demo-study-tasks)
- Video: [Walkthrough](https://groundtruth-meta.vercel.app/demo). Revised asset/playback: **PENDING_FINAL_VIDEO_VERIFICATION**.

The official competition form remains unsubmitted. Publishing consent remains unchecked.

## Start in one click

After the revised release is deployed, open `/login` and choose **Try sample learning path**. No signup or shared password is needed. Each visitor gets a separate temporary learner session and private practice copy, expiring after two hours. Another visitor cannot sign you out or read your project.

The pinned public sample, overview and concepts were prepared in advance with Meta and validated by the operator. They are labelled as prepared content. **Generate question** makes a new Meta request; a prerecorded walkthrough or prepared overview is not evidence of a fresh generation.

At mobile width the sample action appears before the story and animation, followed by the Student/Teacher role cards. Production visual checks at 375 pixels are a release gate.

## Five-minute route

1. **Trace the code.** In Workflow, read the overview and selected source. Find the request, validation helper and database write. The reading flow covers selected files at a pinned commit, not the entire repository.
2. **Make an initial attempt.** Choose a concept and generate an MCQ or small coding task. Start independently: new in-app study assistance pauses. Submit your response, or use End attempt to stop. A submitted response is retained before feedback.
3. **Make one small change.** In Changes, create a private draft only after reviewing its permission checkbox. Change a title-length boundary, review the diff and explicitly apply it. This updates your practice copy; it does not push to GitHub.
4. **Check the actual change.** Use Check my understanding on the applied change. The server reconstructs its before/after source, hashes and diff from your owned proposal. The task can address the edit rather than only the current file. Generate a fresh variation after submission to inspect the same idea in a new task; both attempts remain saved.
5. **See the teacher perspective.** Use the sample banner's link to `/demo/teacher`. It shows only your own synthetic sample record, read-only. Inspect the original committed answer, task and source. This preview grants no Teacher role and cannot save an assessment.

For a real classroom account, the learner can select an enrolled approved teacher by name and explicitly share a path. An approved teacher sees learner/class context, filters Needs review or Reviewed, inspects committed answers and source, and saves a qualified human review. Class enrollment alone does not share projects. Teacher/Developer credentials are never public demo credentials.

## What to inspect in the sample

| Source | Responsibility |
| --- | --- |
| `server/validation.js` | Trimming, blank-title rejection and the title-length boundary |
| `server/api.js` | Valid/invalid task-creation responses |
| `db/schema.sql` and `db/store.js` | Row structure and parameterized persistence |
| `frontend/app.js` | How a task title reaches the interface |

Check the pinned source before accepting a generated explanation or suggested answer key. If final evidence includes a trusted sample-fixture result, record its exact commit, inputs and expected/observed outputs. That operator-run check is separate from the hosted app and never executes arbitrary imported or submitted code.

## Boundaries and failures

- Independent mode pauses assistance inside GroundTruth. It cannot detect outside AI use, prove authorship or stop external tools.
- Displayed concept evidence uses observed/reviewed states. Submitting an answer does not award a mastery percentage or certify understanding.
- MCQ keys and review suggestions can be wrong. Human source review and a fresh task remain necessary.
- Teacher-side AI quiz authoring, assignment distribution and cohort analytics are future work.
- Model failures remain visible. Retry the action or end the unfinished attempt; no canned question is silently substituted.
- Demo creation has per-identity, global and active-session budgets. A capacity error is not an invitation to use shared credentials.
- Demo records are synthetic. No external learner/teacher study has been conducted: **n = 0**. Operator or TinyFish checks are QA, not participant feedback.

The final commit, deployed version, checks, model receipts, screenshots and video verification belong in [release-manifest.json](release-manifest.json). Earlier evidence does not certify this revised release.
