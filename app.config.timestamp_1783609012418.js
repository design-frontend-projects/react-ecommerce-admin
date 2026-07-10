// app.config.ts
import { defineConfig } from "@tanstack/react-start/config";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
var app_config_default = defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: [
          "favicon.ico",
          "images/pwa-192x192.png",
          "images/pwa-512x512.png",
          "images/maskable-icon.png"
        ],
        manifest: {
          name: "Bluewave POS - Premium Restaurant Management",
          short_name: "Bluewave POS",
          description: "Advanced Point of Sale and Restaurant Management System",
          theme_color: "#0f172a",
          background_color: "#0f172a",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          icons: [
            {
              src: "images/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "images/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "images/maskable-icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          maximumFileSizeToCacheInBytes: 5e6
        },
        devOptions: {
          enabled: true,
          type: "module"
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@crm": path.resolve(__dirname, "./src/components/crm"),
        "@tests": path.resolve(__dirname, "./tests")
      }
    }
  }
});
export {
  app_config_default as default
};
