CREATE TABLE `enrollment_attempts` (
	`user_id` text NOT NULL,
	`pilot_id` text NOT NULL,
	`window_started_at` integer NOT NULL,
	`attempts` integer NOT NULL,
	PRIMARY KEY(`user_id`, `pilot_id`)
);
