# Official Cerebral Valley form copy

Form inspected in the authenticated official portal on 5 November 2026. The three narrative answers below are each under the observed 3,000-character limit. They are editorial drafts. **User review hold: do not submit this form. The participant will inspect everything first. Leave publishing consent unchecked.** Actual Meta runtime calls and the public learning-state journey have passed acceptance checks at this checkpoint.

## Team Name

GroundTruth

## Team Members

Confirmed by the participant: solo submission as Kireeti Kumar (`kireeti2`). Prior proposal authors remain attribution, not hackathon team members.

## Track — required

Confirmed: **Indie Developer Track**.

## Problem — required

Confirmed: **Build for Your World**.

## Project Description — maximum 3,000 characters

```text
AI can build a working app before its builder understands the system. Even a one-line change can send a beginner back to an assistant to reread the repository. GroundTruth helps that learner understand the code and architecture, think in systems, and practise the next change independently.

Teachers face a connected assessment problem. An AI-assisted take-home artifact can look polished while revealing little about independent ability. Students using AI responsibly to learn also need a fair opportunity to demonstrate what they understand. A fresh unaided check may expose gaps the artifact hides; reconstructing those gaps through extra manual questioning and marking can add to the teacher's workload. The goal is evidence for better judgement, not an AI-use detector.

Bring a public GitHub repository and choose a feature, such as backend task submission. GroundTruth connects selected source at a pinned commit to a beginner overview, visual reading flow and small concept tree. The learner explores with contextual guidance, then answers an MCQ or writes a tiny snippet with new in-app study assistance paused. The original submitted answer is preserved before feedback. They can end an attempt, revisit saved paths, and choose what to share with an approved teacher.

The teacher sees that original answer, relevant observed app activity and concept-linked evidence. This can help them identify a concept worth discussing, choose a fresh unaided follow-up and adapt their teaching. Those follow-ups remain human decisions: teacher-side AI quiz authoring, assignment distribution and cohort analytics are future work. Class enrollment alone does not disclose every project.

The current concept index is provisional evidence, not a validated mastery score or automatic grade. GroundTruth cannot detect outside AI use, establish authorship or claim measured learning, grading-fairness or marking-time gains.

The live MVP uses Muse Spark 1.3 Standard through Meta Model API, Vercel and Supabase PostgreSQL. Its server enforces access, learning state and immutable submissions; imported code and student snippets are not executed. The demo uses a synthetic account tracing request → validation → persistence, then sharing its practice evidence for human review.

Support responsible AI learning. Make independent understanding visible.

Live demo: https://groundtruth-meta.vercel.app
```

## Public GitHub Repository

`https://github.com/KIREETI001/Ground-Truth`

Verified deployed code: `0b37fa2529cc561050b19e08613827ffb2a4e79d` on `main`. The sample study-task repository belongs in the description or guide; it is not the GroundTruth source submission.

## 3-Minute Demo Video

Local MP4 complete: [video/GroundTruth_Demo.mp4](video/GroundTruth_Demo.mp4), 2:55.02, 720p H.264/AAC. It is an openly labelled narrated walkthrough of actual hosted UI stills, using a synthetic account. Verified public video page: https://groundtruth-meta.vercel.app/demo. A script or slide deck is not the required video.

## Describe your use of Meta products to build the submitted project — maximum 3,000 characters

