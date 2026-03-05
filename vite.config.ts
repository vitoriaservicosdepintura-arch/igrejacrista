import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Separação de chunks para melhor cache
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          motion: ["framer-motion"],
          swiper: ["swiper"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
    sourcemap: false,
    assetsInlineLimit: 4096,
    // Suporte a Chrome 80+, Firefox 80+, Safari 13+, Edge 80+, iOS 13+, Android 7+
    target: ["es2020", "chrome80", "firefox80", "safari13", "edge80"],
  },
  // Servidor de desenvolvimento — exposto na rede local para testar no celular
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: true,
    port: 4173,
  },
});


