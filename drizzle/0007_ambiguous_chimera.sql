CREATE TABLE `daily_queue_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`date_key` text NOT NULL,
	`task_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_queue_owner_date_task` ON `daily_queue_actions` (`owner_id`,`date_key`,`task_key`);--> statement-breakpoint
CREATE INDEX `idx_daily_queue_owner_date` ON `daily_queue_actions` (`owner_id`,`date_key`);--> statement-breakpoint
CREATE TABLE `generated_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`objective_id` text NOT NULL,
	`document_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`printed_page` text DEFAULT '' NOT NULL,
	`question_type` text NOT NULL,
	`prompt` text NOT NULL,
	`options_json` text DEFAULT '[]' NOT NULL,
	`answer` text NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`source_quote` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_generated_questions_owner_objective_status` ON `generated_questions` (`owner_id`,`objective_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_generated_questions_owner_status_updated` ON `generated_questions` (`owner_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `recall_review_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`question_key` text NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`confidence` text DEFAULT 'medium' NOT NULL,
	`was_correct` integer DEFAULT 1 NOT NULL,
	`lapse_count` integer DEFAULT 0 NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`accuracy_streak` integer DEFAULT 0 NOT NULL,
	`average_response_ms` integer DEFAULT 0 NOT NULL,
	`forgetting_score` integer DEFAULT 0 NOT NULL,
	`next_interval_days` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recall_signals_owner_question` ON `recall_review_signals` (`owner_id`,`lesson_slug`,`question_key`);--> statement-breakpoint
CREATE INDEX `idx_recall_signals_owner_forgetting` ON `recall_review_signals` (`owner_id`,`forgetting_score`);