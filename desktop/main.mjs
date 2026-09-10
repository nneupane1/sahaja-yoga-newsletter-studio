import { app, BrowserWindow, safeStorage, shell } from "electron";
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const senderBaseUrl = "https://api.sender.net/v2/";
let senderQueue = Promise.resolve();
let lastSenderCallAt = 0;
let database;
let folders;
let settingsPath;

const clean = (value, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const id = (prefix) => `${prefix}_${randomUUID().replaceAll("-", "")}`;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const safeName = (value) => clean(value, 100).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/[. ]+$/g, "").slice(0, 80) || "Newsletter";
const rowObject = (row) => row ? Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()), value])) : null;
const json = (response, status, value) => {
  const body = JSON.stringify(value);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(body) });
  response.end(body);
};
const readBody = (request, limit = 25 * 1024 * 1024) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > limit) {
      reject(new Error("File is too large"));
      request.destroy();
    } else chunks.push(chunk);
  });
  request.on("end", () => resolve(Buffer.concat(chunks)));
  request.on("error", reject);
});
const readJson = async (request) => {
  const body = await readBody(request, 2 * 1024 * 1024);
  return body.length ? JSON.parse(body.toString("utf8")) : {};
};

function setupWorkspace() {
  const root = path.join(app.getPath("documents"), "Sahaja Yoga Newsletter Studio");
  folders = {
    root,
    database: path.join(root, "Database"),
    media: path.join(root, "Media"),
    projects: path.join(root, "Projects"),
    exports: path.join(root, "Exports"),
    backups: path.join(root, "Backups"),
  };
  Object.values(folders).forEach((folder) => mkdirSync(folder, { recursive: true }));
  settingsPath = path.join(root, "settings.json");
  const databasePath = path.join(folders.database, "newsletter-studio.db");
  database = new DatabaseSync(databasePath);
  database.exec(readFileSync(path.join(__dirname, "local-schema.sql"), "utf8"));
  const campaignColumns = new Set(database.prepare("PRAGMA table_info(campaigns)").all().map((column) => column.name));
  for (const [column, definition] of [
    ["delivered_count", "INTEGER NOT NULL DEFAULT 0"],
    ["failed_count", "INTEGER NOT NULL DEFAULT 0"],
    ["last_error", "TEXT"],
  ]) {
    if (!campaignColumns.has(column)) database.exec(`ALTER TABLE campaigns ADD COLUMN ${column} ${definition}`);
  }
  const backupPath = path.join(folders.backups, `newsletter-studio-${new Date().toISOString().slice(0, 10)}.db`);
  if (existsSync(databasePath) && !existsSync(backupPath)) copyFileSync(databasePath, backupPath);
  const backups = readdirSync(folders.backups).filter((name) => name.endsWith(".db")).sort().reverse();
  backups.slice(14).forEach((name) => unlinkSync(path.join(folders.backups, name)));
}

function readSettings() {
  try { return JSON.parse(readFileSync(settingsPath, "utf8")); }
  catch { return {}; }
}

function senderSettings() {
  const saved = readSettings();
  let apiToken = "";
  if (saved.senderApiTokenEncrypted && safeStorage.isEncryptionAvailable()) {
    try { apiToken = safeStorage.decryptString(Buffer.from(saved.senderApiTokenEncrypted, "base64")); }
    catch { apiToken = ""; }
  }
  return { ...saved, apiToken, fromName: saved.fromName || "Sahaja Yoga Newsletter" };
}

function saveSettings(input) {
  if (input.apiToken && !safeStorage.isEncryptionAvailable()) throw new Error("Windows secure credential storage is unavailable");
  const current = readSettings();
  const output = {
    ...current,
    senderGroupId: clean(input.senderGroupId, 80),
    fromName: clean(input.fromName, 120) || "Sahaja Yoga Newsletter",
    replyTo: clean(input.replyTo, 254),
  };
  if (input.apiToken) output.senderApiTokenEncrypted = safeStorage.encryptString(clean(input.apiToken, 500)).toString("base64");
  writeFileSync(settingsPath, JSON.stringify(output, null, 2), { mode: 0o600 });
}

function senderConfigured(config = senderSettings()) {
  return Boolean(config.apiToken && config.senderGroupId && config.fromName && config.replyTo);
}

