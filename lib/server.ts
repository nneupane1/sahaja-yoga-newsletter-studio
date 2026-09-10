import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export function getDatabase(): D1Database {
  if (!env.DB) throw new Error("Database binding is unavailable");
  return env.DB;
}

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init.headers } });
}

export function apiError(error: unknown, fallback = "Something went wrong") {
  const message = error instanceof Error ? error.message : fallback;
  return json({ error: message }, { status: 400 });
}

export async function requireAdminApi() {
  const user = await getChatGPTUser();
  if (!user) return { response: json({ error: "Sign in required" }, { status: 401 }), user: null };
  const allowed = (env.ADMIN_EMAILS || "nneupane1@gmail.com,seedy@sites.test").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) return { response: json({ error: "Administrator access required" }, { status: 403 }), user: null };
  return { response: null, user };
}

export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function appBaseUrl(request?: Request) {
  if (env.APP_BASE_URL) return env.APP_BASE_URL.replace(/\/$/, "");
  return request ? new URL(request.url).origin : "";
}

export function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}
