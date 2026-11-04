CREATE TABLE `account_profiles` (
	`pilot_id` text NOT NULL,
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`requested_role` text NOT NULL,
	`application_status` text DEFAULT 'none' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "account_requested_role" CHECK("account_profiles"."requested_role" IN ('user','teacher')),
	CONSTRAINT "application_status_values" CHECK("account_profiles"."application_status" IN ('none','pending','approved','declined'))
);
--> statement-breakpoint
CREATE TABLE `study_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`exercise_id` text,
	`kind` text NOT NULL,
	`detail_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `study_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `study_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_events_project_time` ON `study_events` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `study_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`prompt_json` text NOT NULL,
	`rubric_json` text NOT NULL,
	`status` text NOT NULL,
	`answer` text,
	`feedback_json` text,
	`started_at` text,
	`submitted_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `study_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_exercise_status" CHECK("study_exercises"."status" IN ('guided','independent','submitted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_one_open_exercise` ON `study_exercises` (`project_id`) WHERE "study_exercises"."status" IN ('guided','independent');--> statement-breakpoint
CREATE TABLE `study_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`pilot_id` text NOT NULL,
	`goal` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`analysis_json` text,
	`teacher_id` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `study_projects_owner` ON `study_projects` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `study_projects_teacher` ON `study_projects` (`teacher_id`,`pilot_id`);--> statement-breakpoint
CREATE TABLE `study_usage` (
	`user_id` text NOT NULL,
	`usage_day` text NOT NULL,
	`attempts` integer NOT NULL,
	PRIMARY KEY(`user_id`, `usage_day`)
);
