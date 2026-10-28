'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CircleHelp, HardDrive, LockKeyhole } from 'lucide-react';
import { useLearner } from './learner-context';
import { ErrorNotice, Loading } from './lab-ui';

export function LearnerGate({ children }: { children: ReactNode }) {
  const learner = useLearner();
  if (learner.phase === 'loading') return <div className="journey-gate"><Loading>Opening your path…</Loading></div>;
  if (learner.phase === 'error') return <div className="journey-gate"><h1>Your path is waiting.</h1><p>We need to check sign-in before opening the right profile.</p><ErrorNotice message={learner.error} onRetry={learner.retry} /></div>;
  return <>{children}</>;
}
export function LearnerStatus() {
  const { phase, persisted, corrupt, dirty, error } = useLearner();
  return <div className="learner-status">{!persisted && phase === 'guest' && <div className="notice notice-neutral" role="status"><CircleHelp size={19} /><p>Browser storage is unavailable. Your path works in this tab; changes may be lost on refresh.</p></div>}{corrupt && phase === 'guest' && <div className="notice notice-neutral" role="status"><CircleHelp size={19} /><p>Some saved device data could not be read. Valid practice was kept; you can edit or reset the path in Profile.</p></div>}{error && <ErrorNotice message={error} />}{phase === 'account' && dirty && <div className="journey-draft-note" role="status"><LockKeyhole size={16} /><span>Unsaved account changes · kept in this tab.</span><Link href="/profile">Review & save <ArrowRight size={15} /></Link></div>}</div>;
}
export function StorageLabel() {
  const { phase, persisted, dirty } = useLearner();
  return <span className="storage-label">{phase === 'guest' ? <><HardDrive size={14} />{persisted ? 'Saved on this device' : 'This tab only'}</> : <><Check size={14} />{dirty ? 'Account draft · unsaved' : 'Account path'}</>}</span>;
}
