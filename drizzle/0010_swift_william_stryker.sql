CREATE TABLE `evidence_freshness_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_id` text NOT NULL,
	`objective_id` text DEFAULT '' NOT NULL,
	`source_kind` text DEFAULT 'textbook' NOT NULL,
	`edition` text DEFAULT '' NOT NULL,
	`publication_date` text DEFAULT '' NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL,
	`review_due_at` text DEFAULT '' NOT NULL,
	`decision` text DEFAULT 'needs_review' NOT NULL,
	`conflict_note` text DEFAULT '' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_freshness_owner_document_objective` ON `evidence_freshness_reviews` (`owner_id`,`document_id`,`objective_id`);--> statement-breakpoint
CREATE INDEX `idx_evidence_freshness_owner_decision_due` ON `evidence_freshness_reviews` (`owner_id`,`decision`,`review_due_at`);--> statement-breakpoint
CREATE INDEX `idx_evidence_freshness_owner_document` ON `evidence_freshness_reviews` (`owner_id`,`document_id`);--> statement-breakpoint
CREATE TABLE `question_quality_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`question_key` text NOT NULL,
	`source_kind` text NOT NULL,
	`decision` text DEFAULT 'active' NOT NULL,
	`flags_json` text DEFAULT '[]' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_question_quality_owner_question` ON `question_quality_reviews` (`owner_id`,`question_key`);--> statement-breakpoint
CREATE INDEX `idx_question_quality_owner_decision` ON `question_quality_reviews` (`owner_id`,`decision`);