# Judge guide

Live URL: **pending verified deployment**  
GroundTruth source: **https://github.com/KIREETI001/Ground-Truth** — latest release visibility and commit must be verified  
Sample repository: **https://github.com/KIREETI001/groundtruth-demo-study-tasks**  
Video: **pending recording and accessible upload**

## Five-minute route

1. Open the live URL and create a Student profile, or use the separately supplied synthetic judge account. All roles use the same login. Public Developer registration is unavailable.
2. Start a learning path and import the sample repository. Acknowledge the source-processing notice. Select a Backend feature about task submission or validation; generated labels may differ.
3. Use this goal: “I am a beginner. Teach me task-title validation: trimming, empty titles and length limits. Use simple MCQs and tiny coding tasks.”
4. Read the Workflow overview and its visual reading flow. Open the selected source. This is a pinned, bounded source selection, not a complete repository audit.
5. Open Concepts and choose a validation concept. Generate an MCQ in Practice. Options appear immediately. Check the suggested answer against the actual source after submitting.
6. Generate a short coding task. Start an independent attempt and confirm new study guidance pauses. Submit a short snippet, or choose End attempt. Submitted snippets are stored, not executed.
7. Open Progress. Confirm the original response remains visible and the index is described as provisional evidence. An unreviewed response is not a teacher-certified skill.
8. Optionally join a prepared class and explicitly share this project with the approved synthetic teacher. In a separate teacher account, inspect the saved attempt. No teacher/developer credentials belong in the public repository.

The live release may disable laptop-only working-copy operations. Read the release notes before judging Changes. A cloud-safe source proposal is not the same as a successful filesystem apply, GitHub push or executed test.

## Grounded facts in the example

| Source | Fact to inspect |
| --- | --- |
| `server/validation.js` | Trims the title; rejects a blank title and titles longer than 80 characters |
| `server/api.js` | Task creation returns 201; invalid input returns 400 |
| `db/schema.sql` | A row has a primary key; a new task starts incomplete |
| `db/store.js` | SQL values are supplied separately through placeholders |
| `frontend/app.js` | Uses `textContent` for task-title display |

These source facts describe the supplied demo repository at the version rehearsed. Recheck its pinned commit if changed. Do not treat a generated answer key as authoritative without source review.

## Access and data boundaries

- A Student sees their own paths. Teachers need approval and an explicit project share. Class enrollment alone does not grant all-project access.
- Developer access is provisioned by the operator; role choice on signup cannot grant it.
- Independent mode pauses assistance inside GroundTruth. It cannot prevent external tools or establish authorship.
- Public-repository import needs GitHub availability and supported file sizes. Private repository access is not part of this demo.
- Provider errors should remain visible. A failure must not be replaced by an unlabeled fixed question or local response.
- Use synthetic data. The submission contains no real learner research results.

## If a generation fails

Retry from the visible action after the displayed error, or end an unfinished attempt before beginning another. Do not submit a fake response merely to clear the state. Operator diagnostics should inspect only sanitized request status/model/usage and never disclose API keys or passwords.

## Release evidence

The final commit, migration identifier, actual Meta model, check logs, live smoke-test result and screenshot filenames must be recorded in [release-manifest.json](release-manifest.json). If that file has pending values, the cloud release is not yet verified.
