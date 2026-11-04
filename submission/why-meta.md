# Why Meta fits GroundTruth

Revised release evidence is **PENDING_FINAL_COMMIT / PENDING_PRODUCTION_DEPLOYMENT**. Official Meta documentation was rechecked on 5 November 2026. Provider capabilities, integration checks and educational outcomes are separate claims.

## The product reason

Meta supplies contextual teaching content about selected code: a workflow, relevant concepts, one focused question and a source-grounded follow-up. GroundTruth connects this content to a preserved independent attempt, a small reviewed change and optional human assessment. That loop is the contribution being demonstrated.

Dynamic MCQs and short coding tasks create opportunities to inspect a concept-specific response. They do not detect outside AI, certify authorship or establish mastery. Teachers retain judgement about the source, answer and any fresh follow-up. Teacher-side AI quiz authoring, assignment distribution and cohort analytics remain future work.

## Verified fit and application boundaries

| Need | Meta capability or integration | GroundTruth's responsibility |
| --- | --- | --- |
| Explain code and system responsibilities | Muse Spark 1.3 is documented for coding/agentic work | Select relevant source, expose its pinned commit and avoid whole-repository claims |
| Keep maps, concepts and practice usable across projects | Structured outputs with a supplied schema | Validate shape and allowed source references; review correctness separately |
| Ask about an actual edit | Text/code context through the same direct API | Reconstruct owned applied diff and hashes; reject stale or foreign proposals |
| Retain a fresh attempt | Contextual MCQ/coding generation | Link phases, pause assistance, keep original answers and preserve access boundaries |
| Observe reliability | Response model/status and available usage metadata | Save sanitized timing/status/usage receipts, show failures and never substitute an unlabeled preset |

Meta documents `muse-spark-1.3` as a Standard-mode model and supports structured output. Standard-mode content is not used to train Meta models, according to Meta; this does not establish zero retention or permission to upload private material. [Official models](https://dev.meta.ai/docs/models), [structured output](https://dev.meta.ai/docs/structured-output).

GroundTruth uses the direct `https://api.meta.ai/v1` integration with server-only credentials. Its runtime model is Muse Spark 1.3; Codex development assistance and earlier local Qwen/llama.cpp experiments are not Meta inference or Muse Code usage.

## Honest evidence

The earlier [real-provider acceptance record](meta-verification.json) confirms actual adapter requests, returned model and structured/source checks on the pinned sample. It does not certify all revised routes, prove semantic quality or establish model superiority. Prepared sample overviews/concepts are explicitly identified; fresh questions require new requests. Edited/prerecorded video captures do not count as new generation.

The revised code adds relevant-line selection and sanitized receipts. Final denominators, latency/usage observations and reviewed multi-repository outputs must come from actual final artifacts. JSON validity alone does not establish one unambiguous correct MCQ answer or a useful hint.

Review dimensions should match the outcome: map/source fidelity; beginner clarity; MCQ key correctness and ambiguity; coding-task feasibility; hint answer leakage; diff/task relevance; and behavior on a fresh variation. Report exact sample sizes, failures and reviewer role. Operator source review and TinyFish QA are not external participant feedback. No external user study has been conducted, n = 0.

No benchmark here demonstrates that Meta is more accurate, faster, cheaper or safer than another provider. Focused saved context is a budgeting design choice, not measured token savings. Multimodal teaching, institution-managed open-weight deployment and model routing are separate future evaluations, not shipped claims.
