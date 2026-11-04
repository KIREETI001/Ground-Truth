import type { RuntimeConfig } from '../contracts.ts';
import { ApiError } from '../server/http.ts';

export const DEMO_USER_PREFIX = 'demo_';
export const DEMO_USERNAME_PREFIX = 'gt-demo-';
export const DEMO_WINDOW_MS = 10 * 60 * 1000;

export function isDemoUser(userId: string): boolean {
  return /^demo_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(userId);
}

export async function sha256(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

function hex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('');
}

function canonicalIp(value: string): string | null {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    const parts = value.split('.').map(Number);
    return parts.every(part => part <= 255) ? parts.join('.') : null;
  }
  if (!/^[a-f0-9:.]+$/i.test(value) || !value.includes(':')) return null;
  try {
    const canonical = new URL('http://[' + value + ']/').hostname.toLowerCase();
    const mapped = /^\[::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})\]$/.exec(canonical);
    if (mapped) {
      const upper = parseInt(mapped[1], 16), lower = parseInt(mapped[2], 16);
      return [upper >>> 8, upper & 255, lower >>> 8, lower & 255].join('.');
    }
    return canonical;
  }
  catch { return null; }
}

/** Only trust a header when the server explicitly identifies its owning proxy.
 * Vercel overwrites x-vercel-forwarded-for at its ingress. Arbitrary forwarded
 * headers and caller-supplied visitor/project IDs are never an identity. */
export async function requestIdentity(request: Request, config: RuntimeConfig, strict = false): Promise<string> {
  const host = new URL(request.url).hostname;
  if (config.CLOUD_ENABLED !== 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(host)) {
    return sha256('groundtruth-loopback');
  }
  if (config.TRUSTED_PROXY === 'vercel') {
    const ip = canonicalIp(request.headers.get('x-vercel-forwarded-for') || '');
    if (!ip || !config.DEMO_IDENTITY_SECRET || config.DEMO_IDENTITY_SECRET.length < 32) {
      throw new ApiError(503, 'REQUEST_IDENTITY_UNAVAILABLE', 'The temporary sample is unavailable. Please retry shortly.');
    }
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(config.DEMO_IDENTITY_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('groundtruth-request.v1:' + ip)));
  }
  if (strict) throw new ApiError(503, 'REQUEST_IDENTITY_UNAVAILABLE', 'The temporary sample is unavailable. Please retry shortly.');
  // Existing non-Vercel integrations retain a bounded shared safety budget.
  // They cannot create anonymous demos without verified ingress identity.
  return sha256('groundtruth-unverified-ingress');
}

export async function enforceRateLimit(config: RuntimeConfig, bucket: string, cap: number, code: string, message: string): Promise<void> {
  const at = Date.now(), cutoff = at - DEMO_WINDOW_MS;
  const attempt = await config.DB.prepare(`INSERT INTO local_auth_attempts(bucket,window_started_at,attempts) VALUES(?,?,1)
    ON CONFLICT(bucket) DO UPDATE SET
    attempts=CASE WHEN window_started_at<=? THEN 1 ELSE attempts+1 END,
    window_started_at=CASE WHEN window_started_at<=? THEN excluded.window_started_at ELSE window_started_at END
    RETURNING attempts`).bind(bucket, at, cutoff, cutoff).first<{ attempts: number }>();
  if (!attempt || attempt.attempts > cap) throw new ApiError(429, code, message);
}

export function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  return value !== undefined && Number.isInteger(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
}

/** Demo accounts have a server-only namespace and expire with their membership.
 * Delete their related data before the auth user, because several historical
 * application tables deliberately have no FK to the local account table. */
export async function purgeExpiredDemoAccounts(config: RuntimeConfig): Promise<void> {
  const at = new Date().toISOString();
  const expired = await config.DB.prepare(`SELECT u.user_id FROM local_auth_users u JOIN pilot_memberships p ON p.user_id=u.user_id
    WHERE substr(u.user_id,1,5)='demo_' AND substr(u.username,1,8)='gt-demo-'
    AND substr(u.password_hash,1,15)='!demo-disabled:' AND p.expires_at<=? LIMIT 100`).bind(at).all<{ user_id: string }>();
  for (const { user_id: user } of expired.results) {
    if (!isDemoUser(user)) continue;
    await config.DB.batch([
      config.DB.prepare('DELETE FROM study_projects WHERE owner_id=?').bind(user),
      config.DB.prepare('DELETE FROM study_repository_maps WHERE owner_id=?').bind(user),
      config.DB.prepare('DELETE FROM sessions WHERE owner_id=?').bind(user),
      config.DB.prepare('DELETE FROM class_enrollments WHERE student_id=?').bind(user),
      config.DB.prepare('DELETE FROM class_join_attempts WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM account_profiles WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM practice_profiles WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM learner_records WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM pulse_votes WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM enrollment_attempts WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM study_usage WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM study_model_receipts WHERE owner_id=?').bind(user),
      config.DB.prepare('DELETE FROM coach_locks WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM platform_access WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM pilot_memberships WHERE user_id=?').bind(user),
      config.DB.prepare('DELETE FROM local_auth_users WHERE user_id=?').bind(user),
    ]);
  }
  await config.DB.prepare('DELETE FROM local_auth_attempts WHERE window_started_at<=?').bind(Date.now() - 24 * 60 * 60 * 1000).run();
}
