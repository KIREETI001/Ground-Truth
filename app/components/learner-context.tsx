'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Me } from '@/lib/contracts';
import { api, ApiError } from '@/lib/client/api';
import type { LearnerRecord, LearnerState } from '@/lib/learner/types';
import { emptyLearnerState, parseLearnerState } from '@/lib/learner/model';
import { clearLearnerState, LEARNER_STORAGE_KEY, loadLearnerState, saveLearnerState } from '@/lib/learner/store';
import { awardCheckpoint, loadProgress, persistProgress, progressStorageKey, resetProgress } from '@/lib/learning/progress';
import {
  accountBindingIsCurrent, activateLearnerIdentity, beginLearnerOperation, createLearnerSession,
  editLearnerDraft, failLearnerOperation, finishLearnerOperation, hasUnsavedLearnerDrafts,
  type AccountBinding, type LearnerOperation, type LearnerSession,
} from './learner-session';

type LearnerContextValue = {
  phase: 'loading' | 'guest' | 'account' | 'error'; state: LearnerState; me: Me | null;
  persisted: boolean; corrupt: boolean; dirty: boolean; busy: boolean; error: string;
  expiresAt: string | null; accountLoaded: boolean; account: AccountBinding | null;
  isCurrentAccount: (binding: AccountBinding) => boolean;
  update: (change: (state: LearnerState) => LearnerState) => void;
  complete: (id: string) => number; resetPractice: () => void;
  save: () => Promise<boolean>; reloadAccount: () => Promise<void>; deleteAccount: () => Promise<boolean>; deleteActivity: () => Promise<boolean>;
  exportAccount: () => Promise<unknown | null>;
  importDevice: () => void; resetDevice: () => void; retry: () => void; clearError: () => void;
};
const LearnerContext = createContext<LearnerContextValue | null>(null);

