import type { RuntimeConfig } from '../contracts.ts';
import type { StudyProject, StudyExercise } from '../study/types.ts';
import type { RepositoryMap } from '../study/repository-types.ts';
import { createLocalSession, localAccountsEnabled, localIdentity } from './local-auth.ts';
import { ApiError, fields, json } from './http.ts';
import { loadDemoSeed } from '../demo/seed.ts';
import { boundedInteger, enforceRateLimit, isDemoUser, purgeExpiredDemoAccounts, requestIdentity, sha256 } from '../demo/security.ts';

const pilot = (config: RuntimeConfig) => config.PILOT_ID || 'groundtruth-pilot.v1';
type DemoProjectRow = { id: string; goal: string; snapshot_json: string; analysis_json: string | null; expires_at: string };

// Stored change context is authorized and hash-checked when the question is
// created. Copy its public evidence fields explicitly, never arbitrary stored
// prompt fields or rubric/key extensions into the read-only preview.
function publicSourceContext(value: unknown): StudyExercise['prompt']['sourceContext'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  if (typeof source.path !== 'string' || typeof source.source !== 'string' || typeof source.hash !== 'string' || typeof source.label !== 'string') return undefined;
  return { path: source.path, source: source.source, hash: source.hash, label: source.label,
    ...(typeof source.changeProposalId === 'string' ? { changeProposalId: source.changeProposalId } : {}),
    ...(typeof source.originalSource === 'string' ? { originalSource: source.originalSource } : {}),
    ...(typeof source.baseHash === 'string' ? { baseHash: source.baseHash } : {}),
    ...(typeof source.diff === 'string' ? { diff: source.diff } : {}),
    ...(source.mode === 'ai' || source.mode === 'manual-declared' ? { mode: source.mode } : {}),
    ...(typeof source.appliedAt === 'string' ? { appliedAt: source.appliedAt } : {}),
  };
}

async function ownDemoProject(config: RuntimeConfig, userId: string): Promise<DemoProjectRow> {
  if (!isDemoUser(userId)) throw new ApiError(403, 'DEMO_SESSION_REQUIRED', 'Open the temporary sample to view its teacher preview.');
  const row = await config.DB.prepare(`SELECT p.id,p.goal,p.snapshot_json,p.analysis_json,p.expires_at FROM study_projects p
    JOIN pilot_memberships m ON m.user_id=p.owner_id AND m.pilot_id=p.pilot_id
    JOIN local_auth_users u ON u.user_id=p.owner_id
    WHERE p.owner_id=? AND p.pilot_id=? AND p.expires_at>? AND m.expires_at>?
    AND substr(u.username,1,8)='gt-demo-' AND substr(u.password_hash,1,15)='!demo-disabled:'
    ORDER BY p.created_at LIMIT 1`).bind(userId, pilot(config), new Date().toISOString(), new Date().toISOString()).first<DemoProjectRow>();
  if (!row) throw new ApiError(410, 'DEMO_EXPIRED', 'This temporary sample has expired. Open a fresh sample from the sign-in page.');
  return row;
}

/** A teacher-shaped, read-only projection of only this visitor's own record.
 * Private rubrics, MCQ answer keys and model feedback are deliberately not
 * selected. This endpoint never grants teacher access or accepts a project ID. */
