import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Web sürümü GitHub Pages alt klasöründe yayınlanır (ör. /sinavhane/): VITE_BASE ile verilir.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./packages/shared", import.meta.url)),
    },
  },
  // Tauri: Rust derleme klasörünü izleme (derleme sırasında EBUSY hatası verir).
  // TAURI_DEV_HOST: `tauri ios dev` ile gerçek iPad'e bağlanırken Tauri'nin verdiği makine adresi.
  server: {
    port: 5173,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    hmr: process.env.TAURI_DEV_HOST ? { protocol: "ws", host: process.env.TAURI_DEV_HOST, port: 5174 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
