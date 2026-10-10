import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
const base = process.env.BASE_PATH || "/";
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "食简 Foodnote",
        short_name: "食简",
        description: "自己的饮食，认真记录",
        lang: "zh-CN",
        theme_color: "#7d9a86",
        background_color: "#f7f8f3",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icon-192.png`, sizes: "192x192", type: "image/png" },
          {
            src: `${base}icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,png,svg}"],
        globIgnores: ["**/ocr/**"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/ocr/"),
            handler: "CacheFirst",
            options: {
              cacheName: "foodnote-ocr-v1",
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 4000000,
      },
    }),
  ],
});
