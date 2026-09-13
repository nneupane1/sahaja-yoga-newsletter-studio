import { createServer as httpServer } from "node:http";
import { createServer, loadEnv } from "vite";

Object.assign(process.env, loadEnv("development", process.cwd(), ""));
const [{ default: auth }, { default: protectedApi }] = await Promise.all([import("../api/auth.mjs"), import("../api/protected.mjs")]);
const vite = await createServer({ configFile: "vite.share.config.ts", server: { middlewareMode: true } });
const server = httpServer((request, response) => {
  const path = new URL(request.url, "http://localhost:5173").pathname;
  if (path === "/api/auth") void auth(request, response);
  else if (path.startsWith("/api/")) void protectedApi(request, response);
  else vite.middlewares(request, response);
});
server.listen(5173, "127.0.0.1", () => console.log("Newsletter Studio authentication development server: http://localhost:5173"));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { await vite.close(); server.close(() => process.exit(0)); });
