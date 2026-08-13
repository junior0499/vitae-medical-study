CREATE TABLE `alignment_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`alignment_id` text NOT NULL,
	`decision` text DEFAULT 'pending' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_alignment_reviews_owner_alignment` ON `alignment_reviews` (`owner_id`,`alignment_id`);--> statement-breakpoint
CREATE INDEX `idx_alignment_reviews_owner_decision` ON `alignment_reviews` (`owner_id`,`decision`);--> statement-breakpoint
CREATE TABLE `document_source_details` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_id` text NOT NULL,
	`book_title` text DEFAULT '' NOT NULL,
	`book_edition` text DEFAULT '' NOT NULL,
	`section_label` text DEFAULT '' NOT NULL,
	`page_range` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_source_details_owner_document` ON `document_source_details` (`owner_id`,`document_id`);--> statement-breakpoint
CREATE TABLE `imported_alignments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`batch_title` text NOT NULL,
	`system` text NOT NULL,
	`week` text DEFAULT '' NOT NULL,
	`topic` text NOT NULL,
	`primary_source` text NOT NULL,
	`page_reference` text DEFAULT '' NOT NULL,
	`support_source` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'needs_review' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_imported_alignments_owner_created` ON `imported_alignments` (`owner_id`,`created_at`);