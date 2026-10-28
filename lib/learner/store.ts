import { emptyLearnerState, parseLearnerState, validateLearnerState } from './model.ts';
import type { LearnerState } from './types.ts';

export const LEARNER_STORAGE_KEY = 'gt:learner:v1';
type Reader = Pick<Storage, 'getItem'>;
type Writer = Pick<Storage, 'setItem'>;
type Remover = Pick<Storage, 'removeItem'>;
function browserStorage(): Storage | undefined { try { return typeof window === 'undefined' ? undefined : window.localStorage; } catch { return undefined; } }

export function loadLearnerState(storage: Reader | undefined = browserStorage()) {
  try {
    if (!storage) return { state: emptyLearnerState(), persisted: false, corrupt: false };
    const raw = storage.getItem(LEARNER_STORAGE_KEY);
    if (raw === null) return { state: emptyLearnerState(), persisted: true, corrupt: false };
    const state = parseLearnerState(raw);
    let corrupt = false;
    try { validateLearnerState(JSON.parse(raw)); } catch { corrupt = true; }
    return { state, persisted: true, corrupt };
  } catch { return { state: emptyLearnerState(), persisted: false, corrupt: false }; }
}
export function saveLearnerState(state: LearnerState, storage: Writer | undefined = browserStorage()) {
  const clean = parseLearnerState(state);
  try { if (!storage) return { state: clean, persisted: false }; storage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(clean)); return { state: clean, persisted: true }; }
  catch { return { state: clean, persisted: false }; }
}
export function clearLearnerState(storage: Remover | undefined = browserStorage()) {
  const state = emptyLearnerState();
  try { if (!storage) return { state, persisted: false }; storage.removeItem(LEARNER_STORAGE_KEY); return { state, persisted: true }; }
  catch { return { state, persisted: false }; }
}
