// Only serve an account's local uploads after a fresh server authorization.
// Tokens travel over a private MessageChannel and are never stored or cached.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
const fail = (message, status) => new Response(message, { status, headers: { "Cache-Control": "no-store" } });
async function requestToken(client) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = token => { clearTimeout(timer); channel.port1.close(); resolve(token); };
    const timer = setTimeout(() => finish(null), 2000);
    channel.port1.onmessage = event => finish(typeof event.data?.token === "string" ? event.data.token : null);
    client.postMessage({ type: "STUDIO_ASSET_TOKEN" }, [channel.port2]);
  });
}
async function loadAsset(event, url) {
  const account = url.searchParams.get("account");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(account || "")) return fail("Sign in to view this image", 401);
  const owner = event.clientId ? await self.clients.get(event.clientId) : null;
  // Sandboxed email previews cannot run auth code; their approved top-level
  // studio supplies a token. The server identity MUST match the image account.
  const candidates = [owner, ...await self.clients.matchAll({ type: "window" })].filter(Boolean);
  let approved = false;
  for (const client of [...new Map(candidates.map(c => [c.id, c])).values()]) {
    const token = await requestToken(client);
    if (!token) continue;
    const response = await fetch("/api/auth", { headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) continue;
    const data = await response.json();
    if (data.user?.userId === account) { approved = true; break; }
  }
  if (!approved) return fail("Sign in to view this image", 401);
  return new Promise(resolve => {
    const open = indexedDB.open("sy-newsletter-account-" + account + "-v1", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("records");
    open.onerror = () => resolve(fail("Storage unavailable", 503));
    open.onsuccess = () => {
      const db = open.result;
      const get = db.transaction("records").objectStore("records").get("asset:" + url.pathname.split("/").pop());
      get.onsuccess = () => { db.close(); resolve(get.result ? new Response(get.result, { headers: { "Content-Type": get.result.type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }) : fail("Image not found in this account", 404)); };
      get.onerror = () => { db.close(); resolve(fail("Image unavailable", 500)); };
    };
  });
}
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !/^\/api\/assets\/[a-zA-Z0-9-]+$/.test(url.pathname)) return;
  event.respondWith(loadAsset(event, url).catch(() => fail("Image access unavailable", 503)));
});
