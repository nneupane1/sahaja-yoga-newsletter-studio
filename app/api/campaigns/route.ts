import { appBaseUrl, apiError, cleanText, getDatabase, json, newId, requireAdminApi } from "@/lib/server";
import type { EmailBlock } from "@/lib/email-renderer";

const defaultBlocks = (): EmailBlock[] => [
  { id: crypto.randomUUID(), type: "hero", data: { eyebrow: "Sahaja Yoga", title: "A moment of silence, together", text: "Join our next free collective meditation.", imageUrl: "https://assets.wemeditate.com/uploads/media_file/file/210/classes.jpg?version=" } },
  { id: crypto.randomUUID(), type: "heading", data: { text: "Dear friends,", size: 30, align: "left", color: "#17213f" } },
  { id: crypto.randomUUID(), type: "text", data: { text: "We warmly invite you to pause, turn your attention within, and enjoy a collective meditation with us. Everyone is welcome, and the session is always free.", align: "left", color: "#57627a" } },
  { id: crypto.randomUUID(), type: "button", data: { label: "Reserve a place", url: `${appBaseUrl() || "https://example.org"}/rsvp`, align: "center", background: "#175cdf", color: "#ffffff", radius: 12 } },
];

export async function GET(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const url = new URL(request.url); const status = url.searchParams.get("status");
  const statement = status ? getDatabase().prepare("SELECT id,title,subject,preheader,status,provider_campaign_id AS providerCampaignId,recipient_count AS recipientCount,sent_at AS sentAt,scheduled_at AS scheduledAt,created_at AS createdAt,updated_at AS updatedAt FROM campaigns WHERE status = ? ORDER BY updated_at DESC LIMIT 100").bind(status) : getDatabase().prepare("SELECT id,title,subject,preheader,status,provider_campaign_id AS providerCampaignId,recipient_count AS recipientCount,sent_at AS sentAt,scheduled_at AS scheduledAt,created_at AS createdAt,updated_at AS updatedAt FROM campaigns ORDER BY updated_at DESC LIMIT 100");
  const result = await statement.all(); return json({ campaigns: result.results });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = newId("cmp"); const title = cleanText(body.title, 160) || "Untitled newsletter"; const subject = cleanText(body.subject, 180);
    const blocks = Array.isArray(body.blocks) ? body.blocks : defaultBlocks();
    await getDatabase().prepare("INSERT INTO campaigns (id,title,subject,preheader,from_name,reply_to,content_json,status,created_by) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, title, subject, cleanText(body.preheader, 220), cleanText(body.fromName, 120), cleanText(body.replyTo, 200), JSON.stringify(blocks), "draft", auth.user!.userId).run();
    return json({ campaign: { id, title, subject, preheader: cleanText(body.preheader, 220), blocks, status: "draft" } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
