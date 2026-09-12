import React from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import Studio from "../app/page";
import { browserStore } from "./storage.mjs";
import { createPreviewApi } from "./api.mjs";

const root = createRoot(document.getElementById("root")!);
async function start() {
  const store = await browserStore();
  await navigator.serviceWorker.register("/asset-worker.js");
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
  const api = createPreviewApi(store), original = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const request = new Request(input instanceof Request ? input : new URL(String(input), location.href), init);
    const url = new URL(request.url);
    if (url.origin === location.origin && url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/assets/")) return api(request);
    return original(request);
  };
  root.render(<React.StrictMode><Studio/></React.StrictMode>);
}
start().catch(() => root.render(<main style={{ padding: 40, maxWidth: 680, margin: "auto", fontFamily: "sans-serif" }}><h1>Sahaja Yoga Newsletter Studio</h1><p>This preview needs browser storage to save drafts and photos. Open it in Safari, Chrome, Edge or Firefox with site storage enabled.</p><button onClick={() => location.reload()}>Try again</button></main>));
