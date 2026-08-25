CREATE TABLE `user_mcc_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mcc_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_mcc_permissions_unique` ON `user_mcc_permissions` (`user_id`,`mcc_id`);--> statement-breakpoint
CREATE INDEX `idx_user_mcc_permissions_user` ON `user_mcc_permissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_mcc_permissions_mcc` ON `user_mcc_permissions` (`mcc_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`image` text,
	`password_hash` text,
	`role` text DEFAULT 'STAFF' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`session_version` integer DEFAULT 0 NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "name", "image", "password_hash", "role", "status", "session_version", "last_login_at", "created_at", "updated_at")
SELECT "id", "email", "name", "image", "password_hash",
  CASE WHEN "role" = 'ADMIN' THEN 'ADMIN' ELSE 'STAFF' END,
  CASE WHEN "is_active" THEN 'ACTIVE' ELSE 'SUSPENDED' END,
  0, "last_login_at", "created_at", "updated_at"
FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);
