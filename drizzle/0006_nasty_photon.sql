CREATE TABLE `document_extractions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`method` text DEFAULT '' NOT NULL,
	`page_count` integer DEFAULT 0 NOT NULL,
	`searchable_pages` integer DEFAULT 0 NOT NULL,
	`character_count` integer DEFAULT 0 NOT NULL,
	`warning` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_extractions_owner_document` ON `document_extractions` (`owner_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `idx_document_extractions_owner_status` ON `document_extractions` (`owner_id`,`status`);--> statement-breakpoint
CREATE TABLE `document_text_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`printed_page` text DEFAULT '' NOT NULL,
	`text_content` text NOT NULL,
	`method` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_text_owner_document_page` ON `document_text_chunks` (`owner_id`,`document_id`,`page_number`);--> statement-breakpoint
CREATE TABLE `source_citations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_id` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`page_number` integer NOT NULL,
	`printed_page` text DEFAULT '' NOT NULL,
	`quote` text NOT NULL,
	`note_text` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_source_citations_owner_lesson_created` ON `source_citations` (`owner_id`,`lesson_slug`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_source_citations_owner_document_page` ON `source_citations` (`owner_id`,`document_id`,`page_number`);