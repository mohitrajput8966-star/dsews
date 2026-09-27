import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Resolve straight to source: Rollup can't statically analyze the
      // compiled CJS `export *` re-exports in packages/shared/dist for
      // production tree-shaking, and this also removes the need to rebuild
      // shared before every `vite dev`.
      "@dsews/shared": path.resolve(__dirname, "../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
  },
});
