import { apiError, cleanText, getDatabase, json, newId, requireAdminApi } from "@/lib/server";

export async function GET() {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const result = await getDatabase().prepare("SELECT id,title,description,starts_at AS startsAt,location,capacity,created_at AS createdAt FROM events ORDER BY starts_at ASC LIMIT 100").all();
  return json({ events: result.results });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  try { const body = await request.json() as Record<string, unknown>; const title = cleanText(body.title, 180); const startsAt = cleanText(body.startsAt, 40); if (!title || !startsAt) throw new Error("Title and start time are required"); const id = newId("evt"); await getDatabase().prepare("INSERT INTO events (id,title,description,starts_at,location,capacity) VALUES (?,?,?,?,?,?)").bind(id, title, cleanText(body.description, 2000), startsAt, cleanText(body.location, 250), Math.max(0, Math.min(Number(body.capacity) || 0, 10000))).run(); return json({ event: { id, title, startsAt } }, { status: 201 }); } catch (error) { return apiError(error); }
}
