"""Prepare V3's visual recut using only the exact approved V2 audio/captions.

No synthesis, network, publication or submission. V2 files remain untouched.
Capture entries start explicitly provisional and must be replaced/verified
before a final render; --allow-provisional is only for a labelled local proof.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
V2 = ROOT.parent / 'video-v2'
DURATION = 178.465306122449


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare():
    ROOT.mkdir(exist_ok=True)
    for name in ['captions.json', 'captions.srt', 'captions.vtt']:
        shutil.copyfile(V2 / name, ROOT / name)
    source_map = json.loads((V2 / 'source-to-final-map.json').read_text())
    source_map.update({'source': '../video-v2/narration-alyssa.mp3',
                       'audioMaster': '../video-v2/mix-master.wav',
                       'timingUnchangedFrom': '../video-v2/source-to-final-map.json',
                       'visualsRecutIndependently': True, 'speechReordered': False})
    purposes = ['Early original-answer and teacher-evidence payoff',
                'Private diff and change-linked task preview',
                'Pinned source and actual applied-diff inspection',
                'Source inspection and change-understanding task',
                'Fresh variation and observed/reviewed evidence states',
                'Synthetic evidence and current-state limitations']
    for hold, purpose in zip(source_map['holds'], purposes):
        hold['originalV2Purpose'] = hold['purpose']
        hold['purpose'] = purpose
    (ROOT / 'source-to-final-map.json').write_text(json.dumps(source_map, indent=2) + '\n')
    # Real legacy images are temporary layout assets, never presented as current.
    # Crops refer to source pixels; compositing never creates replacement UI.
    sources = {
        'landing': ('../assets/live-landing.png', [150, 100, 1750, 810], 'landing_demo_cta'),
        'landing-wide': ('../assets/live-landing.png', [150, 100, 1750, 810], 'landing_demo_cta'),
        'workflow': ('../assets/live-workflow.png', [500, 240, 1660, 650], 'workflow_overview'),
        'repository': ('../assets/live-repository-map.png', [285, 150, 1830, 900], 'repository_map'),
        'source': ('../video-v2/captures/learner-source.jpg', [18, 350, 622, 739], 'pinned_source'),
        'concepts': ('../assets/live-concepts.png', [470, 160, 1670, 850], 'concept_evidence_states'),
        'change': ('../assets/live-cloud-draft.png', [510, 420, 1650, 950], 'change_applied'),
        'change-question': ('../video-v2/captures/learner-mcq.jpg', [18, 130, 622, 600], 'change_linked_question'),
        'mcq': ('../assets/live-practice-mcq.png', [500, 395, 1660, 820], 'fresh_meta_mcq'),
        'coding': ('../assets/live-practice-coding.png', [500, 270, 1655, 910], 'fresh_meta_coding'),
        'hint': ('../video-v2/captures/learner-hint.jpg', [14, 311, 640, 645], 'source_grounded_hint'),
        'independent': ('../assets/live-independent.png', [500, 180, 1660, 910], 'independent_assistance_paused'),
        'original': ('../video-v2/captures/learner-original.jpg', [18, 435, 622, 710], 'original_committed_answer'),
        'fresh-variation': ('../video-v2/captures/learner-mcq.jpg', [18, 130, 622, 600], 'linked_fresh_variation'),
        'progress': ('../video-v2/captures/learner-progress.jpg', [18, 445, 622, 705], 'concept_evidence_states'),
        'teacher-evidence': ('../assets/live-teacher.png', [410, 490, 1500, 870], 'authorized_teacher_committed_evidence'),
        'teacher-source': ('../assets/live-teacher.png', [410, 490, 1500, 870], 'authorized_teacher_captured_change_context'),
        'teacher-review': ('../video-v2/captures/teacher-assessment.jpg', [18, 132, 608, 537], 'teacher_saved_review'),
        'teacher-queue': ('../assets/live-teacher.png', [410, 490, 1500, 870], 'authorized_teacher_review_filter'),
        'sharing': ('../assets/live-progress.png', [500, 290, 1650, 850], 'explicit_teacher_selection'),
        'sharing-consent': ('../assets/live-progress.png', [500, 290, 1650, 850], 'explicit_project_sharing_consent'),
        'teacher-preview': ('../video-v2/captures/teacher-review.jpg', [18, 80, 608, 537], 'own_readonly_teacher_preview'),
    }
    manifest = ROOT / 'capture-manifest.json'
    if not manifest.exists():
        data = {'status': 'awaiting_current_release_captures', 'captures': {}}
        for key, (path, crop, state) in sources.items():
            data['captures'][key] = {'path': path, 'crop': crop, 'status': 'provisional_legacy',
                'requiredState': state, 'verifiedState': None, 'capturedAt': None,
                'applicationCommit': None, 'context': 'Real earlier hosted capture; layout proof only. Replace before final render.',
                'syntheticRecords': True}
        manifest.write_text(json.dumps(data, indent=2) + '\n')
    scenes = []
    def ui(id, start, end, capture, title, note=''):
        scenes.append({'id': id, 'kind': 'ui', 'start': start, 'end': end,
                       'capture': capture, 'title': title, 'note': note})
    def card(id, start, end, title, rows, note=''):
        scenes.append({'id': id, 'kind': 'card', 'start': start, 'end': end,
                       'title': title, 'rows': rows, 'note': note})
    ui('one-line-challenge', 0, 7.253, 'change', 'Your app works. Own the next change.', 'Private practice copy · no GitHub push')
    ui('one-click-entry', 7.253, 12.5, 'landing', 'Try a sample. Keep your own session.', 'Isolated synthetic visitor · expires after 2 hours')
    ui('mental-model', 12.5, 17.75, 'workflow', 'See the responsibilities behind the code.', 'Prepared Meta overview · pinned public sample')
    ui('teacher-payoff-early', 17.75, 25.75, 'teacher-evidence', 'The payoff: inspect the original answer.', 'Question + committed answer + source · human judgement')
    ui('teacher-evidence-early', 25.75, 33.6, 'teacher-source', 'Compare the answer with captured source.', 'Synthetic operator QA · test accounts are not study participants')
    ui('teacher-review-early', 33.6, 40.6, 'teacher-review', 'Choose a qualified human next step.', 'An approved teacher reviews explicitly shared work')
    ui('private-diff-preview', 40.6, 44.4, 'change', 'One small edit. A reviewed diff.', 'Private copy · trusted before/after hashes')
    ui('linked-question-preview', 44.4, 47.6, 'change-question', 'Ask about the change that was actually applied.', 'Owned proposal + reconstructed diff · new Meta question')
    ui('groundtruth-introduction', 47.6, 51.631, 'landing-wide', 'GroundTruth. Think in systems.', 'Actual product capture · edited walkthrough')
    ui('choose-feature', 51.631, 54.447, 'workflow', 'Start with a feature, before a filename.', 'Prepared sample feature · own public repositories can be imported separately')
    ui('overview', 54.447, 60.122, 'workflow', 'A beginner view of the selected code.', 'Prepared overview is distinct from fresh question generation')
    ui('trace-source', 60.122, 66.623, 'source', 'Request → validation → persistence.', 'Read the pinned source; challenge generated claims')
    ui('responsibility', 66.623, 71.5, 'source', 'Find the component that owns the rule.')
    ui('source-inspection', 71.5, 78.5, 'source', 'The selected source stays visible.', 'Bounded selection · not a complete repository audit')
    ui('applied-diff', 78.5, 85.5, 'change', 'Review a small private change.', 'Hosted source and learner snippets are never executed')
    ui('concepts', 85.5, 93.065, 'concepts', 'Focused concepts. Inspectable evidence states.', 'No mastery percentage for merely submitting an answer')
    card('meta-context', 93.065, 96.82, 'Meta supplies contextual teaching content.', ['Muse Spark 1.3 Standard', 'The application controls access and learning state.'])
    ui('fresh-mcq', 96.82, 101.428, 'mcq', 'One focused question from this source.', 'Fresh Meta request · suggested keys still need source review')
    ui('short-code', 101.428, 104.75, 'coding', 'A small coding task, not a whole project.')
    ui('guided-hint', 104.75, 109.75, 'source', 'Guided exploration: inspect the source.', 'Selected pinned code · contextual guidance stays source-bound')
    ui('change-understanding', 109.75, 114.75, 'change-question', 'Check understanding of the applied diff.', 'Before/after source and hashes are reconstructed server-side')
    ui('independent', 114.75, 120.238, 'independent', 'Try it yourself. New in-app assistance pauses.')
    ui('preserved-answer', 120.238, 123.395, 'original', 'The original response stays preserved.')
    ui('end-attempt', 123.395, 125.7, 'independent', 'You can end an attempt and return later.')
    ui('fresh-variation', 125.7, 130.2, 'fresh-variation', 'A fresh variation. Keep the earlier attempt.', 'Task linkage is evidence, not proof of learning gains')
    ui('evidence-states', 130.2, 134.7, 'progress', 'Observed and reviewed states, not a score.')
    ui('teacher-queue', 134.7, 136.4, 'teacher-queue', 'Find the work awaiting human review.', 'Synthetic operator QA · all counts are test records, not participants')
    ui('teacher-original', 136.4, 140.688, 'teacher-evidence', 'Inspect the original answer alongside the source.')
    ui('learner-choice', 140.688, 141.776, 'sharing', 'The learner explicitly chooses a teacher.', 'Class enrollment alone does not share projects')
    ui('learner-consent', 141.776, 142.864, 'sharing-consent', 'Sharing remains the learner’s explicit choice.', 'Consent for this learning path · separate from class enrollment')
    ui('human-review', 142.864, 147.4, 'teacher-review', 'Human judgement stays central.')
    ui('own-preview', 147.4, 152.4, 'teacher-preview', 'Judges can inspect only their own sample.', 'Read-only preview · no Teacher role or saved assessment')
    card('evidence-boundary-hold', 152.4, 156.4, 'What this demonstration establishes.', ['Synthetic operator records and inspectable workflow.', 'No external user study: n = 0.'], 'Teacher quiz authoring, assignment distribution and cohort analytics remain future work.')
    card('evidence-boundaries', 156.4, 165.434, 'Current release: observed and reviewed states.', ['No validated mastery score.', 'Outside AI use remains beyond the platform’s view.'], 'The unchanged approved narration mentions the earlier provisional index. The displayed percentage has been removed.')
    card('stack', 165.434, 171.493, 'Meta content. Application-controlled evidence.', ['Next.js / Vercel: access, owner checks and state', 'Supabase: original attempts and human review', 'Meta Model API: contextual guidance'], 'MIT implementation · secrets stay server-side')
    ui('closing', 171.493, DURATION, 'landing', 'Let AI cook. Know the recipe.', 'Try the isolated sample · private two-hour session')
    scenes[-1]['callToActionUrl'] = 'groundtruth-meta.vercel.app'
    plan = {'title': 'GroundTruth — own the next change', 'status': 'local_review_only',
        'width': 1920, 'height': 1080, 'fps': 24, 'durationSeconds': DURATION,
        'audioMaster': '../video-v2/mix-master.wav', 'narrationSpeed': 1,
        'speechReordered': False, 'speechRetimed': False,
        'captionSafeArea': [96, 914, 1824, 1050],
        'firstProductUiSeconds': 0, 'firstTeacherEvidenceSeconds': 17.75,
        'captureManifest': 'capture-manifest.json', 'scenes': scenes}
    (ROOT / 'scene-cues.json').write_text(json.dumps(plan, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    provenance = {'approvedSpeechSource': '../video-v2/narration-alyssa.mp3',
        'approvedSpeechSha256': digest(V2 / 'narration-alyssa.mp3'),
        'audioMasterSource': '../video-v2/mix-master.wav',
        'audioMasterSha256': digest(V2 / 'mix-master.wav'),
        'speechProvenance': '../video-v2/speech-provenance.json',
        'captionSource': '../video-v2/captions.json',
        'captionSha256': digest(ROOT / 'captions.json'),
        'voice': 'Alyssa', 'returnedEngine': 'orca', 'speechSpeed': 1,
        'newSynthesisCalls': 0, 'speechTrimmedWords': 0, 'speechReordered': False,
        'audioFiltersAdded': [], 'audioMixChanged': False,
        'listening_review': 'not_performed',
        'listeningLimitation': 'No audible listening review was performed. Decode/alignment measurements do not establish listening quality.',
        'legacySpeechClarification': 'The exact approved speech mentions the earlier provisional index. V3 displays the current evidence states and explicitly notes the removed percentage.',
        'uploaded': False, 'published': False, 'submitted': False}
    (ROOT / 'speech-and-audio-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    speech = json.loads((V2 / 'speech-provenance.json').read_text(encoding='utf-8'))['spokenText']
    (ROOT / 'transcript.md').write_text('# Approved spoken transcript — unchanged V2 Alyssa audio\n\nSpeech speed: 1x. No words added, removed, reordered or regenerated.\n\n' + speech.replace('\r\n', '\n') + '\n', encoding='utf-8')
    print(json.dumps({'sceneCount': len(scenes), 'durationSeconds': DURATION,
                      'firstProductUiSeconds': 0, 'firstTeacherEvidenceSeconds': 17.75,
                      'audioChanged': False, 'captionsChanged': False}))


if __name__ == '__main__':
    prepare()
