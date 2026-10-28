import { checkpointIds, missions } from '../learning/catalog.ts';
import { languageIds, skillIds } from './types.ts';
import type { BaselineAnswer, BaselineQuestion, LearnerProfile, LearnerState, ProjectSnapshot, Recommendation, SkillEvidence, SkillId } from './types.ts';

export const baselineQuestions: BaselineQuestion[] = [
  {
    id: 'trace-total', skillId: 'code-reading', title: 'Follow a changing value',
    prompt: 'What is total after this loop finishes?', code: 'let total = 1;\nfor (const amount of [2, 4]) {\n  total += amount;\n}',
    choices: [
      { id: 'seven', label: '7', correct: true, feedback: 'The value changes from 1 to 3 to 7. This is starting evidence from one short trace.' },
      { id: 'six', label: '6', feedback: 'The starting value is 1. Add it to the two amounts: 1 + 2 + 4.' },
      { id: 'four', label: '4', feedback: 'The loop adds each amount to the existing total; it does not replace total with the last amount.' },
      { id: 'unsure', label: 'Not sure yet', feedback: 'Start with total = 1, then write its value after each visit. The code-reading mission gives you practice with that trace.' },
    ],
  },
  {
    id: 'async-order', skillId: 'async', title: 'Read an async sequence',
    prompt: 'In what order do these three messages appear?', code: 'const ready = Promise.resolve("loaded");\nconsole.log("start");\nready.then(value => console.log(value));\nconsole.log("end");',
    choices: [
      { id: 'start-end-loaded', label: 'start → end → loaded', correct: true, feedback: 'The current synchronous code finishes before the promise callback runs. One baseline answer does not establish independent understanding.' },
      { id: 'loaded-start-end', label: 'loaded → start → end', feedback: 'An already resolved promise still schedules its then callback after the current synchronous code.' },
      { id: 'start-loaded-end', label: 'start → loaded → end', feedback: 'Registering the callback does not pause this code. The end message appears before that callback.' },
      { id: 'unsure', label: 'Not sure yet', feedback: 'Separate the statements running now from the promise callback scheduled for later. Try the async mission next.' },
    ],
  },
  {
    id: 'sql-filter', skillId: 'sql', title: 'Read a query',
    prompt: 'What does this query return?', code: 'SELECT title\nFROM notes\nWHERE archived = 0\nORDER BY title;',
    choices: [
      { id: 'active-titles', label: 'Unarchived note titles, sorted by title', correct: true, feedback: 'WHERE chooses the rows, SELECT chooses the output column, and ORDER BY sorts the result. This is a starting check.' },
      { id: 'all-titles', label: 'All note titles, in their original order', feedback: 'WHERE excludes archived rows, and ORDER BY requests a sorted result rather than the original order.' },
      { id: 'count', label: 'The number of unarchived notes', feedback: 'SELECT title returns title values. A count would require a counting expression such as COUNT(*).' },
      { id: 'unsure', label: 'Not sure yet', feedback: 'Read this in three parts: rows that pass WHERE, columns named by SELECT, then the requested order. The SQL mission practices each part.' },
    ],
  },
];

