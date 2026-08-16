CREATE TABLE `lesson_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`alignment_id` text NOT NULL,
	`source_document_id` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`subject` text NOT NULL,
	`system` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`outline_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_drafts_owner_alignment` ON `lesson_drafts` (`owner_id`,`alignment_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_drafts_owner_updated` ON `lesson_drafts` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `recall_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`question_key` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`last_rating` text DEFAULT 'good' NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`interval_days` integer DEFAULT 1 NOT NULL,
	`ease_score` integer DEFAULT 250 NOT NULL,
	`due_at` text NOT NULL,
	`last_reviewed_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recall_reviews_owner_question` ON `recall_reviews` (`owner_id`,`lesson_slug`,`question_key`);--> statement-breakpoint
CREATE INDEX `idx_recall_reviews_owner_due` ON `recall_reviews` (`owner_id`,`due_at`);