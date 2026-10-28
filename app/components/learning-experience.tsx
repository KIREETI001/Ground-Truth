'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Award, BookOpen, Check, CheckCheck, ChevronRight, Code2, Flag, Lightbulb, LockKeyhole, MapPin, RotateCcw, Sparkles, X } from 'lucide-react';
import { checkpointTotal, practicePointMaximum, missions, type Checkpoint, type Mission } from '@/lib/learning/catalog';
import { missionStatus } from '@/lib/learning/progress';
import { useLearner } from './learner-context';
import { LearnerGate, LearnerStatus } from './learner-shared';
import { SiteNav } from './site-nav';
import { Modal } from './lab-ui';
import { AreaTour, focusArea } from './area-tour';

const lessonTour = [
  { kind: 'procedural' as const, targetId: 'mission-path', title: 'Pick a small mission.', detail: 'Each mission has three checkpoints. You can switch missions or replay one whenever you like.' },
  { kind: 'procedural' as const, targetId: 'lesson-question', title: 'Choose, then check.', detail: 'Select an answer and press Check. Read the feedback, retry if you need to, then choose Continue. A hint is always optional.' },
  { kind: 'procedural' as const, targetId: 'practice-progress', title: 'Keep a little record.', detail: 'Each checkpoint earns 10 local practice points once. Points record guided practice. Account changes save only when you choose Save in Profile. Use Reset practice to replay from zero.' },
];

