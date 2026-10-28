CREATE TABLE `learner_records` (
	`user_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`revision` text NOT NULL,
	`notice_version` text NOT NULL,
	`notice_acknowledged_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pulse_votes` (
	`user_id` text NOT NULL,
	`poll_day` text NOT NULL,
	`poll_id` text NOT NULL,
	`choice_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `poll_day`)
);
