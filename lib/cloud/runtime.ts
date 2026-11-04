import { createPostgresDatabase } from './postgres-d1';
import type { RuntimeConfig } from '../contracts';

// All credentials are read on the server. No privileged database or model key
// is exported to a browser bundle, and Sites identity headers are never trusted.
export function getRuntime(): RuntimeConfig {
  const connection = process.env.DATABASE_URL;
  const unavailable = new Proxy({}, { get() { throw new Error('DATABASE_NOT_CONFIGURED'); } }) as D1Database;
  return {
    DB: connection ? createPostgresDatabase(connection) : unavailable,
    CLOUD_ENABLED: 'true', LOCAL_ACCOUNTS_ENABLED: 'true',
    DEMO_ENABLED: process.env.DEMO_ENABLED || 'false',
    DEMO_SEED_PROJECT_ID: process.env.DEMO_SEED_PROJECT_ID,
    DEMO_IDENTITY_SECRET: process.env.DEMO_IDENTITY_SECRET,
    DEMO_MAX_ACTIVE: process.env.DEMO_MAX_ACTIVE || '200',
    DEMO_MAX_STARTS_PER_WINDOW: process.env.DEMO_MAX_STARTS_PER_WINDOW || '120',
    DEMO_TTL_SECONDS: process.env.DEMO_TTL_SECONDS || '7200',
    TRUSTED_PROXY: process.env.VERCEL === '1' ? 'vercel' : undefined,
    LOCAL_LLM_ENABLED: 'false',
    MODEL_CALLS_ENABLED: process.env.MODEL_CALLS_ENABLED || 'true',
    MODEL_API_KEY: process.env.META_API_KEY || process.env.MODEL_API_KEY,
    MODEL_BASE_URL: 'https://api.meta.ai/v1', MODEL_ID: 'muse-spark-1.3',
    DEVELOPER_PASSWORD_HASH: process.env.DEVELOPER_PASSWORD_HASH,
    PILOT_ID: process.env.PILOT_ID || 'groundtruth-live.v1',
    STAFF_USER_ROLES: '{"local_seedy":"owner"}',
    PILOT_ENROLLMENT_ENABLED: 'false',
  };
}
