import type { InvestigationCase, LearningSession, Me, RunEvidence, RunPlan } from '../contracts.ts';
import { api, finishRequest, post, requestId } from './api.ts';

export function workspaceAccess(me: Me): 'signin' | 'notice' | 'enrollment' | 'activity' {
  if (!me.authenticated) return 'signin';
  if (!me.noticeAcknowledged) return 'notice';
  if (!me.enrolled) return 'enrollment';
  return 'activity';
}

export async function acknowledgePractice(optIn: boolean, loadSessions: () => Promise<void>): Promise<Me> {
  await post('/api/notices/practice', { version: 'practice.v1', acknowledged: true });
  await api('/api/me/research-consent', { method: 'PATCH', body: JSON.stringify({ optIn }) });
  const profile = await api<Me>('/api/me');
  if (profile.enrolled) await loadSessions();
  return profile;
}

export async function completeRun(runId: string, reconcile: () => Promise<LearningSession>): Promise<LearningSession> {
  const key = `finalize:${runId}`;
  const evidence = await post<RunEvidence>(`/api/runs/${runId}/finalize`, { requestId: requestId(key, key) });
  const session = await reconcile();
  if (evidence.runId !== runId || !session.cases.some(item => item.runId === runId && item.evidence?.evidenceHash === evidence.evidenceHash)) {
    throw new Error('Final evidence is not yet reconciled with your saved activity. Resume this run to retry.');
  }
  finishRequest(key);
  return session;
}

export async function prepareRun(sessionId: string, investigation: InvestigationCase): Promise<RunPlan> {
  if (!investigation.prediction) throw new Error('Save a prediction before running this probe.');
  const key = `${sessionId}:run:${investigation.id}`;
  // The owned case and prediction identify the run even after browser storage is lost.
  const plan = await post<RunPlan>(`/api/sessions/${sessionId}/runs`, { caseId: investigation.id, predictionId: investigation.prediction.id, requestId: requestId(key) });
  finishRequest(key);
  return plan;
}
