import { createClient } from "@supabase/supabase-js";

export const authEnv = (import.meta as ImportMeta & { env: Record<string, string> }).env;
const url = authEnv.VITE_SUPABASE_URL;
const key = authEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
// Sessions end with this tab. Only the short-lived PKCE verifier is shared
// between tabs, so an email confirmation can open in a different tab.
export const authStorage = {
  getItem: (key: string) => (key.endsWith("-code-verifier") ? localStorage : sessionStorage).getItem(key),
  setItem: (key: string, value: string) => (key.endsWith("-code-verifier") ? localStorage : sessionStorage).setItem(key, value),
  removeItem: (key: string) => (key.endsWith("-code-verifier") ? localStorage : sessionStorage).removeItem(key),
};
export const authClient = url && key ? createClient(url, key, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: authStorage },
}) : null;
