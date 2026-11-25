import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const backendTarget = process.env.DEMO_BACKEND_URL ?? "http://127.0.0.1:8000";
const webgrpTarget = process.env.WEBGRP_HTTP_BASE_URL ?? "http://127.0.0.1:5174";
const frontendPort = Number(process.env.DEMO_FRONTEND_PORT ?? 4173);

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: frontendPort,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        ws: true
      },
      "/webgrp": {
        target: webgrpTarget,
        changeOrigin: true,
        ws: true
      }
    }
  },
  preview: {
    host: "127.0.0.1",
    port: frontendPort,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        ws: true
      },
      "/webgrp": {
        target: webgrpTarget,
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    target: "es2022"
  }
});
