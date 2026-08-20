CREATE TABLE `diagnostic_drills` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`drill_type` text NOT NULL,
	`title` text NOT NULL,
	`illness_script_ids_json` text DEFAULT '[]' NOT NULL,
	`source_pack_ids_json` text DEFAULT '[]' NOT NULL,
	`prompt` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_diagnostic_drills_owner_type_status` ON `diagnostic_drills` (`owner_id`,`drill_type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_diagnostic_drills_owner_updated` ON `diagnostic_drills` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `illness_scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`source_pack_id` text NOT NULL,
	`title` text NOT NULL,
	`script_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_illness_scripts_owner_pack_title` ON `illness_scripts` (`owner_id`,`source_pack_id`,`title`);--> statement-breakpoint
CREATE INDEX `idx_illness_scripts_owner_status_updated` ON `illness_scripts` (`owner_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `source_learning_packs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`objective_id` text NOT NULL,
	`document_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`printed_page` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`source_label` text NOT NULL,
	`source_quote` text NOT NULL,
	`artifacts_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_packs_owner_objective_document_page` ON `source_learning_packs` (`owner_id`,`objective_id`,`document_id`,`page_number`);--> statement-breakpoint
CREATE INDEX `idx_source_packs_owner_status_updated` ON `source_learning_packs` (`owner_id`,`status`,`updated_at`);