export async function demoTeacherPreview(config: RuntimeConfig, userId: string): Promise<{ readOnly: true; mode: 'own-demo-preview'; expiresAt: string; project: StudyProject }> {
  const row = await ownDemoProject(config, userId);
  const concepts = await config.DB.prepare(`SELECT c.local_id,c.title,c.description,c.category,c.file_paths_json,c.prerequisites_json,
    (SELECT count(*) FROM study_exercise_concepts l JOIN study_exercises e ON e.id=l.exercise_id WHERE l.concept_id=c.id AND e.status='submitted') AS attempts
    FROM study_concepts c WHERE c.project_id=? ORDER BY c.ordinal`).bind(row.id).all<{
      local_id: string; title: string; description: string; category: 'behavior' | 'architecture' | 'testing'; file_paths_json: string; prerequisites_json: string; attempts: number;
    }>();
  const exercises = await config.DB.prepare(`SELECT id,prompt_json,status,ended_at,answer,started_at,submitted_at FROM study_exercises
    WHERE project_id=? ORDER BY created_at DESC LIMIT 20`).bind(row.id).all<{
      id: string; prompt_json: string; status: 'guided' | 'independent' | 'submitted'; ended_at: string | null; answer: string | null; started_at: string | null; submitted_at: string | null;
    }>();
  const safeExercises: StudyExercise[] = exercises.results.map(exercise => {
    const prompt = JSON.parse(exercise.prompt_json);
    const sourceContext = publicSourceContext(prompt.sourceContext);
    return { id: exercise.id, prompt: {
      title: prompt.title, prompt: prompt.prompt, kind: prompt.kind, filePaths: prompt.filePaths,
      ...(prompt.format === 'mcq' ? { format: 'mcq' as const, options: prompt.options?.map((option: { id: string; text: string }) => ({ id: option.id, text: option.text })) } : {}),
      ...(prompt.format === 'coding' ? { format: 'coding' as const, starterCode: prompt.starterCode } : {}),
      ...(['baseline', 'practice', 'transfer'].includes(prompt.phase) ? { phase: prompt.phase } : {}),
      ...(typeof prompt.parentExerciseId === 'string' ? { parentExerciseId: prompt.parentExerciseId } : {}),
      ...(prompt.intent === 'transfer' ? { intent: 'transfer' as const } : {}),
      ...(sourceContext ? { sourceContext } : {}),
    }, status: exercise.ended_at ? 'ended' : exercise.status, endedAt: exercise.ended_at,
    answer: exercise.status === 'submitted' ? exercise.answer : null, feedback: null, mcqResult: null,
    startedAt: exercise.started_at, submittedAt: exercise.submitted_at, reviews: [] };
  });
  const counts = await config.DB.prepare(`SELECT
    (SELECT count(*) FROM study_events WHERE project_id=? AND kind='assistance-requested') AS guidanceRequests,
    (SELECT count(*) FROM study_exercises WHERE project_id=? AND status='submitted') AS independentAttempts,
    (SELECT count(*) FROM study_events WHERE project_id=? AND kind='change-applied' AND json_extract(detail_json,'$.mode')='ai') AS aiChanges,
    (SELECT count(*) FROM study_events WHERE project_id=? AND kind='change-applied' AND json_extract(detail_json,'$.mode')='manual-declared') AS manualChanges`)
    .bind(row.id, row.id, row.id, row.id).first<StudyProject['stats']>();
  return { readOnly: true, mode: 'own-demo-preview', expiresAt: row.expires_at, project: {
    id: row.id, goal: row.goal, snapshot: JSON.parse(row.snapshot_json), analysis: row.analysis_json ? JSON.parse(row.analysis_json).report : null,
    teacherId: null, learner: { displayName: 'Current demo visitor', classNames: [] }, exercises: safeExercises, concepts: concepts.results.map(concept => ({
      id: concept.local_id, title: concept.title, description: concept.description, category: concept.category,
      filePaths: JSON.parse(concept.file_paths_json), prerequisites: JSON.parse(concept.prerequisites_json), attempts: concept.attempts,
      score: 0, state: concept.attempts ? 'Independent attempt · unreviewed' : 'Not attempted',
    })), masteryIndex: 0, stats: counts || { guidanceRequests: 0, independentAttempts: 0, aiChanges: 0, manualChanges: 0 }, events: [],
  } };
}

