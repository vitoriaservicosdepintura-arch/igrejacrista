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
    // Chunks separados para melhor cache no mobile
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
    // Gera source maps para debug
    sourcemap: false,
    // Assets inline até 4kb (ícones pequenos)
    assetsInlineLimit: 4096,
    // Target mobile browsers modernos
    target: ["es2020", "chrome80", "firefox80", "safari13", "edge80"],
  },
  // Servidor de desenvolvimento
  server: {
    host: true, // Expõe na rede local (para testar no celular)
    port: 5173,
    strictPort: false,
  },
  // Preview (npm run preview)
  preview: {
    host: true,
    port: 4173,
  },
});
