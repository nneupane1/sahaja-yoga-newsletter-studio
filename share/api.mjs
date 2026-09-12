import { templateCatalog } from "../lib/newsletter-templates.mjs";
import { renderDocument } from "../lib/newsletter-renderer.mjs";
import { validatePreferences, workspacePayload } from "../lib/workspace-state.mjs";

const reply = (body, status = 200) => Response.json(body, { status });
const at = days => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString(); };
const blocked = () => reply({ error: "This is the shareable preview. Connect Sender in the desktop app to send or sync email." }, 409);

export function seedPreview() {
  const catalog = templateCatalog();
  const campaigns = catalog.slice(0, 2).map((template, i) => ({
    ...template, id: `sample-${i}`, title: i ? "SY Europe Tour · sample edition" : "Music and Meditation",
    subject: template.campaignName, preheader: "Musik, Meditation und Begegnungen in unserer Gemeinschaft.",
    status: i ? "sent" : "draft", recipientCount: i ? 1200 : 0,
    fromName: "Sahaja Yoga Newsletter", replyTo: "", createdAt: at(-14), updatedAt: at(-i),
    ...(i ? { sentAt: at(-7) } : {}),
  }));
  const eventTitles = ["Music and Meditation", "Collective meditation", "SY Europe Tour planning", "Community photo evening", "Newsletter editorial meeting"];
  const photos = catalog.flatMap(t => t.blocks).map(b => b.data.imageUrl).filter(Boolean);
  return { campaigns, prefs: { displayName: "Nischal Neupane" }, contacts: [],
    events: eventTitles.map((title, i) => ({ id: `sample-event-${i}`, title, description: "Sample planning entry — replace with confirmed event details.", startsAt: at(3 + i * 7), location: "München · sample event", imageUrl: photos[i], capacity: 80 })),
  };
}

export function previewDashboard(state, options) {
  const campaign = state.campaigns.find(c => c.id === options.campaignId);
  const sample = campaign?.id === "sample-1";
  const metrics = sample ? { sent: 1200, delivered: 1152, opened: 640, clicked: 370, rsvps: 281, confirmed: 243 }
    : { sent: 0, delivered: 0, opened: 0, clicked: 0, rsvps: 0, confirmed: 0 };
  const rendered = renderDocument(campaign || {});
  const topLinks = rendered.links.map((link, index) => ({ id: link.id, label: link.label, url: link.destinationUrl, clicks: sample ? Math.max(0, 542 - index * 83) : 0, people: sample ? Math.max(0, 370 - index * 62) : 0 }));
  const active = state.contacts.filter(c => c.status !== "unsubscribed").length;
  return { campaign, metrics, demo: true, syncedAt: null, range: options,
    audience: { total: state.contacts.length, active, unsubscribed: state.contacts.length - active, newSubscribers: state.contacts.length },
    growth: state.contacts.length ? [{ month: at(0).slice(0, 7), total: state.contacts.length }] : [],
    trend: sample ? [62, 94, 138, 176, 219, 243].map((rsvps, i) => ({ day: at(-25 + i * 4).slice(0, 10), rsvps })).filter(p => p.day >= options.from && p.day <= options.to) : [],
    engagement: [{ name: "Clicked", value: metrics.clicked, color: "#175cdf" }, { name: "Opened only", value: metrics.opened - metrics.clicked, color: "#51a8f2" }, { name: "No tracked interaction", value: metrics.sent - metrics.opened, color: "#dbe2ed" }],
    topLinks,
    content: (campaign?.blocks || []).filter(b => ["hero", "story", "gallery", "button"].includes(b.type)).map(b => { const link = topLinks.find(l => l.id === `lnk_${b.id}`); return { id: b.id, title: b.data.title || b.data.label || "Photo story", image: b.data.imageUrl, clicks: link?.clicks ?? null, url: link?.url }; }),
    history: state.campaigns.filter(c => { const day = (c.sentAt || c.updatedAt).slice(0, 10); return day >= options.from && day <= options.to; }).map(c => ({ ...c, sent: c.recipientCount || 0, opened: c.id === "sample-1" ? 640 : 0, clicked: c.id === "sample-1" ? 370 : 0, confirmed: c.id === "sample-1" ? 243 : 0 })),
    upcoming: state.events.filter(e => e.startsAt >= at(0)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 5),
  };
}

// Serialized writes keep parallel requests in this tab from overwriting a save.
// Each API request reads persisted state; no production server is contacted.
export function createPreviewApi(store) {
  let queue = Promise.resolve();
  async function handle(request) {
    const url = new URL(request.url), route = url.pathname, method = request.method;
    let state = await store.get("workspace");
    if (!state) { state = seedPreview(); await store.set("workspace", state); }
    const save = () => store.set("workspace", state);
    if (route.endsWith("/send") || route.startsWith("/api/local/") || route === "/api/subscribers/sync-sender") return blocked();
    if (route === "/api/status") return reply({ runtime: "preview", user: { name: state.prefs.displayName }, provider: { name: "Sender", connected: false }, counts: { campaigns: state.campaigns.length, subscribers: state.contacts.length, events: state.events.length }, storage: { database: true, images: true } });
    if (route === "/api/templates" && method === "GET") return reply({ templates: templateCatalog() });
    if (route === "/api/workspace") {
      if (method === "PATCH") { state.prefs = validatePreferences(await request.json(), state.prefs); await save(); }
      else if (method !== "GET") return reply({ error: "Method not allowed" }, 405);
      return reply(workspacePayload({ userId: "preview-organiser", identitySource: "Preview profile · saved in this browser" }, state.prefs, state.campaigns, state.events));
    }
    if (route === "/api/dashboard" && method === "GET") return reply(previewDashboard(state, validatePreferences(Object.fromEntries(url.searchParams))));
    if (route === "/api/analytics") return reply({ campaign: state.campaigns.find(c => c.id === url.searchParams.get("campaignId")), provider: null, events: [], rsvps: { total: 0, confirmed: 0 }, demo: true });
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
      return reply({ asset: { id, url: `/api/assets/${id}` } }, 201);
    }
    return reply({ error: "This action is not available in the shareable preview." }, 404);
  }
  return request => {
    const work = async () => { try { return await handle(request); } catch (error) { return reply({ error: error.message || "Could not save to browser storage" }, 400); } };
    const locked = () => globalThis.navigator?.locks ? navigator.locks.request("sy-newsletter-preview", work) : work();
    const result = queue.then(locked); queue = result.catch(() => {}); return result;
  };
}
