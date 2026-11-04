"""Make a local-only review player. No network or publication."""
from pathlib import Path
import argparse
import html
import json

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--video', default='GroundTruth_Demo_V3_final.mp4')
args = parser.parse_args()
speech = json.loads((ROOT.parent / 'video-v2/speech-provenance.json').read_text(encoding='utf-8'))['spokenText']
paragraphs = ''.join('<p>' + html.escape(p) + '</p>' for p in speech.replace('\r\n', '\n').split('\n\n'))
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GroundTruth V3 local review</title>
<style>*{box-sizing:border-box}body{margin:0;background:#182237;color:#f8f9f4;font:18px/1.6 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:32px}h1{font-size:clamp(30px,4vw,50px);line-height:1.15}a{color:#c7ef70}video{width:100%;aspect-ratio:16/9;background:#000;border-radius:12px}button{border:1px solid #8a95a1;background:none;color:inherit;padding:9px 14px;border-radius:7px;font:inherit;margin:4px;cursor:pointer}details{margin-top:24px;padding:20px;border:1px solid #57616d;border-radius:10px}p{max-width:80ch}.notice{background:#33433c;padding:16px;border-radius:8px}footer{margin-top:32px;color:#c2cccf}</style>
<main><p>LOCAL REVIEW ONLY · NOT PUBLISHED OR SUBMITTED</p><h1>Code. A small change. Human review.</h1><p class="notice">Approved Alyssa narration and original V2 audio mix at natural 1x. Real product captures, cropped and edited; synthetic operator records. Current captures must pass the manifest checks before a final render.</p>
<video id="demo" controls preload="metadata" poster="poster.jpg"><source src="VIDEO" type="video/mp4"><track kind="captions" srclang="en" label="English" src="captions.vtt"></video>
<p><a href="VIDEO" download>Download this review movie</a> · <a href="contact-sheet.jpg">Scene contact sheet</a> · <a href="capture-manifest.json">Capture provenance</a> · <a href="speech-and-audio-provenance.json">Audio provenance</a></p>
<nav aria-label="Chapters"><button data-t="0">Product first</button><button data-t="17.75">Teacher payoff</button><button data-t="54.447">Source workflow</button><button data-t="78.5">Private change</button><button data-t="114.75">Independent attempt</button><button data-t="134.7">Human review</button><button data-t="156.4">Evidence limits</button></nav>
<p>The unchanged approved speech mentions the earlier provisional index. The video clarifies that the current release uses observed and reviewed states, with no validated mastery score. No external user study was conducted, n = 0. Teacher quiz authoring, assignment distribution and cohort analytics remain future work.</p>
<details><summary>Exact approved spoken transcript</summary>SPEECH</details><footer>Listening review: not performed. Decode, timing and layout checks do not establish audible quality. Publication and official submission remain separate participant-controlled actions.</footer></main>
<script>document.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{const v=document.getElementById('demo');v.currentTime=Number(b.dataset.t);v.play()}));</script></html>'''
(ROOT / 'review.html').write_text(page.replace('VIDEO', html.escape(args.video, quote=True)).replace('SPEECH', paragraphs), encoding='utf-8')
print('Created local V3 review player for ' + args.video)
