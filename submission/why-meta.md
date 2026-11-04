# Why Meta fits GroundTruth

Checked against official documentation on 5 November 2026. Provider documentation describes supported capabilities; it is not evidence of our application's quality, latency or competitive ranking. Live release evidence belongs in the release manifest.

## The argument to make

“We use Meta to help the learner build a mental model of their code and architecture. It turns selected source into a workflow, concepts and focused practice. GroundTruth pauses study assistance for an independent attempt and retains the response, giving teachers something more inspectable than a polished take-home artifact. The meaningful integration is the learning-and-review loop around the model.”

The teacher-side reason for dynamic MCQs and short code tasks is an opportunity to inspect a concept-specific response. Meta does not assign a grade to the final artifact or infer AI authorship. A teacher can review the original answer and app-observed evidence to decide what needs a fresh unaided check. AI quiz authoring by teachers, assignment distribution and cohort analytics are future work. We have not measured grading fairness, marking-time savings or educational effectiveness.

The design aims to avoid repeatedly sending a repository back to an assistant for every small change. Saved paths and focused context can support that goal, but no token-savings or independence improvement has been measured. Present it as the reason for the design, not a proven outcome.

This argument is stronger than adding unrelated image, audio or segmentation features for sponsor visibility. Every shipped call should advance the learner's next decision.

## Shipped integration target

| Need | Documented Meta capability | GroundTruth's use and limit |
| --- | --- | --- |
| Understand selected code and connect related concepts | Muse Spark 1.3 is positioned for coding and agentic work | Source-bound mapping, overviews and practice. Model assertions remain reviewable. |
| Keep a clean interface across different repositories | JSON Schema structured output | Stable cards, concept nodes and exercise fields, followed by server-side validation. Valid shape does not imply correct meaning. |
| Balance short interactions with deeper tasks | Configurable reasoning effort | Bound the reasoning/output budget. Measure latency before choosing an effort per task. |
| Handle repeated questions about a common snapshot | Discounted cached input | Stable prompt/source prefixes may reduce input cost. Only observed usage establishes cache hits. |
| Handle code responsibly | Standard mode does not use content for model training | Pin the Standard model ID. This is not a zero-retention claim. Selected context still leaves the user's device. |

Sources: [Models](https://dev.meta.ai/docs/models), [Structured output](https://dev.meta.ai/docs/structured-output), [Reasoning](https://dev.meta.ai/docs/reasoning), [Pricing and rate limits](https://dev.meta.ai/docs/pricing-rate-limits).

## Where the competitive case is credible

**Cost fit for frequent, small teaching interactions.** Meta lists Spark Standard at $1.25 per million input tokens and $4.25 per million output tokens. A hypothetical 5,000-input/1,000-output-token request is $0.0105, excluding any additional billed reasoning/output, tools and retries. This is a transparent estimate, not observed cost per lesson. Spark is less expensive per token than Wonder in the same published table. [Official pricing](https://dev.meta.ai/docs/pricing-rate-limits)

**One consistent model contract across contextual tasks.** The application can reuse a validated adapter for maps, beginner summaries, questions and hints. The product advantage comes from reliable state transitions and source checks around those outputs. Other providers also support structured output; this capability alone is not unique to Meta. [Structured output](https://dev.meta.ai/docs/structured-output)

**An observed prompt-cache fit.** In one actual acceptance run, the provider reported 1,905 cached input tokens out of 2,009 for a source-grounded hint, and 1,905 out of 2,031 for post-answer feedback. This is a concrete example of reuse around stable application context. It is not a guaranteed cache rate, measured lesson cost saving or cross-provider comparison. The sanitized run summary is in [meta-verification.json](meta-verification.json).

**An upgrade path within Meta.** The documented model family supports a future division between frequent Spark interactions and more demanding Wonder work. Do not claim task routing exists unless implemented and tested. [Models](https://dev.meta.ai/docs/models)

**A potential deployment-choice story.** Meta also offers open-weight models. A future institutional version could evaluate an appropriate model on infrastructure the institution controls. Model sizes, licenses and hardware must be checked first; this is not a promise that the cloud model runs on the demo laptop. [Open-weight models](https://dev.meta.ai/docs/models#open-weight-models)

There is no measured comparison here against OpenAI, Anthropic, Google or a local Qwen baseline. Do not say “more accurate,” “faster,” “cheapest,” “best for education” or “safer than competitors.” The strong claim is that Meta is a documented, technically suitable option for this workflow, with explicit cost and privacy-mode choices.

## Capabilities worth evaluating after the MVP

| Opportunity | Potential learner benefit | Before claiming it |
| --- | --- | --- |
| Image input | Connect a UI screenshot or architecture diagram to selected code | Build it, test factual alignment and get appropriate content permission |
| Larger context | Bring more related source into difficult workflow explanations | Measure retrieval quality, cost and leakage; more context is not automatically better teaching |
| Wonder for complex change reasoning | Review a multi-file change with deeper reasoning | Keep execution controlled; measure against current adapter on real examples |
| Search grounding | Retrieve up-to-date official engineering references | Restrict source authority, validate citations and budget tool costs |
| Appropriate open-weight deployment | Explore an institution-managed inference option | Verify license, hardware, capability and operation costs |

The current demo should not imply these future capabilities are already present.

## A useful evaluation for the pitch's next iteration

Compare Meta and a named alternative on the same pinned source and schema. Use at least a small, disclosed set of tasks: map fidelity, beginner explanation, MCQ correctness, distractor plausibility, no answer leakage during guidance, source citation validity, and tiny-change faithfulness. Have a knowledgeable human review outputs without provider labels where practical. Report invalid-output rate, source-error count, latency and actual billed tokens with exact denominators. Do not convert engineering scores into a claim of learning gains.
