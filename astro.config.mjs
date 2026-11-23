// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// Pages render on the server (stock changes all day), under PM2 behind nginx
// like v1. Photos are written at runtime, so they're served from PHOTO_DIR by
// nginx in production and from public/photos in development.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  // This site's own port, as on the VPS (PORT=4391), so it never clashes with
  // London LHD Centre v2 on Astro's default 4321.
  server: { port: 4391 },
  // Fetch likely next pages (car links in view) before they're clicked.
  prefetch: { prefetchAll: false, defaultStrategy: "viewport" },
  vite: { plugins: [tailwindcss()] },
});
