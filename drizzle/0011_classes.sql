CREATE TABLE `class_enrollments` (
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`joined_at` text NOT NULL,
	PRIMARY KEY(`class_id`, `student_id`),
	FOREIGN KEY (`class_id`) REFERENCES `teacher_classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `class_enrollments_student` ON `class_enrollments` (`student_id`);--> statement-breakpoint
CREATE TABLE `class_join_attempts` (
	`user_id` text NOT NULL,
	`pilot_id` text NOT NULL,
	`window_started_at` integer NOT NULL,
	`attempts` integer NOT NULL,
	PRIMARY KEY(`user_id`, `pilot_id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`pilot_id` text NOT NULL,
	`name` text NOT NULL,
	`join_code` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_classes_join_code_unique` ON `teacher_classes` (`join_code`);--> statement-breakpoint
CREATE INDEX `teacher_classes_owner` ON `teacher_classes` (`teacher_id`,`pilot_id`);