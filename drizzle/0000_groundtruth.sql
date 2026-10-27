CREATE TABLE `coach_locks` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coach_usage` (
	`session_id` text PRIMARY KEY NOT NULL,
	`provider_attempts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lab_evidence` (
	`run_id` text PRIMARY KEY NOT NULL,
	`evidence_json` text NOT NULL,
	`evidence_hash` text NOT NULL,
	`finalized_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `lab_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lab_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`step_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`intent_id` text NOT NULL,
	`decision` text NOT NULL,
	`registration_id` text,
	`handler_status` integer,
	`delivered_status` integer NOT NULL,
	`delivery_policy` text NOT NULL,
	`committed_row_count_after` integer NOT NULL,
	`committed_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `lab_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `lab_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lab_receipts_run_step_unique` ON `lab_receipts` (`run_id`,`step_id`);--> statement-breakpoint
CREATE TABLE `lab_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`event_id` text NOT NULL,
	`attendee_ref` text NOT NULL,
	`intent_id` text NOT NULL,
	`idempotency_key` text,
	`payload_hash` text NOT NULL,
	`created_by_step` text NOT NULL,
	`registered_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `lab_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lab_registrations_run_key_unique` ON `lab_registrations` (`run_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `lab_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`case_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`phase` text NOT NULL,
	`fixture_id` text NOT NULL,
	`source_digest` text NOT NULL,
	`source_json` text NOT NULL,
	`plan_digest` text NOT NULL,
	`prediction_id` text NOT NULL,
	`plan_json` text NOT NULL,
	`status` text NOT NULL,
	`completed_steps` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "lab_run_status" CHECK("lab_runs"."status" IN ('running','finalizing','complete','infra_error'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lab_runs_session_case_unique` ON `lab_runs` (`session_id`,`case_id`);--> statement-breakpoint
CREATE TABLE `pilot_memberships` (
	`user_id` text PRIMARY KEY NOT NULL,
	`pilot_id` text NOT NULL,
	`role` text NOT NULL,
	`enrolled_at` text NOT NULL,
	`expires_at` text NOT NULL,
	CONSTRAINT "pilot_membership_role" CHECK("pilot_memberships"."role" IN ('student','staff'))
);
--> statement-breakpoint
CREATE TABLE `practice_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`notice_version` text,
	`notice_acknowledged_at` text,
	`research_opt_in` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`status` text NOT NULL,
	`phase` text NOT NULL,
	`revision` integer NOT NULL,
	`document_json` text NOT NULL,
	`request_id` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	CONSTRAINT "session_status" CHECK("sessions"."status" IN ('active','deleting'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_owner_request_unique` ON `sessions` (`owner_id`,`request_id`);