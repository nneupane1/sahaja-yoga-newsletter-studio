ALTER TABLE `subscribers` RENAME COLUMN "mailchimp_member_id" TO "provider_member_id";--> statement-breakpoint
ALTER TABLE `subscribers` RENAME COLUMN "mailchimp_unique_id" TO "provider_unique_id";--> statement-breakpoint
DROP INDEX `idx_subscribers_mailchimp_unique_id`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscribers_provider_unique_id` ON `subscribers` (`provider_unique_id`);