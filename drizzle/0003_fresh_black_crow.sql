CREATE TABLE `assessment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`assessment_id` text NOT NULL,
	`subject` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`question_type` text DEFAULT 'mcq' NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`total_count` integer DEFAULT 1 NOT NULL,
	`answers_json` text NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_assessment_attempts_owner_completed` ON `assessment_attempts` (`owner_id`,`completed_at`);--> statement-breakpoint
CREATE INDEX `idx_assessment_attempts_owner_subject` ON `assessment_attempts` (`owner_id`,`subject`);--> statement-breakpoint
CREATE TABLE `mistake_notebook` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`assessment_id` text NOT NULL,
	`question_key` text NOT NULL,
	`subject` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`prompt` text NOT NULL,
	`original_answer` text DEFAULT '' NOT NULL,
	`corrected_concept` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`source_label` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`next_review_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_mistake_notebook_owner_question` ON `mistake_notebook` (`owner_id`,`assessment_id`,`question_key`);--> statement-breakpoint
CREATE INDEX `idx_mistake_notebook_owner_status_review` ON `mistake_notebook` (`owner_id`,`status`,`next_review_at`);--> statement-breakpoint
CREATE TABLE `note_mind_maps` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`title` text NOT NULL,
	`nodes_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_note_mind_maps_owner_lesson` ON `note_mind_maps` (`owner_id`,`lesson_slug`);--> statement-breakpoint
CREATE INDEX `idx_note_mind_maps_owner_updated` ON `note_mind_maps` (`owner_id`,`updated_at`);