import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const subscribers = sqliteTable("subscribers", {
  id: text("id").primaryKey(), email: text("email").notNull(), emailHash: text("email_hash").notNull(),
  firstName: text("first_name").notNull().default(""), lastName: text("last_name").notNull().default(""),
  city: text("city").notNull().default(""), language: text("language").notNull().default("en"),
  status: text("status").notNull().default("subscribed"), consentAt: text("consent_at"), consentSource: text("consent_source"),
  providerMemberId: text("provider_member_id"), providerUniqueId: text("provider_unique_id"),
  tagsJson: text("tags_json").notNull().default("[]"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_subscribers_email").on(table.email), uniqueIndex("idx_subscribers_email_hash").on(table.emailHash), uniqueIndex("idx_subscribers_provider_unique_id").on(table.providerUniqueId), index("idx_subscribers_status_created").on(table.status, table.createdAt)]);

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(), title: text("title").notNull(), subject: text("subject").notNull().default(""),
  preheader: text("preheader").notNull().default(""), fromName: text("from_name").notNull().default(""), replyTo: text("reply_to").notNull().default(""),
  contentJson: text("content_json").notNull().default("[]"), html: text("html").notNull().default(""), status: text("status").notNull().default("draft"),
  providerCampaignId: text("provider_campaign_id"), segmentJson: text("segment_json").notNull().default("{}"), recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: text("sent_at"), scheduledAt: text("scheduled_at"), createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_campaigns_status_updated").on(table.status, table.updatedAt), uniqueIndex("idx_campaigns_provider_id").on(table.providerCampaignId)]);

export const campaignLinks = sqliteTable("campaign_links", {
  id: text("id").primaryKey(), campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  label: text("label").notNull(), destinationUrl: text("destination_url").notNull(), position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_campaign_links_campaign").on(table.campaignId)]);

export const events = sqliteTable("events", {
  id: text("id").primaryKey(), title: text("title").notNull(), description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  startsAt: text("starts_at").notNull(), location: text("location").notNull().default(""), capacity: integer("capacity").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_events_starts_at").on(table.startsAt)]);

export const rsvps = sqliteTable("rsvps", {
  id: text("id").primaryKey(), eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  subscriberId: text("subscriber_id").references(() => subscribers.id, { onDelete: "set null" }), email: text("email").notNull().default(""),
  status: text("status").notNull().default("confirmed"), guestCount: integer("guest_count").notNull().default(0),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_rsvps_event_subscriber").on(table.eventId, table.subscriberId), index("idx_rsvps_event_status").on(table.eventId, table.status)]);

export const trackingEvents = sqliteTable("tracking_events", {
  id: integer("id").primaryKey({ autoIncrement: true }), campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  subscriberId: text("subscriber_id").references(() => subscribers.id, { onDelete: "set null" }), eventType: text("event_type").notNull(),
  linkId: text("link_id").references(() => campaignLinks.id, { onDelete: "set null" }), eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
  providerEventId: text("provider_event_id"), ipHash: text("ip_hash"), userAgent: text("user_agent"), metadataJson: text("metadata_json").notNull().default("{}"),
  occurredAt: text("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_tracking_campaign_type_time").on(table.campaignId, table.eventType, table.occurredAt), index("idx_tracking_subscriber_time").on(table.subscriberId, table.occurredAt), uniqueIndex("idx_tracking_provider_event").on(table.providerEventId)]);

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(), objectKey: text("object_key").notNull(), filename: text("filename").notNull(), contentType: text("content_type").notNull(),
  size: integer("size").notNull(), width: integer("width"), height: integer("height"), createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_assets_object_key").on(table.objectKey)]);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(), value: text("value").notNull(), updatedBy: text("updated_by").notNull(), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
