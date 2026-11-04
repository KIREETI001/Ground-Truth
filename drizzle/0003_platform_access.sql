CREATE TABLE `access_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`target_id` text NOT NULL,
	`pilot_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "access_audit_role" CHECK("access_audit"."role" IN ('user','teacher','developer'))
);
--> statement-breakpoint
CREATE TABLE `platform_access` (
	`user_id` text NOT NULL,
	`pilot_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_by` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `pilot_id`),
	CONSTRAINT "platform_access_role" CHECK("platform_access"."role" IN ('user','teacher','developer'))
);
--> statement-breakpoint
CREATE TABLE `session_scopes` (
	`session_id` text PRIMARY KEY NOT NULL,
	`pilot_id` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
INSERT INTO session_scopes(session_id,pilot_id)
 SELECT s.id,m.pilot_id FROM sessions s JOIN pilot_memberships m ON m.user_id=s.owner_id;
CREATE TRIGGER sessions_scope_insert AFTER INSERT ON sessions
 BEGIN
 INSERT INTO session_scopes(session_id,pilot_id)
 SELECT NEW.id,pilot_id FROM pilot_memberships WHERE user_id=NEW.owner_id;
 END;
