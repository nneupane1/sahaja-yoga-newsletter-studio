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
  assert.equal(dashboard.upcoming.length, 5); assert.equal(dashboard.audience.total, 1198); assert.equal(dashboard.metrics.clicked, 370); assert.equal(dashboard.demo, true);
  const draft = await (await api("/api/dashboard?campaignId=sample-0&from=2020-01-01&to=2099-12-31")).json();
  assert.equal(draft.metrics.sent, 0); assert.equal(draft.audience.total, 1);
});

test("preview starts populated and sample results reconcile across all sent campaigns", async () => {
  const { client } = setup(), api = client();
  const workspace = await (await api("/api/workspace")).json();
  assert.equal(workspace.campaign.id, "sample-1");
  for (const campaign of workspace.campaigns.filter(c => c.status === "sent")) {
    const dashboard = await (await api("/api/dashboard?" + new URLSearchParams({ campaignId: campaign.id, from: workspace.preferences.from, to: workspace.preferences.to }))).json();
    const m = dashboard.metrics;
    assert.ok(m.sent >= m.delivered && m.delivered >= m.opened && m.opened >= m.clicked && m.rsvps >= m.confirmed);
    assert.equal(dashboard.engagement.reduce((n, g) => n + g.value, 0), m.sent);
    assert.equal(dashboard.growth.length, 6);
    assert.equal(dashboard.growth.at(-1).total, dashboard.audience.total);
    assert.equal(dashboard.audience.active + dashboard.audience.unsubscribed, dashboard.audience.total);
    assert.equal(dashboard.trend.at(-1).rsvps, m.confirmed);
    assert.ok(dashboard.topLinks.length >= 5 && dashboard.topLinks.every(l => l.people <= l.clicks && l.people <= m.clicked));
    assert.ok(dashboard.content.filter(b => b.clicks > 0).length >= 5);
    assert.equal(dashboard.history.filter(c => c.sent > 0).length, 6);
  }
});

test("existing preview receives samples once without losing drafts, contacts or user choices", async () => {
  const { client, store } = setup(), api = client();
  await api("/api/workspace");
  const state = await store.get("workspace");
  delete state.sampleDataVersion;
  state.campaigns = state.campaigns.filter(c => ["sample-0", "sample-1"].includes(c.id));
  state.campaigns[0].subject = "Keep Bettina's edits";
  state.prefs = { displayName: "Bettina Muller", campaignId: "sample-0", readIds: ["notice"] };
  state.contacts = [{ email: "friend@example.org", status: "subscribed" }];
  await store.set("workspace", state);
  assert.equal((await (await api("/api/workspace")).json()).campaign.id, "sample-1");
  const migrated = await store.get("workspace");
  assert.equal(migrated.campaigns.find(c => c.id === "sample-0").subject, "Keep Bettina's edits");
  assert.deepEqual(migrated.contacts, state.contacts);
  assert.equal(migrated.prefs.displayName, "Bettina Muller");
  assert.deepEqual(migrated.prefs.readIds, ["notice"]);
  await api("/api/workspace", "PATCH", { campaignId: "sample-0" });
  assert.equal((await (await client()("/api/workspace")).json()).campaign.id, "sample-0");
  assert.equal((await store.get("workspace")).campaigns.length, 7);
});
