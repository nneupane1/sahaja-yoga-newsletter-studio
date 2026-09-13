import { templateCatalog } from "../lib/newsletter-templates.mjs";
import { renderDocument } from "../lib/newsletter-renderer.mjs";
import { validatePreferences, workspacePayload } from "../lib/workspace-state.mjs";

const reply = (body, status = 200) => Response.json(body, { status });
const at = days => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString(); };
const sampleStats = [
  { title: "SY Europe Tour", sent: 1200, delivered: 1152, opened: 640, clicked: 370, rsvps: 281, confirmed: 243 },
  { title: "Music and Meditation", sent: 1185, delivered: 1140, opened: 612, clicked: 326, rsvps: 254, confirmed: 218 },
  { title: "Community Summer Journal", sent: 1140, delivered: 1108, opened: 584, clicked: 298, rsvps: 226, confirmed: 192 },
  { title: "Meditation in the Park", sent: 1080, delivered: 1046, opened: 521, clicked: 263, rsvps: 213, confirmed: 176 },
  { title: "An Evening of Bansuri", sent: 1020, delivered: 989, opened: 486, clicked: 248, rsvps: 198, confirmed: 163 },
  { title: "Collective Moments", sent: 980, delivered: 952, opened: 451, clicked: 224, rsvps: 182, confirmed: 151 },
];
const zeroMetrics = { sent: 0, delivered: 0, opened: 0, clicked: 0, rsvps: 0, confirmed: 0 };
const metricsFor = campaign => campaign?.status === "sent" && /^sample-[1-6]$/.test(campaign.id) ? sampleStats[Number(campaign.id.slice(7)) - 1] : zeroMetrics;
const blocked = () => reply({ error: "This is the shareable preview. Connect Sender in the desktop app to send or sync email." }, 409);

export function seedPreview() {
  const catalog = templateCatalog();
  const campaigns = [null, ...sampleStats].map((stats, i) => {
    const template = catalog[i % catalog.length];
    const sentAt = at(-27 + (i - 1) * 4);
    return {
      ...template, id: `sample-${i}`, title: stats ? stats.title + " · sample edition" : "Music and Meditation",
      subject: template.campaignName, preheader: "Musik, Meditation und Begegnungen in unserer Gemeinschaft.",
      status: stats ? "sent" : "draft", recipientCount: stats?.sent || 0,
      fromName: "Sahaja Yoga Newsletter", replyTo: "", createdAt: stats ? sentAt : at(-14), updatedAt: stats ? sentAt : at(0),
      ...(stats ? { sentAt, sampleMetrics: stats } : {}),
    };
  });
  const eventTitles = ["Music and Meditation", "Collective meditation", "SY Europe Tour planning", "Community photo evening", "Newsletter editorial meeting"];
  const photos = catalog.flatMap(t => t.blocks).map(b => b.data.imageUrl).filter(Boolean);
  return { sampleDataVersion: 2, campaigns, prefs: { displayName: "Nischal Neupane", campaignId: "sample-1" }, contacts: [],
    events: eventTitles.map((title, i) => ({ id: `sample-event-${i}`, title, description: "Sample planning entry — replace with confirmed event details.", startsAt: at(3 + i * 7), location: "München · sample event", imageUrl: photos[i], capacity: 80 })),
  };
}

