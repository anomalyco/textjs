import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    // Yoga 3.2 ships its WebAssembly inlined as base64 inside the engine chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("yoga-layout")) return "yoga";
          if (/node_modules\/(react|react-dom|scheduler|react-reconciler)\//.test(id)) return "react";
          if (id.includes("/packages/core/") || id.includes("/packages/react/")) return "turbolog";
          return undefined;
        },
      },
    },
  },
  server: { port: 3000 },
  preview: { port: 3000 },
});
