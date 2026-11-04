# GroundTruth

> Editorial draft. Replace the cloud-status paragraph with verified release details before pasting. This outline is not a claim about the official form's fields.

## Tagline

Let AI cook. Know the recipe.

## One sentence

GroundTruth helps AI-assisted builders understand their code and architecture, practise systems thinking, and make the next change independently.

## Short description

AI can produce a working app before its builder understands the system. GroundTruth turns a GitHub repository into focused, source-linked workflows: see how the pieces fit, learn the relevant concepts, then practise with assistance paused. A concept tree connects the code to independent attempts, while optional teacher sharing supports human review. The goal is a builder who can reason about the next change, rather than request another generated fix.

## The problem

A student can arrive at a working application and still feel stuck when the next requirement changes. “Where is this validated?” and “What happens before the database write?” become difficult questions. They may ask an assistant to reread the repository for even a one-line change, because they have not built a mental model of how the parts interact. A repository full of files is a poor starting point for a beginner. Another generated fix keeps the project moving while leaving the student's understanding unclear.

Teachers face the other side of that problem. The submitted product shows what the software does. It provides much less evidence of what the student can do independently.

GroundTruth focuses on that next-change moment: help the learner build a systems view from real workflows, practise the underlying concepts, and retain an inspectable record of an independent attempt. Reducing repeated repository explanation and unnecessary generation is a design goal. We have not measured token savings or reduced dependence.

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

This is an illustrative product journey, not a reported study outcome.

## Why it stands out

**It begins with a feature, rather than a file.** The repository is reorganized around what the learner wants to understand.

**It connects local code to system responsibilities.** Learners investigate how a request crosses boundaries, which component owns a decision and which concept explains that behavior. The selected-source reading flow is conceptual guidance, not a verified complete call graph.

**Assistance has an explicit stopping point.** Guided exploration and independent practice have different rules. The application enforces the transition and retains the original submitted response.

**The source stays visible.** Generated guidance refers to a bounded selection at a pinned commit. Learners can challenge an explanation against that code.

**Teachers review evidence, rather than a model verdict.** App activity and attempts support a conversation. They are not proof of external-AI use, authorship or educational effectiveness.

**Learning has two purposes.** A learner can understand a project they need to maintain or learn a public pattern before adapting it elsewhere.

## How Meta AI contributes

The production integration targets **Muse Spark 1.3 Standard through Meta Model API**. It turns repository context and the learner's goal into a structured map, overview, concept tree, exercises and source-linked guidance. Fixed output contracts keep navigation consistent while the content changes with the repository. The server validates the output and controls permissions, phases and persistence.

Meta's model supplies contextual teaching content. GroundTruth supplies the source boundary, saved state, independent-mode rules and teacher workflow. Structured output controls shape; it does not establish factual correctness. See [why-meta.md](why-meta.md) for verified provider capabilities and the distinction between shipped behavior and future possibilities.

## How we built it

The workflow was first developed and tested with local inference. The submission migration targets a Next.js application on Vercel, Supabase PostgreSQL for persistent backend data, and server-side Meta inference. API keys and database credentials remain on the server. The cloud release's actual configuration, successful requests, commit and check results belong in [release-manifest.json](release-manifest.json).

**Cloud checkpoint:** the baseline passes 240 tests, type checks, lint and production build. Supabase has 32 tables with RLS enabled; its private-role TLS connection and login path were rehearsed. Vercel is live at https://groundtruth-meta.vercel.app with login and database health verified. Twenty public API checks passed, including role/owner boundaries and cloud manual drafts. Browser login and the draft interface were verified. The Meta API key and complete generated learning journey remain pending; this is a live backend release, not a verified end-to-end AI demonstration.

Codex assisted development, refactoring, test creation, debugging and documentation. Model-generated content is checked through application contracts and source validation, with human review still required for semantic quality. Test results are engineering evidence; they do not prove learning gains.

## Challenges and what we learned

The hardest product problem was deciding when help should stop. A useful educational assistant needs an observable boundary between supported exploration and the learner's own attempt. That boundary also has to work across tabs, saved paths and interrupted activities.

The second challenge was keeping explanations usable for beginners. A clean, consistent interface matters as much as generating more text. Small concept trees, source near the top, immediate MCQ choices and optional help keep the learner focused on one decision.

## Next steps

Run consent-based usability sessions, review generated questions against source facts, and assess whether learners can make a fresh change with less assistance. Extend repository coverage and improve question quality from observed errors. Longer-term multimodal or institution-hosted variants remain future work.

## Honest limits

This is an MVP, not a learning-effectiveness study. Its concept index is provisional evidence, not a validated skill score or automatic grade. It cannot detect outside AI use. Source selection is bounded and is not a full audit or standards certification. Imported code and student snippets are not executed. Generated suggestions can be incorrect. Cloud hosting means selected repository context and learning inputs are processed by external services; this is not the earlier local-only privacy model.
