CREATE TABLE `backup_restore_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`archive_digest` text NOT NULL,
	`selected_groups_json` text NOT NULL,
	`inserted_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_backup_restore_owner_created` ON `backup_restore_audits` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `learning_evidence_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_key` text NOT NULL,
	`link_type` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_learning_evidence_owner_entity_target` ON `learning_evidence_links` (`owner_id`,`entity_type`,`entity_key`,`link_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_learning_evidence_owner_entity` ON `learning_evidence_links` (`owner_id`,`entity_type`,`entity_key`);--> statement-breakpoint
CREATE INDEX `idx_learning_evidence_owner_target` ON `learning_evidence_links` (`owner_id`,`link_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `source_processing_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`total_pages` integer DEFAULT 0 NOT NULL,
	`processed_pages` integer DEFAULT 0 NOT NULL,
	`cursor_page` integer DEFAULT 0 NOT NULL,
	`warning` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_processing_owner_document` ON `source_processing_jobs` (`owner_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `idx_source_processing_owner_status_updated` ON `source_processing_jobs` (`owner_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `source_search_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`query_key` text NOT NULL,
	`scope_hash` text NOT NULL,
	`result_json` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_cache_owner_query_scope` ON `source_search_cache` (`owner_id`,`query_key`,`scope_hash`);--> statement-breakpoint
CREATE INDEX `idx_source_cache_owner_expires` ON `source_search_cache` (`owner_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `source_search_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`term` text NOT NULL,
	`frequency` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_terms_owner_document_page_term` ON `source_search_terms` (`owner_id`,`document_id`,`page_number`,`term`);--> statement-breakpoint
CREATE INDEX `idx_source_terms_owner_term_document` ON `source_search_terms` (`owner_id`,`term`,`document_id`);