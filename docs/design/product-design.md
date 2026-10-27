# GroundTruth MVP product and interaction design

GroundTruth should launch as one guided verification lab for a synthetic **Campus event signup** app. A student commits a prediction, runs the supplied application against real persistence, examines request and registration evidence, revises an explanation, applies a vetted code patch, and completes a fresh case independently. The workbench makes each claim traceable to either the student, the model, the instructor, or an execution record.

This is a pre-build implementation specification. No product, usability result, learning gain, tutor time saving, or accessibility conformance is claimed here. The source proposal supplies the educational intent; the concrete fixture, interface, and release defaults below are product recommendations agreed with the planning team.

## 1. Product boundary and defaults

| Decision | MVP default |
| --- | --- |
| Primary learner | A university student who has built a small web app with AI and can read a short JavaScript request handler |
| Setting | One ungraded, moderated activity using synthetic campus events and student records |
| Initial access | Public information page when released; native ChatGPT sign-in, moderator-supplied pilot enrollment code, and server-enforced membership for the app; initial cap of five pilot users |
| First release | Private staging for team verification before the pilot audience is enabled |
| Learning objective | Distinguish a visible UI safeguard from a guarantee about persisted effects, and distinguish a repeated attempt from a new intended action |
| Guided case | A disabled signup button; the registration commits; the successful response is discarded; the client receives HTTP 504 and retries the same intended signup |
| Independent case | A browser-session key is reused for event A, a retry of A, and a new signup for event B |
| Real execution | Only supplied application handlers and allowlisted fixtures; real HTTP and database evidence where those capabilities are implemented |
| Code changes | Read-only source plus selectable, vetted, real code diffs; no student-uploaded code and no arbitrary code execution |
| AI role | After a committed prediction, one contextual structured generation selects an actual allowlisted probe and returns a short question, rationale and material references; it cannot execute tests, write observations, choose patches, or award marks |
| Tutor role | Read-only review of original predictions, explanations and evidence; human 0–3 judgements are recorded manually in the pilot kit, with no in-app scoring or notes CRUD |
| Time hypothesis | Design for a 20–30 minute moderated session; measure the actual duration rather than imposing a countdown |

The interface must never call a model prediction an observation. It must never label a stored fixture transcript as a fresh execution. If the executor calls a function rather than making an HTTP request, the interface must say “Executed handler call,” not “HTTP request.” If response loss is implemented by a controlled discard rather than a real network outage, the interface must name that mechanism.

Use the canonical lab ID `campus-signup.v1`, fixture IDs `lost-success.v1`, `concurrent-retry.v1`, `fail-before-commit.v1` and `intent-lifecycle.v1`, and phases `baseline`, `repair`, `transfer`, and `transfer_repair` so the student journal and execution service refer to the same artifacts. Carry `caseId` through prediction, execution and evidence; comparisons must group the same case rather than treating unlike probes as repeated measurements.

## 2. What the MVP must prove

The reviewable outcome is a complete record showing what one student predicted before seeing evidence, what the supplied app actually did, how that student revised an explanation, and what they did on a related case without AI help. A passing repair test alone is insufficient evidence of understanding.

The first investigation has these factual checkpoints. These are authoring and QA facts, not pre-run student feedback.

| Phase | Executed sequence | HTTP responses received by client | Registrations in that run |
| --- | --- | --- | --- |
| `baseline` | First request commits; its internal success response is discarded; retry inserts again | 504, then 201 | 2 |
| `repair` with intent replay patch | First request commits; its success response is discarded; retry uses the same key and returns the persisted result | 504, then replayed 201 | 1 |
| `transfer` | Signup A; retry A with the same browser-session key; signup B with that same key and changed payload | 201, replayed 201, then 409 | 1 |
| `transfer_repair` | A and retry A share one intent key; new signup B gets a fresh key | 201, replayed 201, then 201 | 2 |

The 504 is the client-visible outcome of the injected fault. It must not erase the preceding successful commit. The 409 in transfer is an observed rejection of one key used with changed input, not a duplicated registration. Each row count is scoped to a fresh run namespace starting at zero.

The required journey stays on `lost-success.v1`. Two additional real probes support adaptive investigation in `baseline` and `repair`: `concurrent-retry.v1` sends two HTTP fetches together for the same intent and yields two registrations in the naive variant versus one in the idempotent variant; `fail-before-commit.v1` injects a 503 before any write, then retries to a 201 and one registration in either variant. The latter has zero rows after the rejected first attempt. These are actual executor capabilities, not narrated hypotheticals. Selecting a different probe requires a new committed prediction bound to that `caseId` before execution.

The product should say “One persisted result for the repeated signup intent in these tests.” It must not claim universal exactly-once delivery, production readiness, or correctness beyond executed cases.

## 3. Exact student journey

### Entry and participation

1. The landing page gives a one-sentence purpose, the ungraded pilot setting, the approximate session duration as an estimate, and the synthetic-data boundary. Primary action: **Open the lab**.
2. Native ChatGPT sign-in establishes ownership. The app must use platform identity and authorization, not a custom login or an anonymous-session promise.
3. An unenrolled user enters the moderator's pilot code. This is membership enrollment, not a replacement for authentication. Accepting a code assigns an opaque participant label such as `P-4K7`; it does not reveal other participants. Enrollment is enforced on the server and capped at five pilot users initially.
4. A short participation screen separates necessary saved activity and read-only review by the named tutor from optional research use. The research checkbox starts unchecked. Declining research still permits core saved practice, authorized tutor review and the student's own export/print. Both **Continue** actions enter the same lab and provide the same support. A returning student sees **Resume lab**, their current stage, and the last successfully saved time.

