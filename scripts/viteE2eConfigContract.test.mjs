// vite.e2e.config.ts 的三条契约守卫。
//
// 为什么要守卫：e2e 配置是 `pnpm test:e2e` 独有的第二套 vitest 配置，不在默认
// `pnpm test` 的收集范围内，**改坏了默认套件也不会红**。它承载的是整个 e2e 侧
// （`e2e/apiV1Control.e2e.test.mjs` 等）能不能跑起来的前提，出问题时症状又是
// 「前端 WS 客户端未在 60000ms 内上线」这种环境型报错，极难归因到配置。
//
// 本守卫**导入配置对象后按结构断言**，不做文本正则扫描。沿用
// scripts/vitestIsolation.test.mjs 定下的两条教训：
//   ① 扫描源码时，注释里只要出现那个字面量就转红（改配置的人为了*说明*自己没写它，
//      反而把守卫弄红了 —— vite.config.ts 那侧已经踩过两次）；
//   ② 反过来，配置形状一变（test 块拆成 projects），扫描立刻失效，守卫**静默放行** ——
//      扫描式守卫恰恰在「配置形状变了」这件事上最不可靠。
//
// 三条契约各自的依据：
//   ① fileParallelism: false —— e2e harness 的端口是**写死**的（image-server 5184 /
//      Vite 5183，见 e2e/controlHarness.mjs 的 E2E_IMAGE_PORT / E2E_VITE_PORT，
//      且 Vite 侧还带 --strictPort）。一旦允许文件并行，多个 e2e 文件会互相抢端口。
//      这是**低一层的补丁**：根因在 harness 固定端口，更深的改法是监听 0 取空闲端口
//      再下传给子进程，代价是「分配端口」与「spawn」之间的 TOCTOU 窗口。
//   ② include 只收 e2e/** 范围内的测试文件，且不能塌缩成裸目录通配。
//   ③ testTimeout 120s —— e2e 要起真实 Vite + 浏览器，默认 5s/主配置的 30s 都不够。
import { describe, expect, test } from "vitest";
import e2eViteConfig from "../vite.e2e.config.ts";
import mainViteConfig from "../vite.config.ts";

const e2eTest = e2eViteConfig.test ?? {};
const mainTest = mainViteConfig.test ?? {};
const includeGlobs = Array.isArray(e2eTest.include) ? e2eTest.include : [];

/**
 * 判断一个 include glob 是否塌缩成了裸目录通配。
 *
 * vitest 的 include 是**字面替换**默认模式（`**` 与 `/*.{test,spec}.?(c|m)[jt]s?(x)` 两段
 * 拼成一条；此处刻意断开，否则「两个星号紧跟一个斜杠」会提前闭合这段块注释，症状是
 * rollup 报 Parse failure、vitest 只显示 Tests: no tests）。
 * 它不是「在这个目录下按默认规则找测试」。所以写成 `e2e/**` 时，该目录下**每一个文件**
 * 都会当成测试文件收集：vite.config.ts 那侧实测写成 ["src/**"] 收集到 586 个「文件」，
 * 其中 172 个是 .woff2 / .css / .md / .json / .jsonl / .dot，报 No test suite found
 * 或让 vite 去转换二进制与 Markdown，全量跑从 63s 直接劣化到超时。
 *
 * 判据：末尾带斜杠（只给到目录、没有任何文件名过滤），或最后一段整段只有星号
 * （`**` / `*` / `***`）—— 两种都是裸目录。
 *
 * 注意末尾斜杠这一支不能靠「切段后看最后一段」判出来：`"e2e/"` 切段并丢掉空段后
 * 只剩 `["e2e"]`，最后一段是目录名而非星号，会被判成合法。下面这个自测就是为拦住
 * 那个误判而存在的。
 */
function isBareDirectoryGlob(pattern) {
  const raw = String(pattern);
  const segments = raw.split("/").filter(Boolean);
  if (segments.length === 0) return true; // "" 或 "/" —— 匹配一切
  if (raw.endsWith("/")) return true; // "e2e/" —— 目录本身，没有文件名过滤
  const name = segments[segments.length - 1];
  return /^\*+$/.test(name); // "e2e/**" / "e2e/*"
}

