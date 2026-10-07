CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`day` integer NOT NULL,
	`department` text NOT NULL,
	`level` integer NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`course` text NOT NULL,
	`instructor` text NOT NULL,
	`room` text NOT NULL,
	`group_name` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'محاضرة' NOT NULL,
	`source` text DEFAULT 'إضافة يدوية' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
