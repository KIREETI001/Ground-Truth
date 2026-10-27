import type { RuntimeConfig } from '../contracts.ts';
import { ApiError } from './http.ts';
import { loadSession, now, saveDocument } from './state.ts';
import type { SessionRow } from './state.ts';

export const ENROLLMENT_WINDOW_MS = 10 * 60 * 1_000;

export async function purgeExpired(config: RuntimeConfig): Promise<unknown> {
  const cutoff = now();
  const profileCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000).toISOString();
  const telemetryCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000).toISOString();
  const results = await config.DB.batch([
    config.DB.prepare("UPDATE sessions SET status='deleting' WHERE expires_at<=?").bind(cutoff),
    config.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(cutoff),
    config.DB.prepare('DELETE FROM pilot_memberships WHERE expires_at<=?').bind(cutoff),
    config.DB.prepare(`DELETE FROM practice_profiles WHERE updated_at<=? AND NOT EXISTS
      (SELECT 1 FROM pilot_memberships WHERE pilot_memberships.user_id=practice_profiles.user_id AND expires_at>?)`).bind(profileCutoff, cutoff),
    config.DB.prepare('DELETE FROM coach_locks WHERE expires_at<=?').bind(cutoff),
    config.DB.prepare('DELETE FROM enrollment_attempts WHERE window_started_at<=?').bind(Date.now() - ENROLLMENT_WINDOW_MS),
  ]);
  let providerReceipts = 0;
  const rows = await config.DB.prepare("SELECT * FROM sessions WHERE status='active' AND expires_at>? AND document_json LIKE '%\"receipt\"%'")
    .bind(cutoff).all<SessionRow>();
  for (const row of rows.results) {
    let saved = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      let loaded;
      try { loaded = await loadSession(config.DB, row.id); }
      catch (error) { if (error instanceof ApiError && [404, 410].includes(error.status)) { saved = true; break; } throw error; }
      let removed = 0;
      for (const event of loaded.doc.coaching ?? []) {
        if (event.receipt && event.at <= telemetryCutoff) { delete event.receipt; removed++; }
      }
      if (removed === 0) { saved = true; break; }
      if (await saveDocument(config.DB, loaded.row, loaded.doc)) { providerReceipts += removed; saved = true; break; }
    }
    if (!saved) throw new ApiError(409, 'RETENTION_STATE_CHANGED', 'An activity changed during cleanup; run cleanup again.');
  }
  return { deleted: { sessions: results[1].meta.changes, memberships: results[2].meta.changes,
    profiles: results[3].meta.changes, coachLocks: results[4].meta.changes, enrollmentAttempts: results[5].meta.changes, providerReceipts } };
}
