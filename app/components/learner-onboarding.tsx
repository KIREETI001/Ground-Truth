'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Braces, Check, Clock3, Code2, Database, Layers3, Lightbulb } from 'lucide-react';
import { baselineQuestions } from '@/lib/learner/model';
import type { LearnerProfile, LanguageId } from '@/lib/learner/types';
import { useLearner } from './learner-context';

export const goalOptions = [
  { id: 'frontend' as const, title: 'Build better interfaces', detail: 'Understand the browser side.', icon: Code2 },
  { id: 'full-stack' as const, title: 'Connect the whole app', detail: 'Follow browser to database.', icon: Layers3 },
  { id: 'backend' as const, title: 'Make the server reliable', detail: 'Reason about data and access.', icon: Database },
];
export const languageLabels: Record<LanguageId, string> = { javascript: 'JavaScript', typescript: 'TypeScript', sql: 'SQL', python: 'Python', java: 'Java', cpp: 'C++', csharp: 'C#' };
export const interestOptions = [
  { id: 'interfaces' as const, label: 'Interfaces' }, { id: 'apis' as const, label: 'APIs' },
  { id: 'data' as const, label: 'Data' }, { id: 'reliability' as const, label: 'Reliability' },
];
export function goalLabel(goal: LearnerProfile['goal']) { return goalOptions.find(item => item.id === goal)?.title ?? 'Your web-app path'; }

export function LearnerOnboarding() {
  const { state } = useLearner();
  return state.profile ? <BaselineFlow /> : <PathSetup />;
}

function PathSetup() {
  const { update } = useLearner();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<LearnerProfile['goal'] | null>(null);
  const [languages, setLanguages] = useState<LanguageId[]>(['javascript']);
  const [interests, setInterests] = useState<LearnerProfile['interests']>(['interfaces']);
  const [minutes, setMinutes] = useState<LearnerProfile['minutes']>(10);
  return <section className="setup-card" id="build-path" tabIndex={-1} aria-labelledby="setup-title"><div className="setup-progress"><span>Build my path</span><span>Step {step + 1} of 3</span></div><div className="setup-meter" aria-hidden="true">{[0, 1, 2].map(item => <i key={item} className={item <= step ? 'filled' : ''} />)}</div>{step === 0 ? <><span className="setup-symbol"><Braces size={28} /></span><h2 id="setup-title">What do you want to understand?</h2><p>Start with the part of your app you want to feel more confident changing.</p><fieldset className="goal-choices"><legend className="sr-only">Choose your goal</legend>{goalOptions.map(({ id, title, detail, icon: Icon }) => <label className={`goal-choice${goal === id ? ' selected' : ''}`} key={id}><input type="radio" name="goal" value={id} checked={goal === id} onChange={() => setGoal(id)} /><Icon size={23} /><span><strong>{title}</strong><span>{detail}</span></span><span className="choice-indicator">{goal === id && <Check size={15} />}</span></label>)}</fieldset></> : step === 1 ? <><span className="setup-symbol"><Code2 size={28} /></span><h2 id="setup-title">What’s in your toolkit?</h2><p>Pick what you use or want to explore. You can change this later.</p><fieldset className="setup-options"><legend>Languages</legend><div className="selection-chips">{Object.entries(languageLabels).map(([id, label]) => <label key={id} className={languages.includes(id as LanguageId) ? 'selected' : ''}><input type="checkbox" checked={languages.includes(id as LanguageId)} onChange={() => setLanguages(value => value.includes(id as LanguageId) ? value.filter(item => item !== id) : [...value, id as LanguageId])} /><span>{label}</span></label>)}</div></fieldset><fieldset className="setup-options"><legend>Curious about</legend><div className="selection-chips">{interestOptions.map(({ id, label }) => <label key={id} className={interests.includes(id) ? 'selected' : ''}><input type="checkbox" checked={interests.includes(id)} onChange={() => setInterests(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id])} /><span>{label}</span></label>)}</div></fieldset><p className="support-copy">Practice currently covers JavaScript and SQL web-app ideas. All seven languages have reference notes.</p></> : <><span className="setup-symbol"><Clock3 size={28} /></span><h2 id="setup-title">Make room for a small win.</h2><p>How much time would you like to set aside for a session?</p><fieldset className="time-choices"><legend className="sr-only">Session length</legend>{([10, 20, 30] as const).map(value => <label key={value} className={minutes === value ? 'selected' : ''}><input type="radio" name="minutes" checked={minutes === value} onChange={() => setMinutes(value)} /><strong>{value}</strong><span>minutes</span>{minutes === value && <Check size={17} />}</label>)}</fieldset><div className="setup-next-note"><Lightbulb size={20} /><span>Next: three tiny starting questions. “Not sure yet” is a useful answer.</span></div></>}<div className="setup-actions">{step > 0 ? <button className="text-link" onClick={() => setStep(value => value - 1)}><ArrowLeft size={17} />Back</button> : <span className="support-copy">No account required.</span>}<button className="button button-primary" disabled={!goal} onClick={() => step < 2 ? setStep(value => value + 1) : goal && update(value => ({ ...value, profile: { goal, languages, interests, minutes } }))}>{step === 2 ? 'Find my starting point' : 'Continue'}<ArrowRight size={18} /></button></div></section>;
}

function BaselineFlow() {
  const { state, update } = useLearner();
  const first = baselineQuestions.findIndex(question => !state.baseline.some(answer => answer.questionId === question.id));
  const [index, setIndex] = useState(first < 0 ? 0 : first);
  const [selection, setSelection] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const question = baselineQuestions[index];
  const choice = question.choices.find(item => item.id === selection);
  function next() {
    if (!choice) return;
    update(value => ({ ...value, baseline: [...value.baseline.filter(answer => answer.questionId !== question.id), { questionId: question.id, choiceId: choice.id }] }));
    if (index + 1 < baselineQuestions.length) { setIndex(index + 1); setSelection(null); setChecked(false); }
  }
  return <section className="setup-card baseline-card" id="build-path" tabIndex={-1} aria-labelledby="baseline-title"><div className="setup-progress"><span>Your starting point</span><span>Question {index + 1} of {baselineQuestions.length}</span></div><div className="setup-meter" aria-hidden="true">{baselineQuestions.map((item, position) => <i key={item.id} className={position <= index ? 'filled' : ''} />)}</div><h2 id="baseline-title">{question.title}</h2><p>{question.prompt}</p><pre className="journey-code" tabIndex={0} aria-label="Starting question code"><code>{question.code}</code></pre><fieldset className="baseline-choices"><legend className="sr-only">Choose a starting response</legend>{question.choices.map(item => <label key={item.id} className={`${selection === item.id ? 'selected' : ''}${checked && selection === item.id ? ' checked' : ''}`}><input type="radio" name={question.id} checked={selection === item.id} disabled={checked} onChange={() => setSelection(item.id)} /><span>{item.label}</span>{selection === item.id && <Check size={18} />}</label>)}</fieldset>{checked && choice && <div className="baseline-feedback" role="status"><Lightbulb size={21} /><div><strong>{choice.id === 'unsure' ? 'That gives us somewhere to start.' : choice.correct ? 'You followed that correctly.' : 'Here’s the part to notice.'}</strong><p>{choice.feedback}</p></div></div>}<div className="setup-actions"><span className="support-copy">A starting check, not a grade.</span><button className="button button-primary" disabled={!choice} onClick={() => checked ? next() : setChecked(true)}>{checked ? index === baselineQuestions.length - 1 ? 'See my next step' : 'Next question' : 'Check my thinking'}<ArrowRight size={18} /></button></div></section>;
}
