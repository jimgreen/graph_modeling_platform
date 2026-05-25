import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ["**/data/**"]
    },
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.IMAGE_SERVER_PORT ?? "5174"}`,
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "node"
  }
});
