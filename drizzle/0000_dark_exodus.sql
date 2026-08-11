CREATE TABLE `lesson_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_notes_owner_lesson` ON `lesson_notes` (`owner_id`,`lesson_slug`);--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`completed_points` integer DEFAULT 0 NOT NULL,
	`total_points` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_progress_owner_lesson` ON `lesson_progress` (`owner_id`,`lesson_slug`);--> statement-breakpoint
CREATE INDEX `idx_lesson_progress_owner_updated` ON `lesson_progress` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `study_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`semester` integer NOT NULL,
	`subject` text NOT NULL,
	`category` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`object_key` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_study_documents_owner_created` ON `study_documents` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_study_documents_owner_semester` ON `study_documents` (`owner_id`,`semester`);