export function previewDashboard(state, options) {
  const campaign = state.campaigns.find(c => c.id === options.campaignId);
  const metrics = metricsFor(campaign);
  const sample = metrics.sent > 0;
  const rendered = renderDocument(campaign || {});
  const topLinks = rendered.links.map((link, index) => ({ id: link.id, label: link.label, url: link.destinationUrl, clicks: sample ? Math.round(metrics.clicked * Math.max(.06, 1.46 - index * .19)) : 0, people: sample ? Math.round(metrics.clicked * Math.max(.04, 1 - index * .13)) : 0 }));
  const active = state.contacts.filter(c => c.status !== "unsubscribed").length;
  return { campaign, metrics, demo: true, sampleAnalytics: sample, syncedAt: null, range: options,
    audience: sample ? { total: 1198, active: 1124, unsubscribed: 74, newSubscribers: 182 } : { total: state.contacts.length, active, unsubscribed: state.contacts.length - active, newSubscribers: state.contacts.length },
    growth: sample ? [712, 798, 862, 947, 1016, 1198].map((total, i) => { const date = new Date(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() - 5 + i); return { month: date.toISOString().slice(0, 7), total }; }) : state.contacts.length ? [{ month: at(0).slice(0, 7), total: state.contacts.length }] : [],
    trend: sample ? [0, .09, .17, .26, .32, .39, .48, .51, .64, .73, .78, .88, .94, 1].map((part, i) => {
      const date = new Date(campaign.sentAt); date.setUTCDate(date.getUTCDate() + Math.round(i * Math.max(1, (Date.now() - date.getTime()) / 86400000) / 13));
      return { day: date.toISOString().slice(0, 10), rsvps: Math.round(metrics.confirmed * part) };
    }).filter(p => p.day >= options.from && p.day <= options.to) : [],
    engagement: sample ? [
      { name: "Highly engaged", value: Math.round(metrics.clicked * .66), color: "#1caf70" },
      { name: "Interested", value: metrics.clicked - Math.round(metrics.clicked * .66), color: "#175cdf" },
      { name: "Readers", value: metrics.opened - metrics.clicked, color: "#51a8f2" },
      { name: "No tracked interaction", value: metrics.delivered - metrics.opened, color: "#edac54" },
      { name: "Not delivered", value: metrics.sent - metrics.delivered, color: "#a7b6c7" },
    ] : [{ name: "Clicked", value: 0, color: "#175cdf" }, { name: "Opened only", value: 0, color: "#51a8f2" }, { name: "No tracked interaction", value: 0, color: "#dbe2ed" }],
    topLinks,
    content: (campaign?.blocks || []).filter(b => ["hero", "story", "gallery", "button"].includes(b.type)).map(b => { const link = topLinks.find(l => l.id === `lnk_${b.id}`); const position = campaign.blocks.indexOf(b); const previous = campaign.blocks[position - 1]; return { id: b.id, title: b.data.title || (b.type === "gallery" && previous?.data.title) || b.data.label || "Photo story", image: b.data.imageUrl, clicks: link?.clicks ?? null, url: link?.url }; }).sort((a, b) => (b.clicks ?? -1) - (a.clicks ?? -1)),
    history: state.campaigns.filter(c => { const day = (c.sentAt || c.updatedAt).slice(0, 10); return day >= options.from && day <= options.to; }).map(c => ({ ...c, ...metricsFor(c), title: c.title })).sort((a, b) => (b.sentAt || b.updatedAt).localeCompare(a.sentAt || a.updatedAt)),
    upcoming: state.events.filter(e => e.startsAt >= at(0)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 5),
  };
}

