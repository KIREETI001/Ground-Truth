-- PostgreSQL deployment of the existing normalized GroundTruth model.

-- No local accounts or learning records are copied into the public demo.

-- Run once using an operator connection; application requests use the private schema.

CREATE SCHEMA groundtruth;

REVOKE ALL ON SCHEMA groundtruth FROM PUBLIC;

SET search_path TO groundtruth, pg_catalog;

CREATE TABLE "coach_locks" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" text NOT NULL
);

ALTER TABLE "coach_locks" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "pilot_memberships" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text PRIMARY KEY NOT NULL,
	"pilot_id" text NOT NULL,
	"role" text NOT NULL,
	"enrolled_at" text NOT NULL,
	"expires_at" text NOT NULL,
	CONSTRAINT "pilot_membership_role" CHECK("pilot_memberships"."role" IN ('student','staff'))
);

ALTER TABLE "pilot_memberships" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "practice_profiles" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text PRIMARY KEY NOT NULL,
	"notice_version" text,
	"notice_acknowledged_at" text,
	"research_opt_in" bigint DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL
);

ALTER TABLE "practice_profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "sessions" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"status" text NOT NULL,
	"phase" text NOT NULL,
	"revision" bigint NOT NULL,
	"document_json" text NOT NULL,
	"request_id" text NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL,
	CONSTRAINT "session_status" CHECK("sessions"."status" IN ('active','deleting'))
);

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "enrollment_attempts" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text NOT NULL,
	"pilot_id" text NOT NULL,
	"window_started_at" bigint NOT NULL,
	"attempts" bigint NOT NULL,
	PRIMARY KEY("user_id", "pilot_id")
);

ALTER TABLE "enrollment_attempts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "learner_records" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text PRIMARY KEY NOT NULL,
	"state_json" text NOT NULL,
	"revision" text NOT NULL,
	"notice_version" text NOT NULL,
	"notice_acknowledged_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"expires_at" text NOT NULL
);

ALTER TABLE "learner_records" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "pulse_votes" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text NOT NULL,
	"poll_day" text NOT NULL,
	"poll_id" text NOT NULL,
	"choice_id" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"expires_at" text NOT NULL,
	PRIMARY KEY("user_id", "poll_day")
);

ALTER TABLE "pulse_votes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "access_audit" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"target_id" text NOT NULL,
	"pilot_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "access_audit_role" CHECK("access_audit"."role" IN ('user','teacher','developer'))
);

ALTER TABLE "access_audit" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "platform_access" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text NOT NULL,
	"pilot_id" text NOT NULL,
	"role" text NOT NULL,
	"granted_by" text NOT NULL,
	"updated_at" text NOT NULL,
	PRIMARY KEY("user_id", "pilot_id"),
	CONSTRAINT "platform_access_role" CHECK("platform_access"."role" IN ('user','teacher','developer'))
);

ALTER TABLE "platform_access" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "account_profiles" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"pilot_id" text NOT NULL,
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"requested_role" text NOT NULL,
	"application_status" text DEFAULT 'none' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "account_requested_role" CHECK("account_profiles"."requested_role" IN ('user','teacher')),
	CONSTRAINT "application_status_values" CHECK("account_profiles"."application_status" IN ('none','pending','approved','declined'))
);

ALTER TABLE "account_profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "study_projects" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"pilot_id" text NOT NULL,
	"goal" text NOT NULL,
	"snapshot_json" text NOT NULL,
	"analysis_json" text,
	"teacher_id" text,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL
);

ALTER TABLE "study_projects" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "study_usage" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text NOT NULL,
	"usage_day" text NOT NULL,
	"attempts" bigint NOT NULL,
	PRIMARY KEY("user_id", "usage_day")
);

ALTER TABLE "study_usage" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "local_auth_attempts" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"bucket" text PRIMARY KEY NOT NULL,
	"window_started_at" bigint NOT NULL,
	"attempts" bigint NOT NULL
);

ALTER TABLE "local_auth_attempts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "local_auth_users" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" text NOT NULL
);

ALTER TABLE "local_auth_users" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "study_repository_maps" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"pilot_id" text NOT NULL,
	"map_json" text NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL
);

ALTER TABLE "study_repository_maps" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "class_join_attempts" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"user_id" text NOT NULL,
	"pilot_id" text NOT NULL,
	"window_started_at" bigint NOT NULL,
	"attempts" bigint NOT NULL,
	PRIMARY KEY("user_id", "pilot_id")
);

ALTER TABLE "class_join_attempts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "teacher_classes" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"teacher_id" text NOT NULL,
	"pilot_id" text NOT NULL,
	"name" text NOT NULL,
	"join_code" text NOT NULL,
	"created_at" text NOT NULL
);

