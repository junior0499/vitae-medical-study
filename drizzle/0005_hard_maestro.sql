CREATE TABLE `learning_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_key` text NOT NULL,
	`action` text DEFAULT 'saved' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_learning_versions_owner_created` ON `learning_versions` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_learning_versions_owner_entity_created` ON `learning_versions` (`owner_id`,`entity_type`,`entity_key`,`created_at`);