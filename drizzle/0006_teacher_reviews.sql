CREATE TABLE `study_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`level` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `study_exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_review_level" CHECK("study_reviews"."level" IN ('insufficient','supported','explained','transferred'))
);
--> statement-breakpoint
CREATE INDEX `study_reviews_exercise_time` ON `study_reviews` (`exercise_id`,`created_at`);