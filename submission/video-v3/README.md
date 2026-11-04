# GroundTruth V3 — product-first visual recut

Local review work only. Nothing here uploads a file, changes the public video, submits the official form or accepts publishing consent. V2 is preserved.

Canonical local candidate: [GroundTruth_Demo_V3_final.mp4](GroundTruth_Demo_V3_final.mp4), with [review.html](review.html), [poster.jpg](poster.jpg) and [media-validation.json](media-validation.json).

The visual edit puts real product UI at 0 seconds and teacher evidence at 17.75 seconds. The planned/encoded target is 178.5 seconds, 1920×1080, 24 fps. The exact approved V2 Alyssa narration, original score/mix and 64 caption cues are reused without retiming, reordering, synthesis or extra spoken words. Prepared model content and edited/prerecorded captures are labelled; they are not fresh inference evidence.

Current captures and their context live in `capture-manifest.json`. Legacy images are explicitly marked provisional. The final renderer refuses unverified captures; provisional movies must have `provisional` in their filename. Root-supplied current-release captures are inspected and cropped using their real pixels. No replacement product UI is generated.

## Reproduce

```powershell
python submission/video-v3/prepare_plan.py
python submission/video-v3/render_v3.py --frames-only
python submission/video-v3/render_v3.py --allow-provisional --output GroundTruth_Demo_V3_provisional.mp4
python submission/video-v3/render_v3.py --output GroundTruth_Demo_V3_final.mp4
python submission/video-v3/verify_v3.py --video GroundTruth_Demo_V3_final.mp4
python submission/video-v3/build_review.py --video GroundTruth_Demo_V3_final.mp4
```

`prepare_plan.py` preserves an existing capture manifest, copies the exact V2 captions, and records audio hashes and the unchanged source-to-final hold mapping. It requires V2 beside this directory. Python dependencies remain Pillow and imageio-ffmpeg. Fonts use Windows Arial. FFmpeg is located through the installed imageio-ffmpeg package.

`render_v3.py` measures caption/title layout, reserves the bottom caption band, builds deterministic still keyframes and encodes H.264/AAC. It refuses to overwrite a movie. Reports contain the actual hash, dimensions, duration, decode result and unresolved captures. Full listening review is **not performed**; technical decode/alignment checks do not establish audible quality.

## Exact speech and current evidence wording

The approved voice includes “The index is provisional evidence.” The current application uses observed/reviewed states and has removed the displayed mastery percentage. V3 preserves that spoken line exactly and displays an explicit clarification at 156.4–165.434 seconds: “Current release: observed and reviewed states. No validated mastery score.” The transcript/captions remain verbatim; no replacement speech was fabricated.

Synthetic operator activity is labelled. No external participants or feedback have been collected, n = 0. A saved operator teacher review demonstrates the review workflow, not external educator validation or learning gains. The own-visitor read-only teacher preview is separate from an approved teacher's authorized review. Teacher quiz authoring, assignment distribution and cohort analytics remain future work.

Exact version/deployment and final capture provenance belong in the root release manifest after review. No automatic publication is performed by these scripts.
