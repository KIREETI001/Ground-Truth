"""Render a captioned, openly labelled still-image walkthrough of the hosted UI.

No browser automation, model requests or public uploads occur in this script.
Final render requires actual screenshot files and a verified Meta release manifest.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

HERE = Path(__file__).resolve().parent
SUBMISSION = HERE.parent
WORK = HERE / ".work"
INK = "#192239"
MUTED = "#647082"
TEAL = "#17695f"
PAPER = "#fafaf7"
VIOLET = "#6b40e8"


def run(args: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=True, **kwargs)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf", size)


def wrap(draw: ImageDraw.ImageDraw, text: str, face, width: int) -> list[str]:
    result, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if line and draw.textlength(candidate, font=face) > width:
            result.append(line)
            line = word
        else:
            line = candidate
    if line:
        result.append(line)
    return result


def load_plan() -> dict:
    plan = json.loads((HERE / "storyboard.json").read_text(encoding="utf-8"))
    assert plan["durationSeconds"] <= 180
    assert plan["width"] == 1280 and plan["height"] == 720
    assert all(re.fullmatch(r"[a-z0-9-]+", scene["id"]) for scene in plan["scenes"])
    return plan


def audio_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as audio:
        return audio.getnframes() / audio.getframerate()


def prepare(plan: dict) -> list[dict]:
    WORK.mkdir(exist_ok=True)
    run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(HERE / "synthesize.ps1"),
         "-Storyboard", str(HERE / "storyboard.json"), "-OutputDirectory", str(WORK)])
    fps, target = plan["fps"], round(plan["durationSeconds"] * plan["fps"])
    scenes = [dict(scene) for scene in plan["scenes"]]
    for scene in scenes:
        scene["audioSeconds"] = audio_duration(WORK / f"{scene['id']}.wav")
        scene["frames"] = math.ceil((scene["audioSeconds"] + .7) * fps)
    free = target - sum(scene["frames"] for scene in scenes)
    if free < 0:
        raise ValueError(f"Narration exceeds target by {-free/fps:.2f}s. Increase storyboard rate and prepare again; never truncate speech.")
    total_weight = sum(scene["weight"] for scene in scenes)
    distributed = 0
    for scene in scenes:
        extra = math.floor(free * scene["weight"] / total_weight)
        scene["frames"] += extra
        distributed += extra
    for scene in scenes[:free - distributed]:
        scene["frames"] += 1
    at = 0
    for scene in scenes:
        scene["startSeconds"] = at / fps
        scene["durationSeconds"] = scene["frames"] / fps
        at += scene["frames"]
        scene["endSeconds"] = at / fps
    assert at == target
    return scenes


def stamp(seconds: float, vtt=False) -> str:
    total = round(seconds * 1000)
    hours, rem = divmod(total, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, ms = divmod(rem, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02}{'.' if vtt else ','}{ms:03}"


def write_captions(plan: dict, scenes: list[dict]) -> None:
    srt, vtt, transcript = [], ["WEBVTT\n"], [f"# {plan['title']}\n", "Edited walkthrough using real hosted UI captures and synthetic demonstration accounts. Offline synthetic narration.\n"]
    number = 1
    for scene in scenes:
        transcript.extend([f"## {stamp(scene['startSeconds'], True)} — {scene['title']}\n", scene["narration"] + "\n"])
        sentences = re.split(r"(?<=[.!?])\s+", scene["narration"])
        weights = [len(sentence.split()) for sentence in sentences]
        total = sum(weights)
        at = scene["startSeconds"]
        for sentence, weight in zip(sentences, weights):
            end = at + scene["audioSeconds"] * weight / total
            lines = []
            line = ""
            for word in sentence.split():
                if len(line) + len(word) + 1 > 58:
                    lines.append(line)
                    line = word
                else:
                    line = (line + " " + word).strip()
            if line:
                lines.append(line)
            caption = "\n".join(lines)
            srt.append(f"{number}\n{stamp(at)} --> {stamp(end)}\n{caption}\n")
            vtt.append(f"{stamp(at, True)} --> {stamp(end, True)}\n{caption}\n")
            at = end
            number += 1
    (HERE / "GroundTruth_Demo.srt").write_text("\n".join(srt), encoding="utf-8")
    (HERE / "GroundTruth_Demo.vtt").write_text("\n".join(vtt), encoding="utf-8")
    (HERE / "transcript.md").write_text("\n".join(transcript), encoding="utf-8")


def image_path(scene: dict) -> Path:
    path = (HERE / scene["image"]).resolve()
    if not path.is_relative_to(SUBMISSION):
        raise ValueError("Storyboard image must stay inside submission/.")
    if not path.is_file():
        raise FileNotFoundError(f"Capture missing: {path}")
    return path


def render_frame(plan: dict, scene: dict, index: int) -> Path:
    path = image_path(scene)
    original = Image.open(path).convert("RGB")
    frame = Image.new("RGB", (1280, 720), PAPER)
    draw = ImageDraw.Draw(frame)
    if scene["kind"] == "artwork":
        artwork = original.copy()
        artwork.thumbnail((1280, 720), Image.Resampling.LANCZOS)
        frame.paste(artwork, ((1280-artwork.width)//2, (720-artwork.height)//2))
        draw = ImageDraw.Draw(frame)
        draw.rectangle((0, 690, 1280, 720), fill=PAPER)
        draw.text((30, 698), "Editorial illustration · edited narrated walkthrough", font=font(12), fill=MUTED)
    else:
        for x, y, color in [(30, 26, VIOLET), (44, 26, VIOLET), (30, 40, "#a58aef"), (44, 40, "#c2ed67")]:
            draw.rounded_rectangle((x, y, x+11, y+11), radius=2, fill=color)
        draw.text((68, 25), "GroundTruth.", font=font(25, True), fill=INK)
        label = f"{index+1:02} / {len(plan['scenes']):02}"
        draw.text((1238-draw.textlength(label, font=font(15)), 32), label, font=font(15), fill=TEAL)
        draw.line((30, 71, 1250, 71), fill="#dfe3e8", width=1)
        heading_face = font(27, True)
        if draw.textlength(scene["title"], font=heading_face) > 1210:
            heading_face = font(24, True)
        draw.text((30, 88), scene["title"], font=heading_face, fill=INK)
        if scene.get("crop"):
            x, y, width, height = scene["crop"]
            if min(x, y) < 0 or width < 1 or height < 1 or x+width > original.width or y+height > original.height:
                raise ValueError(f"Invalid crop for {scene['id']}")
            original = original.crop((x, y, x+width, y+height))
        original.thumbnail((1216, 508), Image.Resampling.LANCZOS)
        x, y = (1280-original.width)//2, 127+(508-original.height)//2
        draw.rounded_rectangle((x-1, y-1, x+original.width+1, y+original.height+1), radius=2, fill="#dfe3e8")
        frame.paste(original, (x, y))
        caption = wrap(draw, scene["caption"], font(25, True), 1200)
        if len(caption) > 2:
            raise ValueError(f"Caption too long: {scene['id']}")
        for line_index, line in enumerate(caption):
            draw.text((30, 645+line_index*30), line, font=font(25, True), fill=TEAL)
        evidence = plan["evidenceLabel"] + (" · UI detail crop" if scene.get("crop") else "")
        draw.text((30, 697), evidence, font=font(12), fill=MUTED)
    target = WORK / f"{scene['id']}.png"
    frame.save(target)
    return target


def verify_evidence(scenes: list[dict]) -> dict:
    manifest = json.loads((SUBMISSION / "release-manifest.json").read_text(encoding="utf-8"))
    status = str(manifest.get("cloudVerification", {}).get("metaRequest", "pending")).lower()
    if any(word in status for word in ["pending", "blocked", "not-configured", "unverified"]):
        raise ValueError("Real Meta verification is still pending in the release manifest. Do not render a demonstration as successful.")
    if not manifest.get("liveUrl", "").startswith("https://"):
        raise ValueError("Verified public deployment URL required.")
    for scene in scenes:
        image_path(scene)
    return manifest


def render(plan: dict, scenes: list[dict], manifest: dict) -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    fps = plan["fps"]
    clips = []
    evidence = []
    for index, scene in enumerate(scenes):
        frame = render_frame(plan, scene, index)
        clip = WORK / f"{scene['id']}.mp4"
        duration = scene["durationSeconds"]
        fade_out = max(0, duration-.18)
        run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-framerate", str(fps),
             "-i", str(frame), "-i", str(WORK / f"{scene['id']}.wav"),
             "-vf", f"fade=t=in:st=0:d=0.18,fade=t=out:st={fade_out:.6f}:d=0.18",
             "-af", "apad", "-t", f"{duration:.6f}", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
             "-r", str(fps), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
             "-movflags", "+faststart", str(clip)])
        clips.append(clip)
        source = image_path(scene)
        evidence.append({"scene": scene["id"], "image": scene["image"], "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                         "kind": scene["kind"], "crop": scene.get("crop"), "startSeconds": scene["startSeconds"],
                         "durationSeconds": duration, "narrationSeconds": scene["audioSeconds"]})
    concat = WORK / "clips.txt"
    concat.write_text("\n".join(f"file '{clip.name}'" for clip in clips)+"\n", encoding="utf-8")
    output = HERE / "GroundTruth_Demo.mp4"
    run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "1", "-i", str(concat),
         "-t", str(plan["durationSeconds"]), "-c", "copy", "-movflags", "+faststart", str(output)])
    # Decode every stream to verify the final file, rather than only trusting encoding exit status.
    run([ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(output), "-f", "null", "-"])
    size = output.stat().st_size
    if size > 30_000_000:
        raise ValueError(f"Video too large: {size} bytes. Increase CRF or reduce bitrate and render again.")
    report = {"title": plan["title"], "format": "H.264 / AAC", "width": 1280, "height": 720, "fps": fps,
              "durationSeconds": plan["durationSeconds"], "bytes": size, "decodeCheck": "passed", "voice": plan["voice"],
              "speechRate": plan["rate"], "narration": "offline Windows synthetic voice", "presentation": "real captured UI stills; editorial intro and architecture; openly labelled edited walkthrough",
              "liveUrl": manifest["liveUrl"], "releaseCommit": manifest.get("releaseCommit"),
              "metaVerification": manifest["cloudVerification"]["metaRequest"], "scenes": evidence,
              "subtitleAlignment": "sentence timing estimated within measured narration segments; human review required",
              "uploaded": False}
    (HERE / "render-report.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(f"Rendered {output.name}: {plan['durationSeconds']}s, {size/1_000_000:.2f} MB. Full decode check passed.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true", help="Prepare narration and captions without a final video")
    parser.add_argument("--render", action="store_true", help="Validate release evidence, then render the final MP4")
    args = parser.parse_args()
    if not (args.prepare or args.render):
        parser.error("Choose --prepare or --render")
    plan = load_plan()
    manifest = verify_evidence(plan["scenes"]) if args.render else None
    scenes = prepare(plan)
    write_captions(plan, scenes)
    (WORK / "timing.json").write_text(json.dumps(scenes, indent=2)+"\n", encoding="utf-8")
    print(f"Prepared {sum(len(scene['narration'].split()) for scene in scenes)} words; measured narration {sum(scene['audioSeconds'] for scene in scenes):.2f}s; planned duration {plan['durationSeconds']}s.")
    if args.render:
        render(plan, scenes, manifest)


if __name__ == "__main__":
    main()
