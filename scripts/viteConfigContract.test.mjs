// vite.config.ts 的三条既有契约守卫：分块行为、WebSocket 代理标记、测试环境摘插件。
//
// 为什么按配置对象结构断言、而不是文本正则扫源码（两次教训）：
//   ① 字面量扫描会被注释里的同一串文本误红 —— vite.config.ts 的 test 块注释里就写着
//      「别再写 isolate:false」，改配置的人只是要*说明*自己没写它，却被守卫拦下；
//   ② 配置形状一变（例如 test 块拆成 projects），扫描式守卫会**静默放行**，
//      而那恰恰是它最该发挥作用的时候。
// 故本守卫直接 `import` 配置对象，拿 manualChunks 函数真跑一遍模块 id。
//
// 本文件只读 vite.config.ts，不改它。
import { describe, expect, test, vi } from "vitest";
import { apiPrefix, backendPort, frontendPrefix, host } from "../server/config.mjs";

// vitestIsolation.test.mjs 已经用静态 import 加载过同一份配置对象，此处照抄那条先例。
// 静态 import 在 VITEST=true 的环境里求值，正好就是被测的第三条契约所用的那一支。
import viteConfig from "../vite.config.ts";

// vite.config.ts 里 `defineConfig({...})` 收的是字面量对象（不是 (env) => ... 工厂），
// 故 default 就是配置对象本身；若哪天改成工厂形式，manualChunks 取值会变 undefined，
// 下面的 `typeof` 断言会立刻红，而不是让守卫悄悄失去判别力。
const manualChunks = viteConfig.build?.rollupOptions?.output?.manualChunks;

// 前缀式匹配用的假模块 id：真实键形态是「绝对路径 + /node_modules/<pkg>/<文件>」。
const POSIX_ROOT = "/abs/proj";
const WIN_ROOT = "D:\\proj";
const posix = (rel) => `${POSIX_ROOT}/${rel}`;
const win = (rel) => `${WIN_ROOT}\\${rel}`;

// qiankun 插件由 vite-plugin-qiankun-lite 产出，插件名统一带这个前缀。
const QIANKUN_PREFIX = "qiankun:";
const REACT_PREFIX = "vite:react";

const pluginNames = (config) => config.plugins.flat(Infinity).map((plugin) => plugin?.name ?? null);

// 切 VITEST 再动态 import：vite.config.ts 在**模块求值期**读 process.env.VITEST 来决定
// 装不装 qiankun，所以要重跑模块求值才看得到另一支。vi.resetModules() 清模块注册表，
// 于是下一次 import 会重新求值。finally 里恢复环境变量，避免泄漏给同 worker 的其它文件。
async function loadConfig({ vitest }) {
  const previous = process.env.VITEST;
  try {
    if (vitest) {
      process.env.VITEST = "true";
    } else {
      delete process.env.VITEST;
    }
    vi.resetModules();
    const mod = await import("../vite.config.ts");
    return mod.default;
  } finally {
    if (previous === undefined) {
      delete process.env.VITEST;
    } else {
      process.env.VITEST = previous;
    }
    vi.resetModules();
  }
}

