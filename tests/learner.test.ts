import test from 'node:test';
import assert from 'node:assert/strict';
import type { LearnerState, ProjectSnapshot } from '../lib/learner/types.ts';
import { missions } from '../lib/learning/catalog.ts';
import * as model from '../lib/learner/model.ts';
import * as store from '../lib/learner/store.ts';
const project: ProjectSnapshot = {
  repository: 'student/app', url: 'https://github.com/student/app', commit: 'a'.repeat(40), analysedAt: '2026-10-28T00:00:00.000Z',
  files: [{ path: 'src/app.ts', language: 'typescript', excerpt: 'const result = await load();' }],
  signals: [{ skillId: 'async', path: 'src/app.ts', note: 'An await expression appears in the selected text.' }],
  suggestedMissionId: 'async-in-order', warnings: [],
};

test('testing evidence records the denial-test checkpoint rather than unrelated pointer practice', () => {
  const state = model.emptyLearnerState();
  state.completed = ['owner-choose', 'owner-trace', 'marker-trace'];
  assert.equal(model.skillEvidence(state).find(skill => skill.id === 'testing')?.status, 'not-started');
  state.completed.push('owner-boundary');
  const evidence = model.skillEvidence(state).find(skill => skill.id === 'testing')!;
  assert.equal(evidence.status, 'guided');
  assert.equal(evidence.missionId, 'check-the-owner');
  assert.equal(evidence.evidence.length, 1);
  assert.match(evidence.evidence[0], /Test the boundary/);
});

test('baseline accepts uncertainty and only its own authored choices', () => {
  assert.equal(model.baselineQuestions.length, 3);
  assert.deepEqual(new Set(model.baselineQuestions.map(question => question.skillId)), new Set(['code-reading', 'async', 'sql']));
  const state = model.emptyLearnerState();
  state.baseline = model.baselineQuestions.map(question => ({ questionId: question.id, choiceId: 'unsure' }));
  assert.deepEqual(model.validateLearnerState(state).baseline, state.baseline);
  assert.throws(() => model.validateLearnerState({ ...state, baseline: [{ questionId: state.baseline[0].questionId, choiceId: 'invented' }] }));
  assert.throws(() => model.validateLearnerState({ ...state, baseline: [state.baseline[0], state.baseline[0]] }));
});

test('browser parsing recovers bounded known state while discarding derived fields and corrupt values', () => {
  assert.deepEqual(model.parseLearnerState('{broken'), { version: 1, profile: null, baseline: [], completed: [], project: null });
  assert.deepEqual(model.parseLearnerState({ version: 7, completed: ['queue-trace'] }), model.emptyLearnerState());
  const parsed = model.parseLearnerState(JSON.stringify({ version: 1, profile: null, baseline: [], completed: ['queue-trace', 'forged', 'queue-trace'], project: null, mastery: 100, points: 999 }));
  assert.deepEqual(parsed.completed, ['queue-trace']); assert.equal('mastery' in parsed, false); assert.equal('points' in parsed, false);
  assert.throws(() => model.validateLearnerState({ ...model.emptyLearnerState(), completed: ['forged'] }));
  assert.throws(() => model.validateLearnerState({ ...model.emptyLearnerState(), points: 999 }));
});

test('strict state validation bounds every selected project field and total encoded state', () => {
  const state = { ...model.emptyLearnerState(), project };
  assert.deepEqual(model.validateLearnerState(state).project, project);
  for (const patch of [
    { files: Array.from({ length: 6 }, (_, i) => ({ path: `src/${i}.ts`, language: 'typescript', excerpt: 'x' })) },
    { files: [{ ...project.files[0], excerpt: 'x'.repeat(1501) }] },
    { signals: Array.from({ length: 21 }, () => project.signals[0]) },
    { signals: [{ ...project.signals[0], note: 'x'.repeat(201) }] },
    { files: [{ ...project.files[0], path: '../.env' }] },
    { url: 'https://evil.test/student/app' },
    { commit: 'main' },
    { files: [{ ...project.files[0], understanding: 'mastered' }] },
    { signals: [{ ...project.signals[0], skillId: 'mastery' }] },
  ]) assert.throws(() => model.validateLearnerState({ ...state, project: { ...project, ...patch } }));
  const huge = { ...project, files: Array.from({ length: 5 }, (_, i) => ({ path: `src/${i}.ts`, language: 'typescript', excerpt: '😀'.repeat(750) })), signals: [], warnings: Array.from({ length: 10 }, () => '😀'.repeat(100)) };
  // Byte size is checked independently of per-field character limits.
  huge.files = huge.files.map(file => ({ ...file, excerpt: '漢'.repeat(1500) }));
  assert.throws(() => model.validateLearnerState({ ...state, project: huge }));
});

