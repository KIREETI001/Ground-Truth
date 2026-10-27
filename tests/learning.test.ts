import test from 'node:test';
import assert from 'node:assert/strict';
import { awardCheckpoint, loadProgress, missionStatus, parseProgress, persistProgress, resetProgress } from '../lib/learning/progress.ts';
import { workspaceGuide, workspaceTour, type GuideState } from '../lib/learning/guide.ts';

// These exercise the helpers consumed by the lesson and workspace UIs.
test('a checkpoint awards ten local points once, including after reload', () => {
  const first = awardCheckpoint({ completed: [] }, 'queue-choose');
  assert.equal(first.awarded, 10);
  assert.equal(first.points, 10);
  const reloaded = parseProgress(JSON.stringify({ version: 1, completed: first.progress.completed }));
  const repeated = awardCheckpoint(reloaded, 'queue-choose');
  assert.equal(repeated.awarded, 0);
  assert.equal(repeated.points, 10);
  assert.deepEqual(repeated.progress.completed, ['queue-choose']);
});

test('unknown checkpoint IDs cannot earn points', () => {
  const result = awardCheckpoint({ completed: ['queue-choose'] }, 'made-up-checkpoint');
  assert.equal(result.awarded, 0);
  assert.equal(result.points, 10);
  assert.deepEqual(result.progress.completed, ['queue-choose']);
});

test('all nine checkpoints stop at ninety points even when replayed', () => {
  let progress = { completed: [] as string[] };
  const ids = ['queue-choose', 'queue-trace', 'queue-boundary', 'receipt-choose', 'receipt-trace', 'receipt-boundary', 'marker-choose', 'marker-trace', 'marker-boundary'];
  for (const id of [...ids, ...ids]) progress = awardCheckpoint(progress, id).progress;
  assert.equal(awardCheckpoint(progress, 'marker-boundary').points, 90);
  assert.equal(progress.completed.length, 9);
});

test('stored progress discards unknown, duplicated, and malformed IDs', () => {
  assert.deepEqual(parseProgress('{"version":1,"completed":["queue-choose","intruder",null,4,"queue-choose","receipt-trace"]}'), { completed: ['queue-choose', 'receipt-trace'] });
});

test('corrupt, unexpected-version, and malformed stored values start empty', () => {
  for (const raw of [null, '{', 'null', '[]', 'true', '{"version":2,"completed":["queue-choose"]}', '{"version":1,"completed":"queue-choose"}']) {
    assert.deepEqual(parseProgress(raw), { completed: [] });
  }
});

test('blocked storage reads preserve a usable empty practice state', () => {
  const result = loadProgress({ getItem() { throw new Error('blocked'); } });
  assert.deepEqual(result.progress, { completed: [] });
  assert.equal(result.persisted, false);
});

test('failed persistence keeps earned progress in memory and reports the limitation', () => {
  const progress = { completed: ['queue-choose'] };
  const result = persistProgress(progress, { setItem() { throw new Error('quota exceeded'); } });
  assert.deepEqual(result.progress, progress);
  assert.equal(result.persisted, false);
  assert.equal(awardCheckpoint(result.progress, 'queue-choose').awarded, 0);
});

test('successful persistence can be loaded by a new practice view', () => {
  const values = new Map<string, string>();
  const storage = { setItem(key: string, value: string) { values.set(key, value); }, getItem(key: string) { return values.get(key) ?? null; } };
  assert.equal(persistProgress({ completed: ['receipt-trace'] }, storage).persisted, true);
  assert.deepEqual(loadProgress(storage).progress, { completed: ['receipt-trace'] });
});

test('reset clears durable local progress without touching other browser data', () => {
  const values = new Map<string, string>([['gt:practice:v1', '{"version":1,"completed":["queue-choose"]}'], ['unrelated', 'keep']]);
  const storage = { setItem(key: string, value: string) { values.set(key, value); }, getItem(key: string) { return values.get(key) ?? null; }, removeItem(key: string) { values.delete(key); } };
  assert.deepEqual(resetProgress(storage), { progress: { completed: [] }, persisted: true });
  assert.equal(values.size, 1);
  assert.deepEqual(loadProgress(storage).progress, { completed: [] });
  assert.equal(values.get('unrelated'), 'keep');
});

