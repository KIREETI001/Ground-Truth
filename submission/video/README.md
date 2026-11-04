# GroundTruth demo video production

Target: **175 seconds, 1280×720, H.264 video / AAC audio, below 30 MB**.

This is an edited narrated walkthrough using **real captured hosted UI stills**, not a continuous live screen recording. That distinction is displayed in the video and spoken early. The title and architecture are labelled editorial illustrations. All account activity must be synthetic; never capture credentials or real learner records.

## Before rendering

1. Verify an actual Meta request and the generated content shown in the screenshots. The renderer refuses a manifest whose Meta request is still pending, blocked or unconfigured.
2. Capture the final deployed UI into the files listed below. Whole screenshots are fitted without stretching. An optional `crop` rectangle in the storyboard can show a relevant UI detail, but must preserve surrounding state and is labelled as a crop.
3. Check the storyboard's wording against the captured state. Generated questions vary: do not narrate a specific answer unless the screenshot and selected source support it.
4. Update the release manifest with the final public URL and inference verification. Do not insert a key, password or raw learner payload.

Required actual UI files, relative to `submission/`:

- `assets/live-landing.png`
- `assets/live-repository-map.png`
- `assets/live-workflow.png`
- `assets/live-concepts.png`
- `assets/live-practice-mcq.png`
- `assets/live-independent.png`
- `assets/live-progress.png`
- `assets/live-teacher.png`

Existing `thumbnail.png` and `architecture.png` supply editorial intro/closing artwork. They are not screenshots or evidence of a successful model call.

## Render

From this folder, run `python render_demo.py --render`. `--prepare` creates offline narration and timing/caption files without a final video; it does not bypass the screenshot/Meta gate for final rendering.

The renderer uses installed Pillow and pinned `imageio-ffmpeg==0.6.0`; the Windows speech synthesizer generates voice audio entirely offline. It uses the installed Microsoft Zira Desktop voice at rate -1. The prepared output report lists the voice, exact segment timing, screenshot hashes, release commit, encoding and file size. Audio generation does not send text to another service.

Outputs:

- `GroundTruth_Demo.mp4`
- `GroundTruth_Demo.srt` and `.vtt` — full narration, sentence-based approximate timing
- `transcript.md`
- `render-report.json`

Burned-in short scene captions summarize each step; the SRT/VTT contain the full spoken narration. The HTML pitch deck is a separate supporting artifact and does not replace the official three-minute video URL.

## Review and delivery

Play the full final MP4, including transitions and final audio. Confirm no clipping, unreadable decisive state, sensitive data or invented claim. Check the exact duration and file size in the report. No public upload happens in this renderer. A participant-approved accessible video URL is still needed for the official form.
