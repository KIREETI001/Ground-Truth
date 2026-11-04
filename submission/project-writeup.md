# GroundTruth

> Participant review draft. Do not submit the official form. The user will inspect all materials first; publishing consent stays unchecked. This outline is not a claim about the official form's fields.

## Tagline

Let AI cook. Know the recipe.

## One sentence

GroundTruth helps AI-assisted builders understand systems and gives teachers inspectable evidence of their independent attempts.

## Short description

AI can produce a working app before its builder understands the system. That creates a learning gap for the builder and an assessment gap for the teacher: a polished artifact may reveal little about independent ability. GroundTruth connects actual code to focused concepts and practice, pauses study assistance for an independent attempt, and preserves the response for optional human review. It supports responsible AI learning and makes the evidence behind understanding more inspectable.

## The problem

A student can arrive at a working application and still feel stuck when the next requirement changes. “Where is this validated?” and “What happens before the database write?” become difficult questions. They may ask an assistant to reread the repository for even a one-line change, because they have not built a mental model of how the parts interact. A repository full of files is a poor starting point for a beginner. Another generated fix keeps the project moving while leaving the student's understanding unclear.

Teachers face a connected assessment problem. A take-home AI-assisted artifact can show what the software does while revealing much less about what its builder can do independently. A polished submission and a learner's actual ability may diverge. Students who use AI responsibly to learn also deserve an opportunity to show that understanding, rather than have their ability inferred from the final artifact alone.

A fresh unaided check can expose concepts that were not understood during assisted production. If the artifact contains little reasoning evidence, teachers may need extra manual questioning and marking to work out where the gap is. The product should help them inspect the learner's attempt, choose a useful follow-up and adapt teaching, while preserving human judgement. We have not measured improved grading fairness, reduced marking burden or better learning outcomes.

GroundTruth protects space for responsible AI-assisted exploration followed by an explicit opportunity to try independently. It helps the learner build a systems view from real workflows and gives the teacher more than the finished artifact to discuss. Reducing repeated repository explanation, unnecessary generation and avoidable review effort are design goals, not measured savings.

## What it does

The learner brings their own public project or a public reference repository. GroundTruth maps selected source into features and learning areas, so a beginner can choose “Backend” and “Task submission” before needing to know the filename.

The selected workflow opens into a familiar sequence:

1. **Workflow:** a plain-language overview, short visual reading flow, glossary and source at a pinned commit.
2. **Concepts:** a small tree of relevant ideas, with practice connected to particular nodes.
3. **Practice:** generated multiple-choice questions or tiny coding tasks. In an independent attempt, new in-app study assistance pauses until the learner submits or ends the attempt.
4. **Changes / Apply skills:** a reviewed change to a permitted managed copy, or a challenge to adapt a reference pattern to the learner's own goal. The hosted release must advertise only the editing operations it actually supports.
5. **Progress:** saved attempts, observed activity and optional sharing with an approved teacher. A human reviews evidence; the model does not award mastery.

Students can return through their saved repository collection. A shared login opens the correct workspace for a student, approved teacher or preconfigured developer. Teachers can create classes; joining a class does not automatically disclose all of a student's projects.

## One concrete journey

Imagine a beginner who used AI to build a study-task app. It runs, but they do not know where a title travels after clicking Add task, or which part should enforce a new limit. They import the repository and choose the backend task-submission workflow. GroundTruth explains the path from request to validation to persistence, alongside the selected source. This is the beginning of an architectural mental model: understand responsibilities and boundaries before changing a line.

The learner studies trimming, empty-value rejection and length limits. They practise one concept at a time. Next they start an independent short coding task: new study assistance pauses, and their first submitted snippet is retained. They may end the attempt if they need to stop. Finally, they choose to share the path with their teacher, who can review the original response and relevant activity together.

The teacher can inspect the shared original answer and relevant observed activity, identify an apparent concept gap, and decide on a fresh unaided follow-up or a change in teaching. Those are human decisions informed by evidence. The MVP does not author or distribute teacher quizzes, manage assignments or produce cohort analytics.

This is an illustrative product journey, not a reported study outcome or evidence of improved grades.

