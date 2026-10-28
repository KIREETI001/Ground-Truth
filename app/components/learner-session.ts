import type { LearnerRecord, LearnerState } from '../../lib/learner/types.ts';
import type { RadarResult } from '../../lib/discovery/types.ts';

export function initialIdentityDraft(authenticated: boolean, account: LearnerState | null, device: LearnerState): LearnerState {
  return authenticated ? account ?? { version: 1, profile: null, baseline: [], completed: [], project: null } : device;
}

// A completed request cannot replace work typed after the save button was pressed.
export function settleExplicitSave(current: LearnerState, submitted: LearnerState, saved: LearnerState) {
  return JSON.stringify(current) === JSON.stringify(submitted)
    ? { state: saved, dirty: false }
    : { state: current, dirty: true };
}

export function selectProjectPath(selected: string[], path: string, allowed: string[]) {
  if (!allowed.includes(path)) return selected;
  if (selected.includes(path)) return selected.filter(item => item !== path);
  return selected.length < 5 ? [...selected, path] : selected;
}

export function singaporeDate(value: string, includeTime = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', ...(includeTime ? { timeStyle: 'short' } : {}) }).format(date);
}

export type RadarDisplay = { result: RadarResult; staleSources: Record<string, string> };
export function retainSourceHeadlines(previous: RadarDisplay | null, next: RadarResult): RadarDisplay {
  const staleSources: Record<string, string> = {};
  const sources = next.sources.map(source => {
    const earlier = previous?.result.sources.find(item => item.id === source.id);
    if (source.error && earlier?.items.length) {
      staleSources[source.id] = previous!.staleSources[source.id] ?? previous!.result.fetchedAt;
      return { ...source, items: earlier.items };
    }
    return source;
  });
  return { result: { ...next, sources }, staleSources };
}

// Account operations remain bound to the native identity and its in-memory draft.
export type AccountBinding = { owner: string; generation: number; headers: { 'X-GroundTruth-Account': string } };
export type LearnerOperation = AccountBinding & { id: number; draftId: number; changeVersion: number; kind: 'read' | 'reload' | 'save' | 'delete' | 'export'; submitted: LearnerState; revision: string | null };
export type LearnerDraft = { id: number; state: LearnerState; revision: string | null; expiresAt: string | null; dirty: boolean; accountLoaded: boolean; changeVersion: number; pending: LearnerOperation | null; error: string };
export type LearnerSession = { owner: string | null; generation: number; serial: number; active: LearnerDraft; quarantined: Map<string, LearnerDraft> };
const emptyPath = (): LearnerState => ({ version: 1, profile: null, baseline: [], completed: [], project: null });
function blankDraft(id: number, state = emptyPath()): LearnerDraft { return { id, state, revision: null, expiresAt: null, dirty: false, accountLoaded: false, changeVersion: 0, pending: null, error: '' }; }
export function createLearnerSession(): LearnerSession { return { owner: null, generation: 0, serial: 0, active: blankDraft(0), quarantined: new Map() }; }
export function activateLearnerIdentity(session: LearnerSession, owner: string | null, device: LearnerState) {
  const quarantined = new Map(session.quarantined);
  if (session.owner !== null) quarantined.set(session.owner, session.active);
  const restored = owner !== null ? quarantined.get(owner) : undefined;
  if (owner !== null) quarantined.delete(owner);
  const serial = session.serial + 1;
  const active = restored ?? blankDraft(serial, initialIdentityDraft(owner !== null, null, device));
  return { session: { owner, generation: session.generation + 1, serial, active, quarantined }, restored: !!restored, needsRead: owner !== null && !active.dirty && !active.pending };
}

export function editLearnerDraft(session: LearnerSession, state: LearnerState): LearnerSession {
  return { ...session, active: { ...session.active, state, dirty: session.owner !== null, changeVersion: session.active.changeVersion + 1, error: '' } };
}

export function currentAccountBinding(session: LearnerSession): AccountBinding | null {
  return session.owner !== null ? { owner: session.owner, generation: session.generation, headers: { 'X-GroundTruth-Account': session.owner } } : null;
}
export function accountBindingIsCurrent(session: LearnerSession, binding: AccountBinding) {
  return session.owner === binding.owner && session.generation === binding.generation;
}
export function beginLearnerOperation(session: LearnerSession, kind: LearnerOperation['kind']): { session: LearnerSession; operation: LearnerOperation | null } {
  const binding = currentAccountBinding(session);
  if (!binding || session.active.pending) return { session, operation: null };
  const operation: LearnerOperation = { ...binding, id: session.serial + 1, draftId: session.active.id, changeVersion: session.active.changeVersion, kind, submitted: session.active.state, revision: session.active.revision };
  return { session: { ...session, serial: operation.id, active: { ...session.active, pending: operation, error: '' } }, operation };
}

// The pending token belongs to one preserved draft. Identity changes never retarget it.
function operationDraft(session: LearnerSession, operation: LearnerOperation) {
  const draft = session.owner === operation.owner ? session.active : session.quarantined.get(operation.owner);
  return draft && draft.id === operation.draftId && draft.pending?.id === operation.id && draft.pending.generation === operation.generation ? draft : null;
}
function replaceOperationDraft(session: LearnerSession, owner: string, draft: LearnerDraft): LearnerSession {
  if (session.owner === owner) return { ...session, active: draft };
  const quarantined = new Map(session.quarantined); quarantined.set(owner, draft);
  return { ...session, quarantined };
}
export function finishLearnerOperation(session: LearnerSession, operation: LearnerOperation, record?: LearnerRecord): LearnerSession {
  const draft = operationDraft(session, operation);
  if (!draft) return session;
  if (operation.kind === 'delete') {
    const quarantined = new Map(session.quarantined); quarantined.delete(operation.owner);
    const serial = session.serial + 1;
    return { ...session, serial, quarantined, active: session.owner === operation.owner ? { ...blankDraft(serial), accountLoaded: true } : session.active };
  }
  let next: LearnerDraft = { ...draft, pending: null, error: '' };
  if (operation.kind === 'save' && record) {
    const settled = settleExplicitSave(draft.state, operation.submitted, record.state ?? emptyPath());
    next = { ...next, ...settled, revision: record.revision, expiresAt: record.expiresAt, accountLoaded: true };
  } else if ((operation.kind === 'read' || operation.kind === 'reload') && record) {
    if (draft.changeVersion === operation.changeVersion && (operation.kind === 'reload' || !draft.dirty)) {
      next = { ...next, state: record.state ?? emptyPath(), revision: record.revision, expiresAt: record.expiresAt, dirty: false, accountLoaded: true, changeVersion: draft.changeVersion + 1 };
    } else {
      next.error = 'Your draft changed while account data was loading. It has been kept. Export it before choosing Load saved account path.';
    }
  }
  return replaceOperationDraft(session, operation.owner, next);
}
export function failLearnerOperation(session: LearnerSession, operation: LearnerOperation, error: string): LearnerSession {
  const draft = operationDraft(session, operation);
  return draft ? replaceOperationDraft(session, operation.owner, { ...draft, pending: null, error }) : session;
}
export function hasUnsavedLearnerDrafts(session: LearnerSession) {
  return (session.owner !== null && session.active.dirty) || [...session.quarantined.values()].some(draft => draft.dirty);
}
