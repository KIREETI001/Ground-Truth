"""Inspect the encoded local artifact, extract real encoded frames and meter it.

No synthesis, listening claim, network request or publication.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess
import shutil

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--video', default='GroundTruth_Demo_V3_final.mp4')
args = parser.parse_args()
video = ROOT / args.video
provisional = 'provisional' in args.video.lower()
report = json.loads((ROOT / ('provisional-render-report.json' if provisional else 'render-report.json')).read_text())
assert report['file'] == args.video
assert hashlib.sha256(video.read_bytes()).hexdigest() == report['sha256']
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
measurement = subprocess.run([ffmpeg, '-hide_banner', '-i', str(video), '-vn', '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True, check=True)
loudness = json.loads(re.findall(r'\{\s*"input_i".*?\}', measurement.stderr, re.S)[-1])
duration = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', measurement.stderr)
seconds = int(duration[1]) * 3600 + int(duration[2]) * 60 + float(duration[3])
assert 175 <= seconds <= 179.5 and abs(seconds - 178.5) <= .05
assert '1920x1080' in measurement.stderr and '24 fps' in measurement.stderr
assert 'aac' in measurement.stderr and '48000 Hz, stereo' in measurement.stderr
source_audio = (ROOT / report['audioMasterSource']).resolve()
assert hashlib.sha256(source_audio.read_bytes()).hexdigest() == report['audioMasterSha256']
assert (ROOT / 'captions.json').read_bytes() == (ROOT.parent / 'video-v2/captions.json').read_bytes()
samples = [('opening-real-ui', .8), ('sample-entry', 10), ('teacher-payoff', 19), ('private-diff', 81),
           ('independent', 117), ('human-review', 144), ('evidence-limits', 160), ('ending', 177)]
directory = ROOT / ('provisional-encoded-frames' if provisional else 'encoded-frames')
directory.mkdir(exist_ok=True)
for name, at in samples:
    subprocess.run([ffmpeg, '-v', 'error', '-y', '-ss', str(at), '-i', str(video), '-frames:v', '1',
                    '-q:v', '2', str(directory / (name + '.jpg'))], capture_output=True, text=True, check=True)
if not provisional:
    shutil.copyfile(directory / 'opening-real-ui.jpg', ROOT / 'poster.jpg')
result = {'file': args.video, 'status': 'provisional_local_review' if provisional else 'local_review_candidate',
    'durationSeconds': seconds, 'dimensions': [1920, 1080], 'fps': 24, 'codec': 'H.264 / AAC stereo 48kHz',
    'sha256MatchesRender': True, 'sourceAudioMasterHashUnchanged': True, 'captionBytesUnchanged': True,
    'speechSpeed': 1, 'speechRetimed': False, 'newSynthesisCalls': 0,
    'firstProductUiSeconds': 0, 'firstTeacherEvidenceSeconds': 17.75,
    'encodedIntegratedLufs': float(loudness['input_i']), 'encodedTruePeakDbtp': float(loudness['input_tp']),
    'loudnessMeasurementOnly': 'Measurement does not modify the output artifact.',
    'decodePassed': report['decodePassed'], 'encodedFrameSamples': [name for name, _at in samples],
    'unverifiedCaptures': report['unverifiedCaptures'], 'listening_review': 'not_performed',
    'poster': None if provisional else 'poster.jpg',
    'uploaded': False, 'published': False, 'submitted': False}
out = ROOT / ('provisional-media-validation.json' if provisional else 'media-validation.json')
out.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