async function performSenderRequest(endpoint, method, body, config) {
  if (!senderConfigured(config)) throw new Error("Complete the Sender setup in Settings before sending");
  const url = endpoint.startsWith("https://") ? endpoint : new URL(endpoint.replace(/^\/+/, ""), senderBaseUrl).toString();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const pause = Math.max(0, 300 - (Date.now() - lastSenderCallAt));
    if (pause) await wait(pause);
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${config.apiToken}`, Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    lastSenderCallAt = Date.now();
    const result = await response.json().catch(() => ({}));
    const retryable = response.status === 429 || (method === "GET" && response.status >= 500);
    if (retryable && attempt < 5) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(30000, 1000 * 2 ** attempt));
      continue;
    }
    if (!response.ok || result.success === false) {
      const details = result.errors ? Object.values(result.errors).flat().join(" · ") : "";
      throw new Error(details || result.message || `Sender request failed (${response.status})`);
    }
    return result;
  }
  throw new Error("Sender is temporarily rate-limiting requests. Please try again later.");
}

function senderRequest(endpoint, method = "GET", body, config = senderSettings()) {
  const task = senderQueue.then(() => performSenderRequest(endpoint, method, body, config));
  senderQueue = task.catch(() => undefined);
  return task;
}

async function providerStatus() {
  const config = senderSettings();
  if (!senderConfigured(config)) return { connected: false, configured: false, name: "Sender" };
  try {
    const result = await senderRequest(`groups/${encodeURIComponent(config.senderGroupId)}`, "GET", undefined, config);
    const group = result.data || {};
    return {
      connected: true,
      configured: true,
      name: "Sender",
      listName: group.title || "Newsletter group",
      memberCount: Number(group.active_subscribers || 0),
      totalContacts: Number(group.recipient_count || 0),
      unsubscribed: Number(group.unsubscribed_count || 0),
      bounced: Number(group.bounced_count || 0),
      freePlan: true,
      monthlyLimit: 15000,
      subscriberLimit: 2500,
    };
  } catch (error) {
    return { connected: false, configured: true, name: "Sender", error: error instanceof Error ? error.message : "Connection failed" };
  }
}

const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
const normalUrl = (value) => {
  const text = String(value || "");
  if (/^\/api\/assets\/[a-zA-Z0-9_-]+$/.test(text)) return text;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch { return ""; }
};

function renderEmail({ subject, preheader, blocks }) {
  const body = blocks.map((block) => {
    const data = block.data || {};
    if (block.type === "hero") {
      const image = normalUrl(data.imageUrl);
      const filter = `brightness(${Number(data.brightness ?? 100)}%) contrast(${Number(data.contrast ?? 100)}%) saturate(${Number(data.saturation ?? 100)}%)`;
      return `<tr><td style="padding:0;background:#17275d;text-align:center">${image ? `<img src="${escapeHtml(image)}" width="640" alt="" style="display:block;width:100%;height:auto;opacity:${Number(data.opacity ?? 72) / 100};filter:${filter}">` : ""}<div style="padding:34px 42px 38px;color:#fff"><div style="font:700 12px Arial,sans-serif;letter-spacing:1.4px;text-transform:uppercase;color:#ffc976">${escapeHtml(data.eyebrow)}</div><h1 style="margin:12px 0 0;font:600 42px Georgia,serif;line-height:1.08">${escapeHtml(data.title)}</h1><p style="margin:16px 0 0;font:16px Arial,sans-serif;line-height:1.65;color:#dfe7ff">${escapeHtml(data.text)}</p></div></td></tr>`;
    }
    if (block.type === "heading") return `<tr><td style="padding:28px 42px 8px"><h2 style="margin:0;color:${escapeHtml(data.color || "#17213f")};font:600 ${Number(data.size) || 30}px Georgia,serif;line-height:1.2;text-align:${escapeHtml(data.align || "left")}">${escapeHtml(data.text)}</h2></td></tr>`;
    if (block.type === "text") return `<tr><td style="padding:12px 42px;color:${escapeHtml(data.color || "#57627a")};font:16px Arial,sans-serif;line-height:1.75;text-align:${escapeHtml(data.align || "left")}">${escapeHtml(data.text).replaceAll("\n", "<br>")}</td></tr>`;
    if (block.type === "image") {
      const image = normalUrl(data.imageUrl);
      const padding = Math.max(0, Math.min(Number(data.padding ?? 42), 56));
      const width = Math.min(Number(data.width) || 556, 640 - padding * 2);
      const filter = `brightness(${Number(data.brightness ?? 100)}%) contrast(${Number(data.contrast ?? 100)}%) saturate(${Number(data.saturation ?? 100)}%)`;
      return image ? `<tr><td style="padding:18px ${padding}px;text-align:${escapeHtml(data.align || "center")}"><img src="${escapeHtml(image)}" width="${width}" alt="${escapeHtml(data.alt)}" style="display:inline-block;width:${width}px;max-width:100%;height:auto;border-radius:${Number(data.radius) || 0}px;opacity:${Number(data.opacity ?? 100) / 100};filter:${filter}"></td></tr>` : "";
    }
    if (block.type === "button") {
      const url = normalUrl(data.url);
      return url ? `<tr><td style="padding:24px 42px;text-align:${escapeHtml(data.align || "center")}"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 24px;border-radius:${Number(data.radius) || 12}px;background:${escapeHtml(data.background || "#175cdf")};color:${escapeHtml(data.color || "#fff")};font:700 15px Arial,sans-serif;text-decoration:none">${escapeHtml(data.label || "Mehr erfahren")}</a></td></tr>` : "";
    }
    if (block.type === "divider") return `<tr><td style="padding:20px 42px"><div style="height:1px;background:${escapeHtml(data.color || "#e6eaf1")}"></div></td></tr>`;
    return `<tr><td height="${Math.min(Number(data.height) || 24, 80)}" style="font-size:0;line-height:0">&nbsp;</td></tr>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f2f4f8"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f4f8"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#fff">${body}<tr><td style="padding:30px 42px;text-align:center;background:#f8f9fc;color:#8791a6;font:12px Arial,sans-serif;line-height:1.6">Du erhältst diese E-Mail, weil du Sahaja Yoga Neuigkeiten abonniert hast.<br><a href="{$unsubscribe_link}" style="color:#576c9e">Abmelden</a></td></tr></table></td></tr></table></body></html>`;
}

