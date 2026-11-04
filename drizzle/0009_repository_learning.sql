CREATE TABLE `study_learning_paths` (
	`project_id` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`area` text NOT NULL,
	`feature_title` text NOT NULL,
	`concepts_json` text NOT NULL,
	`transfer_goal` text NOT NULL,
	`map_id` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `study_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_learning_purpose" CHECK("study_learning_paths"."purpose" IN ('improve','transfer'))
);
--> statement-breakpoint
CREATE TABLE `study_repository_maps` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`pilot_id` text NOT NULL,
	`map_json` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `study_maps_owner_expiry` ON `study_repository_maps` (`owner_id`,`expires_at`);