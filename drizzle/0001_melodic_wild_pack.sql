CREATE TABLE `cancellations` (
	`entry_id` text NOT NULL,
	`date` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`cancelled_by` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`entry_id`, `date`)
);
