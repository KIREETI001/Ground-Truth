# Future usability protocol and response sheet

**Status: not conducted. External participants: n = 0. Feedback collected: 0.** The participant stated that external participants are unavailable. This is a prepared protocol, not a request to recruit or contact anyone. No sessions, quotes, completions or learning outcomes are reported.

Operator source review, automated tests, fixed trusted-fixture checks and TinyFish browser QA are separate engineering evidence. Record those in their own artifacts. Do not put simulated/operator sessions into the external-participant count.

## Purpose and design

For a future authorized session, observe whether a newcomer can trace a source responsibility, make one small independent change and explain the result, and whether an educator can inspect the preserved evidence and choose a useful follow-up. Use outcome-specific dimensions rather than one blended “quality” or “learning” score.

Proposed convenience sample: two or three adult learner volunteers and one educator/reviewer, roughly 15–20 minutes each. These are planning targets, not recruited or observed people. Report the actual sample and roles if collection occurs. A small formative usability exercise cannot establish causal learning gains, retention, grading fairness, marking-time savings or population-wide AI dependence.

Before a future session, obtain the volunteer's permission for observation and any recording. Use anonymous IDs and synthetic public examples; do not request institutional records, private repositories or passwords. Quotes need separate permission and exact wording. The current task authorizes preparation only; no external outreach or collection has occurred.

## Materials to freeze

- Exact application commit/deployment and the pinned public sample commit.
- Browser/viewport, task wording, prepared content versus freshly generated outputs, and assistance allowed.
- A small known source rule, such as the sample title validation boundary; verify the actual pinned source before selecting the task.
- A fixed trusted sample-fixture check with explicit expected inputs/outputs if behavior is assessed. It runs in the operator's controlled fixture, never by executing arbitrary imported or visitor-submitted code in the web app.
- The exact generated prompt/options/key and the reviewer's source-based assessment. A schema-valid model key is not ground truth.

## Learner tasks

| Task | Observation | Completion evidence |
| --- | --- | --- |
| Open `/login`, choose Try sample learning path | Can the participant find entry and distinguish a prepared overview from a new question? | Time to useful source-linked task; assistance count; observed navigation |
| Trace request → validation → persistence | Can they locate the component responsible for a title rule? | Named source path and explanation of its responsibility, checked against source |
| Submit an initial independent task | Do they understand when in-app assistance pauses and how to submit/end? | Original saved answer; status transition; any confusion or external help disclosed |
| Make a small private edit, review/apply the diff | Can they change the requested rule without a replacement solution? | Saved diff and before/after hashes; fixed fixture's expected/observed boundary results if available |
| Answer the change-linked check and a fresh variation | Is the task related to the actual edit, and what reasoning is preserved? | Distinct original responses and source-based reviewer notes; no automatic learning verdict |
| Open own `/demo/teacher` preview | Can they explain which record is visible and that it is read-only? | Correct description of own-record scope and inability to save a teacher review |

Use neutral prompts such as “What would you do next?” Record help before giving it. Distinguish no help, navigation prompt, conceptual hint and supplied solution. If the observer supplies a solution, do not report that task as independent completion. The application cannot verify absence of outside AI use; ask only for a voluntary disclosure and record the limitation.

## Educator/reviewer tasks

Use approved synthetic accounts with explicit sharing. Ask the reviewer to distinguish two synthetic learners using the same repository, identify an unreviewed committed answer, inspect its task/source/in-app activity, and save a qualified review plus a targeted next question. Confirm that joining a class alone did not share all paths.

The public own-record preview can demonstrate layout and evidence scope, but cannot stand in for a completed authorized teacher review. An operator acting as teacher remains an operator QA session, not external educator feedback.

## Separate evaluation dimensions

| Outcome | Record separately |
| --- | --- |
| Entry/navigation usability | Task found, time, help level, wrong turns, viewport and blocking errors |
| Source understanding | Correct responsibility/path, evidence cited and uncertain reasoning |
| Small-change behavior | Requested diff, fixed expected/observed cases and any remaining failure |
| Independent attempt | Committed response, help disclosure and whether the observer supplied a solution |
| Teacher review usability | Learner correctly identified, original evidence found, source consulted and qualified next step |
| Model map/overview | Source fidelity, relevant coverage, beginner clarity and unsupported claims |
| MCQ | Key correctness, uniquely defensible answer, distractor ambiguity and pre-commit answer leakage |
| Coding prompt | Feasibility from supplied context, clear inputs/expected behavior and small scope |
| Hint/follow-up | Source relevance, useful inspection question and absence of a supplied answer |
| Change/fresh variation | Connection to stored diff, faithful source/hash context and meaningful task variation |

Use categorical observations (completed without help / completed with stated help / blocked / not attempted) and explicit error notes. For model content, use supported / ambiguous / unsupported / not assessed with a reason. Report each dimension's actual denominator and reviewer role. Do not average these into a mastery percentage or claim a causal treatment effect.

## Response sheet template — blank, not collected data

| Field | To fill only after an authorized session |
| --- | --- |
| Anonymous session ID and date | — |
| Role and relevant experience, voluntarily supplied | — |
| Observation/recording permission; quote permission | — |
| Application deployment/commit and source commit | — |
| Browser, viewport and task variant | — |
| Prepared content and fresh-generation receipt IDs | — |
| Task ID, start/end time and completion category | — |
| Help level and exact help provided | — |
| Source path/responsibility identified | — |
| Saved attempt/diff IDs; expected/observed fixed cases | — |
| Reviewer dimension labels and reasons | — |
| Confusion/error observed; severity and recovery | — |
| Participant feedback, exact and permission-scoped | — |
| Change proposed from the observation | — |
| Uncertainties, skipped tasks and missing evidence | — |

Report actual observations in [user-study-results.json](user-study-results.json) only if future collection occurs. Preserve the current not-conducted record until then. A successful demo, synthetic answer or TinyFish run must not be relabelled as participant feedback.