export function LearningExperience() {
  const { state: progress, phase, complete, resetPractice: reset } = useLearner();
  const ready = phase === 'guest' || phase === 'account';
  const [missionIndex, setMissionIndex] = useState(0);
  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [guideVisible, setGuideVisible] = useState(true);
  const [resetMessage, setResetMessage] = useState('');
  const [resetGeneration, setResetGeneration] = useState(0);
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const matched = missions.findIndex(item => item.id === window.location.hash.slice(1));
    const index = matched < 0 ? 0 : matched;
    setMissionIndex(index);
    setCheckpointIndex(missionStatus(progress, missions[index].id).nextIndex ?? 0);
  }, [ready, progress]);
  useLayoutEffect(() => {
    if (!restored.current) return;
    focusArea('lesson-question', 'instant');
  }, [missionIndex, checkpointIndex, finished, resetGeneration]);
  const mission = missions[missionIndex];
  const checkpoint = mission.checkpoints[checkpointIndex];
  const total = progress.completed.length;
  const status = missionStatus(progress, mission.id);
  const missionComplete = status.complete;
  function selectMission(index: number) {
    const next = missions[index];
    const first = missionStatus(progress, next.id).nextIndex;
    setMissionIndex(index); setCheckpointIndex(first ?? 0); setFinished(false); setResetMessage('');
    window.history.replaceState(null, '', `#${next.id}`);
  }
  return <div className="learning-app journey-app"><a className="skip-link" href="#learn-main">Skip to practice</a><SiteNav current="learn" /><LearnerGate><main className="learn-shell" id="learn-main"><LearnerStatus /><div className="learn-titlebar"><div><p className="section-kicker"><BookOpen size={16} /> Your guided practice</p><h1>Small steps. <span>Clearer thinking.</span></h1><p>Choose, trace and test a boundary. One small idea at a time.</p></div><div className="learn-destinations"><Link className="text-link" href="/learn/library"><BookOpen size={16} />Language reference<ArrowRight size={16} /></Link><Link className="text-link" href="/workspace">Live playground<ArrowUpRight size={16} /></Link><AreaTour steps={lessonTour} label="Your guide" floating /></div></div><div className="learning-layout"><aside className="mission-sidebar"><section className="mission-path" id="mission-path" tabIndex={-1} aria-labelledby="path-title"><div className="path-heading"><h2 id="path-title">Your missions</h2><span>JS + SQL</span></div><nav aria-label="Mission path">{missions.map((item, index) => {
    const count = item.checkpoints.filter(point => progress.completed.includes(point.id)).length;
    return <button key={item.id} aria-current={index === missionIndex ? 'step' : undefined} onClick={() => selectMission(index)} className={`mission-path-item ${index === missionIndex ? 'active' : ''}`}><span className={`path-number ${count === item.checkpoints.length ? 'completed' : ''}`}>{count === item.checkpoints.length ? <CheckCheck size={19} /> : item.number}</span><span><strong>{item.title}</strong><span>{item.topic}</span><small>{count} of {item.checkpoints.length} checkpoints</small></span><ChevronRight size={16} /></button>;
  })}</nav></section><section className="practice-progress" id="practice-progress" tabIndex={-1}><div className="progress-symbol"><Award size={23} /></div><h2>{ready ? total * 10 : '—'}<span> / {practicePointMaximum}</span></h2><p>Guided practice points</p><div className="practice-meter" role="progressbar" aria-label="Checkpoints completed" aria-valuemin={0} aria-valuemax={checkpointTotal} aria-valuenow={total}><span style={{ width: `${total / checkpointTotal * 100}%` }} /></div><span className="progress-description">10 per checkpoint, earned once. A record of practice, not a grade.</span><button className="text-link" onClick={() => setResetOpen(true)}><RotateCcw size={15} />Reset practice</button></section><p className="learning-account-note"><LockKeyhole size={15} />{phase === 'account' ? 'Practice updates your account draft. Save explicitly in Profile to keep it across visits.' : 'Practice stays on this device. You can optionally sign in and import it later.'}</p></aside><div className="lesson-main">{resetMessage && <div className="notice notice-success" role="status"><Check size={18} />{resetMessage}</div>}{guideVisible && <div className="lesson-companion"><span className="companion-icon"><Sparkles size={19} /></span><p><strong>A little nudge:</strong> take your best guess. A wrong answer gives you something useful to investigate.</p><button className="icon-button" aria-label="Dismiss practice tip" onClick={() => setGuideVisible(false)}><X size={17} /></button></div>}<div className="mission-overline"><span className={`mission-color-dot ${mission.color}`} /><span>Mission {mission.number}</span><span>/</span><strong>{mission.topic}</strong>{missionComplete && <span className="completion-stamp"><CheckCheck size={15} />Practiced</span>}</div><div className="checkpoint-tabs" aria-label="Checkpoints">{mission.checkpoints.map((item, index) => <button key={item.id} className={index === checkpointIndex && !finished ? 'active' : ''} onClick={() => { setCheckpointIndex(index); setFinished(false); }} aria-current={index === checkpointIndex && !finished ? 'step' : undefined}><span>{progress.completed.includes(item.id) ? <Check size={15} /> : index + 1}</span>{item.label}</button>)}</div>{finished ? <MissionFinish mission={mission} allComplete={total === checkpointTotal} onNext={() => selectMission((missionIndex + 1) % missions.length)} onReplay={() => { setCheckpointIndex(0); setFinished(false); }} /> : <CheckpointCard key={`${checkpoint.id}-${resetGeneration}`} checkpoint={checkpoint} completed={progress.completed.includes(checkpoint.id)} number={checkpointIndex + 1} onComplete={complete} onContinue={() => { if (checkpointIndex < mission.checkpoints.length - 1) setCheckpointIndex(checkpointIndex + 1); else if (status.complete) setFinished(true); else setCheckpointIndex(status.nextIndex ?? 0); }} last={checkpointIndex === mission.checkpoints.length - 1 && missionComplete} />}<p className="lesson-boundary"><Code2 size={16} />Original browser examples. No live app evidence or certification is produced here.</p></div></div><section className="practice-resources"><div><p className="section-kicker">Keep your curiosity going</p><h2>More places to practice.</h2><p>These are external resources. GroundTruth does not track their completion or connect to your accounts.</p></div><div className="resource-list"><a href="https://exercism.org/tracks/javascript/concepts" target="_blank" rel="noreferrer"><span><strong>Exercism · JavaScript concepts</strong><span>Explore the concepts and exercises. Concept exercises are not mentored.</span></span><ArrowUpRight size={19} /></a><a href="https://www.hackerrank.com/skills-verification/problem_solving_basic" target="_blank" rel="noreferrer"><span><strong>HackerRank · Problem Solving (Basic)</strong><span>Optional external skills assessment. GroundTruth issues no certificate and does not predict a pass.</span></span><ArrowUpRight size={19} /></a></div></section></main>{resetOpen && <Modal title="Reset guided practice?" onClose={() => setResetOpen(false)}><div className="reset-copy"><p>This clears all {checkpointTotal} checkpoint stamps and guided practice points from the current path. You can replay every mission.</p><p>Your saved live playground activity is separate.</p><div className="button-row"><button className="button button-outline" onClick={() => setResetOpen(false)}>Keep my progress</button><button className="button button-primary" onClick={() => { reset(); setResetGeneration(value => value + 1); setResetOpen(false); setFinished(false); setCheckpointIndex(0); setResetMessage('Guided practice reset. Ready for a fresh start.'); }}><RotateCcw size={16} />Reset progress</button></div></div></Modal>}</LearnerGate></div>;
}

