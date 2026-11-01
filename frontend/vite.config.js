import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env lives in the repo root, shared with the Go server
  const env = loadEnv(mode, "..", "VITE_");
  const api = `http://localhost:${env.VITE_API_PORT}`;

  return {
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "logo.png"],
        manifest: {
          name: "PORTAL UMKM",
          short_name: "PORTAL UMKM",
          description: "Portal informasi UMKM",
          theme_color: "#228be6",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "pwa-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: { navigateFallbackDenylist: [/^\/api/, /^\/uploads/] },
        devOptions: { enabled: true },
      }),
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    build: { outDir: "../compiled/html", emptyOutDir: true },
    server: {
      proxy: {
        "/api": api,
        "/uploads": api,
      },
    },
  };
});