ALTER TABLE "teacher_classes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "coach_usage" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"session_id" text PRIMARY KEY NOT NULL,
	"provider_attempts" bigint DEFAULT 0 NOT NULL,
	FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "coach_usage" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "lab_runs" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"case_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"phase" text NOT NULL,
	"fixture_id" text NOT NULL,
	"source_digest" text NOT NULL,
	"source_json" text NOT NULL,
	"plan_digest" text NOT NULL,
	"prediction_id" text NOT NULL,
	"plan_json" text NOT NULL,
	"status" text NOT NULL,
	"completed_steps" bigint DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL,
	FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "lab_run_status" CHECK("lab_runs"."status" IN ('running','finalizing','complete','infra_error'))
);

ALTER TABLE "lab_runs" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "session_scopes" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"session_id" text PRIMARY KEY NOT NULL,
	"pilot_id" text NOT NULL,
	FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "session_scopes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "study_exercises" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"prompt_json" text NOT NULL,
	"rubric_json" text NOT NULL,
	"status" text NOT NULL,
	"answer" text,
	"feedback_json" text,
	"started_at" text,
	"submitted_at" text,
	"created_at" text NOT NULL, "ended_at" text,
	FOREIGN KEY ("project_id") REFERENCES "study_projects"("id") ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_exercise_status" CHECK("study_exercises"."status" IN ('guided','independent','submitted'))
);

ALTER TABLE "study_exercises" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "study_concepts" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"local_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"file_paths_json" text NOT NULL,
	"prerequisites_json" text NOT NULL,
	"ordinal" bigint NOT NULL,
	FOREIGN KEY ("project_id") REFERENCES "study_projects"("id") ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_concept_category" CHECK("study_concepts"."category" IN ('behavior','architecture','testing'))
);

ALTER TABLE "study_concepts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "local_auth_sessions" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "local_auth_users"("user_id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "local_auth_sessions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "study_learning_paths" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"project_id" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"area" text NOT NULL,
	"feature_title" text NOT NULL,
	"concepts_json" text NOT NULL,
	"transfer_goal" text NOT NULL,
	"map_id" text NOT NULL,
	FOREIGN KEY ("project_id") REFERENCES "study_projects"("id") ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_learning_purpose" CHECK("study_learning_paths"."purpose" IN ('improve','transfer'))
);

ALTER TABLE "study_learning_paths" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "class_enrollments" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"class_id" text NOT NULL,
	"student_id" text NOT NULL,
	"joined_at" text NOT NULL,
	PRIMARY KEY("class_id", "student_id"),
	FOREIGN KEY ("class_id") REFERENCES "teacher_classes"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "class_enrollments" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "lab_evidence" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"run_id" text PRIMARY KEY NOT NULL,
	"evidence_json" text NOT NULL,
	"evidence_hash" text NOT NULL,
	"finalized_at" text NOT NULL,
	FOREIGN KEY ("run_id") REFERENCES "lab_runs"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "lab_evidence" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "lab_registrations" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"event_id" text NOT NULL,
	"attendee_ref" text NOT NULL,
	"intent_id" text NOT NULL,
	"idempotency_key" text,
	"payload_hash" text NOT NULL,
	"created_by_step" text NOT NULL,
	"registered_at" text NOT NULL,
	FOREIGN KEY ("run_id") REFERENCES "lab_runs"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "lab_registrations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "study_events" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"exercise_id" text,
	"kind" text NOT NULL,
	"detail_json" text NOT NULL,
	"created_at" text NOT NULL,
	FOREIGN KEY ("project_id") REFERENCES "study_projects"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("exercise_id") REFERENCES "study_exercises"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "study_events" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "study_reviews" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"exercise_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"level" text NOT NULL,
	"note" text NOT NULL,
	"created_at" text NOT NULL,
	FOREIGN KEY ("exercise_id") REFERENCES "study_exercises"("id") ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_review_level" CHECK("study_reviews"."level" IN ('insufficient','supported','explained','transferred'))
);

ALTER TABLE "study_reviews" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "study_exercise_concepts" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"exercise_id" text NOT NULL,
	"concept_id" text NOT NULL,
	PRIMARY KEY("exercise_id", "concept_id"),
	FOREIGN KEY ("exercise_id") REFERENCES "study_exercises"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("concept_id") REFERENCES "study_concepts"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "study_exercise_concepts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "lab_receipts" (
 "rowid" bigint GENERATED ALWAYS AS IDENTITY,
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"step_id" text NOT NULL,
	"step_index" bigint NOT NULL,
	"intent_id" text NOT NULL,
	"decision" text NOT NULL,
	"registration_id" text,
	"handler_status" bigint,
	"delivered_status" bigint NOT NULL,
	"delivery_policy" text NOT NULL,
	"committed_row_count_after" bigint NOT NULL,
	"committed_at" text NOT NULL,
	FOREIGN KEY ("run_id") REFERENCES "lab_runs"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("registration_id") REFERENCES "lab_registrations"("id") ON UPDATE no action ON DELETE cascade
);

