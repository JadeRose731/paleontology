import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  // Force hash routing for file:// protocol in singlefile mode
  define: {
    ...(mode === "singlefile"
      ? { "import.meta.env.VITE_HASH_ROUTING": JSON.stringify("true") }
      : {}),
  },

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },

  root: path.resolve(import.meta.dirname, "client"),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },

  server: {
    port: 3001,
    host: true,
    proxy: {
      "/paleo": { target: "http://localhost:8089", changeOrigin: true },
      "/login": { target: "http://localhost:8089", changeOrigin: true },
      "/getInfo": { target: "http://localhost:8089", changeOrigin: true },
      "/uploads": { target: "http://localhost:8089", changeOrigin: true },
    },
  },
}));