describe("vite.config.ts 的 manualChunks 分块行为", () => {
  test("manualChunks 是函数而非分包表（改成记录形式会让本守卫失去判别力）", () => {
    expect(typeof manualChunks, "build.rollupOptions.output.manualChunks 必须是函数").toBe("function");
  });

  test("react、react-dom 与 scheduler 归入 vendor-react 块", () => {
    // 判别力说明：这三条的兜底都是 vendor（因为都带 /node_modules/），断言值与兜底不同，
    // 所以删掉任何一条判断都会立刻转红。
    for (const rel of [
      "node_modules/react/index.js",
      "node_modules/react/cjs/react.production.min.js",
      "node_modules/react-dom/client.js",
      "node_modules/scheduler/index.js"
    ]) {
      expect(manualChunks(posix(rel)), `${rel} 应归入 vendor-react`).toBe("vendor-react");
    }
  });

  test("lucide-react 归入 vendor-icons 块，其余 node_modules 归入 vendor 块", () => {
    expect(manualChunks(posix("node_modules/lucide-react/dist/cjs/lucide-react.js"))).toBe("vendor-icons");
    // 现状记录（不是笔误）：@ant-design/icons 虽已在 dependencies 里，但**没有**进
    // vendor-icons，而是落到通用 vendor 块。此处显式钉住当前真实行为，
    // 让日后有人要把它挪进 vendor-icons 时必须显式改这条断言，而不是无声漂移。
    expect(manualChunks(posix("node_modules/@ant-design/icons/es/icons/PlusOutlined.js"))).toBe("vendor");
    // 图形库同理：@xyflow/react 走通用 vendor 块，graph-core 只装仓库内的图状态源码。
    expect(manualChunks(posix("node_modules/@xyflow/react/dist/esm/index.js"))).toBe("vendor");
    expect(manualChunks(posix("node_modules/typescript/lib/typescript.js"))).toBe("vendor");
  });

  test("model 入口归入 model-core，图状态 store 归入 graph-core，其余源码不归块", () => {
    const repoPosix = (rel) => `D:/work/graph_modeling_platform/${rel}`;
    expect(manualChunks(repoPosix("src/model.ts"))).toBe("model-core");
    for (const rel of [
      "src/graphStore.ts",
      "src/routeStore.ts",
      "src/selectionActions.ts",
      "src/keyboardShortcuts.ts",
      "src/sidePanelVisibility.ts"
    ]) {
      expect(manualChunks(repoPosix(rel)), `${rel} 应归入 graph-core`).toBe("graph-core");
    }
    // 兜底是 undefined，与上面两个期望值都不同，所以这条同样有判别力：
    // 任何被误加进 model-core / graph-core 的源码模块都会在这里露出来。
    expect(manualChunks(repoPosix("src/App.tsx"))).toBeUndefined();
    expect(manualChunks(repoPosix("src/index.css"))).toBeUndefined();
  });

  test("Windows 反斜杠模块 id 给出与正斜杠一致的归块结果", () => {
    // 分块键在 Windows 上就是带反斜杠的绝对路径。配置里靠 normalizeModuleId 把
    // 反斜杠折成正斜杠再匹配（源码模块则靠「以 /src/xxx.ts 结尾」的后缀判断）。
    // 若有人删掉 normalizeModuleId，这条会红：node_modules 里的包会因 '/node_modules/' 匹配不到
    // 而全部掉回 undefined，源码模块则因后缀是反斜杠而漏出 graph-core / model-core。
    const cases = [
      ["node_modules/react/index.js", "vendor-react"],
      ["node_modules/react-dom/client.js", "vendor-react"],
      ["node_modules/scheduler/index.js", "vendor-react"],
      ["node_modules/lucide-react/dist/cjs/lucide-react.js", "vendor-icons"],
      ["node_modules/@xyflow/react/dist/esm/index.js", "vendor"],
      ["node_modules/zod/index.js", "vendor"]
    ];
    for (const [rel, expected] of cases) {
      expect(manualChunks(win(rel)), `Windows 路径 ${win(rel)} 的归块`).toBe(expected);
      // 同时钉住两侧相等，避免断言只在其中一种分隔符下成立。
      expect(manualChunks(win(rel)), `${win(rel)} 应与 ${posix(rel)} 同块`).toBe(manualChunks(posix(rel)));
    }
    // 源码模块走的是后缀匹配，反斜杠一样要能命中。
    expect(manualChunks("D:\\work\\graph_modeling_platform\\src\\model.ts")).toBe("model-core");
    expect(manualChunks("D:\\work\\graph_modeling_platform\\src\\graphStore.ts")).toBe("graph-core");
    expect(manualChunks("D:\\work\\graph_modeling_platform\\src\\App.tsx")).toBeUndefined();
  });
});

describe("vite.config.ts 的开发服务器代理", () => {
  test("后端 API 入口带 ws 标记，静态资源入口不带", () => {
    const proxy = viteConfig.server?.proxy;
    expect(proxy, "server.proxy 必须存在").toBeTruthy();
    expect(typeof proxy).toBe("object");

    const entries = Object.entries(proxy);
    const wsKeys = entries.filter(([, value]) => value?.ws === true).map(([key]) => key);

    // 后端 API 前缀那一项要开 WebSocket —— runtimeWsClient 走的是这条代理，
    // 少了 ws:true 表现为握手 400 且只在真连时炸。
    expect(wsKeys, `后端 API 入口 ${apiPrefix} 必须带 ws:true`).toContain(apiPrefix);
    expect(proxy[apiPrefix].target).toBe(`http://${host}:${backendPort}`);
    expect(proxy[apiPrefix].changeOrigin).toBe(true);

    // 两侧都钉：静态资源入口是纯 HTTP 反代，不开 ws。
    // 只断言「开着 ws 的那一项」的话，一个把所有项都打开 ws 的改动照样能过。
    const staticKey = `${frontendPrefix.replace(/\/+$/, "")}/icon-library`;
    expect(wsKeys, `静态资源入口 ${staticKey} 不应开 ws`).not.toContain(staticKey);
    expect(proxy[staticKey].ws).toBeUndefined();
  });
});

describe("vite.config.ts 的测试环境插件裁剪", () => {
  test("测试环境标记为真时不注册 qiankun 插件", async () => {
    // vitest 的 node 环境没有 qiankun 在 transformIndexHtml 里注入的 __QIANKUN_WINDOW__ 全局，
    // 带着该插件时 runtimeWsClient.test.ts 一 connect() 就 ReferenceError。
    const config = await loadConfig({ vitest: true });
    const names = pluginNames(config);

    expect(names.length, "测试环境应只保留 react 插件").toBeGreaterThan(0);
    expect(names.filter((name) => name?.startsWith(QIANKUN_PREFIX))).toEqual([]);
    expect(
      names.every((name) => name?.startsWith(REACT_PREFIX)),
      `测试环境不应出现非 react 插件：${JSON.stringify(names)}`
    ).toBe(true);
  });

  test("非测试环境注册 qiankun 插件（反证上一条的分支是承重的）", async () => {
    // 光断言「测环境下没有 qiankun」还不够：若 qiankun 插件哪天从配置里彻底消失，
    // 那条也会一直绿。故反向再验一次分支的另一端确实产出 qiankun 插件。
    const config = await loadConfig({ vitest: false });
    const names = pluginNames(config);

    expect(names.some((name) => name?.startsWith(REACT_PREFIX)), "非测试环境仍应有 react 插件").toBe(true);
    expect(
      names.filter((name) => name?.startsWith(QIANKUN_PREFIX)).length,
      `非测试环境应注册 qiankun 插件，实际插件：${JSON.stringify(names)}`
    ).toBeGreaterThan(0);
  });
});