ALTER TABLE "lab_receipts" ENABLE ROW LEVEL SECURITY;

CREATE INDEX "access_audit_pilot_time" ON "access_audit" ("pilot_id","created_at");

CREATE INDEX "class_enrollments_student" ON "class_enrollments" ("student_id");

CREATE UNIQUE INDEX "lab_receipts_run_step_unique" ON "lab_receipts" ("run_id","step_id");

CREATE UNIQUE INDEX "lab_registrations_run_key_unique" ON "lab_registrations" ("run_id","idempotency_key");

CREATE UNIQUE INDEX "lab_runs_session_case_unique" ON "lab_runs" ("session_id","case_id");

CREATE INDEX "local_auth_session_user" ON "local_auth_sessions" ("user_id","expires_at");

CREATE UNIQUE INDEX "local_auth_users_username_unique" ON "local_auth_users" ("username");

CREATE INDEX "session_scopes_pilot" ON "session_scopes" ("pilot_id","session_id");

CREATE UNIQUE INDEX "sessions_owner_request_unique" ON "sessions" ("owner_id","request_id");

CREATE UNIQUE INDEX "study_concept_local_unique" ON "study_concepts" ("project_id","local_id");

CREATE INDEX "study_events_project_time" ON "study_events" ("project_id","created_at");

CREATE INDEX "study_maps_owner_expiry" ON "study_repository_maps" ("owner_id","expires_at");

CREATE UNIQUE INDEX "study_one_open_exercise" ON "study_exercises" ("project_id") WHERE "study_exercises"."status" IN ('guided','independent') AND "study_exercises"."ended_at" IS NULL;

CREATE INDEX "study_projects_owner" ON "study_projects" ("owner_id","created_at");

CREATE INDEX "study_projects_teacher" ON "study_projects" ("teacher_id","pilot_id");

CREATE INDEX "study_reviews_exercise_time" ON "study_reviews" ("exercise_id","created_at");

CREATE UNIQUE INDEX "teacher_classes_join_code_unique" ON "teacher_classes" ("join_code");

CREATE INDEX "teacher_classes_owner" ON "teacher_classes" ("teacher_id","pilot_id");

CREATE FUNCTION groundtruth.sessions_scope_insert_fn() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=groundtruth,pg_catalog AS $$
BEGIN
 INSERT INTO groundtruth.session_scopes(session_id,pilot_id)
 SELECT NEW.id,pilot_id FROM groundtruth.pilot_memberships WHERE user_id=NEW.owner_id;
 RETURN NEW;
END;
$$;
CREATE TRIGGER sessions_scope_insert AFTER INSERT ON groundtruth.sessions
 FOR EACH ROW EXECUTE FUNCTION groundtruth.sessions_scope_insert_fn();
REVOKE ALL ON ALL TABLES IN SCHEMA groundtruth FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA groundtruth FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA groundtruth FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA groundtruth REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA groundtruth REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA groundtruth REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
   EXECUTE format('REVOKE ALL ON SCHEMA groundtruth FROM %I',role_name);
   EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA groundtruth FROM %I',role_name);
   EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA groundtruth FROM %I',role_name);
   EXECUTE format('REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA groundtruth FROM %I',role_name);
  END IF;
 END LOOP;
END;
$$;
-- Runtime credentials are provisioned separately. The role has no password or
-- login until the operator supplies a secret, and cannot access public tables.
CREATE ROLE groundtruth_app NOLOGIN NOINHERIT;
CREATE TABLE groundtruth.cloud_workspaces (
 rowid bigint GENERATED ALWAYS AS IDENTITY,
 project_id text PRIMARY KEY REFERENCES groundtruth.study_projects(id) ON DELETE CASCADE,
 owner_id text NOT NULL,
 pilot_id text NOT NULL,
 commit_sha text NOT NULL,
 state_json text NOT NULL,
 version bigint NOT NULL DEFAULT 0,
 updated_at text NOT NULL
);
ALTER TABLE groundtruth.cloud_workspaces ENABLE ROW LEVEL SECURITY;
CREATE INDEX cloud_workspaces_owner_scope ON groundtruth.cloud_workspaces(owner_id,pilot_id);
GRANT USAGE ON SCHEMA groundtruth TO groundtruth_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA groundtruth TO groundtruth_app;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA groundtruth TO groundtruth_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA groundtruth TO groundtruth_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA groundtruth GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO groundtruth_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA groundtruth GRANT USAGE,SELECT ON SEQUENCES TO groundtruth_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA groundtruth GRANT EXECUTE ON FUNCTIONS TO groundtruth_app;
DO $$
DECLARE table_name text;
BEGIN
 FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname='groundtruth' LOOP
  EXECUTE format('CREATE POLICY backend_access ON groundtruth.%I FOR ALL TO groundtruth_app USING (true) WITH CHECK (true)',table_name);
 END LOOP;
END;
$$;
RESET search_path;
