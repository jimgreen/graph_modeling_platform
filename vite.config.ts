import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { host, backendPort, frontendPort, apiPrefix, frontendPrefix } from "./server/config.mjs";

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

const backendProxyTarget = `http://${host}:${backendPort}`;
// frontendPrefix 去掉尾斜杠后拼 /icon-library，匹配 frontendPath() 产出的 URL
const frontendBaseForProxy = frontendPrefix === "/" ? "" : frontendPrefix.replace(/\/+$/, "");
const backendProxy = {
  [apiPrefix]: {
    target: backendProxyTarget,
    changeOrigin: true,
    ws: true
  },
  [`${frontendBaseForProxy}/icon-library`]: {
    target: backendProxyTarget,
    changeOrigin: true
  }
};

const serverWatchIgnored = [
  "**/data/**",
  "**/dist/**",
  "**/logs/**",
  "**/output/**",
  "**/tmp/**",
  "**/.codex/**",
  "**/.codex-logs/**",
  "**/.superpowers/**",
  "**/.worktrees/**"
];

export default defineConfig({
  plugins: [react()],
  base: frontendPrefix,
  define: {
    __API_PREFIX__: JSON.stringify(apiPrefix),
    __FRONTEND_BASE__: JSON.stringify(frontendPrefix)
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: frontendManualChunks
      }
    }
  },
  server: {
    port: frontendPort,
    host,
    watch: {
      ignored: serverWatchIgnored
    },
    proxy: backendProxy
  },
  preview: {
    port: frontendPort,
    host,
    proxy: backendProxy
  },
  test: {
    environment: "node",
    // e2e 起真实 Vite+浏览器，慢且依赖环境，不进默认 pnpm test；用 pnpm test:e2e 单独跑
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"]
  }
});
