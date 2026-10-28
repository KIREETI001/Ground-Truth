import { checkpointIds, missions } from './catalog.ts';

export type PracticeProgress = { completed: string[] };
export const progressStorageKey = 'gt:practice:v1';
export function missionStatus(progress: PracticeProgress, missionId: string) {
  const mission = missions.find(item => item.id === missionId);
  if (!mission) return { count: 0, complete: false, nextIndex: 0 as number | null };
  const count = mission.checkpoints.filter(item => progress.completed.includes(item.id)).length;
  const next = mission.checkpoints.findIndex(item => !progress.completed.includes(item.id));
  return { count, complete: count === mission.checkpoints.length, nextIndex: next < 0 ? null : next };
}

function validated(ids: unknown[]): PracticeProgress {
  return { completed: [...new Set(ids.filter((id): id is string => typeof id === 'string' && checkpointIds.has(id)))] };
}

export function parseProgress(raw: string | null): PracticeProgress {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('completed' in value) || !Array.isArray(value.completed)) return { completed: [] };
    return validated(value.completed);
  } catch { return { completed: [] }; }
}

export function awardCheckpoint(progress: PracticeProgress, id: string) {
  const clean = validated(progress.completed);
  const awarded = checkpointIds.has(id) && !clean.completed.includes(id) ? 10 : 0;
  const next = awarded ? { completed: [...clean.completed, id] } : clean;
  return { progress: next, awarded, points: next.completed.length * 10 };
}

export function loadProgress(storage: Pick<Storage, 'getItem'>) {
  try { return { progress: parseProgress(storage.getItem(progressStorageKey)), persisted: true }; }
  catch { return { progress: { completed: [] } as PracticeProgress, persisted: false }; }
}

export function persistProgress(progress: PracticeProgress, storage: Pick<Storage, 'setItem'>) {
  const clean = validated(progress.completed);
  try { storage.setItem(progressStorageKey, JSON.stringify({ version: 1, completed: clean.completed })); return { progress: clean, persisted: true }; }
  catch { return { progress: clean, persisted: false }; }
}

export function resetProgress(storage: Pick<Storage, 'removeItem'>) {
  try { storage.removeItem(progressStorageKey); return { progress: { completed: [] } as PracticeProgress, persisted: true }; }
  catch { return { progress: { completed: [] } as PracticeProgress, persisted: false }; }
}
