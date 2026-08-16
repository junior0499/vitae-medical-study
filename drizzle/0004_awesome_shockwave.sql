CREATE TABLE `learning_activity_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`activity_type` text NOT NULL,
	`activity_id` text NOT NULL,
	`subject` text NOT NULL,
	`system` text NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`total_count` integer DEFAULT 1 NOT NULL,
	`details_json` text NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_learning_activity_owner_type_completed` ON `learning_activity_attempts` (`owner_id`,`activity_type`,`completed_at`);--> statement-breakpoint
CREATE INDEX `idx_learning_activity_owner_activity` ON `learning_activity_attempts` (`owner_id`,`activity_id`);