const missionIds = new Set(['scan-the-queue', 'find-the-receipt', 'move-the-marker', 'async-in-order', 'query-the-data', 'check-the-owner']);
const interests = ['interfaces', 'apis', 'data', 'reliability'];
const MAX_STATE_BYTES = 24 * 1024;
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exact(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!object(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) throw new Error('INVALID_LEARNER_STATE');
}
function text(value: unknown, max: number, empty = false): value is string { return typeof value === 'string' && (empty || value.trim().length > 0) && value.length <= max; }
function unique(values: unknown[]) { return new Set(values).size === values.length; }
function path(value: unknown): value is string {
  return text(value, 200) && !value.startsWith('/') && !/[\\\u0000-\u001f\u007f]/.test(value) && value.split('/').every(part => part.length > 0 && part !== '.' && part !== '..');
}
function validProfile(value: unknown): value is LearnerProfile {
  try {
    exact(value, ['goal', 'languages', 'interests', 'minutes']);
    return ['frontend', 'full-stack', 'backend'].includes(value.goal as string) && [10, 20, 30].includes(value.minutes as number) &&
      Array.isArray(value.languages) && value.languages.length <= languageIds.length && unique(value.languages) && value.languages.every(item => languageIds.includes(item)) &&
      Array.isArray(value.interests) && value.interests.length <= interests.length && unique(value.interests) && value.interests.every(item => interests.includes(item));
  } catch { return false; }
}
function validAnswer(value: unknown): value is BaselineAnswer {
  try {
    exact(value, ['questionId', 'choiceId']);
    return baselineQuestions.some(question => question.id === value.questionId && question.choices.some(choice => choice.id === value.choiceId));
  } catch { return false; }
}
function validProject(value: unknown): value is ProjectSnapshot {
  try {
    exact(value, ['repository', 'url', 'commit', 'analysedAt', 'files', 'signals', 'suggestedMissionId', 'warnings']);
    if (!text(value.repository, 200) || !/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value.repository) ||
      value.url !== `https://github.com/${value.repository}` || !text(value.commit, 40) || !/^[a-f0-9]{40}$/i.test(value.commit) ||
      !text(value.analysedAt, 30) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.analysedAt) || !Number.isFinite(Date.parse(value.analysedAt)) ||
      !Array.isArray(value.files) || value.files.length > 5 || !Array.isArray(value.signals) || value.signals.length > 20 ||
      !Array.isArray(value.warnings) || value.warnings.length > 10 || !value.warnings.every(item => text(item, 200)) ||
      !(value.suggestedMissionId === null || (typeof value.suggestedMissionId === 'string' && missionIds.has(value.suggestedMissionId)))) return false;
    const paths = new Set<string>();
    for (const file of value.files) {
      exact(file, ['path', 'language', 'excerpt']);
      if (!path(file.path) || paths.has(file.path) || !text(file.language, 40) || !text(file.excerpt, 1500, true)) return false;
      paths.add(file.path);
    }
    for (const signal of value.signals) {
      exact(signal, ['skillId', 'path', 'note']);
      if (!skillIds.includes(signal.skillId as SkillId) || !path(signal.path) || !paths.has(signal.path) || !text(signal.note, 200)) return false;
    }
    return true;
  } catch { return false; }
}

export function emptyLearnerState(): LearnerState { return { version: 1, profile: null, baseline: [], completed: [], project: null }; }

// Save validation is deliberately strict: derived claims and unknown nested fields are never persisted.
export function validateLearnerState(raw: unknown): LearnerState {
  exact(raw, ['version', 'profile', 'baseline', 'completed', 'project']);
  if (raw.version !== 1 || !(raw.profile === null || validProfile(raw.profile)) ||
    !Array.isArray(raw.baseline) || raw.baseline.length > baselineQuestions.length || !raw.baseline.every(validAnswer) || !unique(raw.baseline.map(answer => answer.questionId)) ||
    !Array.isArray(raw.completed) || raw.completed.length > checkpointIds.size || !unique(raw.completed) || !raw.completed.every(id => typeof id === 'string' && checkpointIds.has(id)) ||
    !(raw.project === null || validProject(raw.project))) throw new Error('INVALID_LEARNER_STATE');
  const serialized = JSON.stringify(raw);
  if (new TextEncoder().encode(serialized).length > MAX_STATE_BYTES) throw new Error('INVALID_LEARNER_STATE');
  return JSON.parse(serialized) as LearnerState;
}

// Browser recovery preserves known guided progress while discarding invalid or unrecognised fields.
export function parseLearnerState(raw: unknown): LearnerState {
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!object(value) || value.version !== 1) return emptyLearnerState();
    const baseline = Array.isArray(value.baseline) ? value.baseline.filter(validAnswer).filter((answer, index, answers) => answers.findIndex(item => item.questionId === answer.questionId) === index).slice(0, 3) : [];
    const completed = Array.isArray(value.completed) ? [...new Set(value.completed.filter((id): id is string => typeof id === 'string' && checkpointIds.has(id)))] : [];
    const state: LearnerState = { version: 1, profile: validProfile(value.profile) ? value.profile : null, baseline, completed, project: validProject(value.project) ? value.project : null };
    try { return validateLearnerState(state); } catch { return { ...state, project: null }; }
  } catch { return emptyLearnerState(); }
}

const skillMissions: Record<SkillId, string[]> = {
  'code-reading': ['scan-the-queue', 'move-the-marker'], collections: ['find-the-receipt', 'move-the-marker'],
  async: ['async-in-order'], sql: ['query-the-data'], testing: ['check-the-owner'], access: ['check-the-owner'],
};
const skillTitles: Record<SkillId, string> = { 'code-reading': 'Code reading', collections: 'Collections', async: 'Async ordering', sql: 'SQL queries', testing: 'Testing boundaries', access: 'Server ownership' };

