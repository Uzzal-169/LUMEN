import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The assistant API (server/index.mjs) holds the model key; the browser only ever
// talks to /api on the same origin.
const api = { "/api": { target: "http://127.0.0.1:8787", changeOrigin: false } };

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
  test: {
    environment: "node",
  },
});
