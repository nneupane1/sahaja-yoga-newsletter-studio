import { env } from "cloudflare:workers";
import { getDatabase } from "@/lib/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const row = await getDatabase().prepare("SELECT object_key AS objectKey,content_type AS contentType FROM assets WHERE id=?").bind(id).first<{ objectKey: string; contentType: string }>();
  if (!row) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(row.objectKey); if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": row.contentType, "Cache-Control": "public, max-age=31536000, immutable", ETag: object.httpEtag } });
}
