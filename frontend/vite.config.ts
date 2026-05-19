import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [react(), visualizer({ open: false, gzipSize: true })],
  envDir: "..",
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:30001",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
    modulePreload: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-carbon": ["@carbon/react", "@carbon/icons-react", "@carbon/charts"],
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@hono/auth-js", "react-hook-form", "react-hot-toast"],
          "vendor-viz": ["framer-motion", "react-virtuoso"],
          "vendor-utils": ["date-fns", "papaparse", "emoji-mart", "@emoji-mart/data"],
        },
      },
    },
  },
});