export async function handleDemo(request: Request, config: RuntimeConfig, body: Record<string, unknown>): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/demo/')) return null;
  if (config.DEMO_ENABLED !== 'true' || !localAccountsEnabled(request, config)) throw new ApiError(404, 'NOT_FOUND');
  // Resolve the opaque authenticated cookie here; caller parameters and forged
  // identity headers cannot select the owner of a demo preview.
  const identity = await localIdentity(request, config);
  if (url.pathname === '/api/demo/teacher' || url.pathname === '/api/demo/session') {
    if (request.method !== 'GET') throw new ApiError(405, 'METHOD_NOT_ALLOWED');
    if ([...url.searchParams].length) throw new ApiError(400, 'UNKNOWN_FIELD');
    if (!identity) throw new ApiError(401, 'AUTH_REQUIRED');
    if (url.pathname === '/api/demo/teacher') return json(await demoTeacherPreview(config, identity.userId));
    const project = await ownDemoProject(config, identity.userId);
    return json({ demo: true, projectId: project.id, expiresAt: project.expires_at, teacherPreviewUrl: '/demo/teacher' });
  }
  if (url.pathname !== '/api/demo/start') throw new ApiError(404, 'NOT_FOUND');
  if (request.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED');
  fields(body, []);
  if ([...url.searchParams].length) throw new ApiError(400, 'UNKNOWN_FIELD');
  if (identity) {
    if (!isDemoUser(identity.userId)) throw new ApiError(409, 'ALREADY_SIGNED_IN', 'Your account is already signed in. Open your workspace to continue.');
    const project = await ownDemoProject(config, identity.userId);
    return json({ authenticated: true, demo: true, next: '/user', projectId: project.id, expiresAt: project.expires_at });
  }
  const verifiedIdentity = await requestIdentity(request, config, true);
  const seed = await loadDemoSeed(config);
  await purgeExpiredDemoAccounts(config);
  const limited = 'The sample has reached its temporary visitor limit. Please retry in ten minutes.';
  await enforceRateLimit(config, 'demo:identity:' + verifiedIdentity, 3, 'DEMO_RATE_LIMIT', limited);
  await enforceRateLimit(config, 'demo:global', boundedInteger(config.DEMO_MAX_STARTS_PER_WINDOW, 120, 1, 300), 'DEMO_RATE_LIMIT', limited);
  const cap = boundedInteger(config.DEMO_MAX_ACTIVE, 200, 1, 400);
  const lifetime = boundedInteger(config.DEMO_TTL_SECONDS, 7200, 300, 7200);
  const suffix = crypto.randomUUID(), userId = 'demo_' + suffix, projectId = crypto.randomUUID(), mapId = crypto.randomUUID();
  const at = new Date().toISOString(), expiresAt = new Date(Date.now() + lifetime * 1000).toISOString();
  const snapshot = { ...seed.snapshot, warnings: [...seed.snapshot.warnings, 'Temporary demo sandbox. Changes stay in your private practice copy; the public repository is never modified.'] };
  const goal = 'Understand this MIT-licensed demo sandbox, then practise a small change in your private copy.';
  const map: RepositoryMap = {
    id: mapId, repository: snapshot.repository, url: snapshot.url, commit: snapshot.commit, summary: 'A pinned public sample for a private learning session.',
    features: [{ id: 'demo-sandbox', area: 'core', title: seed.featureTitle, summary: 'Read the code, practise independently, and try a private change.',
      concepts: seed.concepts.map(concept => concept.title).slice(0, 4), filePaths: snapshot.files.map(file => file.path).slice(0, 3) }],
    warnings: snapshot.warnings, sampledPaths: snapshot.files.map(file => file.path), catalogueCount: snapshot.files.length, listedCount: snapshot.files.length, expiresAt,
  };
  const userExists = 'EXISTS(SELECT 1 FROM local_auth_users WHERE user_id=?)';
  const statements = [
    config.DB.prepare(`INSERT INTO local_auth_users(user_id,username,password_hash,display_name,created_at)
      SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM local_auth_users u JOIN pilot_memberships m ON m.user_id=u.user_id WHERE substr(u.user_id,1,5)='demo_' AND m.expires_at>?)<?`)
      .bind(userId, 'gt-demo-' + suffix, '!demo-disabled:' + await sha256(crypto.randomUUID()), 'Demo learner', at, at, cap),
    config.DB.prepare(`INSERT INTO account_profiles(user_id,pilot_id,display_name,requested_role,application_status,created_at,updated_at)
      SELECT ?,?,?,'user','none',?,? WHERE ${userExists}`).bind(userId, pilot(config), 'Demo learner', at, at, userId),
    config.DB.prepare(`INSERT INTO pilot_memberships(user_id,pilot_id,role,enrolled_at,expires_at) SELECT ?,?,'student',?,? WHERE ${userExists}`)
      .bind(userId, pilot(config), at, expiresAt, userId),
    config.DB.prepare(`INSERT INTO study_projects(id,owner_id,pilot_id,goal,snapshot_json,analysis_json,teacher_id,created_at,expires_at)
      SELECT ?,?,?,?,?,?,NULL,?,? WHERE ${userExists}`).bind(projectId, userId, pilot(config), goal, JSON.stringify(snapshot), JSON.stringify({ version: 4, report: seed.analysis }), at, expiresAt, userId),
    config.DB.prepare(`INSERT INTO study_repository_maps(id,owner_id,pilot_id,map_json,created_at,expires_at) SELECT ?,?,?,?,?,? WHERE ${userExists}`)
      .bind(mapId, userId, pilot(config), JSON.stringify(map), at, expiresAt, userId),
    config.DB.prepare(`INSERT INTO study_learning_paths(project_id,purpose,area,feature_title,concepts_json,transfer_goal,map_id)
      SELECT ?,'improve','core',?,?,?,? WHERE ${userExists}`).bind(projectId, seed.featureTitle, JSON.stringify(map.features[0].concepts), '', mapId, userId),
    ...seed.concepts.map((concept, ordinal) => config.DB.prepare(`INSERT INTO study_concepts(id,project_id,local_id,title,description,category,file_paths_json,prerequisites_json,ordinal)
      SELECT ?,?,?,?,?,?,?,?,? WHERE ${userExists}`).bind(projectId + ':' + concept.id, projectId, concept.id, concept.title, concept.description, concept.category, JSON.stringify(concept.filePaths), JSON.stringify(concept.prerequisites), ordinal, userId)),
    config.DB.prepare(`INSERT INTO study_events(id,project_id,exercise_id,kind,detail_json,created_at)
      SELECT ?,?,NULL,'demo-started',?,? WHERE ${userExists}`).bind(crypto.randomUUID(), projectId, JSON.stringify({ source: 'public-pinned-sample', provider: 'meta', model: 'muse-spark-1.3', preloaded: ['overview', 'concepts'], synthetic: true }), at, userId),
  ];
  const saved = await config.DB.batch(statements);
  if (saved[0].meta.changes !== 1) throw new ApiError(429, 'DEMO_CAPACITY', limited);
  return createLocalSession(request, config, userId, { lifetime, next: '/user', result: { demo: true, projectId, expiresAt, teacherPreviewUrl: '/demo/teacher' } });
}
