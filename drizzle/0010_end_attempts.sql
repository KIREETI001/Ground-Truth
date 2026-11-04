DROP INDEX `study_one_open_exercise`;--> statement-breakpoint
ALTER TABLE `study_exercises` ADD `ended_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `study_one_open_exercise` ON `study_exercises` (`project_id`) WHERE "study_exercises"."status" IN ('guided','independent') AND "study_exercises"."ended_at" IS NULL;