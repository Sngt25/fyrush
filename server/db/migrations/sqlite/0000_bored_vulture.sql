CREATE TABLE `incident_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`address` text NOT NULL,
	`status` text NOT NULL,
	`report_count` integer DEFAULT 1 NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`timer_started_at` integer,
	`dispatched_at` integer,
	`closed_at` integer
);
--> statement-breakpoint
CREATE TABLE `point_person_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`user_id` text NOT NULL,
	`assigned_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `responder_locations` (
	`incident_id` text PRIMARY KEY NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`login_id` text,
	`name` text NOT NULL,
	`email` text,
	`google_id` text,
	`auth_provider` text DEFAULT 'legacy' NOT NULL,
	`mobile` text,
	`address` text,
	`profile_complete` integer DEFAULT 0 NOT NULL,
	`profile_completed_at` integer,
	`registered_lat` real,
	`registered_lng` real,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