// Serialized writes keep parallel requests in this tab from overwriting a save.
// Each API request reads persisted state; no production server is contacted.
export function createPreviewApi(store, options = {}) {
  let queue = Promise.resolve();
  async function handle(request) {
    const identity = typeof options.identity === "function" ? options.identity() : options.identity || null;
    const url = new URL(request.url), route = url.pathname, method = request.method;
    let state = await store.get("workspace");
    if (!state) { state = seedPreview(); if (identity) state.prefs.displayName = identity.displayName; await store.set("workspace", state); }
    if (state.sampleDataVersion !== 2) {
      const examples = seedPreview().campaigns.filter(c => c.status === "sent");
      state.campaigns = [...state.campaigns.filter(c => !examples.some(e => e.id === c.id && c.status === "sent")), ...examples.filter(e => !state.campaigns.some(c => c.id === e.id && c.status !== "sent"))];
      if (!state.prefs.campaignId || /^sample-[0-6]$/.test(state.prefs.campaignId)) {
        state.prefs = { ...state.prefs, campaignId: "sample-1", from: at(-29).slice(0, 10), to: at(0).slice(0, 10) };
      }
      state.sampleDataVersion = 2;
      await store.set("workspace", state);
    }
    const save = () => store.set("workspace", state);
    if (route.endsWith("/send") || route.startsWith("/api/local/") || route === "/api/subscribers/sync-sender") return blocked();
    if (route === "/api/status") return reply({ runtime: "preview", user: { name: state.prefs.displayName }, provider: { name: "Sender", connected: false }, counts: { campaigns: state.campaigns.length, subscribers: state.contacts.length, events: state.events.length }, storage: { database: true, images: true } });
    if (route === "/api/templates" && method === "GET") return reply({ templates: templateCatalog() });
    if (route === "/api/workspace") {
      if (method === "PATCH") { const patch = await request.json(); if (identity && "displayName" in patch) return reply({error:"Update your name in Account & security."}, 400); state.prefs = validatePreferences(patch, state.prefs); await save(); }
      else if (method !== "GET") return reply({ error: "Method not allowed" }, 405);
      return reply(workspacePayload(identity || { userId: "preview-organiser", identitySource: "Preview profile · saved in this browser" }, identity ? { ...state.prefs, displayName: identity.displayName } : state.prefs, state.campaigns, state.events));
    }
    if (route === "/api/dashboard" && method === "GET") return reply(previewDashboard(state, validatePreferences(Object.fromEntries(url.searchParams))));
    if (route === "/api/analytics") {
      const campaign = state.campaigns.find(c => c.id === url.searchParams.get("campaignId")), metrics = metricsFor(campaign);
      return reply({ campaign, provider: null, events: [], rsvps: { total: metrics.rsvps, confirmed: metrics.confirmed }, metrics, demo: true });
    }
    if (route === "/api/campaigns") {
      if (method === "GET") return reply({ campaigns: state.campaigns });
      if (method === "POST") {
        const data = await request.json();
        const campaign = { ...data, id: crypto.randomUUID(), status: "draft", recipientCount: 0, createdAt: at(0), updatedAt: at(0) };
        state.campaigns.unshift(campaign); await save(); return reply({ campaign }, 201);
      }
    }
    const match = route.match(/^\/api\/campaigns\/([^/]+)$/);
    if (match) {
      const campaign = state.campaigns.find(c => c.id === match[1]);
      if (!campaign) return reply({ error: "Newsletter not found" }, 404);
      if (method === "GET") return reply({ campaign });
      if (method === "PUT") {
        if (campaign.status !== "draft") return reply({ error: "Start a new edition from this sample to edit it." }, 409);
        const data = await request.json();
        if (!data.subject?.trim() || !Array.isArray(data.blocks) || !data.blocks.length) return reply({ error: "Subject and content are required" }, 400);
        for (const key of ["title", "subject", "preheader", "fromName", "replyTo", "blocks"]) if (key in data) campaign[key] = data[key];
        campaign.updatedAt = at(0); const { html } = renderDocument(campaign); await save(); return reply({ ok: true, html });
      }
    }
    if (route === "/api/events") {
      if (method === "GET") return reply({ events: state.events });
      if (method === "POST") {
        const data = await request.json();
        if (!data.title?.trim() || !Number.isFinite(Date.parse(data.startsAt))) return reply({ error: "Event title and valid date are required" }, 400);
        const event = { ...data, startsAt: new Date(data.startsAt).toISOString(), id: crypto.randomUUID() };
        state.events.push(event); await save(); return reply({ event }, 201);
      }
    }
    if (route === "/api/subscribers" && method === "POST") {
      const { contacts } = await request.json();
      if (!Array.isArray(contacts)) return reply({ error: "Contacts are required" }, 400);
      let imported = 0;
      for (const contact of contacts) {
        const email = String(contact.email || "").trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !state.contacts.some(c => c.email === email)) { state.contacts.push({ ...contact, email, id: crypto.randomUUID(), status: "subscribed" }); imported++; }
      }
      await save(); return reply({ imported, skipped: contacts.length - imported });
    }
    if (route === "/api/assets" && method === "POST") {
      const form = await request.formData(), file = form.get("file");
      if (!(file instanceof Blob) || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 15 * 1024 * 1024) return reply({ error: "Choose a PNG, JPEG, WebP or GIF image under 15 MB." }, 400);
      const id = crypto.randomUUID(); await store.set(`asset:${id}`, file);
      return reply({ asset: { id, url: `/api/assets/${id}${identity ? "?account=" + encodeURIComponent(identity.userId) : ""}` } }, 201);
    }
    return reply({ error: "This action is not available in the shareable preview." }, 404);
  }
  return request => {
    const work = async () => { try { return await handle(request); } catch (error) { return reply({ error: error.message || "Could not save to browser storage" }, 400); } };
    const locked = () => globalThis.navigator?.locks ? navigator.locks.request("sy-newsletter-preview", work) : work();
    const result = queue.then(locked); queue = result.catch(() => {}); return result;
  };
}
