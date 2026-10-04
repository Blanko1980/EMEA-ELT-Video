import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Builds the web player (index.html) into /docs so it can be served by GitHub Pages.
export default defineConfig({
  root: path.resolve(__dirname),
  base: "./",
  publicDir: path.resolve(__dirname, "../public"),
  plugins: [react()],
  build: { outDir: path.resolve(__dirname, "../docs"), emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
