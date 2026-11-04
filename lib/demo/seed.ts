import { z } from 'zod';
import type { RuntimeConfig } from '../contracts.ts';
import { skillIds, type ProjectSnapshot } from '../learner/types.ts';
import { validateGenerated } from '../study/model.ts';
import { ApiError } from '../server/http.ts';
import type { StudyAnalysis } from '../study/types.ts';

const snapshotSchema = z.object({
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  url: z.string().url(), commit: z.string().regex(/^[a-f0-9]{40}$/), analysedAt: z.string(),
  files: z.array(z.object({ path: z.string().min(1).max(250), language: z.string().max(80), excerpt: z.string().min(1).max(32768) }).strict()).min(1).max(5),
  signals: z.array(z.object({ skillId: z.enum(skillIds), path: z.string().max(250), note: z.string().max(2000) }).strict()).max(30),
  suggestedMissionId: z.string().nullable(), warnings: z.array(z.string().max(2000)).max(50),
}).strict();

export type DemoSeed = {
  snapshot: ProjectSnapshot;
  analysis: StudyAnalysis;
  concepts: { id: string; title: string; description: string; category: string; filePaths: string[]; prerequisites: string[] }[];
  featureTitle: string;
};

/** The seed is chosen only by operator configuration. A request never supplies
 * a seed/project ID. Explicit readiness records attest the operator checked
 * real Meta-generated output and the public pinned source before exposure. */
export async function loadDemoSeed(config: RuntimeConfig): Promise<DemoSeed> {
  const unavailable = () => new ApiError(503, 'DEMO_UNAVAILABLE', 'The sample learning path is being prepared. Please retry shortly.');
  if (!config.DEMO_SEED_PROJECT_ID) throw unavailable();
  const row = await config.DB.prepare('SELECT snapshot_json,analysis_json FROM study_projects WHERE id=? AND pilot_id=? AND expires_at>?')
    .bind(config.DEMO_SEED_PROJECT_ID, config.PILOT_ID || 'groundtruth-pilot.v1', new Date().toISOString())
    .first<{ snapshot_json: string; analysis_json: string | null }>();
  if (!row?.analysis_json) throw unavailable();
  try {
    const snapshot = snapshotSchema.parse(JSON.parse(row.snapshot_json));
    const url = new URL(snapshot.url);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password || url.search || url.hash ||
      url.pathname.replace(/\/$/, '').replace(/\.git$/, '') !== '/' + snapshot.repository ||
      snapshot.files.some(file => file.path.startsWith('/') || file.path.split('/').includes('..') || /[\x00-\x1f\\]/.test(file.path))) throw unavailable();
    const readiness = await config.DB.prepare("SELECT detail_json FROM study_events WHERE project_id=? AND kind='demo-seed-ready' ORDER BY created_at DESC LIMIT 1")
      .bind(config.DEMO_SEED_PROJECT_ID).first<{ detail_json: string }>();
    const ready = readiness && JSON.parse(readiness.detail_json);
    if (ready?.provider !== 'meta' || ready.model !== 'muse-spark-1.3' || ready.commit !== snapshot.commit ||
      ready.publicRepository !== true || ready.license !== 'MIT' || typeof ready.licenseCommit !== 'string' || !/^[a-f0-9]{40}$/.test(ready.licenseCommit) ||
      !Array.isArray(ready.tasks) || !ready.tasks.includes('analyse') || !ready.tasks.includes('concepts')) throw unavailable();
    const envelope = JSON.parse(row.analysis_json);
    if (envelope.version !== 4) throw unavailable();
    const analysis = validateGenerated('analyse', envelope.report, snapshot) as StudyAnalysis;
    const rows = await config.DB.prepare('SELECT local_id,title,description,category,file_paths_json,prerequisites_json FROM study_concepts WHERE project_id=? ORDER BY ordinal')
      .bind(config.DEMO_SEED_PROJECT_ID).all<{ local_id: string; title: string; description: string; category: string; file_paths_json: string; prerequisites_json: string }>();
    const result = validateGenerated('concepts', { nodes: rows.results.map(concept => ({
      id: concept.local_id, title: concept.title, description: concept.description, category: concept.category,
      filePaths: JSON.parse(concept.file_paths_json), prerequisites: JSON.parse(concept.prerequisites_json),
    })) }, snapshot) as { nodes: DemoSeed['concepts'] };
    const path = await config.DB.prepare('SELECT feature_title FROM study_learning_paths WHERE project_id=?').bind(config.DEMO_SEED_PROJECT_ID).first<{ feature_title: string }>();
    return { snapshot, analysis, concepts: result.nodes, featureTitle: path?.feature_title?.slice(0, 80) || 'Trace a public example' };
  } catch { throw unavailable(); }
}