Suggested landing copy: “Predict what this app will save. Run it, inspect the evidence, and test your explanation.” Suggested participation copy: “Your answers and test history are saved for practice and read-only review by your named tutor, and you can export or print your own record. You can optionally allow de-identified counts, timings and manually recorded rubric scores to be included in pilot analysis. Your written answers, quotations and tutor notes are excluded from that analysis and its exports. Your research choice does not affect practice or tutor support.” The notice also states the 30-day availability window from session creation and the deletion operations described below.

### Stage 1 — Predict

5. Show the Campus event signup requirement: one intended signup should produce one registration, while a genuinely new signup remains possible. Show a small working app preview with synthetic event and student data, the short relevant client and server source, and the exact planned intervention. There is no observed result yet.
6. Explain the intervention as a condition, without supplying its result: “Send a signup request. Discard its response after the registration commits. Let the client receive a timeout response and retry the same intended signup.” Name this **Response interrupted after commit**. Do not call it “the duplicate-write bug.”
7. Ask the student to predict registration count after each visible action group, emphasizing the final count. Offer **0 / 1 / 2 / 3** without a preselected answer. An uncertain learner can choose a best estimate and record **Very unsure** confidence. Store the numeric sequence as `rowsAfterEachGroup`. A serial fixture has a count for each action stage; the concurrent fixture has one count after the whole parallel group, without implying a fixed order between its two requests.
8. Ask: “What do you expect the client and database to do, and why?” Provide an empty textarea and an optional neutral structure: “I expect … because …”. Do not prefill a correct explanation or show model-authored prediction options. Require a nonempty response, not a minimum word count.
9. Ask confidence using a five-point labelled scale from **Very unsure** to **Very sure**. Save the student's brief expected sequence as their conceptual model; no separate instructor simulator is presented as their thinking.
10. **Save prediction** commits an immutable version. The student sees **Prediction saved** and the exact saved answer. **Run this test** is now enabled. An edit before the first run creates a new prediction version and preserves the previous version; the run binds to one committed version.

The first prediction is AI-free. Source code may be examined because predicting code behavior is the task. Result APIs, precomputed answers, repair choices, gold explanations, tutor rubrics, and AI hints must not be returned to the student before the appropriate gate. Hiding DOM elements alone is insufficient.

### Stage 2 — Run and observe

11. **Run this test** creates a run ID bound to participant, fixture version, phase, code digest, and committed prediction ID. Double activation of this workbench control must not start duplicate lab runs.
12. The workbench reports real milestones: **Preparing this run → Sending signup → Injecting response discard → Retrying → Reading registrations → Complete**. Show only milestones actually observed from the runner. Do not invent a percentage, countdown, live trace, or timing.
13. While running, prediction is read-only. The embedded sample app can visibly move from submitting to “We couldn't confirm your signup. Try again” to a returned result, but the sample UI cannot be treated as database evidence.
14. On completion, reveal **My prediction** and **Executed evidence** together. Show the student's expected count, the actual queried count, both client-visible HTTP responses, the request attempts, and the registration rows. Use **Different from your prediction**, **Matches your prediction**, or **You marked this unsure** as descriptive labels. Do not use a grade, celebration, or shame message.
15. The request trace separates intended action ID, attempt ID, idempotency key when present, server commit, discarded success response, client-visible 504, and later response. Selecting an event opens its full structured record. Every displayed fact links to its evidence record ID. For concurrent requests, show the actual recorded timing or overlapping group; the fixture's step index must not invent an observed completion order.
16. **Replay trace** replays the already stored timeline without another request. **Run again** starts a new isolated run after the student saves a fresh or explicitly reused prediction. These controls must be visibly different.

### Stage 3 — Explain and investigate

17. Ask: “Which evidence supports or changes your explanation?” Require the student to select at least one request event or row evidence reference, or explicitly choose **The available evidence is insufficient**. A text-only answer must also be available for assistive technology users; citations cannot depend on drag and drop.
18. Ask: “Revise your explanation. If it is unchanged, explain why.” Keep the initial answer visible and immutable. The new field starts empty; **Keep my explanation** copies the student's own text only after an explicit action and still requires an evidence note.
19. Expose **Get investigation prompts** only after a relevant prediction is committed; its default placement is here after the first revised explanation. Its notice says that the current explanation and synthetic test context are sent to a Meta model service. Do not send the platform account identifier or unrelated work. The student can finish the lab without requesting prompts.
20. One contextual structured Meta generation selects among `lost-success.v1`, `concurrent-retry.v1` and `fail-before-commit.v1` and returns a short generated question, test rationale and vetted material references. No native tool loop is required. Each card is labelled **Meta model suggestion — not executed** and offers **Use**, **Change**, and **Skip**. Using or skipping requires a short reason, with a quick reason option and optional detail. Changing chooses an actual supported probe or saves a written idea; arbitrary prose is never executed.
21. A selected executable proposal returns to a prediction card before execution. Changing the `caseId` requires a new probe-specific prediction to be committed. An unsupported idea is labelled **Test idea only** and has **Save idea**, not **Run**. Transfer permits no coach call, regardless of earlier prompt use.
22. The student saves a final guided explanation and one test they would use to challenge it. **Review code changes** now opens the vetted patch choices. There is still no model answer or gold rubric.

