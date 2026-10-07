CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`occurrence_date` text,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`actor_username` text NOT NULL,
	`occurred_at` text NOT NULL,
	`department` text NOT NULL,
	`level` integer NOT NULL,
	`entry_json` text NOT NULL,
	`before_json` text NOT NULL,
	`after_json` text NOT NULL
);
