import { apiError, getDatabase, json, requireAdminApi } from "@/lib/server";

export async function GET() {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  try {
    const db = getDatabase();
    const [latest, subscribers, rsvps, eventsByType, growth] = await Promise.all([
      db.prepare("SELECT id,title,status,provider_campaign_id AS providerCampaignId,recipient_count AS recipientCount,sent_at AS sentAt FROM campaigns ORDER BY COALESCE(sent_at,updated_at) DESC LIMIT 1").first<{ id: string; title: string; status: string; providerCampaignId: string | null; recipientCount: number; sentAt: string | null }>(),
      db.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN status='subscribed' THEN 1 ELSE 0 END) AS active FROM subscribers").first(),
      db.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) AS confirmed FROM rsvps").first(),
      db.prepare("SELECT event_type AS eventType,COUNT(*) AS total,COUNT(DISTINCT subscriber_id) AS uniquePeople FROM tracking_events WHERE campaign_id=(SELECT id FROM campaigns ORDER BY COALESCE(sent_at,updated_at) DESC LIMIT 1) GROUP BY event_type").all(),
      db.prepare("SELECT substr(created_at,1,7) AS month,COUNT(*) AS total FROM subscribers GROUP BY substr(created_at,1,7) ORDER BY month DESC LIMIT 6").all(),
    ]);
    return json({ campaign: latest || null, subscribers, rsvps, events: eventsByType.results, growth: [...growth.results].reverse(), provider: null, runtime: "web-preview" });
  } catch (error) { return apiError(error); }
}
