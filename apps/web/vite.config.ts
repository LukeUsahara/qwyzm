import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: process.env.WEB_PORT ? "127.0.0.1" : undefined,
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: Boolean(process.env.WEB_PORT),
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/ws": {
        target: process.env.WS_PROXY_TARGET ?? "ws://127.0.0.1:8788",
        ws: true,
      },
    },
  },
});
