# GroundTruth submission packet

**Participant review draft. The official form remains unsubmitted and publishing consent unchecked.** The participant will review the completed materials before any final portal action.

Revised release: **PENDING_FINAL_COMMIT / PENDING_PRODUCTION_DEPLOYMENT**. The code and narrative have been reconciled around one journey: understand actual code, make a small independent change, retain the original attempt and support human review. The release operator still needs final deployment and media evidence.

| File | Purpose |
| --- | --- |
| [judge-guide.md](judge-guide.md) | One-click isolated sample and code-to-change-to-review route |
| [project-writeup.md](project-writeup.md) | Project story, implementation and limits |
| [official-form-copy.md](official-form-copy.md) | Local copy of observed form fields and answers |
| [form-values.json](form-values.json) | Matching local field values; no submission action |
| [why-meta.md](why-meta.md) | Direct Meta integration, model fit and evaluation boundaries |
| [architecture-and-attribution.md](architecture-and-attribution.md) | Authorization, source/data boundaries, licensing and prior work |
| [release-checklist.md](release-checklist.md) | Evidence gates for this revised release |
| [release-manifest.json](release-manifest.json) | Canonical final version, checks and media provenance |
| [production-check-summary.md](production-check-summary.md) | Production observations recorded by the release operator |
| [evaluation/user-study-plan.md](evaluation/user-study-plan.md) | Future optional usability protocol and response sheet |
| [evaluation/user-study-results.json](evaluation/user-study-results.json) | Explicit not-conducted status, n = 0 |
| [research-evidence.md](research-evidence.md) | External research context, distinct from product validation |

## Revised implementation

- `/login` offers Try sample learning path before the marketing story. Each visitor receives an isolated two-hour synthetic learner session and private practice copy.
- Prepared sample overview/concepts come from validated Meta output at a pinned public source commit. New questions still call Meta; prepared artifacts are labelled.
- An applied change provides trusted before/after source, hashes and diff for an understanding check. Linked initial/practice/fresh-variation attempts retain their original answers.
- Teachers get privacy-scoped learner/class context, explicit sharing, a review queue, readable committed evidence and saved human reviews. Displayed states replace a mastery percentage.
- `/demo/teacher` is a read-only view of the current visitor's own sample, with no teacher privilege or access to another visitor.
- Source selection prioritizes relevant lines within bounded context. Sanitized inference receipts record provider/model, task, status, timing and available usage metadata, not prompts or answers.

These are implementation facts. Final hosted behavior and refreshed media are pending exact-release checks. Historical Meta acceptance evidence remains in [meta-verification.json](meta-verification.json); it is not a semantic benchmark or proof that every revised route passed production checks.

## Review and media

Application target: [groundtruth-meta.vercel.app](https://groundtruth-meta.vercel.app/login). Public source: [Ground-Truth](https://github.com/KIREETI001/Ground-Truth). Video target: [walkthrough page](https://groundtruth-meta.vercel.app/demo). The video is edited/prerecorded material; its presence does not demonstrate a new live inference request. Use only the final asset, duration, dimensions, captions and transcript named in the release manifest. Historical media must not be described as the revised release.

The participant confirmed a solo entry as Kireeti Kumar, Indie Developer Track, Build for Your World. The observed official portal has three narrative limits of 3,000 characters and a partner-feedback limit of 150. The [official event](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) and [official rules](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver) remain the organizer's authority; later changes must be checked before submission.

## Evidence and licensing

There are **no external user-study participants or collected feedback (n = 0)**. Automated tests, operator source review, controlled sample checks and TinyFish browser QA must be labelled separately. None establishes causal learning gains, assessment validity, reduced marking time or model superiority.

The submitted implementation is [MIT licensed](../LICENSE). [NOTICE](../NOTICE) preserves prior GroundTruth ideation and third-party attribution. Third-party components retain their own licenses. Teacher-side AI quiz authoring, assignment distribution and cohort analytics remain future work.
