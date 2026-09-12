import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "share"),
  publicDir: path.resolve(__dirname, "public"),
  plugins: [react(), { name: "preview-assets", generateBundle() {
    this.emitFile({ type: "asset", fileName: "asset-worker.js", source: readFileSync(path.resolve(__dirname, "share/asset-worker.js"), "utf8") });
  } }],
  resolve: { alias: { "@": path.resolve(__dirname) } },
  build: { outDir: path.resolve(__dirname, "share-dist"), emptyOutDir: true },
});
