import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "assets",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: "diagrama/src/main.jsx",
      name: "Diagrama",
      formats: ["iife"],
      fileName: () => "diagrama.js",
    },
    rollupOptions: { output: { assetFileNames: "diagrama.[ext]" } },
  },
});