function CheckpointCard({ checkpoint, completed, number, onComplete, onContinue, last }: { checkpoint: Checkpoint; completed: boolean; number: number; onComplete: (id: string) => number; onContinue: () => void; last: boolean }) {
  const [selection, setSelection] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [hint, setHint] = useState(false);
  const [awarded, setAwarded] = useState(0);
  const picked = checkpoint.choices.find(choice => choice.id === selection);
  const correct = checked && picked?.correct;
  function check() { if (!picked) return; setChecked(true); if (picked.correct) setAwarded(onComplete(checkpoint.id)); }
  return <article className="checkpoint-card" id="lesson-question" tabIndex={-1}><div className="checkpoint-heading"><span className="section-kicker">Checkpoint {number} of 3</span><span className="checkpoint-value">{completed ? <><Check size={14} />Points already earned</> : '+10 practice points'}</span></div><h2>{checkpoint.title}</h2><p className="checkpoint-prompt">{checkpoint.prompt}</p><LessonVisual checkpoint={checkpoint} />{checkpoint.code && <pre className="lesson-code" tabIndex={0} aria-label="Supplied practice code"><code>{checkpoint.code}</code></pre>}<fieldset className="lesson-choices"><legend>Choose your answer</legend>{checkpoint.choices.map((choice, index) => <label key={choice.id} className={`lesson-choice ${selection === choice.id ? 'selected' : ''} ${checked && selection === choice.id ? correct ? 'answer-correct' : 'answer-wrong' : ''}`}><input type="radio" name={checkpoint.id} checked={selection === choice.id} disabled={checked} onChange={() => setSelection(choice.id)} value={choice.id} /><span className="choice-letter">{String.fromCharCode(65 + index)}</span><span>{choice.label}</span>{checked && choice.id === selection && (correct ? <Check size={19} /> : <RotateCcw size={18} />)}</label>)}</fieldset>{checked && picked && <div className={`lesson-feedback ${correct ? 'is-correct' : 'is-retry'}`} role="status"><span className="feedback-icon">{correct ? <CheckCheck size={22} /> : <RotateCcw size={21} />}</span><div><h3>{correct ? awarded ? 'That’s it. +10 practice points!' : 'That’s it. Nicely reasoned.' : 'A useful place to pause.'}</h3><p>{picked.feedback}</p>{correct && <p className="takeaway">{checkpoint.takeaway}</p>}</div></div>}{hint && !correct && <div className="lesson-hint" role="note"><Lightbulb size={19} /><p>{checkpoint.hint}</p></div>}<div className="checkpoint-actions"><div>{!correct && <button className="text-link hint-toggle" onClick={() => setHint(!hint)} aria-expanded={hint}><Lightbulb size={17} />{hint ? 'Hide hint' : 'Need a hint?'}</button>}</div>{correct ? <button className="button button-primary" onClick={onContinue}>{last ? 'Finish mission' : 'Continue'}<ArrowRight size={18} /></button> : checked ? <button className="button button-primary" onClick={() => { setSelection(null); setChecked(false); }}><RotateCcw size={17} />Try again</button> : <button className="button button-primary" disabled={!selection} onClick={check}>Check answer <ArrowRight size={18} /></button>}</div></article>;
}

