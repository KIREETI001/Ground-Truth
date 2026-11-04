import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex, unique } from 'drizzle-orm/sqlite-core';

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
export const learnerRecords = sqliteTable('learner_records', {
  userId: text('user_id').primaryKey(), stateJson: text('state_json').notNull(), revision: text('revision').notNull(),
  noticeVersion: text('notice_version').notNull(), noticeAcknowledgedAt: text('notice_acknowledged_at').notNull(),
  updatedAt: text('updated_at').notNull(), expiresAt: text('expires_at').notNull(),
});
export const pulseVotes = sqliteTable('pulse_votes', {
  userId: text('user_id').notNull(), pollDay: text('poll_day').notNull(), pollId: text('poll_id').notNull(),
  choiceId: text('choice_id').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(), expiresAt: text('expires_at').notNull(),
}, table => [primaryKey({ columns: [table.userId, table.pollDay] })]);
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

export const platformAccess = sqliteTable('platform_access', {
 userId: text('user_id').notNull(), pilotId: text('pilot_id').notNull(), role: text('role').notNull(),
 grantedBy: text('granted_by').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [primaryKey({columns:[t.userId,t.pilotId]}),check('platform_access_role',sql`${t.role} IN ('user','teacher','developer')`)]);
export const accessAudit = sqliteTable('access_audit', {
 id: text('id').primaryKey(), actorId: text('actor_id').notNull(), targetId: text('target_id').notNull(),
 pilotId: text('pilot_id').notNull(), role: text('role').notNull(), createdAt: text('created_at').notNull(),
}, t => [index('access_audit_pilot_time').on(t.pilotId,t.createdAt),check('access_audit_role',sql`${t.role} IN ('user','teacher','developer')`)]);
export const sessionScopes = sqliteTable('session_scopes', {
 sessionId: text('session_id').primaryKey().references(()=>sessions.id,{onDelete:'cascade'}),
 pilotId: text('pilot_id').notNull(),
}, t => [index('session_scopes_pilot').on(t.pilotId,t.sessionId)]);

export const accountProfiles = sqliteTable('account_profiles',{
 userId:text('user_id').primaryKey(),pilotId:text('pilot_id').notNull(),displayName:text('display_name').notNull(),requestedRole:text('requested_role').notNull(),
 applicationStatus:text('application_status').notNull().default('none'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[check('account_requested_role',sql`${t.requestedRole} IN ('user','teacher')`),check('application_status_values',sql`${t.applicationStatus} IN ('none','pending','approved','declined')`)]);
export const studyProjects=sqliteTable('study_projects',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),pilotId:text('pilot_id').notNull(),goal:text('goal').notNull(),snapshotJson:text('snapshot_json').notNull(),analysisJson:text('analysis_json'),teacherId:text('teacher_id'),createdAt:text('created_at').notNull(),expiresAt:text('expires_at').notNull(),
},t=>[index('study_projects_owner').on(t.ownerId,t.createdAt),index('study_projects_teacher').on(t.teacherId,t.pilotId)]);
export const studyExercises=sqliteTable('study_exercises',{
 id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>studyProjects.id,{onDelete:'cascade'}),promptJson:text('prompt_json').notNull(),rubricJson:text('rubric_json').notNull(),status:text('status').notNull(),answer:text('answer'),feedbackJson:text('feedback_json'),startedAt:text('started_at'),submittedAt:text('submitted_at'),createdAt:text('created_at').notNull(),endedAt:text('ended_at'),
},t=>[check('study_exercise_status',sql`${t.status} IN ('guided','independent','submitted')`),uniqueIndex('study_one_open_exercise').on(t.projectId).where(sql`${t.status} IN ('guided','independent') AND ${t.endedAt} IS NULL`)]);
export const studyEvents=sqliteTable('study_events',{
 id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>studyProjects.id,{onDelete:'cascade'}),exerciseId:text('exercise_id').references(()=>studyExercises.id,{onDelete:'cascade'}),kind:text('kind').notNull(),detailJson:text('detail_json').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('study_events_project_time').on(t.projectId,t.createdAt)]);
export const studyUsage=sqliteTable('study_usage',{userId:text('user_id').notNull(),usageDay:text('usage_day').notNull(),attempts:integer('attempts').notNull()},t=>[primaryKey({columns:[t.userId,t.usageDay]})]);