function prepareSenderHtml(savedHtml, includeUnsubscribe = true) {
  let html = savedHtml || "";
  const matches = [...html.matchAll(/src=(["'])(?:https?:\/\/127\.0\.0\.1(?::\d+)?)?\/api\/assets\/([a-zA-Z0-9_-]+)\1/g)];
  for (const match of matches) {
    const asset = database.prepare("SELECT * FROM assets WHERE id=?").get(match[2]);
    if (!asset) continue;
    const assetPath = path.join(folders.media, asset.object_key);
    if (!existsSync(assetPath)) continue;
    const source = `data:${asset.content_type};base64,${readFileSync(assetPath).toString("base64")}`;
    html = html.replaceAll(match[0], `src=${match[1]}${source}${match[1]}`);
  }
  html = html.replaceAll("*|UNSUB|*", "{$unsubscribe_link}").replaceAll("{{amazonSESUnsubscribeUrl}}", "{$unsubscribe_link}");
  if (!includeUnsubscribe) html = html.replaceAll("{$unsubscribe_link}", "#");
  return html;
}

function plainText(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/p>|<\/h[1-6]>|<\/tr>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n\s+/g, "\n").replace(/[ \t]+/g, " ").trim();
}

async function ensureSenderCampaign(campaign) {
  if (campaign.provider_campaign_id) return campaign.provider_campaign_id;
  const config = senderSettings();
  const providerTitle = `${campaign.title} · Studio ${campaign.id.slice(-8)}`;
  let created;
  try {
    created = await senderRequest("campaigns", "POST", {
    title: providerTitle,
    subject: campaign.subject,
    from: config.fromName,
    preheader: campaign.preheader,
    reply_to: config.replyTo,
    content_type: "html",
    google_analytics: 0,
    auto_followup_active: false,
    groups: [config.senderGroupId],
    segments: [],
    content: prepareSenderHtml(campaign.html, true),
    }, config);
  } catch (error) {
    const listing = await senderRequest("campaigns?limit=100", "GET", undefined, config).catch(() => null);
    const recovered = resultItems(listing).find((item) => item.title === providerTitle && item.subject === campaign.subject);
    if (!recovered) throw error;
    created = { data: recovered };
  }
  const providerId = created.data?.id;
  if (!providerId) throw new Error("Sender created the campaign but did not return its ID");
  database.prepare("UPDATE campaigns SET provider_campaign_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(providerId, campaign.id);
  return providerId;
}

const resultItems = (result) => Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];
const resultTotal = (result) => Number(result?.meta?.total ?? resultItems(result).length);

async function campaignReport(campaign) {
  if (!campaign?.provider_campaign_id || !senderConfigured()) return null;
  const campaignId = encodeURIComponent(campaign.provider_campaign_id);
  const [details, opens, clicks, hardBounces, softBounces, unsubscribes] = await Promise.all([
    senderRequest(`campaigns/${campaignId}`),
    senderRequest(`campaigns/${campaignId}/opens?limit=2500`),
    senderRequest(`campaigns/${campaignId}/clicks?limit=2500`),
    senderRequest(`campaigns/${campaignId}/hard_bounces?limit=2500`),
    senderRequest(`campaigns/${campaignId}/soft_bounces?limit=2500`),
    senderRequest(`campaigns/${campaignId}/unsubscribes?limit=2500`),
  ]);
  const item = details.data || {};
  const opened = Number(item.opens ?? resultTotal(opens));
  const clicked = Number(item.clicks ?? resultTotal(clicks));
  const hard = resultTotal(hardBounces);
  const soft = resultTotal(softBounces);
  const unsubscribed = resultTotal(unsubscribes);
  const sent = Number(item.sent_count || item.recipient_count || campaign.recipient_count || 0);
  const delivered = Math.max(0, sent - hard - soft);
  const clickItems = resultItems(clicks);
  const rsvpItems = clickItems.filter((event) => /rsvp|anmeld|register|eventbrite|forms\.gle|docs\.google\.com\/forms/i.test(String(event.url || "")));
  for (const event of resultItems(unsubscribes)) database.prepare("UPDATE subscribers SET status='unsubscribed',updated_at=CURRENT_TIMESTAMP WHERE email=?").run(String(event.email || "").toLowerCase());
  for (const event of [...resultItems(hardBounces), ...resultItems(softBounces)]) database.prepare("UPDATE subscribers SET status='bounced',updated_at=CURRENT_TIMESTAMP WHERE email=?").run(String(event.email || "").toLowerCase());
  database.prepare("UPDATE campaigns SET status=?,recipient_count=?,delivered_count=?,failed_count=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(String(item.status || campaign.status).toLowerCase(), sent, delivered, hard + soft, campaign.id);
  return {
    provider: "Sender",
    emails_sent: sent,
    delivered,
    opens: { unique_opens: opened, open_rate: delivered ? opened / delivered : 0 },
    clicks: { unique_clicks: clicked, click_rate: delivered ? clicked / delivered : 0, items: clickItems },
    bounces: { hard_bounces: hard, soft_bounces: soft },
    unsubscribed,
    rsvpClicks: new Set(rsvpItems.map((event) => event.recipient_id || event.email)).size,
  };
}

async function syncSubscriber(contact, config) {
  const body = { email: contact.email, firstname: contact.first_name, lastname: contact.last_name, groups: [config.senderGroupId], trigger_automation: false };
  try { await senderRequest("subscribers", "POST", body, config); }
  catch (error) {
    if (!/already|exist|taken|422/i.test(error instanceof Error ? error.message : "")) throw error;
    await senderRequest(`subscribers/${encodeURIComponent(contact.email)}`, "PATCH", { ...body, subscriber_status: contact.status === "subscribed" ? "ACTIVE" : "UNSUBSCRIBED" }, config);
  }
}

function parseMultipart(buffer, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.slice(1).find(Boolean);
  if (!boundary) throw new Error("Invalid image upload");
  const marker = Buffer.from(`--${boundary}`);
  const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), buffer.indexOf(marker));
  if (headerEnd < 0) throw new Error("Invalid image upload");
  const headers = buffer.subarray(buffer.indexOf(marker) + marker.length, headerEnd).toString("utf8");
  const end = buffer.indexOf(Buffer.from(`\r\n--${boundary}`), headerEnd + 4);
  if (end < 0) throw new Error("Invalid image upload");
  return { data: buffer.subarray(headerEnd + 4, end), filename: headers.match(/filename="([^"]+)"/)?.[1] || "image", contentType: headers.match(/content-type:\s*([^\r\n]+)/i)?.[1] || "application/octet-stream" };
}

async function api(request, response, url) {
  const method = request.method || "GET";
  const pathname = url.pathname;
  if (pathname === "/api/status" && method === "GET") {
    const counts = { campaigns: database.prepare("SELECT COUNT(*) count FROM campaigns").get().count, subscribers: database.prepare("SELECT COUNT(*) count FROM subscribers WHERE status='subscribed'").get().count, events: database.prepare("SELECT COUNT(*) count FROM events WHERE starts_at >= CURRENT_TIMESTAMP").get().count };
    return json(response, 200, { runtime: "desktop", user: { email: "local-organiser", name: app.getName() }, counts, provider: await providerStatus(), storage: { database: true, images: true, workspace: folders.root } });
  }
  if (pathname === "/api/local/settings" && method === "GET") {
    const current = senderSettings();
    return json(response, 200, { configured: senderConfigured(current), senderGroupId: current.senderGroupId || "", fromName: current.fromName || "Sahaja Yoga Newsletter", replyTo: current.replyTo || "", hasApiToken: Boolean(current.apiToken), workspace: folders.root });
  }
  if (pathname === "/api/local/settings" && method === "PUT") {
    saveSettings(await readJson(request));
    return json(response, 200, { ok: true, provider: await providerStatus(), workspace: folders.root });
  }
  if (pathname === "/api/local/open-folder" && method === "POST") {
    const error = await shell.openPath(folders.root);
    if (error) throw new Error(error);
    return json(response, 200, { ok: true });
  }
  if (pathname === "/api/campaigns" && method === "GET") {
    const rows = database.prepare("SELECT id,title,subject,preheader,status,provider_campaign_id,recipient_count,delivered_count,failed_count,last_error,sent_at,scheduled_at,created_at,updated_at FROM campaigns ORDER BY updated_at DESC LIMIT 100").all().map(rowObject);
    return json(response, 200, { campaigns: rows });
  }
  if (pathname === "/api/campaigns" && method === "POST") {
    const input = await readJson(request);
    const campaignId = id("cmp");
    database.prepare("INSERT INTO campaigns (id,title,subject,preheader,from_name,reply_to,content_json,status) VALUES (?,?,?,?,?,?,?,'draft')").run(campaignId, clean(input.title, 160) || "Unbenannter Newsletter", clean(input.subject, 180), clean(input.preheader, 220), clean(input.fromName, 120), clean(input.replyTo, 254), JSON.stringify(input.blocks || []));
    return json(response, 201, { campaign: { id: campaignId, title: input.title, subject: input.subject, preheader: input.preheader, blocks: input.blocks || [], status: "draft" } });
  }
  const campaignMatch = pathname.match(/^\/api\/campaigns\/([^/]+)$/);
  if (campaignMatch && method === "GET") {
    const row = database.prepare("SELECT * FROM campaigns WHERE id=?").get(campaignMatch[1]);
    if (!row) return json(response, 404, { error: "Newsletter not found" });
    const campaign = rowObject(row);
    campaign.blocks = JSON.parse(campaign.contentJson || "[]");
    delete campaign.contentJson;
    return json(response, 200, { campaign });
  }
  if (campaignMatch && method === "PUT") {
    const input = await readJson(request);
    const html = renderEmail(input);
    database.prepare("UPDATE campaigns SET title=?,subject=?,preheader=?,from_name=?,reply_to=?,content_json=?,html=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(clean(input.title, 160), clean(input.subject, 180), clean(input.preheader, 220), clean(input.fromName, 120), clean(input.replyTo, 254), JSON.stringify(input.blocks || []), html, campaignMatch[1]);
    const projectFolder = path.join(folders.projects, safeName(input.title));
    mkdirSync(projectFolder, { recursive: true });
    writeFileSync(path.join(projectFolder, "newsletter.html"), html);
    writeFileSync(path.join(projectFolder, "newsletter.json"), JSON.stringify({ ...input, id: campaignMatch[1] }, null, 2));
    return json(response, 200, { ok: true, html });
  }
  const sendMatch = pathname.match(/^\/api\/campaigns\/([^/]+)\/send$/);
  if (sendMatch && method === "POST") {
    const input = await readJson(request);
    const campaign = database.prepare("SELECT * FROM campaigns WHERE id=?").get(sendMatch[1]);
    if (!campaign) return json(response, 404, { error: "Newsletter not found" });
    const config = senderSettings();
    if (input.action === "test") {
      const emails = (input.emails || []).map((email) => clean(email, 254).toLowerCase()).filter((email) => email.includes("@")).slice(0, 10);
      if (!emails.length) throw new Error("Enter at least one test email");
      const html = prepareSenderHtml(campaign.html, false);
      await Promise.all(emails.map((email) => senderRequest("message/send", "POST", { from: { email: config.replyTo, name: config.fromName }, to: { email }, subject: `[TEST] ${campaign.subject}`, html, text: plainText(html), headers: { charset: "utf-8" } }, config)));
      return json(response, 200, { ok: true, action: "test", recipients: emails.length });
    }
    const providerId = await ensureSenderCampaign(campaign);
    if (input.action === "schedule") {
      if (!input.scheduleAt || Number.isNaN(new Date(input.scheduleAt).getTime())) throw new Error("Choose a valid schedule time");
      const scheduleTime = String(input.scheduleAt).slice(0, 19).replace("T", " ");
      await senderRequest(`campaigns/${encodeURIComponent(providerId)}/schedule`, "POST", { schedule_time: scheduleTime }, config);
      database.prepare("UPDATE campaigns SET status='scheduled',scheduled_at=?,last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(new Date(input.scheduleAt).toISOString(), sendMatch[1]);
      return json(response, 200, { ok: true, action: "scheduled" });
    }
    if (["sending", "sent"].includes(campaign.status)) throw new Error("This newsletter has already been sent or is currently sending");
    const recipients = Math.min(2500, database.prepare("SELECT COUNT(*) count FROM subscribers WHERE status='subscribed'").get().count);
    const remoteBefore = await senderRequest(`campaigns/${encodeURIComponent(providerId)}`, "GET", undefined, config);
    const remoteBeforeStatus = String(remoteBefore.data?.status || "").toUpperCase();
    if (remoteBeforeStatus && remoteBeforeStatus !== "DRAFT") {
      database.prepare("UPDATE campaigns SET status='sending',recipient_count=?,sent_at=COALESCE(sent_at,CURRENT_TIMESTAMP),last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(recipients, sendMatch[1]);
      return json(response, 200, { ok: true, action: "already_queued", recipients });
    }
    try {
      await senderRequest(`campaigns/${encodeURIComponent(providerId)}/send`, "POST", undefined, config);
    } catch (error) {
      const remoteAfter = await senderRequest(`campaigns/${encodeURIComponent(providerId)}`, "GET", undefined, config).catch(() => null);
      const remoteAfterStatus = String(remoteAfter?.data?.status || "").toUpperCase();
      if (!remoteAfterStatus || remoteAfterStatus === "DRAFT") throw error;
    }
    database.prepare("UPDATE campaigns SET status='sending',recipient_count=?,sent_at=CURRENT_TIMESTAMP,last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(recipients, sendMatch[1]);
    return json(response, 200, { ok: true, action: "sent", recipients });
  }
  if (pathname === "/api/analytics" && method === "GET") {
    const latest = database.prepare("SELECT * FROM campaigns WHERE provider_campaign_id IS NOT NULL ORDER BY COALESCE(sent_at,scheduled_at,updated_at) DESC LIMIT 1").get();
    const provider = latest ? await campaignReport(latest).catch(() => null) : null;
    return json(response, 200, { campaign: latest ? rowObject(latest) : null, provider, events: provider?.clicks?.items || [], rsvps: { total: provider?.rsvpClicks || 0, confirmed: 0 } });
  }
  if (pathname === "/api/subscribers" && method === "POST") {
    const input = await readJson(request);
    const contacts = (input.contacts || []).slice(0, 2500);
    const statement = database.prepare("INSERT INTO subscribers (id,email,email_hash,first_name,last_name,city,language,status,consent_at,consent_source,tags_json) VALUES (?,?,?,?,?,?,?,'subscribed',CURRENT_TIMESTAMP,'admin_import',?) ON CONFLICT(email) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,city=excluded.city,language=excluded.language,status='subscribed',tags_json=excluded.tags_json,updated_at=CURRENT_TIMESTAMP");
    let imported = 0;
    for (const contact of contacts) {
      const email = clean(contact.email, 254).toLowerCase();
      if (!email.includes("@")) continue;
      statement.run(id("sub"), email, hash(email), clean(contact.firstName, 100), clean(contact.lastName, 100), clean(contact.city, 120), clean(contact.language, 10) || "en", JSON.stringify(contact.tags || []));
      imported += 1;
    }
    return json(response, 200, { imported, providerConnected: senderConfigured(), providerSynced: 0 });
  }
  if (pathname === "/api/subscribers/sync-sender" && method === "POST") {
    const config = senderSettings();
    if (!senderConfigured(config)) throw new Error("Connect Sender before synchronizing subscribers");
    const contacts = database.prepare("SELECT * FROM subscribers ORDER BY created_at LIMIT 2500").all();
    let synced = 0;
    let failed = 0;
    for (const contact of contacts) {
      try { await syncSubscriber(contact, config); synced += 1; }
      catch { failed += 1; }
    }
    return json(response, 200, { synced, failed, total: contacts.length });
  }
  if (pathname === "/api/assets" && method === "POST") {
    const upload = parseMultipart(await readBody(request), request.headers["content-type"] || "");
    if (!upload.contentType.startsWith("image/")) throw new Error("Please choose an image file");
    if (upload.data.length > 8 * 1024 * 1024) throw new Error("Keep each newsletter image below 8 MB");
    const assetId = id("asset");
    const extension = path.extname(upload.filename).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".img";
    const objectKey = `${assetId}${extension}`;
    writeFileSync(path.join(folders.media, objectKey), upload.data);
    database.prepare("INSERT INTO assets (id,object_key,filename,content_type,size) VALUES (?,?,?,?,?)").run(assetId, objectKey, upload.filename, upload.contentType, upload.data.length);
    return json(response, 201, { asset: { id: assetId, url: `/api/assets/${assetId}` } });
  }
  const assetMatch = pathname.match(/^\/api\/assets\/([^/]+)$/);
  if (assetMatch && method === "GET") {
    const asset = database.prepare("SELECT * FROM assets WHERE id=?").get(assetMatch[1]);
    if (!asset) { response.writeHead(404); return response.end("Not found"); }
    const file = readFileSync(path.join(folders.media, asset.object_key));
    response.writeHead(200, { "Content-Type": asset.content_type, "Cache-Control": "public, max-age=31536000, immutable" });
    return response.end(file);
  }
  return json(response, 404, { error: "Not found" });
}

function serveFile(response, pathname) {
  const root = path.join(app.getAppPath(), "desktop-dist", "renderer");
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  let file = path.resolve(root, relative);
  if (!file.startsWith(path.resolve(root))) { response.writeHead(403); return response.end("Forbidden"); }
  if (!existsSync(file)) file = path.join(root, "index.html");
  const extension = path.extname(file);
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".woff2": "font/woff2" };
  const body = readFileSync(file);
  response.writeHead(200, { "Content-Type": types[extension] || "application/octet-stream", "Content-Length": body.length, "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=31536000, immutable" });
  response.end(body);
}

async function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url || "/", "http://127.0.0.1");
        if (url.pathname.startsWith("/api/")) await api(request, response, url);
        else serveFile(response, url.pathname);
      } catch (error) {
        json(response, 400, { error: error instanceof Error ? error.message : "Something went wrong" });
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

app.whenReady().then(async () => {
  setupWorkspace();
  const server = await startServer();
  const address = server.address();
  const window = new BrowserWindow({ width: 1560, height: 980, minWidth: 390, minHeight: 720, backgroundColor: "#f6f7fb", title: "Sahaja Yoga Newsletter Studio", icon: path.join(app.getAppPath(), "desktop", "build", "icon.png"), webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  await window.loadURL(`http://127.0.0.1:${address.port}`);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
