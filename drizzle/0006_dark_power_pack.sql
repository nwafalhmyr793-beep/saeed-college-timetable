CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`action` text NOT NULL,
	`entry_id` text NOT NULL,
	`occurrence_date` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`entry_json` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_account_created` ON `notifications` (`account_id`,`created_at`);