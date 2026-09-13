import test from "node:test";
import assert from "node:assert/strict";
import { createOrganiserAuth, authConfiguration } from "../lib/organiser-auth.mjs";
import { guardedPreviewFetch } from "../share/guarded-fetch.mjs";
import { createPreviewApi } from "../share/api.mjs";
import { accountDatabaseName } from "../share/storage.mjs";
import { setPreferenceAccount, studioLocalStorage } from "../lib/browser-preferences.mjs";

const origin = "https://studio.example.test";
function fixture() {
  const env = { STUDIO_APP_ORIGIN: origin, STUDIO_ORGANISER_EMAILS: "nischal@example.test,bettina@example.test", VITE_SUPABASE_URL: "https://example.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "test-fixture-only" };
  const user = { id: "11111111-1111-4111-8111-111111111111", email: "nischal@example.test", email_confirmed_at: "2026-09-01T00:00:00Z", user_metadata: {full_name:"Nischal Neupane"} };
  const session = { user_id: user.id, active: true, mfa_required: false, aal: "aal1" };
  const provider = {
    auth: { async getUser(token) { return token === "valid" ? {data:{user},error:null} : {data:{user:null},error:{status:401}}; } },
    async rpc(name) { if(name === "studio_revoke_session") {session.active=false;return {data:null,error:null};} return {data:session,error:null}; },
  };
  const auth = createOrganiserAuth({ env, client: () => provider });
  const request = (token = "valid", method = "GET", headers = {}) => new Request(origin + "/api/auth", { method, headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(method === "POST" ? { Origin: origin } : {}), ...headers } });
  return { env, user, session, provider, auth, request };
}

test("registration is not approval: unverified and unapproved accounts stay outside", async () => {
  const f = fixture();
  f.user.email_confirmed_at = null;
  assert.equal((await (await f.auth.handle(f.request())).json()).code, "EMAIL_VERIFICATION_REQUIRED");
  f.user.email_confirmed_at = "2026-09-01T00:00:00Z";
  f.user.email = "stranger@example.test";
  f.user.user_metadata = { role: "admin", approved: true, email:"bettina@example.test" };
  const pending = await f.auth.handle(f.request());
  assert.equal(pending.status, 403);
  assert.equal((await pending.json()).code, "APPROVAL_REQUIRED");
});

test("approved users get provider identity; cookies and forged tokens cannot authenticate", async () => {
  const f = fixture();
  for (const token of [null, "forged", "expired"]) assert.equal((await f.auth.handle(f.request(token, "GET", { Cookie: "session=valid" }))).status, 401);
  const response = await f.auth.handle(f.request());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal((await response.json()).user.displayName, "Nischal Neupane");
});

test("logout, revoked sessions, banned users and removed approval block the next request", async () => {
  const f = fixture();
  assert.equal((await f.auth.handle(f.request("valid", "POST"))).status, 200);
  assert.equal((await f.auth.handle(f.request())).status, 401);
  f.session.active = true; f.user.banned_until = "2999-01-01T00:00:00Z";
  assert.equal((await f.auth.handle(f.request())).status, 401);
  f.user.banned_until = null; f.env.STUDIO_ORGANISER_EMAILS = "bettina@example.test";
  assert.equal((await f.auth.handle(f.request())).status, 403);
  assert.equal((await f.auth.handle(f.request("valid", "POST"))).status, 200);
});

test("MFA cannot be bypassed by a password-only session or user metadata", async () => {
  const f = fixture(); f.session.mfa_required = true; f.user.user_metadata.aal = "aal2";
  assert.equal((await (await f.auth.handle(f.request())).json()).code, "MFA_REQUIRED");
  f.session.aal = "aal2"; assert.equal((await f.auth.handle(f.request())).status, 200);
  f.session.user_id = "22222222-2222-4222-8222-222222222222";
  assert.equal((await f.auth.handle(f.request())).status, 401);
});

