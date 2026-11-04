# GroundTruth — submission packet

**Draft packet, 5 November 2026. Nothing in this folder records a successful competition submission.**

GroundTruth helps builders understand AI-generated code and architecture, develop a systems mindset, and make the next change independently. The core demonstration is a beginner tracing a request through task-title validation and persistence, practising with the assistant paused, and sharing the original attempt with a teacher.

| File | Purpose |
| --- | --- |
| [project-writeup.md](project-writeup.md) | Reusable project description and short versions |
| [video/GroundTruth_Demo.mp4](video/GroundTruth_Demo.mp4) | 2:55 narrated walkthrough of real hosted UI captures |
| [demo-script.md](demo-script.md) | Presenter script and alternative live recording plan |
| [judge-guide.md](judge-guide.md) | Judge journey, source facts and expected behavior |
| [why-meta.md](why-meta.md) | Documented model fit, differentiation and honest comparisons |
| [architecture-and-attribution.md](architecture-and-attribution.md) | System boundaries, data handling and original-work disclosure |
| [release-checklist.md](release-checklist.md) | Required links, evidence and release gates |
| [release-manifest.json](release-manifest.json) | Machine-readable record of verified release assets |
| [official-form-copy.md](official-form-copy.md) | Answers for the inspected official form, with character limits |
| [production-check-summary.md](production-check-summary.md) | Baseline checks and remaining production gates |
| [pitch-deck.html](pitch-deck.html) | Standalone five-slide pitch with keyboard navigation and print layout |
| [thumbnail.svg](thumbnail.svg) / [architecture.svg](architecture.svg) | Shareable vector illustrations; not product screenshots |

The cloud baseline has passed 244 tests, type checks, lint and production build. Supabase has been migrated and its connection rehearsed. Vercel is live at https://groundtruth-meta.vercel.app. Twenty public API checks and browser login/manual-draft checks passed. Actual Meta requests are verified: eight adapter tasks and twelve public learning-journey checks passed. Final claims must follow the release manifest. A successful build is not evidence of a successful hosted inference call.

The public event page lists **4 November, 9:00 p.m. ET**, which is **5 November 2026, 10:00 a.m. Singapore time**. Use the actual [Cerebral Valley submission portal](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit); do not assume this is a Devpost entry. The release operator inspected the authenticated form: a public GitHub URL, three-minute video URL and three narrative answers (3,000 characters each) are among its fields. See the exact copy and unresolved participant answers in [official-form-copy.md](official-form-copy.md). [Official event page](https://dev.meta.ai/events/global-hackathon)

The original participant guide has not been recovered in this checkout. The [official rules](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver) assign impact 30%, Meta tooling 25%, technical execution 20%, and demo 25%. Keep prior-work and assistance attribution explicit.
