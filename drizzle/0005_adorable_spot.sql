CREATE TABLE `instructors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`schedule_name` text NOT NULL,
	`aliases_json` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teaching_assignments` (
	`account_id` text NOT NULL,
	`entry_id` text NOT NULL,
	PRIMARY KEY(`account_id`, `entry_id`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD `instructor_id` text;