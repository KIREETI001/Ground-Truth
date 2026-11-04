CREATE TABLE `study_concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`local_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`file_paths_json` text NOT NULL,
	`prerequisites_json` text NOT NULL,
	`ordinal` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `study_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_concept_category" CHECK("study_concepts"."category" IN ('behavior','architecture','testing'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_concept_local_unique` ON `study_concepts` (`project_id`,`local_id`);--> statement-breakpoint
CREATE TABLE `study_exercise_concepts` (
	`exercise_id` text NOT NULL,
	`concept_id` text NOT NULL,
	PRIMARY KEY(`exercise_id`, `concept_id`),
	FOREIGN KEY (`exercise_id`) REFERENCES `study_exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`concept_id`) REFERENCES `study_concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
