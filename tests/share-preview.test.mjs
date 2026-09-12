import test from "node:test";
import assert from "node:assert/strict";
import { createPreviewApi } from "../share/api.mjs";

function setup() {
  const records = new Map();
  const store = { get: async key => structuredClone(records.get(key)), set: async (key, value) => { records.set(key, structuredClone(value)); } };
  const client = () => {
    const api = createPreviewApi(store);
    return (path, method = "GET", data) => api(new Request(`https://preview.example${path}`, { method, ...(data ? { body: data instanceof FormData ? data : JSON.stringify(data) } : {}) }));
  };
  return { client, store };
}

test("draft, profile and notifications survive a new client; templates remain masters", async () => {
  const { client } = setup(); const api = client();
  const catalog = await (await api("/api/templates")).json();
  assert.equal(catalog.templates.length, 4);
  assert.ok(catalog.templates.some(t => t.blocks.some(b => b.type === "gallery")));
  const { campaign } = await (await api("/api/campaigns", "POST", { title: "Friends edition", subject: "A shared evening", blocks: catalog.templates[0].blocks })).json();
  assert.equal((await api(`/api/campaigns/${campaign.id}`, "PUT", { subject: "Updated subject", blocks: campaign.blocks })).status, 200);
  await api("/api/workspace", "PATCH", { displayName: "Bettina Muller", readIds: ["example"] });
  const next = client();
  assert.equal((await (await next(`/api/campaigns/${campaign.id}`)).json()).campaign.subject, "Updated subject");
  const workspace = await (await next("/api/workspace")).json();
  assert.equal(workspace.user.firstName, "Bettina"); assert.equal(workspace.user.initials, "BM");
  assert.ok(workspace.preferences.readIds.includes("example"));
  assert.equal((await next("/api/workspace", "PATCH", { from: "2026-09-30", to: "2026-09-01" })).status, 400);
});

test("delivery and credentials cannot be enabled by changing requests", async () => {
  const { client, store } = setup(); const api = client();
  for (const path of ["/api/campaigns/sample-0/send", "/api/local/settings", "/api/subscribers/sync-sender"]) assert.equal((await api(path, "POST", { apiToken: "never-store-this", action: "send" })).status, 409);
  assert.ok(!JSON.stringify(await store.get("workspace")).includes("never-store-this"));
  assert.equal((await api("/api/campaigns/sample-1", "PUT", { status: "draft" })).status, 409);
});

test("uploaded collage bytes persist; unsafe formats fail; dashboard reflects saved events and contacts", async () => {
  const { client, store } = setup(); const api = client();
  const form = new FormData(); form.append("file", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), "collage.png");
  const { asset } = await (await api("/api/assets", "POST", form)).json();
  assert.equal((await store.get(`asset:${asset.id}`)).type, "image/png");
  const unsafe = new FormData(); unsafe.append("file", new Blob(["<svg/>"], { type: "image/svg+xml" }), "unsafe.svg");
  assert.equal((await api("/api/assets", "POST", unsafe)).status, 400);
  await api("/api/subscribers", "POST", { contacts: [{ email: "friend@example.org" }, { email: "FRIEND@example.org" }] });
  const dashboard = await (await api("/api/dashboard?campaignId=sample-1&from=2020-01-01&to=2099-12-31")).json();
  assert.equal(dashboard.upcoming.length, 5); assert.equal(dashboard.audience.total, 1); assert.equal(dashboard.metrics.clicked, 370); assert.equal(dashboard.demo, true);
  const draft = await (await api("/api/dashboard?campaignId=sample-0&from=2020-01-01&to=2099-12-31")).json();
  assert.equal(draft.metrics.sent, 0);
});
