import { apiError, cleanText, getDatabase, json, newId, requireAdminApi, sha256 } from "@/lib/server";

export async function GET(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const url = new URL(request.url); const query = cleanText(url.searchParams.get("q"), 100); const status = cleanText(url.searchParams.get("status"), 30) || "subscribed";
  const like = `%${query}%`;
  const result = query ? await getDatabase().prepare("SELECT id,email,first_name AS firstName,last_name AS lastName,city,language,status,tags_json AS tagsJson,created_at AS createdAt FROM subscribers WHERE status=? AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR city LIKE ?) ORDER BY created_at DESC LIMIT 500").bind(status, like, like, like, like).all() : await getDatabase().prepare("SELECT id,email,first_name AS firstName,last_name AS lastName,city,language,status,tags_json AS tagsJson,created_at AS createdAt FROM subscribers WHERE status=? ORDER BY created_at DESC LIMIT 500").bind(status).all();
  return json({ subscribers: result.results.map((row) => ({ ...row, tags: JSON.parse(String(row.tagsJson || "[]")), tagsJson: undefined })) });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  try {
    const body = await request.json() as { contacts?: Array<Record<string, unknown>> };
    const contacts = (body.contacts || []).slice(0, 2000); if (!contacts.length) throw new Error("No subscribers supplied");
    const normalized = contacts.map((contact) => ({ email: cleanText(contact.email, 254).toLowerCase(), firstName: cleanText(contact.firstName, 100), lastName: cleanText(contact.lastName, 100), city: cleanText(contact.city, 120), language: cleanText(contact.language, 10) || "en", tags: Array.isArray(contact.tags) ? contact.tags.slice(0, 20) : [] })).filter((contact) => contact.email.includes("@"));
    const db = getDatabase(); let imported = 0;
    for (let start = 0; start < normalized.length; start += 80) {
      const prepared: D1PreparedStatement[] = [];
      for (const contact of normalized.slice(start, start + 80)) {
        prepared.push(db.prepare("INSERT INTO subscribers (id,email,email_hash,first_name,last_name,city,language,status,consent_at,consent_source,tags_json) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?) ON CONFLICT(email) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,city=excluded.city,language=excluded.language,status=excluded.status,tags_json=excluded.tags_json,updated_at=CURRENT_TIMESTAMP").bind(newId("sub"), contact.email, await sha256(contact.email), contact.firstName, contact.lastName, contact.city, contact.language, "subscribed", "admin_import", JSON.stringify(contact.tags)));
        imported++;
      }
      if (prepared.length) await db.batch(prepared);
    }
    return json({ imported, providerSynced: 0, providerFailed: 0, providerConnected: false, runtime: "web-preview" });
  } catch (error) { return apiError(error); }
}
