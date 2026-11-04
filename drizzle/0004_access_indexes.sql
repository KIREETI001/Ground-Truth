CREATE INDEX `access_audit_pilot_time` ON `access_audit` (`pilot_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `session_scopes_pilot` ON `session_scopes` (`pilot_id`,`session_id`);