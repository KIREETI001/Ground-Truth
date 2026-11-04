"""Deterministic V3 screenshot edit. Exact approved V2 audio; no synthesis.

python render_v3.py --frames-only
python render_v3.py --allow-provisional --output GroundTruth_Demo_V3_provisional.mp4
python render_v3.py --output GroundTruth_Demo_V3_final.mp4

Final rendering refuses any legacy/unverified capture. No upload/publication.
"""
from __future__ import annotations
import argparse
import bisect
from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import time

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
W, H = 1920, 1080
PAPER, INK, TEAL, MUTED = '#F8F9F4', '#182237', '#176E64', '#60717C'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8-sig'))


@lru_cache(maxsize=20)
def font(size=36, bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/' + ('arialbd.ttf' if bold else 'arial.ttf'), size)


def wrap(draw, text, face, width):
    rows, row = [], ''
    for word in text.split():
        attempt = (row + ' ' + word).strip()
        if row and draw.textlength(attempt, font=face) > width:
            rows.append(row)
            row = word
        else:
            row = attempt
    if row:
        rows.append(row)
    return rows


def text_rows(draw, xy, value, size=36, color=INK, bold=False, width=1728, max_lines=None):
    rows = wrap(draw, value, font(size, bold), width)
    if max_lines and len(rows) > max_lines:
        raise ValueError('Text exceeds safe measured layout: ' + value)
    x, y = xy
    for row in rows:
        draw.text((x, y), row, font=font(size, bold), fill=color)
        y += round(size * 1.28)
    return y


class Renderer:
    def __init__(self):
        self.plan, self.manifest, self.captions = read('scene-cues.json'), read('capture-manifest.json'), read('captions.json')
        self.scenes = self.plan['scenes']
        self.scene_starts = [scene['start'] for scene in self.scenes]
        self.caption_starts = [cue['start'] for cue in self.captions]
        self.fps = self.plan['fps']
        self.total_frames = math.ceil(self.plan['durationSeconds'] * self.fps)
        self.capture_hashes = {}
        self.validate()

    def validate(self):
        assert 175 <= self.total_frames / self.fps <= 179.5
        assert self.plan['narrationSpeed'] == 1 and not self.plan['speechRetimed'] and not self.plan['speechReordered']
        assert self.scenes[0]['start'] == 0 and self.scenes[0]['kind'] == 'ui'
        assert self.plan['firstTeacherEvidenceSeconds'] < 90
        for previous, following in zip(self.scenes, self.scenes[1:]):
            assert abs(previous['end'] - following['start']) < 1e-6
        assert abs(self.scenes[-1]['end'] - self.plan['durationSeconds']) < 1e-6
        source = read('speech-and-audio-provenance.json')
        assert sha((ROOT / source['audioMasterSource']).resolve()) == source['audioMasterSha256']
        assert sha((ROOT / source['approvedSpeechSource']).resolve()) == source['approvedSpeechSha256']
        assert sha(ROOT / 'captions.json') == sha(ROOT.parent / 'video-v2/captions.json')
        original = json.loads((ROOT.parent / 'video-v2/speech-provenance.json').read_text(encoding='utf-8'))['spokenText']
        words = lambda value: re.findall(r"[a-z0-9]+(?:['’-][a-z0-9]+)*", value.lower())
        assert words(' '.join(cue['text'] for cue in self.captions)) == words(original)
        for scene in self.scenes:
            if scene['kind'] != 'ui':
                continue
            capture = self.manifest['captures'][scene['capture']]
            path = (ROOT / capture['path']).resolve()
            if not path.is_file():
                raise FileNotFoundError(path)
            self.capture_hashes[scene['capture']] = sha(path)
            with Image.open(path) as image:
                x0, y0, x1, y1 = capture['crop']
                assert 0 <= x0 < x1 <= image.width and 0 <= y0 < y1 <= image.height, (scene['id'], image.size, capture['crop'])

    def unverified(self):
        return sorted({scene['capture'] for scene in self.scenes if scene['kind'] == 'ui' and not self.verified(scene['capture'])})

    def verified(self, key):
        capture = self.manifest['captures'][key]
        return capture.get('status') == 'live_verified' and capture.get('verifiedState') == capture.get('requiredState') and bool(capture.get('capturedAt')) and bool(capture.get('applicationCommit'))

    @lru_cache(maxsize=50)
    def base_frame(self, index):
        scene = self.scenes[index]
        im = Image.new('RGB', (W, H), PAPER)
        draw = ImageDraw.Draw(im)
        draw.text((96, 36), 'GROUNDTRUTH / CODE → CHANGE → HUMAN REVIEW', font=font(27, True), fill=TEAL)
        text_rows(draw, (96, 84), scene['title'], 48, bold=True, max_lines=2)
        if scene['kind'] == 'ui':
            capture = self.manifest['captures'][scene['capture']]
            with Image.open((ROOT / capture['path']).resolve()) as source:
                shot = source.convert('RGB').crop(capture['crop'])
            picture_height = 560 if scene.get('callToActionUrl') else 616
            factor = min(1728 / shot.width, picture_height / shot.height)
            size = (round(shot.width * factor), round(shot.height * factor))
            shot = shot.resize(size, Image.Resampling.LANCZOS)
            x, y = (W - shot.width) // 2, 210 + (picture_height - shot.height) // 2
            draw.rounded_rectangle((x-8, y-8, x+shot.width+8, y+shot.height+8), 12, fill='#FFFFFF', outline='#CCD8D1', width=2)
            im.paste(shot, (x, y))
            if scene.get('callToActionUrl'):
                url = scene['callToActionUrl']
                width = draw.textlength(url, font=font(34, True))
                draw.text(((W-width)/2, 794), url, font=font(34, True), fill=TEAL)
            label = 'Actual hosted capture · Synthetic operator QA · edited / cropped'
            if not self.verified(scene['capture']):
                label = 'PROVISIONAL LEGACY CAPTURE · layout proof · replace before final'
            draw.text((96, 858), label, font=font(25, True), fill=TEAL if self.verified(scene['capture']) else '#9A432A')
            if scene.get('note'):
                text_rows(draw, (96, 891), scene['note'], 23, color=MUTED, max_lines=1)
        else:
            y = 300
            for value in scene['rows']:
                y = text_rows(draw, (120, y), value, 42, max_lines=2) + 32
            if scene.get('note'):
                text_rows(draw, (120, 730), scene['note'], 30, color=MUTED, max_lines=3)
            draw.text((96, 858), 'Editorial evidence note · synthetic demonstration · no external study', font=font(25, True), fill=TEAL)
        return im

    def frame_at(self, seconds):
        index = max(0, bisect.bisect_right(self.scene_starts, seconds) - 1)
        im = self.base_frame(index).copy()
        cue_index = bisect.bisect_right(self.caption_starts, seconds) - 1
        if cue_index >= 0 and seconds < self.captions[cue_index]['end']:
            cue = self.captions[cue_index]
            draw = ImageDraw.Draw(im)
            rows = wrap(draw, cue['text'], font(43, True), 1580)
            assert len(rows) <= 2, cue['text']
            top = 928 if len(rows) == 2 else 950
            for row_index, row in enumerate(rows):
                width = draw.textlength(row, font=font(43, True))
                x, y = (W - width) / 2, top + row_index * 55
                draw.rounded_rectangle((x-24, y-8, x+width+24, y+50), 13, fill='#FFFFFF', outline='#D9E1DA', width=1)
                draw.text((round(x), y), row, font=font(43, True), fill=INK)
        return im

    def qa(self):
        folder = ROOT / 'qa-frames'
        folder.mkdir(exist_ok=True)
        thumbs = []
        for index, scene in enumerate(self.scenes):
            at = min(scene['end'] - 0.05, scene['start'] + min(2.3, (scene['end'] - scene['start']) / 2))
            frame = self.frame_at(at)
            frame.save(folder / f"{index+1:02d}-{scene['id']}.png")
            box = Image.new('RGB', (384, 248), '#E8F1EB')
            box.paste(frame.resize((384, 216), Image.Resampling.LANCZOS), (0, 0))
            ImageDraw.Draw(box).text((6, 222), f"{scene['start']:.2f}s {scene['id']}", font=font(16), fill=INK)
            thumbs.append(box)
        sheet = Image.new('RGB', (1920, 248 * math.ceil(len(thumbs) / 5)), '#E8F1EB')
        for index, thumb in enumerate(thumbs):
            sheet.paste(thumb, ((index % 5) * 384, (index // 5) * 248))
        sheet.save(ROOT / 'contact-sheet.jpg', quality=94)
        result = {'sceneCount': len(self.scenes), 'unverifiedCaptures': self.unverified(),
                  'firstProductUiSeconds': 0, 'firstTeacherEvidenceSeconds': 17.75,
                  'durationSeconds': self.total_frames / self.fps,
                  'captionSourceUnchanged': True, 'listening_review': 'not_performed'}
        (ROOT / 'visual-layout-report.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result, indent=2))

    def keyframes(self):
        folder = ROOT / 'encoded-keyframes'
        folder.mkdir(exist_ok=True)
        boundaries = {0, self.total_frames}
        for scene in self.scenes:
            boundaries.add(min(self.total_frames, math.ceil(scene['start'] * self.fps)))
        for cue in self.captions:
            boundaries.add(min(self.total_frames, math.ceil(cue['start'] * self.fps)))
            boundaries.add(min(self.total_frames, math.ceil(cue['end'] * self.fps)))
        marks = sorted(boundaries)
        concat = ['ffconcat version 1.0']
        for index, (start, end) in enumerate(zip(marks, marks[1:])):
            path = folder / f'{index:03d}.png'
            self.frame_at(start / self.fps + 0.000001).save(path)
            concat.extend(["file '" + path.as_posix().replace("'", "'\\''") + "'", 'option framerate ' + str(self.fps), f'duration {(end-start)/self.fps:.9f}'])
        concat.append("file '" + path.as_posix().replace("'", "'\\''") + "'")
        concat.append('option framerate ' + str(self.fps))
        (ROOT / 'frames.ffconcat').write_text('\n'.join(concat) + '\n')
        return len(marks) - 1

    def render(self, name, allow_provisional):
        pending = self.unverified()
        if pending and not allow_provisional:
            raise ValueError('Final render requires current verified captures: ' + ', '.join(pending))
        if pending and 'provisional' not in name.lower():
            raise ValueError('A provisional output filename must include provisional.')
        out = ROOT / name
        if out.exists():
            raise FileExistsError('Choose a new output name; prior renders are preserved: ' + str(out))
        started = time.monotonic()
        self.assert_captures_unchanged()
        count = self.keyframes()
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        command = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-nostdin', '-n',
            '-f', 'concat', '-safe', '0', '-i', str(ROOT / 'frames.ffconcat'),
            '-i', str((ROOT / self.plan['audioMaster']).resolve()),
            '-map', '0:v:0', '-map', '1:a:0', '-vf', 'fps=' + str(self.fps) + ',tpad=stop_mode=clone:stop_duration=4', '-fps_mode', 'cfr',
            '-frames:v', str(self.total_frames), '-t', str(self.total_frames / self.fps),
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', str(out)]
        with (ROOT / 'encode.log').open('w') as log:
            subprocess.run(command, stderr=log, check=True)
        decode = subprocess.run([ffmpeg, '-v', 'error', '-i', str(out), '-f', 'null', '-'], capture_output=True, text=True, check=True)
        probe = subprocess.run([ffmpeg, '-hide_banner', '-i', str(out)], capture_output=True, text=True)
        duration = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', probe.stderr)
        seconds = int(duration[1]) * 3600 + int(duration[2]) * 60 + float(duration[3])
        assert 175 <= seconds <= 179.5 and abs(seconds-self.total_frames/self.fps) <= .05 and '1920x1080' in probe.stderr and '24 fps' in probe.stderr
        self.assert_captures_unchanged()
        report = {'file': out.name, 'status': 'provisional_local_review' if pending else 'local_review_candidate',
            'dimensions': [W, H], 'fps': self.fps, 'durationSeconds': seconds,
            'authoredDurationSeconds': self.plan['durationSeconds'], 'sceneCount': len(self.scenes),
            'captionCues': len(self.captions), 'captionSourceUnchanged': True,
            'speechSpeed': 1, 'speechRetimed': False, 'speechReordered': False, 'newSynthesisCalls': 0,
            'audioMasterSource': self.plan['audioMaster'], 'audioMasterSha256': sha((ROOT / self.plan['audioMaster']).resolve()),
            'firstProductUiSeconds': 0, 'firstTeacherEvidenceSeconds': 17.75,
            'unverifiedCaptures': pending, 'keyframeCount': count,
            'captureSha256': self.capture_hashes,
            'captionSha256': sha(ROOT / 'captions.json'),
            'captureManifestSha256': sha(ROOT / 'capture-manifest.json'),
            'scenePlanSha256': sha(ROOT / 'scene-cues.json'),
            'decodePassed': not decode.stderr.strip(), 'bytes': out.stat().st_size,
            'sha256': sha(out), 'renderSeconds': round(time.monotonic() - started, 1),
            'listening_review': 'not_performed', 'uploaded': False, 'published': False, 'submitted': False}
        report_name = 'provisional-render-report.json' if pending else 'render-report.json'
        (ROOT / report_name).write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))

    def assert_captures_unchanged(self):
        for key, expected in self.capture_hashes.items():
            if sha((ROOT / self.manifest['captures'][key]['path']).resolve()) != expected:
                raise ValueError('Capture changed during rendering; choose a new output after freezing assets: ' + key)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--frames-only', action='store_true')
    parser.add_argument('--allow-provisional', action='store_true')
    parser.add_argument('--output', default='GroundTruth_Demo_V3_final.mp4')
    args = parser.parse_args()
    renderer = Renderer()
    renderer.qa()
    if not args.frames_only:
        renderer.render(args.output, args.allow_provisional)
