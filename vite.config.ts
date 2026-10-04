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
    // 首屏那条「打开即等」的路径：浏览器请求一个模块，Vite 才现转译一个模块，
    // 146 个模块串成 ~19s。warmup 让 Vite 在**启动时后台**先把入口的整张静态依赖图
    // 转完，等用户真的点开时图已经是热的。代价只是把耗时挪到 dev server 启动阶段。
    warmup: {
      clientFiles: ["src/main.tsx"]
    },
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
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    // pool: threads —— 全量套件的主要开销是「每个文件重新求值一次模块图」。
    // forks（vitest 3 的默认池）每个文件要起一次子进程，实测 533 files / 10982 tests 需 212.91s，
    // 其中 collect 累计 3322s（每文件约 6.2s：collect 4.6s + tests 1.4s）。
    // threads 在同进程内跑，模块图求值成本大幅下降。
    //
    // ⚠ **测耗时必须在机器安静时测。** 之前记录的「threads 后 134.04s / 143.67s」是在十几路
    //   后台 lane 同时跑的时候取的，被负载污染了。安静机器上同一配置连跑三轮：
    //   **62.87s / 66.44s / 66.31s**（533 files / 10987 tests 全过 / 0 failed），墙钟 65~68s。
    //   引用那批数字去判断「还差多少」会把结论带偏。
    //
    // 这里**只**换池，**不动 isolate**：isolate 仍为默认的 true，每个文件仍拿到全新模块注册表。
    // 这一点由 scripts/vitestIsolation.test.mjs 守卫（server.mjs 在模块加载期求值 dataRoot、
    // registries 是模块级 Map，关掉隔离会让 server 测试文件互相串数据）。
    // 曾实测把 isolate 关掉：server/ 全量立刻 45 条红；src/ 单独跑则在 1~5 个文件间不确定地漏
    // （三次跑出 12/3/8 条，名单每次不同）—— 属顺序/分片依赖的泄漏。
    //
    // ⚠⚠ **vitest 3.2.7 做不了 per-project 的隔离设置，四种写法全部静默无效**（每种都实测过）：
    //   ① inline project 对象里写 isolate:false → 不生效（unit-fast 单跑 53~55s，
    //      collect 累计 1124s；同一批文件加 CLI --no-isolate 只要 15.5s / collect 307s）；
    //   ② `extends: true` → 那是 **vitest 5** 才有的特性，3.x 静默无效，根配置的 pool /
    //      setupFiles 因此不会下沉到 project；
    //   ③ projects 引用独立配置文件（isolate 落在根级）→ **仍然不生效**，全量 collect 1178s，
    //      与全隔离无差别；
    //   ④ CLI --no-isolate → 唯一有效的形式，但它是全局的，会连带把 server 侧也关掉。
    //   要命的是这四种写法**全程 533/533 全绿、exit 0**：配置文本写着「src/ 不隔离」，
    //   实际跑的是全隔离。**静默无效比不做更糟**，所以 scripts/vitestIsolation.test.mjs
    //   有一条断言专门拦 `test.projects`，别再重走这四条路。
    //   拆成两个 project 本身也没有调度收益：63.29s vs 单配置 62.87s，反而略慢。
    //
    // ⚠ include 不能塌缩成裸目录通配（那会把 .woff2 / .md / .json 当测试文件收集，
    //   实测 586 个「文件」、全量从 63s 劣化到超时）。守卫里有对应断言。
    //
    // maxWorkers 保持默认（按 CPU 数 = 本机 32）。实测钉到 16 更慢（151.38s，同样是负载污染下的
    // 数字，只能说明「没更好」的定性结论）：超订到逻辑核数反而优于超订到物理核数。
    pool: "threads",
    // 默认 5s 对这个套件太紧：全量一万余用例、32 路并发抢 CPU，而其中确有一批
    // 本身就慢的集成型用例（起 TS 编译器、遍历全图、真跑 HTTP/WS），空载 1~2s、
    // 并发下轻易过 5s —— 表现为「机器慢」被报成「用例坏了」，且逐个加预算会没完没了
    // （实测同一轮全量里 swigger.examples / customDeviceUtils / symbolExportSvg 轮着红）。
    // 放到 30s：真正的死循环/挂起仍会被抓到（只是晚一点），而慢用例不再假红。
    // 需要更严的守卫时，在具体用例上显式传更小的 timeout 即可覆盖本值。
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      include: ["src/**", "server/**", "scripts/**", "shared/**"],
      exclude: ["**/*.test.*", "**/node_modules/**"]
    }
  }
});