```text
GroundTruth uses Muse Spark 1.3 Standard through Meta Model API to turn selected public code, a learner's goal and the current task into contextual learning content: repository maps, beginner overviews, concept nodes, MCQs, short coding prompts, grounded hints and supported change proposals.

The same structured integration feeds workflow → concepts → practice → changes/apply skills → progress. Different repositories retain a familiar interface while their actual selected code determines the content. Server-side schemas validate output shape and approved-source references. A valid structure does not make an explanation or suggested answer infallible.

For assessment, Meta generates focused practice that can surface something more inspectable than a polished take-home artifact: the learner's own response to a code-linked question. The application then pauses new study assistance for an independent attempt and preserves the original submission. Teachers can review explicitly shared attempts and observed app activity. The model does not grade the artifact, infer outside AI use or certify understanding. Teacher-side AI quiz authoring and assignment management are not built.

The application owns authentication, roles, explicit shares, budgets, immutable answers and phase transitions. Meta cannot grant access, invent execution results or override the independent-mode boundary. This supports responsible AI-assisted exploration followed by an observable opportunity to try independently.

The workflow was first developed with local Qwen inference, then moved to Meta's hosted model. Qwen and llama.cpp are not counted as Meta usage. Codex assisted implementation, debugging, tests and documentation; it is not a Meta product.

The deployed provider is Meta directly, using the Standard model ID and a server-only key, with no silent local or preset-response fallback. Selected inputs leave the device; Standard mode's no-training policy is not a zero-retention claim.

Eight actual Muse Spark adapter tasks passed schema/source checks. The public deployment also generated and persisted learning content and verified independent assistance blocking and voluntary exit. These are engineering acceptance checks, not educational-effectiveness or assessment-validity results.
```

## Why are Meta's models important to your solution? — maximum 3,000 characters

```text
GroundTruth needs a model that understands code and system responsibilities while producing concise, contextual learning content. Muse Spark 1.3 combines documented coding capabilities with structured output, allowing one validated integration to create maps, overviews, concepts, MCQs, short coding tasks and hints from selected source.

The important use is a question about this learner's code, rather than a score for a polished artifact. A dynamic MCQ or tiny coding task creates an opportunity to demonstrate understanding of a specific concept. GroundTruth pauses new study assistance during the attempt and preserves the response for optional teacher review. Meta helps scaffold the learning; the teacher retains judgement about what the evidence supports and what fresh unaided follow-up is needed.

This matters when take-home AI-assisted work and independent ability are difficult to distinguish from the final product alone. We want to protect room for responsible AI learning and make gaps discussable. We do not claim to detect AI authorship, improve grading fairness or reduce marking time. Teacher-side AI quiz creation and cohort analytics remain future work.

Structured outputs keep the interface consistent across repositories. Strict application schemas and approved-source checks constrain each response; the model cannot award mastery, change roles or bypass independent mode. Generated answer keys still need source review.

Frequent learning interactions also need a budget. We use selected files and focused goals rather than repeatedly sending an entire repository. Actual requests reported cached prompt tokens for source-grounded hints and feedback. Published Spark Standard pricing provides a transparent budgeting basis. We have not measured total learner token savings or comparative model performance.

Standard mode avoids opting learner context into model training, although selected content still goes to Meta. The wider Meta model family offers future options for demanding reasoning or institution-managed open-weight deployments, which require separate evaluation.

Meta is a strong technical fit for contextual teaching content; GroundTruth's distinctive contribution is the loop around it: understand a system, practise with assistance paused, retain the original attempt, and support human review.
```

## Partner technology feedback — maximum 150 characters

```text
Vercel hosts GroundTruth; Supabase persists learning evidence. Real Meta structured outputs and public learner-state checks passed.
```

## Other observed fields

- Optional viral X post URL: leave blank unless a real relevant post is provided. Do not create or send a social post without the user's instruction.
- Required likelihood of building with Meta Model API and overall opinion: participant confirmed **Very likely** and **Very favorable** respectively. Do not infer other survey ratings from these answers.
- Meta Model API NPS (0–5) and Muse Code NPS (0–5): preserve the form's actual scale. Codex usage is not Muse Code usage. “Not used” or an explanation may be appropriate only if the form supports it.
- Biggest obstacle, performance comparison, importance, switching and production-blocker questions: use actual observed experience. At this checkpoint, actual Meta generation and hosted state checks passed; there is no provider comparison benchmark.
- Publishing/marketing consent checkbox: grants rights to Meta/Cerebral Valley. Do not accept on the participant's behalf. The participant must review the actual declaration before final submission.

There is no separate observed live-deployment URL field; include the verified URL in Project Description. Retain a success receipt only after the official portal confirms submission.
