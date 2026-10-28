'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Compass, Signal } from 'lucide-react';
import { api, ApiError } from '@/lib/client/api';
import type { RadarResult } from '@/lib/discovery/types';
import type { Pulse } from '@/lib/learner/types';
import { useLearner } from './learner-context';
import { retainSourceHeadlines, singaporeDate, type RadarDisplay } from './learner-session';
import { ErrorNotice, Loading } from './lab-ui';

export function useRadar() {
  const [data, setData] = useState<RadarDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    void api<RadarResult>('/api/radar').then(value => { if (alive) setData(previous => retainSourceHeadlines(previous, value)); }).catch(failure => { if (alive) setError(failure instanceof Error ? failure.message : 'The field brief could not be fetched.'); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [attempt]);
  return { result: data?.result ?? null, staleSources: data?.staleSources ?? {}, loading, error, refresh: () => { setLoading(true); setError(''); setAttempt(value => value + 1); } };
}

export function LearnerFieldBrief() {
  const { result, staleSources, loading, error } = useRadar();
  const items = result?.sources.flatMap(source => source.items.map(item => ({ ...item, publisher: source.title, stale: !!staleSources[source.id] }))).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 2) ?? [];
  return <section className="brief-card" id="field-brief" tabIndex={-1}><div className="rail-heading"><span className="rail-icon"><Compass size={20} /></span><span className="section-kicker">The field brief</span></div><h2>A little outside perspective.</h2>{loading ? <p className="support-copy" role="status">Checking official sources…</p> : error ? <p className="support-copy" role="status">Sources are unavailable right now. Open Radar to retry.</p> : items.length ? <div className="brief-items">{items.map(item => <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><span>{item.stale ? 'Earlier result · ' : ''}{item.publisher} · {singaporeDate(item.publishedAt)}</span><strong>{item.title}<ArrowUpRight size={15} /></strong></a>)}</div> : <p className="support-copy">No source updates are available yet. Radar shows each source’s status.</p>}{!!result?.sources.some(source => source.error) && <p className="support-copy">Some sources could not be refreshed.</p>}<Link className="text-link" href="/radar">Explore Radar<ArrowRight size={16} /></Link></section>;
}

export function LearnerPulse() {
  const { phase, account, isCurrentAccount, retry } = useLearner();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const binding = account;
    const current = () => alive && (!binding || isCurrentAccount(binding));
    void api<Pulse>('/api/pulse', binding ? { headers: binding.headers } : {}).then(value => {
      if (current()) { setPulse(value); setChoiceId(value.choiceId); }
    }).catch(failure => {
      if (!current()) return;
      if (binding && failure instanceof ApiError && ['ACCOUNT_CHANGED', 'AUTH_REQUIRED'].includes(failure.code)) retry();
      else setError(failure instanceof Error ? failure.message : 'The community question is unavailable.');
    }).finally(() => { if (current()) setLoading(false); });
    return () => { alive = false; };
  }, [attempt, account, isCurrentAccount, retry]);
  async function vote() {
    const binding = account;
    if (!pulse || !choiceId || phase !== 'account' || !binding || !isCurrentAccount(binding)) return;
    setBusy(true); setError('');
    try {
      const next = await api<Pulse>('/api/pulse', { method: 'POST', headers: binding.headers, body: JSON.stringify({ pollId: pulse.id, choiceId }) });
      if (isCurrentAccount(binding)) { setPulse(next); setChoiceId(next.choiceId); }
    } catch (failure) {
      if (!isCurrentAccount(binding)) return;
      if (failure instanceof ApiError && ['ACCOUNT_CHANGED', 'AUTH_REQUIRED'].includes(failure.code)) retry();
      else setError(failure instanceof Error ? failure.message : 'Your answer was not saved. Please try again.');
    } finally { if (isCurrentAccount(binding)) setBusy(false); }
  }
  return <section className="pulse-card journey-card" id="daily-pulse" tabIndex={-1}><div className="journey-section-head"><div><span className="section-kicker"><Signal size={16} />Community pulse · optional</span><h2>{skipped ? 'Take it at your own pace.' : 'One question for today.'}</h2></div>{!skipped && <button className="text-link" onClick={() => setSkipped(true)}>Skip</button>}</div>{skipped ? <><p>No answer needed to keep learning.</p><button className="text-link" onClick={() => setSkipped(false)}>Show the question<ArrowRight size={16} /></button></> : loading ? <Loading>Loading today’s question…</Loading> : <>{error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setError(''); setAttempt(value => value + 1); }} />}{pulse && <><h3>{pulse.question}</h3><fieldset className="pulse-choices" disabled={busy || phase !== 'account'}><legend className="sr-only">Choose your community response</legend>{pulse.choices.map(choice => <label key={choice.id} className={choiceId === choice.id ? 'selected' : ''}><input type="radio" name="daily-pulse" checked={choiceId === choice.id} onChange={() => setChoiceId(choice.id)} /><span>{choice.label}</span>{pulse.choiceId === choice.id && <Check size={17} aria-label="Saved response" />}{pulse.counts && <strong>{pulse.counts[choice.id] ?? 0}</strong>}</label>)}</fieldset>{phase === 'account' ? <button className="button button-outline" onClick={() => void vote()} disabled={busy || !choiceId || pulse.choiceId === choiceId}>{busy ? 'Saving…' : pulse.choiceId ? 'Change my answer' : 'Share my answer'}<ArrowRight size={16} /></button> : <a className="button button-outline" href="/signin-with-chatgpt?return_to=/radar">Sign in to answer<ArrowRight size={16} /></a>}<p className="pulse-results">{pulse.counts ? `${pulse.total} responses · counts shown by option` : `${pulse.total} responses · option counts appear after ${pulse.minimumResponses} responses`}</p><p className="support-copy">Self-selected GroundTruth community opinion. This is not representative market sentiment. Closes {singaporeDate(pulse.closesAt, true)} SGT.</p></>}</>}</section>;
}
