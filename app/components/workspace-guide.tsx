'use client';

import { useState } from 'react';
import { ArrowRight, CheckCheck, Compass, Sparkles, X } from 'lucide-react';
import { workspaceGuide, workspaceTour, type GuideState } from '@/lib/learning/guide';
import { AreaTour, focusArea } from './area-tour';

export function WorkspaceGuidance({ state, onSelectCase, onHistory }: { state: GuideState; onSelectCase: (id: string) => void; onHistory: () => void }) {
  const [visible, setVisible] = useState(true);
  const guide = workspaceGuide(state);
  const independent = state.phase === 'transfer' || state.phase === 'transfer_repair';
  function follow() {
    if (guide.caseId) onSelectCase(guide.caseId);
    else if (guide.action === 'review') onHistory();
    else focusArea(guide.targetId);
  }
  return <div className="workspace-guidance"><div id="workspace-next" tabIndex={-1}>{visible ? <section className="workspace-next" aria-label="Your next action"><span className="next-symbol"><Sparkles size={21} /></span><div><h2>{guide.title}</h2><p>{guide.detail}</p></div><button className="button button-primary" onClick={follow}>{guide.label}<ArrowRight size={16} /></button><button className="icon-button" aria-label="Dismiss next-action guide" onClick={() => setVisible(false)}><X size={17} /></button></section> : <button className="text-link" onClick={() => setVisible(true)}><Compass size={17} />Show my next action</button>}</div><div className="workspace-help"><span>{independent ? 'Independent phase · guide explains controls only' : 'Guidance is optional. Your own reasoning leads.'}</span><AreaTour steps={workspaceTour(state.phase)} label="Quick guide" floating /></div>{state.selectedCaseId && <div className="workspace-milestones" aria-label="Saved milestones for this case">{[[state.hasPrediction, 'Prediction locked'], [state.hasEvidence, 'Run evidence saved'], [state.hasExplanation, 'Explanation saved']].map(([done, label]) => <span key={String(label)} className={done ? 'done' : ''}>{done ? <CheckCheck size={14} /> : <span className="status-dot" />}{label}</span>)}</div>}</div>;
}
