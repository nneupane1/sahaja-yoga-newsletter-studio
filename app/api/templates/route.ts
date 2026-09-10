import { templateCatalog } from "@/lib/newsletter-templates.mjs";
import { json, requireAdminApi } from "@/lib/server";
export async function GET() {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  return json({ templates: templateCatalog() });
}
