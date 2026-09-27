import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import qiankun from "vite-plugin-qiankun-lite";
import { host, backendPort, frontendPort, apiPrefix, frontendPrefix } from "./server/config.mjs";
import { name } from "./package.json";

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
const frontendBaseForProxy = frontendPrefix.replace(/\/+$/, "");
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

// qiankun 子应用需要使用相对路径加载资源
const useRelativeBase = process.env.VITE_QIANKUN === 'true';
const effectiveBase = useRelativeBase ? './' : frontendPrefix;

// qiankun 插件只服务浏览器运行时：它的 `support-sandbox` post-transform 会把源码里的
// `window.__POWERED_BY_QIANKUN__` 改写成 `__QIANKUN_WINDOW__["<name>"]....`，而那个全局
// 由插件在 `transformIndexHtml` 里注入的内联 <script> 建立 —— 只存在于真实浏览器。
// vitest 的 node 环境没有该全局，于是 runtimeWsClient.test.ts 一 connect() 就
// ReferenceError（12 条用例红）。测试要验的是**源码**语义，故按 VITEST 标记摘掉该插件。
const isVitest = process.env.VITEST === "true";
// qiankun() 返回的是插件**数组**，而 plugins 接受嵌套数组，故这里整体塞进一个元素即可，
// 不能展开（展开后 TS 判成 PluginOption 非数组，见 TS2461）。
const appPlugins = isVitest ? [react()] : [react(), qiankun({ name })];

export default defineConfig({
  plugins: appPlugins,
  base: effectiveBase,
  define: {
    __API_PREFIX__: JSON.stringify(apiPrefix),
    __FRONTEND_BASE__: JSON.stringify(frontendPrefix)
  },
  build: {
    modulePreload: false, // qiankun 环境禁用 modulepreload，避免资源路径问题
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
    setupFiles: ["./src/test-setup.ts"],
    // e2e 起真实 Vite+浏览器，慢且依赖环境，不进默认 pnpm test；用 pnpm test:e2e 单独跑
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"]
  }
});
