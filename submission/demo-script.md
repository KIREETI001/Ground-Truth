# Three-minute demo

**Recording asset still required.** This is a production plan, not a finished video. Verify the live form's duration and file/link requirements before recording. Target 2:50–3:00 without stretching the route into a tour of every screen.

## The promise

“Your app works. Do you understand the system well enough to make the next change yourself?”

Use the same small example throughout: a student who used AI to build a study-task app and now wants to understand where title validation belongs in its architecture. The demo repository is [groundtruth-demo-study-tasks](https://github.com/KIREETI001/groundtruth-demo-study-tasks). It contains simple, inspectable source. There is no claim that the example app is a production service.

## Screen and voiceover

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:18 | Landing page, then a ready student workspace | “My AI-built app works. But even a one-line change can send me back to an assistant to reread the repository. GroundTruth helps me understand the code and architecture so I can start thinking like a builder.” |
| 0:18–0:43 | Import this repository, then choose Backend and task submission | “I bring a GitHub repository and choose what I want to strengthen. I start with a feature, not a filename. The map is generated from selected source, and each path is tied to a pinned commit.” |
| 0:43–1:08 | Beginner overview, visual flow, one source file | “Where does this request go? Which component validates it before persistence? The overview connects these responsibilities to selected source. I build a mental model one workflow at a time, rather than reading isolated lines.” |
| 1:08–1:33 | Select input validation concept; show one generated MCQ | “Muse Spark generates a short question from this code and my goal. The interface stays consistent, but the content belongs to this project. A beginner can start with a multiple-choice question, then progress to a small coding task.” |
| 1:33–2:03 | Start independent short coding attempt; show assistance paused; enter clearly labelled presenter snippet | “Now the assistant steps aside. GroundTruth pauses new study help during my independent attempt. My original submission is saved before feedback. If I need to stop, I can end the attempt without inventing a completed answer.” |
| 2:03–2:25 | Saved attempt and Progress; optionally show one reviewed change only if verified hosted feature | “Progress connects the attempt to its concept and records in-app activity. It is evidence to review, not an automatic mastery verdict. A change proposal also needs a visible diff and my approval before any supported apply action.” |
| 2:25–2:45 | Explicit project share, then separate prepared teacher account | “I choose what to share. My teacher sees the original attempt and relevant activity, rather than assuming a working AI-built project proves understanding. Class membership alone does not share every project.” |
| 2:45–3:00 | End on learner's saved path, then small architecture card | “Meta powers the contextual guidance. GroundTruth helps me use it to build understanding, then practise without it. Understand the code. Think in systems. Make the next change yourself.” |

## Preparation

- Freeze the tested release and write its commit and URL into the release manifest.
- Prepare separate synthetic student and approved teacher accounts. Never record developer credentials, tokens, account settings or real student records.
- Rehearse the exact workflow once and check every generated answer against the source. Keep one saved path ready as a labelled backup.
- Record at a readable desktop size. Keep the pointer still while explaining source. Crop browser chrome only if it improves legibility without hiding important state.
- Use one live Meta generation in the recording. If waiting is cut, add “Generation wait shortened” on screen. Label saved content and prepared states; do not imply cached content was just generated.
- If hosted editing is unavailable, omit it. The core story is overview → practice → independent attempt → teacher review.
- Use a short code task as the independent checkpoint. Use an MCQ to make the initial question understandable, not as proof of deep competence.
- Stop at 3:00. If the teacher transition takes too long, use a labelled cut between the two separate accounts.

## Presenter prompts

Goal: “I am a complete beginner. Help me understand where title validation belongs in this app: the request, validation function and database write. Then practise trimming, empty-title rejection and length limits with simple MCQs and tiny functions.”

Transfer alternative: “I want to adapt the title-validation pattern to a reading-list app. Help me practise with book titles before I implement it.”

These are presenter inputs, not fixed generated questions. Workflow names and exercises can vary.

## Suggested thumbnail

Headline: **AI built it. Can you change it?**

Show a clean crop of the source and independent-practice state, with the GroundTruth wordmark. Avoid decorative dashboards or fabricated learning statistics.