test('reset remains usable when storage is blocked', () => {
  assert.deepEqual(resetProgress({ removeItem() { throw new Error('blocked'); } }), { progress: { completed: [] }, persisted: false });
});

const explained: GuideState = { phase: 'repair', selectedCaseId: 'required', requiredCaseId: 'required', hasPrediction: true, hasRun: true, hasEvidence: true, hasExplanation: true };

test('answering only a final checkpoint cannot mark the whole mission practiced', () => {
  assert.deepEqual(missionStatus({ completed: ['queue-boundary'] }, 'scan-the-queue'), { count: 1, complete: false, nextIndex: 0 });
  assert.deepEqual(missionStatus({ completed: ['queue-choose', 'queue-boundary'] }, 'scan-the-queue'), { count: 2, complete: false, nextIndex: 1 });
});

test('a completed mission can replay without requiring a new unfinished checkpoint', () => {
  assert.deepEqual(missionStatus({ completed: ['queue-choose', 'queue-trace', 'queue-boundary'] }, 'scan-the-queue'), { count: 3, complete: true, nextIndex: null });
});

test('any unfinished run takes priority over phase advance', () => {
  const guide = workspaceGuide({ ...explained, unfinishedCaseId: 'optional' });
  assert.equal(guide.action, 'resume-other');
  assert.equal(guide.caseId, 'optional');
  assert.equal(workspaceGuide({ ...explained, unfinishedCaseId: 'required', hasEvidence: false }).action, 'resume');
});

test('an explained optional case returns to the required case before continuing', () => {
  const guide = workspaceGuide({ ...explained, selectedCaseId: 'optional' });
  assert.equal(guide.action, 'return-required');
  assert.equal(guide.caseId, 'required');
});

test('the next control follows prediction, run, explanation, and reviewed transition state', () => {
  assert.equal(workspaceGuide({ ...explained, hasPrediction: false, hasRun: false, hasEvidence: false, hasExplanation: false }).action, 'predict');
  assert.equal(workspaceGuide({ ...explained, hasRun: false, hasEvidence: false, hasExplanation: false }).action, 'run');
  assert.equal(workspaceGuide({ ...explained, hasExplanation: false }).action, 'explain');
  assert.equal(workspaceGuide({ ...explained, phase: 'baseline' }).action, 'patch');
  assert.equal(workspaceGuide(explained).action, 'advance');
  assert.equal(workspaceGuide({ ...explained, phase: 'complete' }).action, 'review');
});

test('prediction advice targets the prediction form rather than the source-first grid', () => {
  const guide = workspaceGuide({ ...explained, hasPrediction: false, hasRun: false, hasEvidence: false, hasExplanation: false });
  assert.equal(guide.targetId, 'workspace-prediction');
});

test('run and saved-run resume advice targets the actual execution control', () => {
  assert.equal(workspaceGuide({ ...explained, hasEvidence: false, hasExplanation: false }).targetId, 'workspace-run-control');
  assert.equal(workspaceGuide({ ...explained, unfinishedCaseId: 'required', hasEvidence: false, hasExplanation: false }).targetId, 'workspace-run-control');
});

for (const phase of ['transfer', 'transfer_repair'] as const) test(`${phase} guide and replayable tour expose procedural controls only`, () => {
  const state = { ...explained, phase, hasExplanation: false };
  const guide = workspaceGuide(state);
  const steps = workspaceTour(phase);
  assert.equal(guide.kind, 'procedural');
  assert.ok(steps.length >= 3);
  assert.ok(steps.every(step => step.kind === 'procedural'));
  assert.ok(steps.every(step => step.targetId.length > 0));
  assert.equal(steps.some(step => step.targetId === 'workspace-coach' || step.targetId === 'workspace-glossary'), false);
});
