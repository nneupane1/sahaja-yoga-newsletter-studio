import { env } from "cloudflare:workers";
import { apiError, appBaseUrl, getDatabase, json, newId, requireAdminApi } from "@/lib/server";

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  try {
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Choose an image to upload");
    if (!file.type.startsWith("image/")) throw new Error("Only image files are accepted");
    if (file.size > 8 * 1024 * 1024) throw new Error("Images must be smaller than 8 MB");
    const id = newId("ast"); const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "img"; const objectKey = `newsletter/${id}.${extension}`;
    await env.BUCKET.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
    await getDatabase().prepare("INSERT INTO assets (id,object_key,filename,content_type,size,created_by) VALUES (?,?,?,?,?,?)").bind(id, objectKey, file.name.slice(0, 255), file.type, file.size, auth.user!.userId).run();
    return json({ asset: { id, url: `${appBaseUrl(request)}/api/assets/${id}`, filename: file.name, size: file.size } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
