# GroundTruth — review before submission

**Engineering verification is complete. Official form submission is not authorized. The participant reviews the local copy and publishing declaration.** No portal fields were updated or submitted in this goal; an earlier portal draft may be stale.

**Revised release: `1e1bcfaa848150f90caf890e8d32471336f5e084` / `dpl_23T8RW7JX4r21MZ5zoLuTUZo86nE` (READY). Final V3 media HTTP and browser checks passed; full listening review was not performed.** The [production acceptance record](evaluation/production-acceptance.json), [media verification](video-publication-verification.json) and [browser observations](evaluation/browser-verification.json) identify this app release. A following evidence-only commit does not change its runtime.

## Start here

1. Open the [application](https://groundtruth-meta.vercel.app/login) and choose **Try sample learning path**. Each visitor receives a temporary private sample. Prepared Meta overview/concepts are labelled; a new question requires a new model request.
2. Read the [project story](project-writeup.md), [five-slide pitch](pitch-deck.html), [Meta fit](why-meta.md) and [architecture boundaries](architecture-and-attribution.md).
3. Inspect the [judge guide](judge-guide.md) and [form copy](official-form-copy.md). They are review material, not a submission receipt or permission to submit.
4. Review [model content findings](evaluation/model-evaluation.md), [trusted helper checks](evaluation/trusted-title-boundary-proof.md), [external study status](evaluation/user-study-results.json) and the [verification summary](production-check-summary.md).
5. Review the [current video plan](video-v3/README.md), [capture provenance](video-v3/capture-manifest.json), [hosted demo page](https://groundtruth-meta.vercel.app/demo), [thumbnail](thumbnail.svg), [architecture illustration](architecture.svg) and [release manifest](release-manifest.json). V3 is verified at 178.5 seconds, 1080p/24 fps, with 64 caption cues. Earlier [V2 media evidence](video-v2/previous-release-verification.json) and [screenshots](assets) do not verify revised routes.

## The story to check

Understand code and architecture → think in systems → make the next one-line change independently.

A polished AI-assisted take-home artifact may reveal little about its builder's independent reasoning. GroundTruth pairs the artifact with inspectable practice evidence so a teacher can choose a useful follow-up. It does not infer prevalence or diagnose AI use from software polish.

The core demonstration follows a pinned repository into its workflow/source and concepts. The learner manually changes the title limit from 80 to 100 in an owned cloud draft, reviews the diff and explicitly applies it. Meta receives the trusted before/after source and diff for a linked MCQ or small coding task. An independent attempt pauses new in-app study help and preserves the original response on submission. A fresh linked variation retains the earlier answer.

The classroom workflow then uses a separate explicit share to an enrolled teacher selected by name. The named teacher queue exposes the question, alternatives, committed answer, relevant captured source and in-app assistance counts for qualified human review. Class enrollment alone does not share a path. The visitor's own read-only `/demo/teacher` preview grants no teacher role and cannot save an assessment.

Concepts display observed and human-reviewed states, not a mastery percentage. The application cannot detect external AI use, prove authorship or establish mastery. Teacher quiz authoring, assignment distribution and cohort analytics remain future work.

## Evidence, without inflated claims

- Baseline Meta content review: 12 outputs across three small repositories; Codex inspection recorded **8 pass and 4 concern**. The four concerns remain in the report.
- Four **separate** mitigation rechecks passed; there were **16 total provider requests**, not a head-to-head model comparison.
- Engineering checks: 288 automated tests passed; four separate fixture guard tests and 120 helper behavior checks passed. The actual browser-downloaded `validation.js` matched the trusted 100-limit hash, without executing the downloaded file. These checks do not measure learner transfer or validate arbitrary code.
- Preview acceptance passed 13/13 checks with six Meta calls. Final production acceptance passed 6/6 checks with two new Meta calls, preserving previous answers, hiding pre-commit guidance and retaining the captured 100-limit source.
- Supabase verification found 33/33 private tables with RLS and zero security-advisor findings. A restricted server role is used; user isolation still depends on application authorization and owner checks.
- The independent Codex release review found no blockers across 33 focused checks. This is engineering review, not external human validation.
- External user study: **not conducted, n = 0**. No learner or educator participants, collected feedback or measured learning outcomes are claimed.
- Operator activity, synthetic reviews, automated tests and browser QA are engineering evidence. Any saved operator review must remain labelled as synthetic operator QA, not external educator validation.

The original implementation is published under [MIT](../LICENSE), with attribution and third-party notices in [NOTICE](../NOTICE) and the [public source](https://github.com/KIREETI001/Ground-Truth). Codex assisted implementation and review.

## Participant-confirmed choices

- Solo builder: Kireeti Kumar.
- Track: Indie Developer Track.
- Theme: Build for Your World.
- Likelihood of building with Meta Model API: Very likely.
- Overall opinion of Meta Model API: Very favorable.

TinyFish reported a teacher-preview redirect; authenticated normal-browser and API checks passed and did not reproduce it. The discrepancy remains recorded in [tooling QA](evaluation/tooling-qa.json). Actual playback advanced to 36.94 seconds and seeked to the end/back with readyState 4; this is not a complete linear listening review. The approved legacy spoken index line is retained with a 156.4–165.4-second clarification about observed/reviewed states.

Optional personal survey answers and the publishing declaration remain for the participant to review. A draft, deployment, screenshot or video is not an official submission receipt.