Useful question form: “Which recorded event would distinguish the client not receiving a response from the server not saving a registration?” Unacceptable form: “The button does not protect the database; add idempotency.” The former asks the student to use evidence; the latter supplies the target conclusion and repair.

### Stage 4 — Repair and retest

23. Present two equally styled, vetted patch cards, both backed by real supplied code. Recommended choices are **Guard the submit handler** and **Persist and replay signup intent**. The first adds a client guard; the second preserves the logical intent key across retries and atomically persists or replays its server result. Neither card is labelled correct, recommended, safer, or best.
24. Each card shows a concise change summary, the actual client/server diff with line references, and which supplied files change. The student selects one and explains why the change addresses the observed evidence. The model does not select, generate, or apply a patch.
25. **Apply selected patch** changes the supplied application variant, records patch ID and code digest, and opens a fresh repair prediction. The old run and source digest remain inspectable. “Applied” means the executed code variant changed; it must not mean a decorative diff was displayed over unchanged behavior.
26. Before repair execution, the student predicts registrations and client behavior again. **Run verification** executes the same required `lost-success.v1` fixture from zero rows with the selected code. The comparison shows before/after rows and request evidence side by side, each with its own run ID.
27. A nonresolving patch produces normal executed evidence and asks the student to revise or choose the other patch. The interface does not narrate the correct fix. Switching patches records a new choice and a new prediction; it never rewrites the first choice.
28. The guided repair completes when the expected single-intent contract has executed successfully and the student has saved an evidence-based account of what changed. Do not judge the prose automatically. A student who needs help can remain in this stage or ask the moderator; no correct text is auto-inserted to unlock progress.

If there is only time to build one real patch variant, preserve one meaningful selection between existing supplied client and server variants rather than adding fictional options. Do not ship an option with no actual executable implementation.

### Stage 5 — Transfer independently

29. Enter a visually distinct but calm **Independent case — AI paused** state. Keep the same workbench layout and source viewer. Remove AI cards, hints, worked explanations, patch comparisons, and model endpoints for this phase. The first-case journal remains saved, but its explanatory panels are not opened beside the independent task.
30. Reveal the new variant and sequence: signup for event A, retry event A, then make a genuinely new signup for event B using a client that stores one key for the browser session. State the desired behavior in domain terms: a retry should not create another registration, and a new intended signup should remain possible. Do not reveal the returned statuses, row count, diagnosis, or new-intent patch.
31. Require three pre-run fields: **predicted registration count**, **expected status or statuses for the planned requests**, and the student's own **rationale**. Also record confidence and ask what evidence would distinguish a rejected new signup from an inserted duplicate. **Save independent prediction** locks these fields before execution.
32. **Run independent test** executes `intent-lifecycle.v1` with the idempotent backend and the supplied session-key client. Reveal the actual 201 / replayed 201 / 409 sequence and one persisted row only after completion.
33. Require a post-run, no-AI explanation: “Explain what happened to each intended signup. What should remain the same on a retry, and what should change for a new signup?” The response must diagnose same-intent replay versus the new-intent conflict, cite execution records and propose the corrected key lifecycle. The interface checks that the student's own fields are present; a human judges their conceptual quality. **Submit independent explanation** locks this response before any debrief or transfer repair is exposed.
34. Only now reveal the vetted client diff that creates a fresh key for each new intended signup and preserves it across that intent's retries. The learner saves a repair prediction and executes `transfer_repair` in a fresh run. Observed evidence should contain two registrations for the two intended signups, with the repeated attempt of A replaying its stored result.
35. The student adds a final note on which evidence tests their proposed boundary. **Finish activity** submits the record for tutor review. The interface says **Activity submitted** and shows a factual evidence summary, not **You mastered idempotency**.

Do not show a model-written gold explanation, answer key, suggested SOLO level, or correctness rubric before the independent explanation is locked. An answer can be reasoned out from code and executed evidence; that is the intended task. It must not be delivered as hidden structured feedback or in an accessible-but-visually-hidden component.

## 4. Workbench screen anatomy

The product is a focused application, not a chatbot or a course dashboard. There is no empty chat input, mascot, points system, streak, lesson marketplace, or hero image inside the lab.

| Region | Content and behavior |
| --- | --- |
| Application header | GroundTruth wordmark, **Campus event signup**, participant label, save status, **Activity history**, and account/data controls. No grade or class leaderboard. |
| Stage navigation | Predict → Run and observe → Explain → Repair and retest → Transfer. Current stage is marked by text and shape. Completed stages open their saved records read-only. Locked stages explain their prerequisite. |
| Current task strip | One main question, the synthetic app requirement, fixture condition, and current code version. Length should fit within three short lines on desktop. |
| Left pane — My prediction | Expected state count; the student's expected event sequence; original explanation; confidence; later revisions. Label “Your model — not executed.” Preserve the saved text when the right pane changes. |
| Right pane — Supplied app and evidence | Before run: sample app preview plus source tabs. After run: queried registrations summary, request timeline, registrations table, raw structured record, and source digest. Default to Evidence after completion; do not hide it behind Source. |
| Investigation prompts | A bounded section below the student's explanation, revealed at the proper gate. Suggestions never enter the evidence timeline. |
| Primary action area | Exactly one primary action for the present state. Secondary actions are text or outline buttons. Save state and validation are adjacent. A sticky area must leave enough page padding that it never covers focused content. |
| Activity history | Chronological predictions, runs, explanations, suggestions and decisions, patches, and independent submission. Filter by phase. Each item opens its snapshot; there is no destructive “edit history” control. |

