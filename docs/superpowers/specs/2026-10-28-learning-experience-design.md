# GroundTruth learning experience redesign

## Intent

Kireeti's direct feedback is that the first build is hard to read, unwelcoming, and confusing to navigate. Rebuild the entry and learning experience around doing a small task, a visible next action, and contextual guidance. Extend the product toward concept selection and code understanding with original, public mini missions and external practice handoffs.

This is an implementation request within the approved MVP build. The visual choices below are product decisions by the builder, not preferences supplied by the user. Retain the existing application and deployment; preserve all saved activity and server contracts.

## Approach

Considered: (1) enlarge and recolor the existing long landing page; (2) a challenge-first learning home plus public concept missions and a redesigned live playground; (3) a full course engine and external assessment integrations. Use (2). It directly addresses the user's inability to find a starting point and demonstrates the broader vision with a bounded build. A generalized curriculum or integration layer would delay testing the interaction that matters.

## Experience

- Home: plain product description, one dominant start action, a playable authored unscored warmup, a small three-mission path, and one distinct live-playground card. No long manifesto, fake usage numbers, fabricated testimonials, or decorative wall of code. Make sign-in/code requirements visible beside the live-lab destination.
- Learn (`/learn`): three original JavaScript concept missions. Each has three short checkpoints: choose or read a concept, trace its behavior, identify a boundary or when it fits. Cover control flow, lookup/collections, and sorted two-pointer reasoning. A reusable renderer supplies choices, per-choice feedback, optional procedural/concept hints, retry, and explicit Continue. Do not copy provider questions or solution text.
- Progress: ten practice points per newly completed checkpoint, earned once, maximum ninety for nine checkpoints. Replaying a checkpoint cannot farm points. These mark local practice completion, not a grade, certification, external result, or inferred mastery. Show a simple path and earned completion stamp. No fake streaks, losses, countdown pressure, or public ranking.
- Persistence: public mission progress is browser-local and anonymous, disclosed plainly. Validate parsed storage, discard unknown checkpoint IDs, handle blocked/corrupt storage without breaking practice. Do not send warmup choices or public mission answers to tutor APIs or analytics. Provide a way to reset this local progress.
- External bridge: after each mission, a short recommendation to continue relevant practice on verified official LeetCode, Codewars, or Exercism pages. An optional HackerRank skills-assessment link can be in a final resources section. Ordinary links, clearly external; no imported completion, accounts, affiliation, readiness guarantee, or certificates issued by GroundTruth. No prices.
- Live playground (`/workspace`): retain the actual HTTP/SQL investigation. A darker playground surface, visible app/source/evidence areas, readable controls, and a compact next-action card make its purpose distinctive. Reward saved milestones, including learning from a wrong prediction. Show phase/checkpoint progress from server session data. Derive the next action from the required case, currently selected optional case, and any unfinished run before proposing a phase advance.
- Guidance: dismissible floating help with a short contextual next step; replayable navigation tour; skip and close always available. Use actual UI targets and a readable single instruction, not a second wall of text. Use a modal/dialog or anchored companion with keyboard access and no mobile obstruction.
- Independent work: in `transfer` and `transfer_repair`, guidance may explain controls only. Do not reveal conceptual hints, solutions, earlier reasoning, repair answers, or model coaching. Preserve the history guard and prediction lock. The public algorithm lessons must not contain the signup transfer solution.
- Completion: celebrate completed work, show next practice destinations, keep export/tutor evidence accessible.

## Visual direction

Use a modern, friendly learning workspace: warm near-white canvas, dark navy text, vivid violet primary actions, lime and soft lavender accents used sparingly, generous whitespace, rounded cards, simple Lucide icons, and a dark high-contrast code/playground panel. Avoid the previous editorial serif treatment and tiny all-caps paragraphs. The playable code, choices, progress path, and real evidence are the visual content; no decorative stock art is required.

Main text and form controls are 16–18px; secondary instructions at least 14px; code at least 14px. Small metadata may be 12px if it remains readable. Interactive targets at least 44px. Stack panels on narrow screens instead of shrinking fonts. Ensure keyboard focus, semantic labels, textual feedback alongside color, and reduced-motion support. No unnecessary animation. Shared navigation is Home, Learn, Live playground; retain tutor access for authorized users.

## Integrity and operational constraints

- Preserve native sign-in, pilot enrollment, notices, consent, ownership, retention/delete disclosures, exports, run recovery, and existing reviewed variants.
- Keep executed evidence separate from browser-authored examples and AI suggestions. A replay highlights saved receipts and sends no new requests.
- Keep Meta disabled without a configured key. Do not fabricate live model use.
- Do not add arbitrary code execution, AI grading, external account integrations, or new database tables for this iteration.
- Keep the existing private Site audience and pilot code. Publish updates to the current draft PR branch and existing private Site after appropriate verification.

## Acceptance

1. A visitor can start and finish a meaningful public exercise without sign-in or a pilot code.
2. A wrong answer receives specific feedback and an obvious retry; a correct answer reveals why and an explicit next action.
3. Progress survives refresh, awards a checkpoint once, and stays usable if storage is corrupt or unavailable.
4. All three missions, path navigation, reset, hints, guide/tour controls, and external links work.
5. The live playground preserves the current API flow and makes its next required action visible.
6. Independent cases have procedural help only, and no old reasoning or AI access is exposed.
7. Existing tests, added meaningful learning/guide-boundary tests, typecheck, and production build pass.
8. Browser inspection verifies the home, lesson interaction, public lesson completion, and live-lab entry gate. Exercise the full signed-in predict/run/explain/repair/independent journey when genuine authentication permits; otherwise explicitly record that browser gate blocked and retain actual client/API/SQL integration coverage. Do not spoof a hosted identity.
