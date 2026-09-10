import { apiError, cleanText, getDatabase, json, newId } from "@/lib/server";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params; const event = await getDatabase().prepare("SELECT id,title,description,starts_at AS startsAt,location,capacity FROM events WHERE id=?").bind(eventId).first();
  return event ? json({ event }) : json({ error: "Event not found" }, { status: 404 });
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await context.params; const body = await request.json() as Record<string, unknown>; const campaignId = cleanText(body.campaignId, 100) || null; const email = cleanText(body.email, 254).toLowerCase(); const status = ["confirmed","maybe","declined"].includes(String(body.status)) ? String(body.status) : "confirmed"; const guests = Math.max(0, Math.min(Number(body.guestCount) || 0, 10)); const db = getDatabase();
    const event = await db.prepare("SELECT id FROM events WHERE id=?").bind(eventId).first(); if (!event) return json({ error: "Event not found" }, { status: 404 });
    const subscriber = email ? await db.prepare("SELECT id,email FROM subscribers WHERE email=?").bind(email).first<{ id: string; email: string }>() : null;
    if (!subscriber && !email) throw new Error("Please enter your email address"); const resolvedEmail = subscriber?.email || email;
    const existing = subscriber ? await db.prepare("SELECT id FROM rsvps WHERE event_id=? AND subscriber_id=?").bind(eventId, subscriber.id).first<{ id: string }>() : null; const id = existing?.id || newId("rsvp");
    if (existing) await db.prepare("UPDATE rsvps SET status=?,guest_count=?,campaign_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, guests, campaignId, id).run();
    else await db.prepare("INSERT INTO rsvps (id,event_id,subscriber_id,email,status,guest_count,campaign_id) VALUES (?,?,?,?,?,?,?)").bind(id, eventId, subscriber?.id || null, resolvedEmail, status, guests, campaignId).run();
    if (campaignId) await db.prepare("INSERT INTO tracking_events (campaign_id,subscriber_id,event_type,event_id,metadata_json) VALUES (?,?,?,?,?)").bind(campaignId, subscriber?.id || null, "rsvp", eventId, JSON.stringify({ status, guests })).run().catch(() => undefined);
    return json({ rsvp: { id, status, guestCount: guests }, message: status === "confirmed" ? "Your place is reserved" : "Your response is saved" });
  } catch (error) { return apiError(error); }
}