describe("vite.e2e.config.ts 契约", () => {
  // ① 串行补丁。
  //
  // 这里必须断言 `toBe(false)` 而不是 vitestIsolation.test.mjs 那侧的 `not.toBe(false)`：
  // 那边 isolate 的**默认值就是 true**，所以「不等于 false」恰好等价于「保持默认开启」；
  // 而 fileParallelism 的**默认值恰恰是 true（并行）**，此处一旦写成 not.toBe(false)，
  // 删掉整个键（undefined）会照绿 —— 正好放过要防的那个回归。
  test("fileParallelism 必须是 false：e2e harness 端口写死 5183/5184，并行会互抢", () => {
    expect(
      e2eTest.fileParallelism,
      "e2e 各文件的 harness 用写死端口（e2e/controlHarness.mjs: E2E_VITE_PORT=5183 / " +
        "E2E_IMAGE_PORT=5184，Vite 还带 --strictPort）。放开文件并行会让后起的那个环境里" +
        "前端永远不上线。要串行就别删这个键 —— 删掉等于回到默认的并行，症状是" +
        "「前端 WS 客户端未在 60000ms 内上线」，且默认 pnpm test 不会红。"
    ).toBe(false);
  });

  // ② include 只收 e2e/** 范围内的测试文件，且不是裸目录通配。
  test("include 必须非空且每一条都限定在 e2e/ 范围内", () => {
    expect(
      includeGlobs.length,
      "include 缺失时 vitest 会退回默认模式，把 scripts/、src/ 等一并收集 —— " +
        "而这套配置的用途恰恰是「只跑 e2e」。"
    ).toBeGreaterThan(0);

    const outOfScope = includeGlobs.filter((glob) => !String(glob).startsWith("e2e/"));
    expect(outOfScope, `include 混入了非 e2e 范围的 glob：${outOfScope.join("、")}`).toEqual([]);
  });

  test("include 不能塌缩成裸目录通配（会把字体/文档当测试文件收集）", () => {
    const bare = includeGlobs.filter((glob) => isBareDirectoryGlob(glob));
    expect(
      bare,
      `include 含裸目录通配：${bare.join("、")} —— include 是字面替换默认模式，` +
        "会把该目录下每个文件（含 .woff2/.css/.md/.json）都当测试文件收集。"
    ).toEqual([]);
  });

  test("include 每一条都必须带测试文件名过滤（.test./.spec.），否则连 harness 都会被收进来", () => {
    const noTestName = includeGlobs.filter((glob) => !/\.(test|spec)\./.test(String(glob)));
    expect(
      noTestName,
      `include 会收集到非测试文件：${noTestName.join("、")} —— e2e/controlHarness.mjs 这类` +
        "支撑文件一旦被收集，会报 No test suite found。"
    ).toEqual([]);
  });

  // 上面那条判据函数本身的自测：证明它**能转红**，而不是「扫到了 N 条所以通过」。
  // 这是 scripts/ 下扫描式守卫的固定要求 —— 检测逻辑没被喂过能红的输入时，绿是无信息的。
  test("裸目录判据自测（检测逻辑必须能识别真实的塌缩写法与合法写法）", () => {
    // 真实塌缩写法（改坏配置后的样子）
    expect(isBareDirectoryGlob("e2e/**")).toBe(true);
    expect(isBareDirectoryGlob("e2e/*")).toBe(true);
    expect(isBareDirectoryGlob("e2e/")).toBe(true);
    expect(isBareDirectoryGlob("**")).toBe(true);
    expect(isBareDirectoryGlob("")).toBe(true);
    // 合法写法（当前配置的真实值，以及将来可能的加项）
    expect(isBareDirectoryGlob("e2e/**/*.test.mjs")).toBe(false);
    expect(isBareDirectoryGlob("e2e/**/*.{test,spec}.mjs")).toBe(false);
  });

  // ③ 超时预算。
  test("testTimeout 必须是 120000 毫秒：e2e 要起真实 Vite 与浏览器", () => {
    expect(
      e2eTest.testTimeout,
      "e2e 每个文件都要拉起 Vite dev server + image server + 浏览器并等端口就绪，" +
        "主配置的 30s 不足以覆盖冷启动。"
    ).toBe(120000);
  });

  // 与主配置对齐的一条：e2e 与单元测试跑在同一个 node 环境里（无 jsdom）。
  // 这里断言的是**两边一致**，而不是硬编码某个值 —— 主配置改环境时不必连带改这里。
  test("environment 必须与主配置一致（两套配置同环境，避免 e2e 悄悄换运行时）", () => {
    expect(typeof mainTest.environment, "主配置未声明 environment，无法比对").toBe("string");
    expect(e2eTest.environment, "e2e 的 environment 与主配置不一致").toBe(mainTest.environment);
  });

  // 本守卫不能被自身拖累：默认配置里 fileParallelism 必须保持默认（并行）。
  // scripts/vitestIsolation.test.mjs 已有一条同义断言，这里加一条是为了让本文件
  // 单独 `vitest run scripts/viteE2eConfigContract.test.mjs` 时也能自洽。
  test("主配置不得开 fileParallelism:false（串行补丁只属于 e2e 那一侧）", () => {
    expect(
      mainTest.fileParallelism,
      "主配置一旦串行，全量套件的墙钟时间会被 e2e 那种慢文件的量级拖垮"
    ).not.toBe(false);
  });
});