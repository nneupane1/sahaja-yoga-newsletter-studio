CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assets_object_key` ON `assets` (`object_key`);--> statement-breakpoint
CREATE TABLE `campaign_links` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`label` text NOT NULL,
	`destination_url` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_campaign_links_campaign` ON `campaign_links` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`preheader` text DEFAULT '' NOT NULL,
	`from_name` text DEFAULT '' NOT NULL,
	`reply_to` text DEFAULT '' NOT NULL,
	`content_json` text DEFAULT '[]' NOT NULL,
	`html` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`provider_campaign_id` text,
	`segment_json` text DEFAULT '{}' NOT NULL,
	`recipient_count` integer DEFAULT 0 NOT NULL,
	`sent_at` text,
	`scheduled_at` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_campaigns_status_updated` ON `campaigns` (`status`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_campaigns_provider_id` ON `campaigns` (`provider_campaign_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`starts_at` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_starts_at` ON `events` (`starts_at`);--> statement-breakpoint
CREATE TABLE `rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`subscriber_id` text,
	`email` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`guest_count` integer DEFAULT 0 NOT NULL,
	`campaign_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rsvps_event_subscriber` ON `rsvps` (`event_id`,`subscriber_id`);--> statement-breakpoint
CREATE INDEX `idx_rsvps_event_status` ON `rsvps` (`event_id`,`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_hash` text NOT NULL,
	`first_name` text DEFAULT '' NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`status` text DEFAULT 'subscribed' NOT NULL,
	`consent_at` text,
	`consent_source` text,
	`mailchimp_member_id` text,
	`mailchimp_unique_id` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscribers_email` ON `subscribers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscribers_email_hash` ON `subscribers` (`email_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscribers_mailchimp_unique_id` ON `subscribers` (`mailchimp_unique_id`);--> statement-breakpoint
CREATE INDEX `idx_subscribers_status_created` ON `subscribers` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `tracking_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` text NOT NULL,
	`subscriber_id` text,
	`event_type` text NOT NULL,
	`link_id` text,
	`event_id` text,
	`provider_event_id` text,
	`ip_hash` text,
	`user_agent` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`link_id`) REFERENCES `campaign_links`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_tracking_campaign_type_time` ON `tracking_events` (`campaign_id`,`event_type`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_tracking_subscriber_time` ON `tracking_events` (`subscriber_id`,`occurred_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tracking_provider_event` ON `tracking_events` (`provider_event_id`);--> statement-breakpoint
PRAGMA optimize;
