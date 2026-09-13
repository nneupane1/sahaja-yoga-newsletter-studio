import { createClient } from "@supabase/supabase-js";
import { authConfiguration, createOrganiserAuth, authErrorResponse } from "./organiser-auth.mjs";

export const organiserAuth = createOrganiserAuth({ env: process.env, client: token => createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
}) });
export function nodeAuthHandler(handler) {
  return async (req, res) => {
    let response;
    try {
      const { origin } = authConfiguration(process.env);
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) if (value != null) headers.set(name, Array.isArray(value) ? value.join(",") : value);
      response = await handler(new Request(new URL(req.url, origin), { method: req.method, headers }));
    } catch (error) { response = authErrorResponse(error); }
    res.statusCode = response.status;
    for (const [name, value] of response.headers) res.setHeader(name, value);
    res.end(await response.text());
  };
}
