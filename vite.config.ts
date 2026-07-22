import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { backendPort, frontendPort, apiPrefix, frontendApiPrefix, escapeRegExp } from "./server/config.mjs";

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

const backendProxyTarget = `http://127.0.0.1:${backendPort}`;
// 前端 base 子路径：非 API 请求（图标库/WS）带 frontendApiPrefix 前缀，代理 rewrite 剥前缀转发后端根。
// 默认 / 时 fe 为空，key 退化为 /icon-library、/ws，rewrite 为 undefined（no-op）。
const feBaseNoSlash = frontendApiPrefix === "/" ? "" : frontendApiPrefix.replace(/\/+$/g, "");
const stripFe = feBaseNoSlash
  ? (path: string) => path.replace(new RegExp(`^${escapeRegExp(feBaseNoSlash)}`), "") || "/"
  : undefined;
const backendProxy = {
  [apiPrefix]: {
    target: backendProxyTarget,
    changeOrigin: true
  },
  [`${feBaseNoSlash}/icon-library`]: {
    target: backendProxyTarget,
    changeOrigin: true,
    rewrite: stripFe
  },
  [`${feBaseNoSlash}/ws`]: {
    target: backendProxyTarget,
    ws: true,
    changeOrigin: true,
    rewrite: stripFe
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
  base: frontendApiPrefix,
  define: {
    __API_PREFIX__: JSON.stringify(apiPrefix),
    __FRONTEND_BASE__: JSON.stringify(frontendApiPrefix)
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
    host: "127.0.0.1",
    watch: {
      ignored: serverWatchIgnored
    },
    proxy: backendProxy
  },
  preview: {
    port: frontendPort,
    host: "127.0.0.1",
    proxy: backendProxy
  },
  test: {
    environment: "node",
    // e2e 起真实 Vite+浏览器，慢且依赖环境，不进默认 pnpm test；用 pnpm test:e2e 单独跑
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"]
  }
});
