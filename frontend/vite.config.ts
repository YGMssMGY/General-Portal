import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
  },
});
