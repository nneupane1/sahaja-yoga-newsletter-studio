PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, email_hash TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en', status TEXT NOT NULL DEFAULT 'subscribed', consent_at TEXT,
  consent_source TEXT, provider_member_id TEXT, provider_unique_id TEXT, tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '', preheader TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '', reply_to TEXT NOT NULL DEFAULT '', content_json TEXT NOT NULL DEFAULT '[]',
  html TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', provider_campaign_id TEXT,
  recipient_count INTEGER NOT NULL DEFAULT 0, delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0, last_error TEXT, sent_at TEXT, scheduled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, content_type TEXT NOT NULL,
  size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', starts_at TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '', capacity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS rsvps (
  id TEXT PRIMARY KEY, event_id TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'confirmed',
  guest_count INTEGER NOT NULL DEFAULT 0, campaign_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS delivery_messages (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, subscriber_id TEXT, email TEXT NOT NULL,
  message_id TEXT, status TEXT NOT NULL DEFAULT 'queued', error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_updated ON campaigns(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_subscribers_status_created ON subscribers(status, created_at);
CREATE INDEX IF NOT EXISTS idx_delivery_campaign_status ON delivery_messages(campaign_id, status);

CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS campaign_links (
 id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,label TEXT NOT NULL,destination_url TEXT NOT NULL,position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tracking_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,campaign_id TEXT NOT NULL,subscriber_id TEXT,event_type TEXT NOT NULL,link_id TEXT,provider_event_id TEXT UNIQUE,occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tracking_campaign_type_time ON tracking_events(campaign_id,event_type,occurred_at);
CREATE INDEX IF NOT EXISTS idx_campaign_links_campaign ON campaign_links(campaign_id);
