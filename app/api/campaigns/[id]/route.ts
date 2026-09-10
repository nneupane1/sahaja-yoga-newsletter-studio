import { renderEmail } from "@/lib/email-renderer";
import type { EmailBlock } from "@/lib/email-renderer";
import { appBaseUrl, apiError, cleanText, getDatabase, json, requireAdminApi } from "@/lib/server";

type CampaignRow = { id: string; title: string; subject: string; preheader: string; fromName: string; replyTo: string; contentJson: string; html: string; status: string; providerCampaignId: string | null; updatedAt: string };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const { id } = await context.params;
  const row = await getDatabase().prepare("SELECT id,title,subject,preheader,from_name AS fromName,reply_to AS replyTo,content_json AS contentJson,html,status,provider_campaign_id AS providerCampaignId,updated_at AS updatedAt FROM campaigns WHERE id = ?").bind(id).first<CampaignRow>();
  if (!row) return json({ error: "Newsletter not found" }, { status: 404 });
  return json({ campaign: { ...row, blocks: JSON.parse(row.contentJson || "[]"), contentJson: undefined } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  try {
    const { id } = await context.params; const body = await request.json() as Record<string, unknown>;
    const existing=await getDatabase().prepare("SELECT status,provider_campaign_id AS providerCampaignId FROM campaigns WHERE id=?").bind(id).first<{status:string;providerCampaignId:string|null}>();
    if(!existing)return json({error:"Newsletter not found"},{status:404});
    if(existing.status!=="draft"||existing.providerCampaignId)return json({error:"Start a new copy to edit a delivered or scheduled edition"},{status:409});
    const blocks = Array.isArray(body.blocks) ? body.blocks as EmailBlock[] : [];
    if (!blocks.length) throw new Error("Add at least one content block");
    const subject = cleanText(body.subject, 180); if (!subject) throw new Error("Subject is required");
    const rendered = await renderEmail({ campaignId: id, subject, preheader: cleanText(body.preheader, 220), blocks, baseUrl: appBaseUrl(request) });
    const db = getDatabase();
    const statements: D1PreparedStatement[] = [
      db.prepare("UPDATE campaigns SET title=?,subject=?,preheader=?,from_name=?,reply_to=?,content_json=?,html=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(cleanText(body.title, 160) || "Untitled newsletter", subject, cleanText(body.preheader, 220), cleanText(body.fromName, 120), cleanText(body.replyTo, 200), JSON.stringify(blocks), rendered.html, id),
      db.prepare("DELETE FROM campaign_links WHERE campaign_id=?").bind(id),
      ...rendered.links.map((link) => db.prepare("INSERT INTO campaign_links (id,campaign_id,label,destination_url,position) VALUES (?,?,?,?,?)").bind(link.id, id, link.label, link.destinationUrl, link.position)),
    ];
    await db.batch(statements);
    return json({ campaign: { id, blocks, html: rendered.html, updatedAt: new Date().toISOString() }, links: rendered.links.length });
  } catch (error) { return apiError(error); }
}
