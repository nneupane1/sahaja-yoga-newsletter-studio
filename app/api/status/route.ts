import { env } from "cloudflare:workers";
import { getDatabase, json, requireAdminApi } from "@/lib/server";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  const db = getDatabase();
  const [campaigns, subscribers, events] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM campaigns").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM subscribers WHERE status = ?").bind("subscribed").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM events WHERE starts_at >= CURRENT_TIMESTAMP").first<{ count: number }>(),
  ]);
  const provider = { connected: false, configured: false, name: "Sender", runtime: "desktop-only" };
  return json({ user: auth.user, counts: { campaigns: campaigns?.count || 0, subscribers: subscribers?.count || 0, events: events?.count || 0 }, provider, storage: { database: Boolean(env.DB), images: Boolean(env.BUCKET) } });
}
