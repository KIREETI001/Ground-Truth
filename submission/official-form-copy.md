# Official Cerebral Valley form copy

Form inspected in the authenticated official portal on 5 November 2026. The three narrative answers below are each under the observed 3,000-character limit. They are editorial drafts. **Do not submit until the Meta call, final URL, team details and declarations are resolved.** The API integration is implemented, but actual Meta runtime use is awaiting the key at this checkpoint.

## Team Name

GroundTruth

## Team Members

The form currently shows Kireeti Kumar (`kireeti2`). This does not establish that the roster is complete. Confirm the actual team and authority to submit. Prior proposal authors are attribution, not automatic hackathon team members.

## Track — required

Recommended: **Indie**. User must confirm the final selection. The other observed option is Startups.

## Problem — required

Recommended: **Build for Your World**. The other observed option is Push the Frontier.

## Project Description — maximum 3,000 characters

```text
AI can build a working app before its builder understands the system. Even a one-line change can send a beginner back to an assistant to reread the repository. The app works, but the learner lacks a mental model of its code, architecture and responsibilities.

GroundTruth helps that learner think in systems and practise the next change independently.

Bring a public GitHub repository and choose a feature, such as backend task submission. GroundTruth maps selected source into a focused workflow, explains how the pieces fit, and connects them to a small concept tree. A beginner sees an overview, a visual reading flow and the actual source at a pinned commit before practising.

The learning loop is explicit: explore with contextual guidance, then answer an MCQ or write a tiny code snippet with new in-app study assistance paused. The original submitted answer is preserved before feedback. Learners can end an attempt without pretending they completed it, revisit saved paths, and choose what to share with an approved teacher. Class membership alone does not expose every project.

The teacher reviews evidence of the learner's attempt, rather than treating an AI-built project as proof of understanding. The concept index is provisional evidence, not an automatic grade or validated mastery score. GroundTruth cannot detect outside AI use.

The cloud implementation uses Vercel, Supabase PostgreSQL and a server-side Meta Model API adapter. The server controls access, phases, source validation and persistence. Imported code and student snippets are not executed.

The demo follows one beginner tracing request → validation → persistence in a small study-task app. The goal is a builder who understands where a change belongs, rather than needing another generated fix. Reducing unnecessary repeated context and generation is a design goal, not a measured token-saving claim.

Let AI cook. Know the recipe.

Live demo: https://groundtruth-meta.vercel.app
```

## Public GitHub Repository

`https://github.com/KIREETI001/Ground-Truth/tree/codex/groundtruth-mvp`

Public baseline commit: `bcbe7dcf01e2310cac945760f7560646707e56e0`. Replace with the final released branch/commit if changed. The sample study-task repository belongs in the description or guide; it is not the GroundTruth source submission.

## 3-Minute Demo Video

**Pending actual recording and accessible video URL.** Use [demo-script.md](demo-script.md). A script or slide deck is not the required video.

## Describe your use of Meta products to build the submitted project — maximum 3,000 characters

```text
GroundTruth integrates Muse Spark 1.3 Standard through Meta Model API as its contextual learning engine. The server supplies a bounded selection of public source at a pinned commit, the learner's goal and the current task. It requests structured repository maps, beginner overviews, concept nodes, MCQs, short coding prompts, hints and supported change proposals.

These outputs feed a consistent interface: workflow → concepts → practice → changes/apply skills → progress. The structure stays familiar across repositories while the content responds to the actual selected code and goal. Server-side schemas validate shape, and source checks validate references against the approved snapshot. A valid schema does not make the model's explanation or answer key infallible.

Meta supplies contextual content; the application owns authentication, permissions, explicit teacher sharing, request budgets, immutable submissions and the independent-mode boundary. New study assistance pauses during an independent attempt. The model cannot grant roles, fabricate execution results or award mastery.

The workflow was first developed with local Qwen inference, then adapted for Meta's hosted model. Qwen and llama.cpp are not counted as Meta usage. Codex assisted application implementation, debugging, tests and documentation; it is not presented as a Meta product.

The intended deployed provider is Meta directly, with the Standard model ID and a server-only key. There is no silent local or preset-response fallback. Selected source and learning inputs leave the device for hosted inference. Standard mode's no-training policy is not a zero-retention claim.

Integration code is complete, but the production key and real-call verification are pending at this draft checkpoint. Replace this final sentence only after recording an actual successful request and checking the resulting learning content against source.
```

## Why are Meta's models important to your solution? — maximum 3,000 characters

```text
GroundTruth needs a model that can reason about code while producing concise learning content, rather than simply generating another fix. Muse Spark 1.3 is documented for coding and agentic work, and Meta's structured output lets us request predictable maps, concept nodes and exercises for a clean, consistent interface.

That combination supports the central product idea: help a learner build a mental model of a real workflow, then step aside so they can practise independently. Meta is used throughout the contextual learning loop, while the application enforces when assistance is available and preserves the learner's own attempt.

Spark is also positioned for frequent, cost-sensitive interactions. We intentionally keep each interaction focused on selected source and a specific learning decision. Published Standard pricing gives us a transparent basis for budgeting, while Standard mode avoids opting learner context into model training. These are documented provider characteristics, not measured advantages over another model in our application.

Meta's wider model family offers a future path for harder multi-file reasoning or institution-managed open-weight deployments. Those possibilities are not represented as shipped features. The current MVP does not require unrelated image generation, audio or segmentation to make the sponsor visible.

Our differentiation is the product loop around the model: feature-first navigation, visible source, connected concepts, an explicit independent attempt and optional human review. We have not demonstrated that Meta outperforms OpenAI, Anthropic, Google or the local development model, nor that GroundTruth improves learning. Those comparisons require controlled evaluation. Meta is important because its documented capabilities fit this code-to-systems-understanding workflow and let us build it with explicit format, budget and privacy-mode choices.
```

## Partner technology feedback — maximum 150 characters

```text
Vercel hosts the app; Supabase stores learning records. Integration checks passed; hosted Meta inference awaits final key verification.
```

## Other observed fields

- Optional viral X post URL: leave blank unless a real relevant post is provided. Do not create or send a social post without the user's instruction.
- Required likelihood of building with Meta Model API and overall opinion: ask the participant for their actual opinion; do not invent ratings from engineering tests.
- Meta Model API NPS (0–5) and Muse Code NPS (0–5): preserve the form's actual scale. Codex usage is not Muse Code usage. “Not used” or an explanation may be appropriate only if the form supports it.
- Biggest obstacle, performance comparison, importance, switching and production-blocker questions: use actual observed experience. At this checkpoint, credentials and end-to-end hosted verification are unresolved; there is no provider comparison benchmark.
- Publishing/marketing consent checkbox: grants rights to Meta/Cerebral Valley. Do not accept on the participant's behalf. The participant must review the actual declaration before final submission.

There is no separate observed live-deployment URL field; include the verified URL in Project Description. Retain a success receipt only after the official portal confirms submission.