function deviceState() {
  try {
    const local = loadLearnerState(window.localStorage);
    const practice = loadProgress(window.localStorage);
    return { state: parseLearnerState({ ...local.state, completed: [...new Set([...local.state.completed, ...practice.progress.completed])] }), persisted: local.persisted && practice.persisted, corrupt: local.corrupt };
  } catch { return { state: emptyLearnerState(), persisted: false, corrupt: false }; }
}
function operationMessage(failure: unknown) {
  if (failure instanceof ApiError && failure.code === 'LEARNER_REVISION_CONFLICT') return 'Your account path changed in another tab or its save expired. Your draft is still here. Export it before loading the saved account path, then make your changes again.';
  if (failure instanceof ApiError && ['ACCOUNT_CHANGED', 'AUTH_REQUIRED', 'unauthorized'].includes(failure.code)) return 'The sign-in changed. Your draft has been kept in this tab for its original account.';
  return failure instanceof Error ? failure.message : 'The request failed. Your draft is still here.';
}
function cleanRecord(record: LearnerRecord): LearnerRecord { return { ...record, state: record.state === null ? null : parseLearnerState(record.state) }; }

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LearnerSession>(createLearnerSession);
  const sessionRef = useRef(session);
  const mounted = useRef(true);
  const [identityStatus, setIdentityStatus] = useState<'checking' | 'known' | 'error'>('checking');
  const [me, setMe] = useState<Me | null>(null);
  const [persisted, setPersisted] = useState(true);
  const [corrupt, setCorrupt] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const publish = useCallback((next: LearnerSession) => { sessionRef.current = next; setSession(next); }, []);
  const isCurrentAccount = useCallback((binding: AccountBinding) => accountBindingIsCurrent(sessionRef.current, binding), []);
  const resyncIdentity = useCallback(() => {
    // Preserve the previous owner's draft before hiding it; no account draft enters browser storage.
    publish(activateLearnerIdentity(sessionRef.current, null, emptyLearnerState()).session);
    setIdentityStatus('checking'); setMe(null); setConnectionError(''); setAttempt(value => value + 1);
  }, [publish]);
  const requestFailed = useCallback((operation: LearnerOperation, failure: unknown) => {
    if (!mounted.current) return;
    const active = accountBindingIsCurrent(sessionRef.current, operation);
    publish(failLearnerOperation(sessionRef.current, operation, operationMessage(failure)));
    if (active && failure instanceof ApiError && ['ACCOUNT_CHANGED', 'AUTH_REQUIRED', 'unauthorized'].includes(failure.code)) resyncIdentity();
  }, [publish, resyncIdentity]);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let alive = true;
    const generation = sessionRef.current.generation;
    void (async () => {
      try {
        const profile = await api<Me>('/api/me');
        if (!alive || sessionRef.current.generation !== generation) return;
        if (profile.authenticated && !profile.userId) throw new Error('Your native sign-in could not be confirmed. Try opening your path again.');
        const owner = profile.authenticated ? profile.userId : null;
        const local = owner === null ? deviceState() : null;
        const opened = activateLearnerIdentity(sessionRef.current, owner, local?.state ?? emptyLearnerState());
        publish(opened.session); setMe(profile); setIdentityStatus('known');
        if (local) { setPersisted(local.persisted); setCorrupt(local.corrupt); }
        // Refresh clean snapshots and failed initial reads. A preserved draft or pending operation stays intact.
        if (!opened.needsRead) return;
        const started = beginLearnerOperation(sessionRef.current, 'read');
        if (!started.operation) return;
        const operation = started.operation;
        publish(started.session);
        try {
          const record = await api<LearnerRecord>('/api/learner', { headers: operation.headers });
          if (mounted.current) publish(finishLearnerOperation(sessionRef.current, operation, cleanRecord(record)));
        } catch (failure) { requestFailed(operation, failure); }
      } catch (failure) {
        if (!alive || sessionRef.current.generation !== generation) return;
        setConnectionError(failure instanceof Error ? failure.message : 'Your sign-in status could not be checked.'); setIdentityStatus('error');
      }
    })();
    return () => { alive = false; };
  }, [attempt, publish, requestFailed]);

  const phase: LearnerContextValue['phase'] = identityStatus === 'checking' || (identityStatus === 'known' && session.active.pending?.kind === 'read') ? 'loading'
    : identityStatus === 'error' ? 'error' : session.owner === null ? 'guest' : 'account';
  const account = useMemo<AccountBinding | null>(() => phase === 'account' && session.owner !== null ? { owner: session.owner, generation: session.generation, headers: { 'X-GroundTruth-Account': session.owner } } : null, [phase, session.owner, session.generation]);
  const unsaved = hasUnsavedLearnerDrafts(session);
  const quarantinedUnsaved = [...session.quarantined.values()].some(draft => draft.dirty);

  useEffect(() => {
    if (phase !== 'guest') return;
    const generation = session.generation;
    function sync(event: StorageEvent) {
      if (![LEARNER_STORAGE_KEY, progressStorageKey, null].includes(event.key) || sessionRef.current.owner !== null || sessionRef.current.generation !== generation) return;
      const local = deviceState(); publish(editLearnerDraft(sessionRef.current, local.state)); setPersisted(local.persisted); setCorrupt(local.corrupt);
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [phase, session.generation, publish]);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);
  useEffect(() => {
    if (identityStatus !== 'known') return;
    let alive = true;
    let checking = false;
    const checkIdentity = async () => {
      if (checking || document.visibilityState !== 'visible') return;
      checking = true;
      const generation = sessionRef.current.generation;
      try {
        const fresh = await api<Me>('/api/me');
        const owner = fresh.authenticated ? fresh.userId : null;
        if (alive && sessionRef.current.generation === generation && owner !== sessionRef.current.owner) resyncIdentity();
      } catch { /* A failed check does not reassign a draft. Account endpoints enforce the captured native owner. */ }
      finally { checking = false; }
    };
    window.addEventListener('focus', checkIdentity); document.addEventListener('visibilitychange', checkIdentity);
    return () => { alive = false; window.removeEventListener('focus', checkIdentity); document.removeEventListener('visibilitychange', checkIdentity); };
  }, [identityStatus, resyncIdentity]);

  function viewIsCurrent() { return identityStatus === 'known' && sessionRef.current.owner === session.owner && sessionRef.current.generation === session.generation; }
  function update(change: (value: LearnerState) => LearnerState) {
    if ((phase !== 'guest' && phase !== 'account') || !viewIsCurrent()) return;
    const next = parseLearnerState(change(sessionRef.current.active.state));
    publish(editLearnerDraft(sessionRef.current, next));
    if (phase === 'guest') {
      try {
        const saved = saveLearnerState(next, window.localStorage);
        const practice = persistProgress({ completed: next.completed }, window.localStorage);
        setPersisted(saved.persisted && practice.persisted); setCorrupt(false);
      } catch { setPersisted(false); }
    }
  }
  function complete(id: string) {
    if (!viewIsCurrent()) return 0;
    const result = awardCheckpoint({ completed: sessionRef.current.active.state.completed }, id);
    update(value => ({ ...value, completed: result.progress.completed })); return result.awarded;
  }
  function start(kind: LearnerOperation['kind']) {
    if (phase !== 'account' || !viewIsCurrent()) return null;
    const started = beginLearnerOperation(sessionRef.current, kind);
    if (started.operation) publish(started.session);
    return started.operation;
  }
  async function save() {
    if (!session.active.accountLoaded) return false;
    const operation = start('save');
    if (!operation) return false;
    try {
      const record = await api<LearnerRecord>('/api/learner', { method: 'POST', headers: operation.headers, body: JSON.stringify({ state: operation.submitted, revision: operation.revision, noticeVersion: 'learner.v1' }) });
      if (!mounted.current) return false;
      publish(finishLearnerOperation(sessionRef.current, operation, cleanRecord(record)));
      return accountBindingIsCurrent(sessionRef.current, operation);
    } catch (failure) { requestFailed(operation, failure); return false; }
  }
  async function reloadAccount() {
    const operation = start('reload');
    if (!operation) return;
    try {
      const record = await api<LearnerRecord>('/api/learner', { headers: operation.headers });
      if (mounted.current) publish(finishLearnerOperation(sessionRef.current, operation, cleanRecord(record)));
    } catch (failure) { requestFailed(operation, failure); }
  }
  async function deleteAccount(allActivity = false) {
    const operation = start('delete');
    if (!operation) return false;
    try {
      await api(allActivity ? '/api/activity' : '/api/learner', { method: 'DELETE', headers: operation.headers });
      if (!mounted.current) return false;
      publish(finishLearnerOperation(sessionRef.current, operation));
      return accountBindingIsCurrent(sessionRef.current, operation);
    } catch (failure) { requestFailed(operation, failure); return false; }
  }
  async function exportAccount() {
    const operation = start('export');
    if (!operation) return null;
    try {
      const result = await api<unknown>('/api/learner/export', { headers: operation.headers });
      if (!mounted.current) return null;
      const current = accountBindingIsCurrent(sessionRef.current, operation);
      publish(finishLearnerOperation(sessionRef.current, operation));
      return current ? result : null;
    } catch (failure) { requestFailed(operation, failure); return null; }
  }
  function resetDevice() {
    try {
      const learner = clearLearnerState(window.localStorage); const practice = resetProgress(window.localStorage);
      setPersisted(learner.persisted && practice.persisted);
    } catch { setPersisted(false); }
    if (phase === 'guest' && viewIsCurrent()) { publish(editLearnerDraft(sessionRef.current, emptyLearnerState())); setCorrupt(false); }
  }
  const value: LearnerContextValue = {
    phase, state: session.active.state, me, persisted, corrupt, dirty: session.active.dirty,
    busy: !!session.active.pending, error: session.active.error || connectionError,
    expiresAt: session.active.expiresAt, accountLoaded: session.active.accountLoaded, account, isCurrentAccount,
    update, complete, resetPractice: () => update(value => ({ ...value, completed: [] })), save, reloadAccount, deleteAccount, deleteActivity: () => deleteAccount(true), exportAccount,
    importDevice: () => update(() => deviceState().state), resetDevice, retry: resyncIdentity,
    clearError: () => { publish({ ...sessionRef.current, active: { ...sessionRef.current.active, error: '' } }); setConnectionError(''); },
  };
  return <LearnerContext.Provider value={value}>{quarantinedUnsaved && <div className="notice notice-neutral" role="status" style={{ maxWidth: 1248, margin: '16px auto', padding: '14px 20px' }}>An unsaved path is kept in this tab for a previous sign-in. Return to the original account to recover it before closing this tab.</div>}{children}</LearnerContext.Provider>;
}

export function useLearner() {
  const value = useContext(LearnerContext);
  if (!value) throw new Error('LearnerProvider is required.');
  return value;
}
export function downloadLearnerDraft(state: LearnerState) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'groundtruth-path.json'; link.click(); URL.revokeObjectURL(url);
}