At a wide desktop viewport, use a 176–192 px stage rail and a 42% / 58% expectation/evidence split inside a maximum 1440 px shell. Minimum pane widths are approximately 340 px and 460 px. At widths where these cannot fit, move stage navigation above the content and then stack the panes. The learner can resize panes with keyboard-operable controls if this can be implemented cleanly; resizing is not required for MVP.

The conceptual-model pane is a visualization of the student's committed predictions: simple labelled expected-event cards and a final expected count. It does not execute a second authoritative simulator. A separate dual-engine simulator is deferred until it has a clear educational purpose and independently specified semantics.

## 5. Evidence presentation contract

Each completed run must show:

- **Provenance:** run ID, case ID, completed time, fixture version, phase, code/patch digest, execution mode, initial row count, and the committed prediction it tested.
- **Observed summary:** queried final registration count, number of attempts, and actual client-visible statuses. A summary is computed from stored records, never supplied by the model.
- **Request timeline:** ordered records with attempt ID, logical intent ID, key when present, input event, handler result, commit event, response-discard event, client-visible response, and replay flag. Missing fields are explicitly unknown.
- **Database rows:** row ID, synthetic student ID, event ID, logical intent/key association if persisted, and commit time. Count and rows must agree. A query failure is not represented as zero rows.
- **Boundaries:** “Controlled response discard after commit” identifies the injected fault. “Synthetic campus data” remains visible. Isolation wording reflects actual implementation, for example “This run uses its own registration namespace,” rather than claiming a container sandbox that does not exist.

Use neutral words for client uncertainty: “The client received 504; the commit record shows registration R-101 was saved.” Never compress this into “The request failed” if the server already committed. A second attempt is a new request record even when the server returns the first result.

The database view is read-only. A visually simulated row cannot be displayed in it. If operational evidence is incomplete, put **Run incomplete — final database state not verified** above all summaries and prevent outcome-based progress until the state is reconciled or the run is safely repeated in a fresh namespace.

## 6. AI boundary and scaffold fading

| Point in journey | Support available | What remains the student's work |
| --- | --- | --- |
| First prediction | Requirement, source, fixture conditions, glossary, empty sentence structure | Predict counts and events; explain causal expectation |
| First observation | Real trace, rows, provenance, “compare prediction” structure | Identify supporting/conflicting evidence and revise explanation |
| Guided investigation | At most two bounded Meta test suggestions and one question, requested by the student | Accept/change/skip with reason; commit next prediction; choose evidence |
| Repair | Instructor-vetted code diffs and fresh execution | Select patch, justify it, predict and explain its observed effect |
| Transfer | Requirement, new supplied source, same evidence tools; AI paused | Predict, choose a discriminating observation, explain, propose a boundary |
| After independent explanation | Vetted client repair diff and another real execution | Predict repaired behavior and account for the observed boundary |

Scaffolding fades by phase in MVP, not by a speculative mastery score. All students receive the same gate order. Optional prompts may be reopened in the guided stages, and their use is recorded without a penalty label. Reading support, glossary definitions, keyboard access, and save/resume remain available throughout transfer; AI-free must not mean inaccessible.

The Meta response format is bounded: an actual case ID selected from the three baseline/repair probes, allowed parameters, a short generated test rationale, one short generated question, and vetted material references. Each request uses one contextual structured generation, with no autonomous execution or native tool loop. A validator rejects unsupported tests, output-count predictions, supplied solution code, final causal answers, invented execution claims, grade decisions, and transfer help. Rejected or unavailable AI output is replaced by a clearly labelled **Instructor question**, not a fake successful model call. The actual provider/model name and request status may be recorded for provenance, without exposing secrets.

Do not make model latency a gate to saving, testing, or completing the lab. Show **Preparing investigation prompts** with cancellation, then a short retry action on failure. Avoid automatically repeating paid model calls on re-render or navigation.

## 7. State transitions and durable records

| State | Primary action | Required guard | Successful next state |
| --- | --- | --- | --- |
| Unenrolled | Enter pilot code | Native sign-in, accepted code, remaining membership capacity | Participation choice |
| Prediction draft | Save prediction | Count per visible action group, own nonempty explanation, confidence | Prediction committed |
| Prediction committed | Run this test | Server-owned committed prediction, authorized fixture and phase | Run pending |
| Run pending | View progress | One active run for this phase; duplicate clicks reuse the request | Evidence ready or incomplete |
| Evidence ready | Save revised explanation | Own text plus evidence reference or insufficient-evidence declaration | Explanation committed |
| Explanation committed | Review code changes | Required guided run completed and revision saved | Patch review |
| Patch review | Apply selected patch | Allowlisted variant and own justification | Repair prediction draft |
| Repair evidence ready | Start independent case | Repair contract observed; own repair explanation saved | Transfer prediction draft |
| Transfer prediction committed | Run independent test | Count, expected statuses and rationale committed; no AI route; hidden transfer repair not yet disclosed | Transfer evidence ready |
| Transfer evidence ready | Submit independent explanation | Own account of replay versus conflict, evidence references and proposed corrected key lifecycle; no AI | Independent explanation locked |
| Independent explanation locked | Review client repair | Server gate satisfied | Transfer repair prediction draft |
| Transfer repair evidence ready | Finish activity | Final own note saved | Submitted for tutor review |

