CREATE TABLE `__new_mailboxes` (
	`address` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`credential_version` integer DEFAULT 1 NOT NULL,
	`batch_id` text,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`last_login_at` integer
);--> statement-breakpoint
INSERT INTO `__new_mailboxes` (
	`address`,
	`password_hash`,
	`salt`,
	`credential_version`,
	`batch_id`,
	`created_at`,
	`expires_at`,
	`last_login_at`
)
SELECT
	`address`,
	`password_hash`,
	`salt`,
	1,
	NULL,
	`created_at`,
	`expires_at`,
	`last_login_at`
FROM `mailboxes`;--> statement-breakpoint
DROP TABLE `mailboxes`;--> statement-breakpoint
ALTER TABLE `__new_mailboxes` RENAME TO `mailboxes`;--> statement-breakpoint
CREATE INDEX `emails_message_to_created_at_idx` ON `emails` (`message_to`,`created_at`);--> statement-breakpoint
CREATE INDEX `emails_message_to_is_read_created_at_idx` ON `emails` (`message_to`,`is_read`,`created_at`);--> statement-breakpoint
CREATE INDEX `mailboxes_batch_id_idx` ON `mailboxes` (`batch_id`);--> statement-breakpoint
CREATE INDEX `mailboxes_expires_at_idx` ON `mailboxes` (`expires_at`);
