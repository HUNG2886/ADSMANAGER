CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text,
	`ip_address` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_user_created` ON `audit_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_account_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`type` text NOT NULL,
	`budget_micros` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_campaigns_account_id` ON `campaigns` (`customer_account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_campaigns_campaign_account` ON `campaigns` (`campaign_id`,`customer_account_id`);--> statement-breakpoint
CREATE INDEX `idx_campaigns_status` ON `campaigns` (`status`);--> statement-breakpoint
CREATE TABLE `customer_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`mcc_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`name` text NOT NULL,
	`currency` text,
	`timezone` text,
	`status` text NOT NULL,
	`last_sync_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_customer_accounts_mcc_id` ON `customer_accounts` (`mcc_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_customer_accounts_customer_mcc` ON `customer_accounts` (`customer_id`,`mcc_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_accounts_status` ON `customer_accounts` (`status`);--> statement-breakpoint
CREATE TABLE `daily_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_account_id` text NOT NULL,
	`campaign_id` text,
	`date` text NOT NULL,
	`impressions` integer NOT NULL,
	`clicks` integer NOT NULL,
	`cost_micros` integer NOT NULL,
	`conversions` real NOT NULL,
	`conversion_value` real NOT NULL,
	`ctr` real NOT NULL,
	`average_cpc_micros` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_daily_metrics_account_date` ON `daily_metrics` (`customer_account_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_metrics_campaign_date` ON `daily_metrics` (`campaign_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_metrics_unique` ON `daily_metrics` (`customer_account_id`,`campaign_id`,`date`);--> statement-breakpoint
CREATE TABLE `google_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`google_email` text NOT NULL,
	`refresh_token_encrypted` text NOT NULL,
	`access_token_encrypted` text,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_google_connections_user_id` ON `google_connections` (`user_id`);--> statement-breakpoint
CREATE TABLE `mcc_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`name` text NOT NULL,
	`currency` text,
	`timezone` text,
	`status` text NOT NULL,
	`last_sync_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_mcc_user_id` ON `mcc_accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_mcc_customer_user` ON `mcc_accounts` (`customer_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_mcc_status` ON `mcc_accounts` (`status`);--> statement-breakpoint
CREATE TABLE `sync_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`mcc_id` text,
	`customer_account_id` text,
	`progress` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sync_jobs_status_created` ON `sync_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sync_jobs_mcc_id` ON `sync_jobs` (`mcc_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_jobs_account_id` ON `sync_jobs` (`customer_account_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`image` text,
	`role` text DEFAULT 'USER' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);