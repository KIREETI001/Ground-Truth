'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Braces, Check, ChevronRight, Database, FlaskConical, GitBranch, Layers3, ShieldCheck, Workflow } from 'lucide-react';
import { skillEvidence } from '@/lib/learner/model';
import { missions } from '@/lib/learning/catalog';
import type { SkillEvidence } from '@/lib/learner/types';
import { useLearner } from './learner-context';
import { Modal } from './lab-ui';
const icons = { 'code-reading': Braces, collections: Layers3, async: Workflow, sql: Database, testing: FlaskConical, access: ShieldCheck };
export function LearnerEvidence() {
  const { state } = useLearner();
  const [selected, setSelected] = useState<SkillEvidence | null>(null);
  const evidence = skillEvidence(state);
  return <section className="evidence-map journey-card" id="skill-map" tabIndex={-1}><div className="journey-section-head"><div><span className="section-kicker">Your understanding, in progress</span><h2>Follow the evidence.</h2></div><span className="support-copy">Tap a skill to inspect it</span></div><div className="skill-nodes">{evidence.map(item => { const Icon = icons[item.id]; return <button key={item.id} className={`skill-node status-${item.status}`} onClick={() => setSelected(item)} aria-label={`${item.title}: ${item.label}. Inspect evidence`}><span className="skill-node-icon"><Icon size={22} />{item.status === 'guided' && <i><Check size={11} /></i>}</span><strong>{item.title}</strong><span>{item.status === 'guided' ? 'Guided practice' : item.status === 'baseline' ? 'Starting check' : item.status === 'found-in-project' ? 'Source signal' : 'Ready to explore'}</span><ChevronRight size={15} /></button>; })}</div><p className="map-boundary">Guided practice and source signals are starting evidence. Independent understanding has not been assessed.</p>{selected && <Modal title={selected.title} onClose={() => setSelected(null)}><div className="evidence-detail"><span className="evidence-label"><GitBranch size={16} />{selected.label}</span><p>{selected.description}</p>{selected.evidence.length ? <ul>{selected.evidence.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="empty-evidence">No starting answer, guided checkpoint, or selected project signal is recorded yet.</p>}<Link className="button button-primary" href={`/learn#${selected.missionId}`}>Try {missions.find(mission => mission.id === selected.missionId)?.title ?? 'a mission'}<ArrowRight size={17} /></Link></div></Modal>}</section>;
}