test('baseline and project presence never become mastery or independent understanding', () => {
  const state = model.emptyLearnerState();
  state.baseline = model.baselineQuestions.map(question => ({ questionId: question.id, choiceId: question.choices.find(choice => choice.correct)!.id }));
  const baseline = model.skillEvidence(state);
  assert.equal(baseline.find(skill => skill.id === 'async')?.status, 'baseline');
  assert.match(baseline.find(skill => skill.id === 'async')!.label, /starting|baseline/i);
  const found = model.skillEvidence({ ...state, baseline: [], project }).find(skill => skill.id === 'async')!;
  assert.equal(found.status, 'found-in-project'); assert.equal(found.label, 'Found in project · understanding not checked');
  assert.match(found.evidence.join(' '), /src\/app.ts/);
  for (const skill of baseline) assert.match(skill.description, /independent understanding has not been assessed/i);
});

test('known checkpoint completions provide guided evidence and recommendation moves to unfinished missions', () => {
  const state = model.emptyLearnerState();
  const first = model.recommendMission(state); assert.equal(first.review, false);
  const chosen = missions.find(mission => mission.id === first.missionId)!; assert.ok(chosen);
  const completed = chosen.checkpoints.map(checkpoint => checkpoint.id);
  const next = model.recommendMission({ ...state, completed }); assert.notEqual(next.missionId, first.missionId);
  assert.equal(model.skillEvidence({ ...state, completed: ['queue-trace'] }).find(skill => skill.id === 'code-reading')?.status, 'guided');
  const all = model.recommendMission({ ...state, completed: missions.flatMap(mission => mission.checkpoints.map(checkpoint => checkpoint.id)) });
  assert.equal(all.review, true); assert.match(all.reason, /review|investigation/i);
});

test('goals, uncertain baseline and selected project signals explain deterministic next missions', () => {
  const base = model.emptyLearnerState();
  const sqlQuestion = model.baselineQuestions.find(question => question.skillId === 'sql')!;
  const sql = model.recommendMission({ ...base, baseline: [{ questionId: sqlQuestion.id, choiceId: 'unsure' }] });
  assert.equal(sql.missionId, 'query-the-data'); assert.match(sql.reason, /baseline|not sure|uncertain/i);
  const goal = model.recommendMission({ ...base, profile: { goal: 'backend', languages: ['sql'], interests: ['apis'], minutes: 20 } });
  assert.equal(goal.missionId, 'check-the-owner'); assert.match(goal.reason, /backend|server|API/i);
  const repo = model.recommendMission({ ...base, project }); assert.equal(repo.missionId, 'async-in-order'); assert.match(repo.reason, /project/);
  assert.deepEqual(model.recommendMission({ ...base, project }), repo);
});

test('storage reports blocked and corrupt local data while keeping the journey usable', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(store.loadLearnerState(blocked).persisted, false);
  assert.equal(store.saveLearnerState(model.emptyLearnerState(), blocked).persisted, false);
  assert.equal(store.clearLearnerState(blocked).persisted, false);
  const corrupt = store.loadLearnerState({ getItem() { return '{broken'; } });
  assert.equal(corrupt.corrupt, true); assert.deepEqual(corrupt.state, model.emptyLearnerState());
  let stored: string | null = null;
  const memory = { getItem() { return stored; }, setItem(_key: string, value: string) { stored = value; }, removeItem() { stored = null; } };
  const state: LearnerState = { ...model.emptyLearnerState(), completed: ['queue-trace'] };
  assert.equal(store.saveLearnerState(state, memory).persisted, true);
  assert.deepEqual(store.loadLearnerState(memory).state, state);
  assert.equal(store.clearLearnerState(memory).persisted, true); assert.equal(stored, null);
});