export const studyReviews=sqliteTable('study_reviews',{
 id:text('id').primaryKey(),exerciseId:text('exercise_id').notNull().references(()=>studyExercises.id,{onDelete:'cascade'}),
 teacherId:text('teacher_id').notNull(),level:text('level').notNull(),note:text('note').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('study_reviews_exercise_time').on(t.exerciseId,t.createdAt),check('study_review_level',sql`${t.level} IN ('insufficient','supported','explained','transferred')`)]);

export const studyConcepts=sqliteTable('study_concepts',{
 id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>studyProjects.id,{onDelete:'cascade'}),
 localId:text('local_id').notNull(),title:text('title').notNull(),description:text('description').notNull(),category:text('category').notNull(),
 filePathsJson:text('file_paths_json').notNull(),prerequisitesJson:text('prerequisites_json').notNull(),ordinal:integer('ordinal').notNull(),
},t=>[unique('study_concept_local_unique').on(t.projectId,t.localId),check('study_concept_category',sql`${t.category} IN ('behavior','architecture','testing')`)]);
export const studyExerciseConcepts=sqliteTable('study_exercise_concepts',{
 exerciseId:text('exercise_id').notNull().references(()=>studyExercises.id,{onDelete:'cascade'}),
 conceptId:text('concept_id').notNull().references(()=>studyConcepts.id,{onDelete:'cascade'}),
},t=>[primaryKey({columns:[t.exerciseId,t.conceptId]})]);

export const localAuthUsers=sqliteTable('local_auth_users',{
 userId:text('user_id').primaryKey(),username:text('username').notNull().unique(),passwordHash:text('password_hash').notNull(),displayName:text('display_name').notNull(),createdAt:text('created_at').notNull(),
});
export const localAuthSessions=sqliteTable('local_auth_sessions',{
 tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>localAuthUsers.userId,{onDelete:'cascade'}),expiresAt:text('expires_at').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('local_auth_session_user').on(t.userId,t.expiresAt)]);
export const localAuthAttempts=sqliteTable('local_auth_attempts',{
 bucket:text('bucket').primaryKey(),windowStartedAt:integer('window_started_at').notNull(),attempts:integer('attempts').notNull(),
});

export const studyRepositoryMaps=sqliteTable('study_repository_maps',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),pilotId:text('pilot_id').notNull(),
 mapJson:text('map_json').notNull(),createdAt:text('created_at').notNull(),expiresAt:text('expires_at').notNull(),
},t=>[index('study_maps_owner_expiry').on(t.ownerId,t.expiresAt)]);
export const studyLearningPaths=sqliteTable('study_learning_paths',{
 projectId:text('project_id').primaryKey().references(()=>studyProjects.id,{onDelete:'cascade'}),
 purpose:text('purpose').notNull(),area:text('area').notNull(),featureTitle:text('feature_title').notNull(),
 conceptsJson:text('concepts_json').notNull(),transferGoal:text('transfer_goal').notNull(),mapId:text('map_id').notNull(),
},t=>[check('study_learning_purpose',sql`${t.purpose} IN ('improve','transfer')`)]);

export const teacherClasses=sqliteTable('teacher_classes',{
 id:text('id').primaryKey(),teacherId:text('teacher_id').notNull(),pilotId:text('pilot_id').notNull(),name:text('name').notNull(),joinCode:text('join_code').notNull().unique(),createdAt:text('created_at').notNull(),
},t=>[index('teacher_classes_owner').on(t.teacherId,t.pilotId)]);
export const classEnrollments=sqliteTable('class_enrollments',{
 classId:text('class_id').notNull().references(()=>teacherClasses.id,{onDelete:'cascade'}),studentId:text('student_id').notNull(),joinedAt:text('joined_at').notNull(),
},t=>[primaryKey({columns:[t.classId,t.studentId]}),index('class_enrollments_student').on(t.studentId)]);
export const classJoinAttempts=sqliteTable('class_join_attempts',{
 userId:text('user_id').notNull(),pilotId:text('pilot_id').notNull(),windowStartedAt:integer('window_started_at').notNull(),attempts:integer('attempts').notNull(),
},t=>[primaryKey({columns:[t.userId,t.pilotId]})]);
