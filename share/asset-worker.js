// Serves only browser-owned uploads. No API, credentials or external requests are proxied.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !/^\/api\/assets\/[a-zA-Z0-9-]+$/.test(url.pathname)) return;
  event.respondWith(new Promise(resolve => {
    const open = indexedDB.open("sy-newsletter-preview-v1", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("records");
    open.onerror = () => resolve(new Response("Storage unavailable", { status: 503 }));
    open.onsuccess = () => {
      const db = open.result;
      const get = db.transaction("records").objectStore("records").get(`asset:${url.pathname.split("/").pop()}`);
      get.onsuccess = () => { db.close(); resolve(get.result ? new Response(get.result, { headers: { "Content-Type": get.result.type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }) : new Response("Image not found in this browser", { status: 404 })); };
      get.onerror = () => { db.close(); resolve(new Response("Image unavailable", { status: 500 })); };
    };
  }));
});
