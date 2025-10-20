import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      includeAssets: ["favicon.svg", "robots.txt", "apple-touch-icon.png"],
      devOptions: {
        enabled: true, // ✅ allow SW in dev
      },
      manifest: {
        name: "RENDEZVOUS",
        short_name: "RENDEZVOUS",
        description: "My awesome PWA built with Vite + React",
        theme_color: "#1b5e20",
        background_color: "#3a3a3a",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/logo5.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/logo5.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        runtimeCaching: [],
      },
    }),
  ],
});
