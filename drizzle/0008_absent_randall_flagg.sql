CREATE TABLE `clinical_reasoning_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`objective_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`note_text` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'complete' NOT NULL,
	`document_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`printed_page` text DEFAULT '' NOT NULL,
	`source_quote` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reasoning_progress_owner_objective_stage` ON `clinical_reasoning_progress` (`owner_id`,`objective_id`,`stage_key`);--> statement-breakpoint
CREATE INDEX `idx_reasoning_progress_owner_objective` ON `clinical_reasoning_progress` (`owner_id`,`objective_id`);--> statement-breakpoint
CREATE TABLE `misconception_repairs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`concept_key` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`reflection` text DEFAULT '' NOT NULL,
	`evidence_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`completed_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_misconception_repairs_owner_concept` ON `misconception_repairs` (`owner_id`,`concept_key`);--> statement-breakpoint
CREATE INDEX `idx_misconception_repairs_owner_updated` ON `misconception_repairs` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `objective_source_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`objective_id` text NOT NULL,
	`document_id` text NOT NULL,
	`role` text DEFAULT 'support' NOT NULL,
	`decision` text DEFAULT 'pending_review' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_objective_source_owner_objective_document` ON `objective_source_links` (`owner_id`,`objective_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `idx_objective_source_owner_objective_decision` ON `objective_source_links` (`owner_id`,`objective_id`,`decision`);--> statement-breakpoint
CREATE INDEX `idx_objective_source_owner_document` ON `objective_source_links` (`owner_id`,`document_id`);