test("cross-origin logout, missing configuration and provider outages fail closed", async () => {
  const f = fixture();
  for (const suppliedOrigin of ["https://evil.example", "null", ""]) assert.equal((await f.auth.handle(f.request("valid", "POST", { Origin: suppliedOrigin }))).status, 403);
  assert.equal(f.session.active, true);
  f.provider.auth.getUser = async () => { throw Error("secret_token_do_not_leak"); };
  const unavailable = await f.auth.handle(f.request());
  assert.equal(unavailable.status, 503);
  assert.ok(!(await unavailable.text()).includes("secret_token"));
  delete f.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  assert.equal((await f.auth.handle(f.request())).status, 503);
  assert.throws(() => authConfiguration({ ...f.env, VITE_SUPABASE_PUBLISHABLE_KEY: "test", STUDIO_ORGANISER_EMAILS: Array.from({length:6},(_,i)=>`person${i}@example.test`).join(",") }));
  assert.throws(() => authConfiguration({ ...f.env, STUDIO_APP_ORIGIN: "http://public.example.test" }));
  assert.throws(() => authConfiguration({ ...f.env, VITE_SUPABASE_URL: "https://attacker.example" }));
});

test("browser API cannot read or write state before server approval or after disposal", async () => {
  let touched = 0, denied = 0;
  const identity = { userId: "11111111-1111-4111-8111-111111111111" };
  const bridge = guardedPreviewFetch({ api: async () => { touched++; return Response.json({ok:true}); }, original: async () => Response.json({}), authorize: async () => identity, userId: identity.userId, origin, denied: () => denied++ });
  assert.equal((await bridge.fetch("/api/campaigns")).status, 200);
  identity.userId = "22222222-2222-4222-8222-222222222222";
  assert.equal((await bridge.fetch("/api/campaigns", {method:"POST",body:"{}"})).status, 401);
  assert.equal(touched, 1); assert.equal(denied, 1);
  identity.userId = "11111111-1111-4111-8111-111111111111"; bridge.dispose();
  assert.equal((await bridge.fetch("/api/workspace")).status, 401);
  assert.equal(touched, 1);
});

test("account storage and profile identity cannot inherit another organiser's data", async () => {
  assert.notEqual(accountDatabaseName("11111111-1111-4111-8111-111111111111"), accountDatabaseName("22222222-2222-4222-8222-222222222222"));
  assert.throws(() => accountDatabaseName("../public"));
  const records = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: { getItem: key => records.get(key) ?? null, setItem: (key,value) => records.set(key,value), removeItem: key => records.delete(key) } };
  try {
    setPreferenceAccount("11111111-1111-4111-8111-111111111111"); studioLocalStorage.setItem("draft", "private draft");
    setPreferenceAccount("22222222-2222-4222-8222-222222222222"); assert.equal(studioLocalStorage.getItem("draft"), null);
    setPreferenceAccount("11111111-1111-4111-8111-111111111111"); assert.equal(studioLocalStorage.getItem("draft"), "private draft");
  } finally { globalThis.window = previousWindow; }
  const saved = new Map(), store = { get: async k => saved.get(k), set: async (k,v) => saved.set(k,v) };
  const api = createPreviewApi(store, { identity: { userId: "22222222-2222-4222-8222-222222222222", email: "bettina@example.test", displayName: "Bettina Muller" } });
  const workspace = await (await api(new Request(origin + "/api/workspace"))).json();
  assert.equal(workspace.user.firstName, "Bettina"); assert.equal(workspace.user.initials, "BM");
  assert.equal((await api(new Request(origin + "/api/workspace", { method: "PATCH", body: JSON.stringify({displayName:"Nischal"}) }))).status, 400);
});

test("logout during an in-flight authorization prevents the pending local write", async () => {
  let finish, touched = 0;
  const bridge = guardedPreviewFetch({ api: async () => { touched++; return Response.json({}); }, original: fetch,
    authorize: () => new Promise(resolve => { finish=resolve; }), userId: "11111111-1111-4111-8111-111111111111", origin, denied: () => {} });
  const pending=bridge.fetch("/api/campaigns",{method:"POST",body:"{}"});
  bridge.dispose(); finish({userId:"11111111-1111-4111-8111-111111111111"});
  assert.equal((await pending).status,401); assert.equal(touched,0);
});
