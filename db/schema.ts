import { sql } from 'drizzle-orm';
import { check, integer, primaryKey, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const practiceProfiles = sqliteTable('practice_profiles', {
  userId: text('user_id').primaryKey(), noticeVersion: text('notice_version'),
  noticeAcknowledgedAt: text('notice_acknowledged_at'), researchOptIn: integer('research_opt_in').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});
export const pilotMemberships = sqliteTable('pilot_memberships', {
  userId: text('user_id').primaryKey(), pilotId: text('pilot_id').notNull(), role: text('role').notNull(),
  enrolledAt: text('enrolled_at').notNull(), expiresAt: text('expires_at').notNull(),
}, table => [check('pilot_membership_role', sql`${table.role} IN ('student','staff')`)]);
export const enrollmentAttempts = sqliteTable('enrollment_attempts', {
  userId: text('user_id').notNull(), pilotId: text('pilot_id').notNull(),
  windowStartedAt: integer('window_started_at').notNull(), attempts: integer('attempts').notNull(),
}, table => [primaryKey({ columns: [table.userId, table.pilotId] })]);
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), status: text('status').notNull(),
  phase: text('phase').notNull(), revision: integer('revision').notNull(), documentJson: text('document_json').notNull(),
  requestId: text('request_id').notNull(), createdAt: text('created_at').notNull(), expiresAt: text('expires_at').notNull(),
}, table => [unique('sessions_owner_request_unique').on(table.ownerId,table.requestId),
  check('session_status', sql`${table.status} IN ('active','deleting')`)]);
export const coachUsage = sqliteTable('coach_usage', {
  sessionId: text('session_id').primaryKey().references(() => sessions.id, { onDelete: 'cascade' }),
  providerAttempts: integer('provider_attempts').notNull().default(0),
});
export const coachLocks = sqliteTable('coach_locks', {
  userId: text('user_id').primaryKey(), token: text('token').notNull(), expiresAt: text('expires_at').notNull(),
});
export const labRuns = sqliteTable('lab_runs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  caseId: text('case_id').notNull(), ownerId: text('owner_id').notNull(), phase: text('phase').notNull(),
  fixtureId: text('fixture_id').notNull(), sourceDigest: text('source_digest').notNull(), sourceJson: text('source_json').notNull(),
  planDigest: text('plan_digest').notNull(), predictionId: text('prediction_id').notNull(),
  planJson: text('plan_json').notNull(), status: text('status').notNull(),
  completedSteps: integer('completed_steps').notNull().default(0),
  createdAt: text('created_at').notNull(), expiresAt: text('expires_at').notNull(),
}, table => [unique('lab_runs_session_case_unique').on(table.sessionId,table.caseId),
  check('lab_run_status', sql`${table.status} IN ('running','finalizing','complete','infra_error')`)]);
export const labRegistrations = sqliteTable('lab_registrations', {
  id: text('id').primaryKey(), runId: text('run_id').notNull().references(() => labRuns.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull(), attendeeRef: text('attendee_ref').notNull(), intentId: text('intent_id').notNull(),
  idempotencyKey: text('idempotency_key'), payloadHash: text('payload_hash').notNull(),
  createdByStep: text('created_by_step').notNull(), registeredAt: text('registered_at').notNull(),
}, table => [unique('lab_registrations_run_key_unique').on(table.runId,table.idempotencyKey)]);
export const labReceipts = sqliteTable('lab_receipts', {
  id: text('id').primaryKey(), runId: text('run_id').notNull().references(() => labRuns.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull(), stepIndex: integer('step_index').notNull(), intentId: text('intent_id').notNull(),
  decision: text('decision').notNull(),
  registrationId: text('registration_id').references(() => labRegistrations.id, { onDelete: 'cascade' }),
  handlerStatus: integer('handler_status'), deliveredStatus: integer('delivered_status').notNull(),
  deliveryPolicy: text('delivery_policy').notNull(), committedRowCountAfter: integer('committed_row_count_after').notNull(),
  committedAt: text('committed_at').notNull(),
}, table => [unique('lab_receipts_run_step_unique').on(table.runId,table.stepId)]);
export const labEvidence = sqliteTable('lab_evidence', {
  runId: text('run_id').primaryKey().references(() => labRuns.id, { onDelete: 'cascade' }),
  evidenceJson: text('evidence_json').notNull(), evidenceHash: text('evidence_hash').notNull(), finalizedAt: text('finalized_at').notNull(),
});
