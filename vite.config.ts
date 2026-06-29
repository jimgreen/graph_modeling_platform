import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> };

const normalizeModuleId = (id: string) => id.replace(/\\/g, "/");

const hasModulePath = (id: string, path: string) => id.indexOf(path) >= 0;
const isSourceModule = (id: string, path: string) => id.slice(-path.length) === path;

const frontendManualChunks = (id: string) => {
  const moduleId = normalizeModuleId(id);
  if (hasModulePath(moduleId, "/node_modules/")) {
    if (
      hasModulePath(moduleId, "/node_modules/react/") ||
      hasModulePath(moduleId, "/node_modules/react-dom/") ||
      hasModulePath(moduleId, "/node_modules/scheduler/")
    ) {
      return "vendor-react";
    }
    if (hasModulePath(moduleId, "/node_modules/lucide-react/")) {
      return "vendor-icons";
    }
    return "vendor";
  }
  if (isSourceModule(moduleId, "/src/model.ts")) {
    return "model-core";
  }
  if (
    isSourceModule(moduleId, "/src/graphStore.ts") ||
    isSourceModule(moduleId, "/src/routeStore.ts") ||
    isSourceModule(moduleId, "/src/selectionActions.ts") ||
    isSourceModule(moduleId, "/src/keyboardShortcuts.ts") ||
    isSourceModule(moduleId, "/src/sidePanelVisibility.ts")
  ) {
    return "graph-core";
  }
  return undefined;
};

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: frontendManualChunks
      }
    }
  },
  server: {
    watch: {
      ignored: ["**/data/**"]
    },
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.IMAGE_SERVER_PORT ?? "5174"}`,
        changeOrigin: true
      },
      "/icon-library": {
        target: `http://127.0.0.1:${process.env.IMAGE_SERVER_PORT ?? "5174"}`,
        changeOrigin: true
      },
      "/ws": {
        target: `http://127.0.0.1:${process.env.IMAGE_SERVER_PORT ?? "5174"}`,
        ws: true,
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "node",
    // e2e 起真实 Vite+浏览器，慢且依赖环境，不进默认 pnpm test；用 pnpm test:e2e 单独跑
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"]
  }
});
