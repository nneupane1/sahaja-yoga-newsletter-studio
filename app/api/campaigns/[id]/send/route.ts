import { json, requireAdminApi } from "@/lib/server";

export async function POST(_request: Request, _context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  return json({ error: "Email delivery is available only in the installed Windows app, where Sender credentials remain on the organiser's computer." }, { status: 501 });
}