function LessonVisual({ checkpoint }: { checkpoint: Checkpoint }) {
  if (checkpoint.visual === 'code') return null;
  if (checkpoint.visual === 'queue') return <div className="queue-visual" aria-label="Three slots in order: open, full, open">{['open', 'full', 'open'].map((state, index) => <div key={index} className={`queue-slot ${state}`}><span>Slot {index + 1}</span><strong>{state === 'open' ? <Flag size={18} /> : <LockKeyhole size={18} />}{state}</strong></div>)}</div>;
  if (checkpoint.visual === 'receipt') return <div className="receipt-visual" aria-label="Map entries: r-2 maps to saved; r-5 maps to queued"><div><span className="receipt-key">r-2</span><ArrowRight size={20} /><strong>saved</strong></div><div><span className="receipt-key">r-5</span><ArrowRight size={20} /><strong>queued</strong></div><span className="visual-caption">request ID <ArrowRight size={14} /> status</span></div>;
  const unsorted = checkpoint.visual === 'marker-unsorted';
  const next = checkpoint.visual === 'marker-next';
  const values = unsorted ? [7, 2, 11, 4] : [2, 4, 7, 11];
  const right = next ? 2 : 3;
  return <div className="pointer-visual"><div className="pointer-values" aria-label={`${unsorted ? 'Unsorted' : 'Sorted'} values. Left index 0, value ${values[0]}. Right index ${right}, value ${values[right]}.`}>{values.map((value, index) => <div key={index} className={`pointer-cell ${index === 0 ? 'pointer-left' : ''} ${index === right ? 'pointer-right' : ''}`}><span className="pointer-label">{index === 0 ? 'left' : index === right ? 'right' : '\u00a0'}</span><strong>{value}</strong><span className="pointer-index">index {index}</span></div>)}</div><div className="pointer-equation"><span>{values[0]} + {values[right]} = <strong>{values[0] + values[right]}</strong></span><span>{unsorted ? 'Order is not established' : 'Target: 11'}</span></div></div>;
}

function MissionFinish({ mission, allComplete, onNext, onReplay }: { mission: Mission; allComplete: boolean; onNext: () => void; onReplay: () => void }) {
  return <section className="mission-finish" id="lesson-question" tabIndex={-1}><div className="finish-badge"><Award size={40} /></div><span className="completion-stamp"><CheckCheck size={16} />Mission practiced</span><h2>{mission.title},<br /><span>in your toolkit.</span></h2><p>You chose an approach, traced its behavior, and found a boundary. Keep using those three questions.</p><div className="mission-takeaways">{mission.checkpoints.map(point => <div key={point.id}><Check size={18} /><p>{point.takeaway}</p></div>)}</div><div className="finish-actions">{allComplete ? <Link className="button button-primary" href="/workspace">Explore the live playground <ArrowRight size={17} /></Link> : <button className="button button-primary" onClick={onNext}>Try another mission <ArrowRight size={17} /></button>}<button className="text-link" onClick={onReplay}><RotateCcw size={16} />Replay mission</button></div><div className="external-bridge"><p className="section-kicker"><MapPin size={16} />Next stop · External practice</p>{mission.links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noreferrer"><span><strong>{link.label}</strong><span>{link.detail}</span></span><ArrowUpRight size={20} /></a>)}<p>External sites have their own accounts and terms. Completion is not imported into GroundTruth.</p></div></section>;
}