export function skillEvidence(raw: LearnerState): SkillEvidence[] {
  const state = parseLearnerState(raw);
  return skillIds.map(id => {
    const related = missions.filter(mission => skillMissions[id].includes(mission.id));
    const guided = related.flatMap(mission => mission.checkpoints.filter(checkpoint => state.completed.includes(checkpoint.id) && (id !== 'testing' || checkpoint.id === 'owner-boundary')).map(checkpoint => `${mission.title}: ${checkpoint.label} (guided practice).`));
    const baseline = state.baseline.filter(answer => baselineQuestions.some(question => question.id === answer.questionId && question.skillId === id)).map(answer => {
      const question = baselineQuestions.find(question => question.id === answer.questionId)!;
      const choice = question.choices.find(choice => choice.id === answer.choiceId)!;
      return `Starting baseline: ${question.title} — ${choice.id === 'unsure' ? 'not sure yet' : choice.correct ? 'matching response to this question' : 'a response to revisit'}.`;
    });
    const found = (state.project?.signals ?? []).filter(signal => signal.skillId === id).map(signal => `Found in project: ${signal.path} at ${state.project!.commit.slice(0, 7)}. ${signal.note} Understanding not checked.`);
    const status: SkillEvidence['status'] = guided.length ? 'guided' : found.length ? 'found-in-project' : baseline.length ? 'baseline' : 'not-started';
    const labels = { guided: 'Guided practice', 'found-in-project': 'Found in project · understanding not checked', baseline: 'Starting baseline evidence', 'not-started': 'No evidence yet' };
    return { id, title: skillTitles[id], status, label: labels[status], evidence: [...baseline, ...guided, ...found],
      description: 'This map records starting answers, guided practice and selected source signals. Independent understanding has not been assessed.', missionId: skillMissions[id][0] };
  });
}

export function recommendMission(raw: LearnerState): Recommendation {
  const state = parseLearnerState(raw);
  const complete = (id: string) => { const mission = missions.find(item => item.id === id); return !!mission && mission.checkpoints.every(checkpoint => state.completed.includes(checkpoint.id)); };
  const candidates: { missionId: string; reason: string }[] = [];
  if (state.project?.suggestedMissionId) candidates.push({ missionId: state.project.suggestedMissionId, reason: 'The selected project contains a related source signal. Practice the idea next; its presence does not check your understanding.' });
  for (const answer of state.baseline) {
    const question = baselineQuestions.find(question => question.id === answer.questionId)!;
    if (!question.choices.find(choice => choice.id === answer.choiceId)?.correct) candidates.push({ missionId: skillMissions[question.skillId][0], reason: 'Your starting baseline marked this idea as uncertain or ready to revisit. A short guided mission gives you a concrete next step.' });
  }
  if (state.profile?.goal === 'backend') candidates.push({ missionId: 'check-the-owner', reason: 'Your backend goal includes deciding who may read or change server data. Start with an ownership check.' });
  if (state.profile?.goal === 'full-stack') candidates.push({ missionId: 'async-in-order', reason: 'Your full-stack goal crosses browser and server requests. Trace an async result before using it.' });
  if (state.profile?.goal === 'frontend') candidates.push({ missionId: 'async-in-order', reason: 'Your frontend goal includes interfaces waiting for data. Trace which statements finish first.' });
  if (state.profile?.interests.includes('data') || state.profile?.languages.includes('sql')) candidates.push({ missionId: 'query-the-data', reason: 'Your data interests make reading a filtered SQL query a useful next task.' });
  if (state.profile?.interests.includes('reliability')) candidates.push({ missionId: 'move-the-marker', reason: 'Your reliability interest fits tracing positions and checking boundary cases.' });
  for (const mission of missions) candidates.push({ missionId: mission.id, reason: 'Build a clear code-reading foundation with this unfinished guided mission.' });
  const next = candidates.find(candidate => missions.some(mission => mission.id === candidate.missionId) && !complete(candidate.missionId));
  if (next) return { ...next, review: false };
  return { missionId: candidates.find(candidate => missions.some(mission => mission.id === candidate.missionId))?.missionId ?? 'scan-the-queue', reason: 'Your guided missions are complete. Review one, or try the live investigation to gather different evidence; guided points are not independent mastery.', review: true };
}
