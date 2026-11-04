import type { RuntimeConfig } from '../contracts.ts';
import { ApiError, fields, json, string } from './http.ts';

export type PlatformRole = 'user' | 'teacher' | 'developer';
const scope = (config: RuntimeConfig) => config.PILOT_ID || 'groundtruth-pilot.v1';

// Environment roles bootstrap a durable assignment once. A persisted downgrade
// remains authoritative, including after restarts.
export async function platformRole(config: RuntimeConfig, userId: string): Promise<PlatformRole> {
  let bootstrap: PlatformRole = 'user';
  try {
    const roles: unknown = JSON.parse(config.STAFF_USER_ROLES || '{}');
    if (roles && typeof roles === 'object' && !Array.isArray(roles) && Object.hasOwn(roles, userId)) {
      const value = (roles as Record<string, unknown>)[userId];
      if (value === 'owner') bootstrap = 'developer';
      if (value === 'tutor') bootstrap = 'teacher';
    }
  } catch { /* Invalid bootstrap configuration grants nothing. */ }
  if (bootstrap !== 'user') await config.DB.prepare(
    'INSERT OR IGNORE INTO platform_access(user_id,pilot_id,role,granted_by,updated_at) VALUES(?,?,?,?,?)'
  ).bind(userId, scope(config), bootstrap, 'operator-bootstrap', new Date().toISOString()).run();
  const row = await config.DB.prepare('SELECT role FROM platform_access WHERE user_id=? AND pilot_id=?')
    .bind(userId, scope(config)).first<{ role: PlatformRole }>();
  return row?.role || 'user';
}

export async function requireDeveloper(config: RuntimeConfig, userId: string) {
  if (await platformRole(config, userId) !== 'developer') throw new ApiError(403, 'DEVELOPER_REQUIRED');
}

export async function requireOperator(config: RuntimeConfig, userId: string) {
  await requireDeveloper(config, userId);
  let roles: Record<string, unknown> = {};
  try { roles = JSON.parse(config.STAFF_USER_ROLES || '{}'); } catch { /* Deny. */ }
  if (!roles || !Object.hasOwn(roles, userId) || roles[userId] !== 'owner') throw new ApiError(403, 'OPERATOR_REQUIRED');
}

export async function handleDeveloper(request: Request, config: RuntimeConfig, userId: string, body: Record<string, unknown>): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/developer/')) return null;
  await requireDeveloper(config, userId);
  if (path === '/api/developer/status' && request.method === 'GET') {
    const counts = await config.DB.prepare(`SELECT
      (SELECT count(*) FROM session_scopes x JOIN sessions s ON s.id=x.session_id WHERE x.pilot_id=? AND s.status='active' AND s.expires_at>?) AS activities,
      (SELECT count(*) FROM platform_access WHERE pilot_id=? AND role='teacher') AS teachers`)
      .bind(scope(config), new Date().toISOString(), scope(config)).first();
    const access = await config.DB.prepare('SELECT user_id AS userId,role,updated_at AS updatedAt FROM platform_access WHERE pilot_id=? ORDER BY updated_at DESC LIMIT 100').bind(scope(config)).all();
    const pendingTeachers = await config.DB.prepare("SELECT user_id AS userId,display_name AS displayName FROM account_profiles WHERE pilot_id=? AND application_status='pending' ORDER BY created_at LIMIT 50").bind(scope(config)).all();
    const audit = await config.DB.prepare('SELECT actor_id AS actorId,target_id AS targetId,role,created_at AS createdAt FROM access_audit WHERE pilot_id=? ORDER BY created_at DESC LIMIT 20').bind(scope(config)).all();
    return json({ pendingTeachers: pendingTeachers.results, localModelEnabled: config.LOCAL_LLM_ENABLED === 'true', pilotId: scope(config), database: 'connected', modelCallsEnabled: config.MODEL_CALLS_ENABLED === 'true', modelKeyConfigured: !!config.MODEL_API_KEY, counts, access: access.results, audit: audit.results });
  }
  if (path === '/api/developer/access' && request.method === 'POST') {
    fields(body, ['userId','role']);
    const target = string(body.userId, 'userId', 1, 200);
    const role = body.role;
    if (!['user','teacher','developer'].includes(String(role)) || typeof role !== 'string') throw new ApiError(400,'INVALID_ROLE');
    // Prevent locking out the owner through the UI.
    if (target === userId) throw new ApiError(409,'SELF_ROLE_CHANGE_FORBIDDEN');
    const at = new Date().toISOString();
    await config.DB.batch([
      config.DB.prepare('INSERT INTO platform_access(user_id,pilot_id,role,granted_by,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,pilot_id) DO UPDATE SET role=excluded.role,granted_by=excluded.granted_by,updated_at=excluded.updated_at').bind(target,scope(config),role,userId,at),
      config.DB.prepare("UPDATE account_profiles SET application_status=?,updated_at=? WHERE user_id=? AND pilot_id=? AND requested_role='teacher'").bind(role==='teacher'?'approved':'declined',at,target,scope(config)),
      config.DB.prepare('INSERT INTO access_audit(id,actor_id,target_id,pilot_id,role,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),userId,target,scope(config),role,at),
    ]);
    return json({ userId: target, role });
  }
  throw new ApiError(404,'NOT_FOUND');
}