Use server-enforced state guards on mutation and content endpoints. Reloading a page must restore a pending run and retrieve its status; it must not repeat the signup test or drop the prediction. Browser Back must not reopen an editable first prediction after the student has seen evidence. A new run always has a new namespace; clearing the sample app UI does not reset the database invisibly.

The journal preserves prediction versions, run snapshots, explanation versions, prompt source, AI suggestion decisions, patch choices and transfer locks. Edits create new versions. Tutor judgements and notes are outside the MVP application and are not journal records. The server associates every artifact with opaque platform ownership; a URL run ID alone does not grant access. Tutor authorization uses an explicit instructor ID allowlist, never a query parameter or hidden menu.

## 8. Tutor experience

Keep one read-only evidence review screen for MVP. The authorized tutor can inspect original learner work and execution evidence; the student can export/print their own retained activity. Human scoring takes place manually in the pilot kit. There is no in-app scoring-save interface, review-note CRUD, AI marking, grade publication or tutor authoring. Instructor authoring, roster management and course administration are separate future work.

| Tutor area | Required content |
| --- | --- |
| Pilot overview | Pseudonymous participant labels, stage, submitted/in-progress state and actual completed-run count; no scored status or speculative mastery ranking |
| Evidence timeline | First prediction next to first run; revisions with cited records; accepted/changed/skipped prompts; patch choices; first independent prediction and locked explanation |
| Execution inspector | The same immutable request/registration facts as the student, plus integrity/failed-run warnings; no model-authored substitute facts |
| Export/print | Student-owned export and a readable print layout of the retained original record; the tutor view stays read-only |
| Pilot kit | A separate manual rubric sheet for human judgement, evidence references and uncertainty; not an application screen or persisted app note |

The pilot kit's manual human rubric uses 0–3 separately for **concept accuracy**, **evidence linkage** and **boundary reasoning**. Concept accuracy asks whether the account distinguishes a committed operation from client response loss and describes replay/conflict accurately. Evidence linkage asks whether the learner connects particular request, commit and row records to the account. Boundary reasoning asks whether the proposed lifecycle keeps a key for retries of one intent and creates a fresh key for a new intent. Use 0 for absent or incompatible evidence, 1 for an isolated relevant element, 2 for a mostly coherent account with a material gap, and 3 for an accurate, connected account within the tested boundary. The tutor records the evidence and uncertainty in the kit, not in the app. These are human research/review dimensions, not grades shown to the student. SOLO remains an optional qualitative mapping for the proposal's later study, not the MVP scoring system.

No AI marking is needed for MVP. If optional AI analysis is added later, record the tutor's initial judgement before revealing it and label it **AI draft — tutor decision required**. Do not declare that an imperfect answer proves a particular cognitive state.

The gold case notes and rubric stay in the manual pilot kit and are not included in student API payloads or presented as student grades. The named tutor's in-app screen is read-only and does not show optional research-consent status while they review learning work. The student's own export includes their original saved work and evidence regardless of research choice; it does not imply that tutor judgements or notes are stored in the app. Research analysis/export is separate and excludes all raw answers, quotations, tutor notes and other free text, even for consenting participants.

Suggested manual review prompt: “What does this student's first independent prediction and explanation support, and what remains uncertain?” Measure tutor review time manually in the pilot kit, with pauses and interruptions recorded rather than silently counted as marking work. Do not require an in-app saved-review timestamp.

## 9. Visual system

The visual direction is a quiet scientific workbench: readable text, a clear comparison, restrained blue for actions, teal for executed evidence, and amber for unexecuted suggestions. Avoid decoration that competes with the trace. Use a wordmark and an existing icon set; custom illustration is unnecessary.

| Token | Value | Usage |
| --- | --- | --- |
| `canvas` | `#F7F8FA` | Application background |
| `surface` | `#FFFFFF` | Panels and form fields |
| `surface-subtle` | `#F0F3F6` | Source and quiet nested regions |
| `ink` | `#172129` | Primary text |
| `ink-muted` | `#4B5B68` | Secondary text; never low-opacity body text |
| `border` | `#CBD2D9` | Panel division; controls need a sufficiently visible boundary |
| `action` | `#244BCB` | Primary actions and links; white button label |
| `focus` | `#713CC2` | Visible outline with offset; verify against adjacent colors |
| `expectation-ink` / `expectation-bg` | `#3E4BB2` / `#EEF0FF` | Student prediction label and region |
| `evidence-ink` / `evidence-bg` | `#12665F` / `#EAF7F4` | Executed evidence label and region |
| `suggestion-ink` / `suggestion-bg` | `#795200` / `#FFF6DE` | Unexecuted suggestion and uncertainty |
| `error-ink` / `error-bg` | `#A62D24` / `#FFF0EE` | Operational or validation errors; not student misunderstanding |
| `verified-ink` / `verified-bg` | `#1C6A42` / `#EDF7F0` | A verified test contract, with explicit text |
| Font | System sans serif | No external font dependency required |
| Source font | System monospace | Source, row IDs, keys, raw records |
| Type sizes | 32 landing title; 24 page title; 20 section; 16 body; 14 metadata/code | Body line height 1.5; code approximately 1.55 |
| Spacing | 4, 8, 12, 16, 24, 32, 48 px | 24 px desktop gutters; 16 px narrow-screen gutters |
| Radius | 4 px code; 8 px fields/buttons; 12 px major panes | Avoid pill-shaped cards for ordinary content |
| Controls | 44 px preferred target height | Labels remain visible; no icon-only primary action |
| Motion | Brief state change only | No required animation, confetti, auto-scrolling trace, or flashing |