## Why it stands out

**It begins with a feature, rather than a file.** The repository is reorganized around what the learner wants to understand.

**It connects local code to system responsibilities.** Learners investigate how a request crosses boundaries, which component owns a decision and which concept explains that behavior. The selected-source reading flow is conceptual guidance, not a verified complete call graph.

**Assistance has an explicit stopping point.** Guided exploration and independent practice have different rules. The application enforces the transition and retains the original submitted response.

**The source stays visible.** Generated guidance refers to a bounded selection at a pinned commit. Learners can challenge an explanation against that code.

**Teachers get an inspectable starting point for assessment.** Original answers, observed app activity and concept links can help them decide what needs further checking. The teacher owns the judgement. This is not external-AI detection, automated diagnosis or proof of educational effectiveness.

**Learning has two purposes.** A learner can understand a project they need to maintain or learn a public pattern before adapting it elsewhere.

## How Meta AI contributes

The production integration targets **Muse Spark 1.3 Standard through Meta Model API**. It turns repository context and the learner's goal into a structured map, overview, concept tree, exercises and source-linked guidance. Fixed output contracts keep navigation consistent while the content changes with the repository. The server validates the output and controls permissions, phases and persistence.

Meta's model supplies contextual teaching content. GroundTruth supplies the source boundary, saved state, independent-mode rules and teacher workflow. Structured output controls shape; it does not establish factual correctness. See [why-meta.md](why-meta.md) for verified provider capabilities and the distinction between shipped behavior and future possibilities.

## How we built it

The workflow was first developed and tested with local inference. The submission migration targets a Next.js application on Vercel, Supabase PostgreSQL for persistent backend data, and server-side Meta inference. API keys and database credentials remain on the server. The cloud release's actual configuration, successful requests, commit and check results belong in [release-manifest.json](release-manifest.json).

**Cloud checkpoint:** the baseline passes 246 tests, type checks, lint and production build. Supabase has 32 tables with RLS enabled; its private-role TLS connection and login path were rehearsed. Vercel is live at https://groundtruth-meta.vercel.app with login and database health verified. Twenty public API checks passed, including role/owner boundaries and cloud manual drafts. Browser login and the draft interface were verified. Actual Meta generation is verified for the map, overview, concepts, MCQ, short code and grounded hint. The independent lock and voluntary exit passed public checks. Thirty-two public API checks and eight direct Meta adapter tasks passed at this checkpoint.

Codex assisted development, refactoring, test creation, debugging and documentation. Model-generated content is checked through application contracts and source validation, with human review still required for semantic quality. Test results are engineering evidence; they do not prove learning gains.

## Challenges and what we learned

The hardest product problem was deciding when help should stop. A useful educational assistant needs an observable boundary between supported exploration and the learner's own attempt. That boundary also has to work across tabs, saved paths and interrupted activities.

The second challenge was keeping explanations usable for beginners. A clean, consistent interface matters as much as generating more text. Small concept trees, source near the top, immediate MCQ choices and optional help keep the learner focused on one decision.

## Next steps

Run consent-based usability sessions, review generated questions against source facts, and assess whether learners can make a fresh change with less assistance. Study whether teachers can identify useful follow-up concepts from the evidence, without assuming a time saving. Teacher-side AI quiz authoring, assignment distribution and cohort analytics are future work. Extend repository coverage and improve question quality from observed errors; separately evaluate multimodal or institution-hosted variants.

## Honest limits

This is an MVP, not a learning-effectiveness or assessment-validity study. Its concept index is provisional evidence, not a validated skill score or automatic grade. It cannot detect outside AI use or establish authorship. We have not demonstrated fairer grades, reduced marking time, improved transfer or a rising population trend of dependence. Source selection is bounded and is not a full audit or standards certification. Imported code and student snippets are not executed. Generated suggestions can be incorrect. Cloud hosting means selected repository context and learning inputs are processed by external services; this is not the earlier local-only privacy model.

## Research context

Selected primary studies help motivate separating assisted artifacts from independent checks; they do not validate GroundTruth or establish a universal trend. See [research-evidence.md](research-evidence.md) for study-specific settings and limitations.