All roles use explicit text as well as color: **Your prediction**, **Executed**, **Suggested**, **Incomplete**, **Replay**, **New intent**. A green count does not mean the student explanation is correct. A red form error never means “wrong hypothesis.” Source diffs use Added/Removed markers and line labels rather than red/green alone.

Validate implemented color pairings rather than claiming the token list itself guarantees contrast. Text targets are at least 4.5:1 for normal text; large text and essential nontext controls have separate minimum targets of 3:1. Use a visible focus indicator and keep focused content unobscured. These acceptance targets follow the official [WCAG 2.2 specification](https://www.w3.org/TR/WCAG22/); conformance must be tested on the implementation.

## 10. Responsive and accessible behavior

- At 1200 px and above, show the stage rail and split panes. At medium widths, replace the rail with a compact step list above the panes. Below approximately 960 px, stack prediction before evidence. At 320 px and 400% zoom, the main page must reflow without horizontal scrolling.
- On mobile, show a compact saved-prediction summary above executed evidence. A **Jump to evidence** anchor can help; do not force the learner to remember a prediction from a hidden tab. Registration rows become labelled cards. Raw JSON and source may scroll in their own labelled region.
- Preserve meaningful DOM order: task, prediction, action, execution status, evidence, explanation. Headings and landmarks identify each region. Provide a **Skip to current task** link.
- All fields have persistent labels and associated help/error text. Validation points to the specific empty field and keeps existing work. Count questions allow **Very unsure** confidence alongside the required best estimate. Do not rely on placeholders, hover, color, drag and drop, or time pressure.
- Stage changes move focus to the new heading after a deliberate action. Run completion announces a short status through a polite live region; it does not read the entire trace automatically or steal focus while the student is typing.
- Timeline events are an ordered list, and tables have headers. Evidence references are checkboxes or buttons with full accessible names. Raw records are supplemental to a plain-language view.
- Tabs and dialogs follow keyboard patterns. Opening a patch diff dialog moves focus inside; closing returns it to the initiating button. Modal confirmation is reserved for deleting work, not ordinary progress.
- Source code has a readable plain-text option; syntax color never carries meaning alone. Nonessential decorative icons are hidden from assistive technology.
- Respect reduced motion. No timed prediction, forced auto-advance, or inactivity loss. The app warns of actual sign-in expiry and preserves the saved activity.

Manual acceptance should include keyboard-only completion, a screen-reader pass on the core loop, 200% text zoom, 400% page zoom, a 320 px viewport, a wide desktop viewport, and high-contrast or forced-colors mode. This is an acceptance plan, not a claim that these checks have run.

## 11. Loading, error, empty, and interruption states

| Situation | Required treatment | Recovery |
| --- | --- | --- |
| Sign-in required | Native sign-in affordance and a short explanation of saved ownership | Return to the intended lab after sign-in |
| Wrong/expired enrollment code | “That code could not enroll you. Check it with your moderator.” Avoid revealing valid codes or roster | Keep input editable; retry with rate limiting |
| Pilot full | “This pilot is currently full. Your moderator can confirm access.” No fabricated waitlist | Return to information page; no automatic invitation |
| No prediction yet | Empty prediction card with task-specific fields; evidence says “No run yet” | Save prediction |
| Saving | “Saving…” then a confirmed timestamp; never show Saved prematurely | Retry saving; keep text locally in memory without claiming durable storage |
| Save rejected or connection lost | “Your latest changes have not been saved” near the field and action | Retry; preserve draft; do not enable Run on an unsaved prediction |
| Pending run | Real milestone and run ID; button remains unavailable for a second start | Resume status after reload |
| Runner timeout or missing final query | “Run incomplete — final database state not verified”; unknown count rather than zero | Reconcile existing run; if necessary create a fresh run with a new prediction reference |
| Controlled sample timeout | Display observed 504 as evidence; keep it distinct from a broken workbench | Continue the fixture and show its actual retry |
| Zero observed rows | “0 registrations returned by this run's database query” plus successful query provenance | Inspect request evidence; this is a valid outcome |
| Model loading/failure | Bounded loading state; “Investigation prompts unavailable” with Retry or a labelled instructor question | Continue without AI; never fabricate a model response |
| Patch application failure | Keep current executed variant and say which change did not apply | Retry allowed patch; do not label the new code active |
| Stale tab / phase conflict | “This activity changed in another tab. Reload its saved state.” | Reload without rerunning; preserve unsaved own draft for copying |
| Unauthorized run/tutor link | Plain access-denied state without other students' content or existence details | Return to own activity |
| No submitted activities | “No submitted activities to review yet” with real submitted/in-progress counts | Refresh or return later; no fabricated sample participants |
| Submission saved | “Activity submitted for tutor review” with time and record link | View own history; no speculative mastery badge |

## 12. Data choices and research participation

Necessary application data consists of membership, opaque ownership, predictions, explanations, fixture/code versions, execution records and patch choices. These support saved practice, read-only review by the named tutor and the student's own export/print even when optional research use is declined; disclose that on entry. Manual human judgements and tutor notes are not stored by the app. Collect no real event registrations, student names, student email addresses, production credentials, or uploaded application source.

Optional research consent is a distinct, versioned choice with its own timestamp. It defaults off, does not affect access, does not change task scaffolds, and is hidden from tutor judgement screens. An additional optional follow-up invitation would require its own choice and a separate contact channel; the MVP does not collect contact details or send automated messages. The organizer recruits real testers and supplies the pilot code through their existing channel.

Show a brief AI data notice next to **Get investigation prompts**: the current explanation, synthetic case, permitted material and relevant executed evidence are sent to a Meta model service. Do not promise provider retention or model-training behavior without verified settings. The student can use instructor prompts instead. Logs and model requests must avoid platform account IDs and unnecessary free-text duplication.

Practice records are available for **30 days from session creation**, not 30 days after the last interaction. Operational diagnostic data has a **7-day window**. **Delete my activity** must perform synchronous deletion of the student's application records through a functioning server operation and report its completion honestly. The operator also purges pilot data at pilot close. Do not promise automatic timed deletion unless a scheduler is implemented and verified; an access-expiry window is not proof of erasure. The operator owns the 7-day diagnostic purge when no scheduler exists. State these actual availability and purge rules in the entry notice. Deletion needs a clear consequence statement and one confirmation; ordinary saving and testing do not.

Research withdrawal removes eligibility from future research analysis and exports. State any real limitation on already aggregated exports plainly. Research exports include only consent-eligible, de-identified structured counts, timings, choices and manually collected human rubric dimensions; **raw text, quotations and tutor notes are excluded from both research analysis and research export**. Research consent does not authorize quoting a participant in a demo or publication. The organizer may later seek separate permission for a specific attributed or anonymous quotation; no such permission is assumed in MVP. The student's own export is a separate access feature, not a research dataset.

## 13. Measurement and first-user test plan

The first five users answer usability and feasibility questions. They are not evidence of learning efficacy. Recruit actual students with relevant web-app experience; team members and scripted agents may verify functionality but must not be reported as study participants.

| Question | Measure | Decision it informs |
| --- | --- | --- |
| Can students distinguish expectation from observation? | First unprompted description of left/right panes; confusion incidents; provenance inspection | Rename/restructure pane labels and evidence summaries |
| Does the pre-run gate preserve an authentic prediction? | First prediction timestamp precedes run creation and first evidence access; no answer payload before the gate | Fix ordering or disclosure defects before wider pilot |
| Can students read the lost-response evidence? | Whether they cite commit plus client response; time and moderator help needed to locate each | Simplify trace and status vocabulary |
| Do model suggestions support investigation? | Suggestions accepted/changed/skipped with reasons; invalid proposals; provider failures; hint use | Refine bounded prompts and executor capability descriptions |
| Does a repair change behavior? | Executed code digest and before/after row evidence; independent of prose score | Verify product integrity and supplied patch implementation |
| Can students handle the fresh-intent case independently? | Locked first transfer count/status prediction and rationale, mandatory post-run explanation and references; human 0–3 concept/evidence/boundary judgements | Refine the task and rubric; estimate feasibility of later assessment |
| Is the workbench usable? | Completion, abandonment stage, save/reload failures, task duration, accessibility barriers, moderator interventions | Prioritize product fixes |
| Does the evidence help tutors? | Manually recorded review time, evidence opened and disagreement between two tutors on a sample, using the pilot kit | Improve evidence organization and the manual rubric |

Use event names such as `prediction_committed`, `run_started`, `run_completed`, `evidence_opened`, `explanation_committed`, `suggestion_decision`, `patch_selected`, `transfer_prediction_locked` and `transfer_explanation_locked`. Include participant/run/case/phase/version references and elapsed activity time. There is no `tutor_review_saved` event or required in-app scoring store. Do not place complete explanations or notes in analytics events. Consent eligibility is checked for research analysis and export, not inferred from browsing behavior; research datasets remain free of raw text even when consent is given. A human may read original work for the disclosed core tutor review, then record structured rubric numbers separately; that does not authorize a research text corpus.

The moderator should use a short neutral introduction, allow thinking aloud without supplying the technical answer, record interventions, and ask at the end: “Where were you uncertain about what was predicted versus what actually ran?” During independent transfer, a moderator can explain controls but cannot suggest the key scope or interpretation. Record any assistance so the response is not later described as fully independent.

The proposal's broader feasibility pilot of 8–12 volunteers, an AI-free pre/post comparison, and a 5–9 day delayed case remains a follow-on study. It needs equivalent but different task forms, real participants, explicit consent and organizer scheduling. Do not turn the guided first prediction into a claimed validated pretest, or infer retention from immediate completion. Product acceptance targets are engineering gates; they are not observed study results.

## 14. Tradeoffs and excluded work

| Choice | Benefit | Cost or limitation |
| --- | --- | --- |
| One supplied campus app | Fast reliable execution and a comprehensible trace | Narrow domain; does not establish performance on arbitrary student projects |
| Vetted diff choices | Real code changes with bounded executor risk | Less open-ended repair practice; choice text can cue a strategy, so keep it after an explanation |
| Two distinct failure cases | Demonstrates both replay protection and the fresh-intent boundary | Transfer is related and immediate; not evidence of broad or delayed transfer |
| Phase-based scaffold fading | Predictable implementation and clean independent gate | No personalized competence adaptation in MVP |
| Student prediction visualization | Makes the conceptual claim visible without another truth engine | Does not implement the proposal's full independent declarative simulator |
| Native sign-in and enrollment code | Platform-owned access and a bounded pilot audience | Sign-in creates friction; measure it and explain why activity is saved |
| Evidence-first tutor review | Preserves human judgement and supports auditability | Requires tutor time; savings are a hypothesis to measure |

MVP non-goals are arbitrary source uploads, untrusted code execution, a general coding agent, unrestricted education chat, auto-generated solution code, full course projects, team collaboration, peer review, instructor case authoring, cohort analytics, in-app tutor scoring and notes CRUD, gradebook writeback, LTI integration, LMS connectors, production application connections, automatic marking, automated recruitment or email invitations, mastery certification, and formal efficacy or fairness claims.

Do not add extra labs, a general dashboard, or decorative onboarding while the exact baseline → repair → independent transfer chain remains incomplete.

## 15. Acceptance gates for implementation

1. A signed-in, enrolled test user can complete the full journey; an unenrolled user cannot access lab execution or another participant's records. Instructor access is server checked against an allowlist.
2. The first prediction and every later pre-run prediction are durably committed before the corresponding run is created. They cannot be overwritten after evidence is seen. Counts match visible action groups; uncertainty is captured as confidence without inventing a fixed completion order for concurrent requests.
3. No result, gold answer, patch diagnosis, or tutor rubric is returned by the student routes before its gate. The first prediction is AI-free; the independent phase rejects model calls on the server.
4. `baseline` produces real scoped rows and the expected 504 / 201 client evidence after the first commit and response discard. The trace makes the commit visible separately from the timeout.
5. The selected supplied patch actually changes the executed code variant. The robust repair repeats the same fixture and produces one persisted registration with replay evidence. A nonresolving patch is shown through its real outcomes.
6. Transfer begins with an unseen supplied variant, an empty prediction form requiring predicted count, expected statuses and rationale, no AI or gold explanation, and the same evidence tools. It records 201 / replayed 201 / 409 and one row before the learner locks a mandatory independent explanation of replay versus conflict, supporting evidence and corrected key lifecycle. Only then can debrief or repair appear.
7. The new-intent client patch appears only after that lock. Its fresh run produces two intended registrations while retry A replays the stored result. Both pre-run prediction and final own explanation remain in the journal.
8. Every result carries run, fixture, phase and code provenance. Counts derive from successful persistence queries. Missing evidence never appears as zero or as a model-filled observation.
9. Refresh, Back, double activation and a second tab cannot silently rerun a test, reset a database, drop work, or bypass a content gate. A pending run resumes by status lookup.
10. One contextual structured Meta call selects an actual lost-response, concurrent or precommit probe and supplies a short question, rationale and material references only after a committed prediction. A changed probe requires its own prediction before execution. Transfer rejects coach calls. The student can complete the activity when Meta is unavailable; fallback prompts and live model use are attributed accurately.
11. The core journey is operable by keyboard, readable at the specified zoom and narrow width, and has labelled fields, announced statuses, accessible evidence references, visible focus and appropriate contrast. Validate these on the implementation.
12. Optional research consent defaults off and remains separate from saved practice, read-only named tutor review and own export/print, all disclosed on entry. Research analysis/export excludes raw text, quotations and notes. Data availability is 30 days from session creation, operational diagnostics use a 7-day window, own app deletion is synchronous and operator purge occurs at pilot close; no automatic erasure is promised without a verified scheduler.
13. Tutors have a read-only view of original predictions, explanations and immutable evidence. The app supports no scoring-save UI or notes CRUD. Human 0–3 concept/evidence/boundary judgements are performed manually in the pilot kit, remain outside the app and are not shown as student grades. No model automatically awards or publishes a mark.
14. Before recruiting five real testers, the team verifies private staging with synthetic data and demonstrates the four execution phases from a fresh account. The pilot report labels real participant results, staff QA and planned measures separately.

## 16. Human decisions and source grounding

The team can proceed using these defaults. The organizer's necessary human contributions are recruiting real testers and confirming that the campus-signup requirement, learner prerequisites, ungraded setting, and explanation rubric match the intended teaching context. The team should resolve routine visual, interaction and implementation choices without reopening them as design questions.

Source material: the supplied `GroundTruth-Proposal.docx` grounds prediction before execution, evidence-based explanation, teacher-vetted prompts, fading scaffolds, individual AI-free checks, human marking, synthetic-data trials, and the proposed longer feasibility study. Its figure reinforces that AI does not write runtime results or gradebooks. The supplied `Pasted text(3).txt` identifies the hackathon need for a genuine Meta-model contribution and cautions against a generic education chatbot. Neither source is used here as proof that the proposed learning outcomes have already occurred.

The concrete execution facts, identity choice, enrollment limit and transfer case were aligned with the planning team's execution, release and product decisions. Accessibility targets were checked against the official [WCAG 2.2 specification](https://www.w3.org/TR/WCAG22/). No user interviews, usability tests, or learning measurements have yet been conducted in this design pass.
