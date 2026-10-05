import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { clearInterval as nodeClearInterval, setInterval as nodeSetInterval, setTimeout as nodeSetTimeout } from "node:timers";
import {
  MEMORY_WATCH_CRITICAL_LIMIT_BYTES,
  MEMORY_WATCH_HARD_LIMIT_BYTES,
  MEMORY_WATCH_SOFT_LIMIT_BYTES,
  memoryWatchLevelFor,
  readJsHeapUsedBytes
} from "./memoryWatch";
import { isSkipBeforeUnload, setSkipBeforeUnload } from "./spaceSwitch";

// ─── 共享注册表（isolate 关掉）下，本文件依赖到的全局的基线 ──────────
//
// 唯一真正咬人的是 showGlobalMessage：memoryWatch 的 level 2/3 分支会调 globalThis 上的
// 弹窗出口，而这个调用**夹在**「记处置」与「记 lastLevel」两句之间
//（src/memoryWatch.ts:71 记处置 → :72 调弹窗 → :94 记 lastLevel）。那一刻的弹窗若会抛，
// 抛出就把 lastLevel 的赋值吃掉 ⇒ 下一个 tick 又被判成升档、再处置一次 ⇒ 用例看到「多一项」。
//
// 共享注册表下这个前提极易不成立：src/globalMessage.ts 末尾三行在**模块加载期**把真弹窗
// 写回 window，而 src/test-setup.ts 的 noop 只在 `typeof showGlobalMessage !== "function"`
// 时才装 —— 真弹窗是函数，noop 装不上。任何先 import 过该模块的文件都会把 noop 顶掉；
// 而本仓 test.environment 是 node，真弹窗一上来就 document.createElement ⇒ ReferenceError。
// 实测肇事者 src/globalMessage.test.ts：`vi.stubGlobal("window", globalThis)` 之后
// `await import("./globalMessage")`，其 afterEach 的 `vi.unstubAllGlobals()` 只还原它自己
// stub 过的 document/window/requestAnimationFrame —— 被顶掉的那三个函数没人还原，
// 真实残留（探针实测：残留函数体含 getContainer，且调用抛 document is not defined）。
//
// 故本文件不依赖「桩表是干净的」：下面把依赖到的键逐个显式钉死，afterEach 逐键精确还原。
// 不用 vi.unstubAllGlobals() —— 共享注册表下它清的是整个 worker 的桩表，会顺手拆掉别的
// 文件（或 test-setup）装的桩，那正是 isolate:false 下最难查的一类偶发红。
//
// performance.memory 不在这里钉：它每一组用例都由 stubHeapUsedBytes 自己按值快照/还原
// （含「本来就没有」这一态，见「读不到堆占用时静默空转」），基线已经是逐例精确的；
// 反过来若在此处把它删掉，readJsHeapUsedBytes 那条只会走 null 分支 —— 它「未来 node 提供了
// performance.memory」的分支就被 setup 中和掉了，正是「setup 消掉了被测对象」那种假绿。
const BASELINE_GLOBALS = ["showGlobalMessage", "setInterval", "clearInterval", "setTimeout"] as const;
let baselineBackup: Array<[string, unknown]> = [];
/** 本文件 level 2/3 用例里弹窗出口收到的文案（逐例清空）。 */
let baselineMessages: string[] = [];

beforeEach(() => {
  baselineMessages = [];
  baselineBackup = BASELINE_GLOBALS.map((key) => [key, (globalThis as Record<string, unknown>)[key]]);
  vi.stubGlobal("showGlobalMessage", (text: string) => {
    baselineMessages.push(text);
  });
  // 定时器基线取自 node:timers 而不是「当前全局值」：共享注册表下别的文件可能留下
  // vi.useFakeTimers()（全局 setInterval/setTimeout 被换成假实现且不还原），而本文件整组
  // 用例都靠**真**定时器的间隔推进、以及 clearInterval 生效与否来断言。node:timers 是
  // 不受全局污染影响的原始引用。
  vi.stubGlobal("setInterval", nodeSetInterval);
  vi.stubGlobal("clearInterval", nodeClearInterval);
  vi.stubGlobal("setTimeout", nodeSetTimeout);
});

afterEach(() => {
  // 逐键精确还原：只动本文件 beforeEach 装过的那几个键，原样放回当时的值（含 undefined）。
  for (const [key, value] of baselineBackup) {
    if (value === undefined) {
      delete (globalThis as Record<string, unknown>)[key];
    } else {
      (globalThis as Record<string, unknown>)[key] = value;
    }
  }
  baselineBackup = [];
  baselineMessages = [];
});

describe("memoryWatch 阈值分级", () => {
  it("低于 soft 阈值：不处置", () => {
    expect(memoryWatchLevelFor(0)).toBe(0);
    expect(memoryWatchLevelFor(MEMORY_WATCH_SOFT_LIMIT_BYTES - 1)).toBe(0);
  });

  it("soft 档：裁剪撤销历史（保留最近 10 条）", () => {
    expect(memoryWatchLevelFor(MEMORY_WATCH_SOFT_LIMIT_BYTES)).toBe(1);
    expect(memoryWatchLevelFor(MEMORY_WATCH_HARD_LIMIT_BYTES - 1)).toBe(1);
  });

  it("hard 档：清空撤销历史并提示", () => {
    expect(memoryWatchLevelFor(MEMORY_WATCH_HARD_LIMIT_BYTES)).toBe(2);
    expect(memoryWatchLevelFor(MEMORY_WATCH_CRITICAL_LIMIT_BYTES - 1)).toBe(2);
  });

  it("critical 档：持久化恢复点后自动刷新", () => {
    expect(memoryWatchLevelFor(MEMORY_WATCH_CRITICAL_LIMIT_BYTES)).toBe(3);
    expect(memoryWatchLevelFor(2 * 1024 * 1024 * 1024)).toBe(3);
  });

  it("critical 上限低于 2GB：保证「永远不超过 2GB」的硬约束", () => {
    expect(MEMORY_WATCH_CRITICAL_LIMIT_BYTES).toBeLessThan(2 * 1024 * 1024 * 1024);
  });
});

describe("readJsHeapUsedBytes", () => {
  it("无 performance.memory 的环境（node 测试）返回 null，守望静默空转", () => {
    // node 无 Chrome 专有 performance.memory；若未来 node 提供该 API，本用例需相应调整
    const memory = (performance as unknown as { memory?: unknown }).memory;
    if (memory === undefined) {
      expect(readJsHeapUsedBytes()).toBeNull();
    } else {
      expect(readJsHeapUsedBytes()).toBeGreaterThan(0);
    }
  });
});

describe("空间索引 seenById 上限（源码契约）", () => {
  // routeStore / graphStore 的查询标记表曾在「只增不减」状态下随长期编辑无限累积；
  // 用读源码断言钉住「超限即清空重建」的实现不被回退（仓库源码扫描测试先例：windowCloseCoverage）。
  const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

  it("routeStore：seenById 超限必须清空并重置 mark", () => {
    const source = readSource("./routeStore.ts");
    expect(source).toContain("ROUTE_SPATIAL_SEEN_LIMIT");
    expect(source).toMatch(/seenById\.size\s*>\s*ROUTE_SPATIAL_SEEN_LIMIT[\s\S]{0,200}seenById\.clear\(\)/);
  });

  it("graphStore：seenById 超限必须清空并重置 mark", () => {
    const source = readSource("./graphStore.ts");
    expect(source).toContain("GRAPH_NODE_SPATIAL_SEEN_LIMIT");
    expect(source).toMatch(/seenById\.size\s*>\s*GRAPH_NODE_SPATIAL_SEEN_LIMIT[\s\S]{0,200}seenById\.clear\(\)/);
  });
});

describe("memoryWatch 装配点（源码契约）", () => {
  // 「按钮恒灰」同款坑：effect 定义了但装配点漏挂 / 工厂没注册，静态渲染测不出来。
  // 用源码扫描钉住 appRenderBatch 的 import + useEffect 挂载成对出现。
  it("appRenderBatch 必须导入并在 effect 中挂载 createMemoryWatchCallback", () => {
    const source = readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");
    expect(source).toContain('import { createMemoryWatchCallback } from "../memoryWatch"');
    expect(source).toContain("useEffect(createMemoryWatchCallback(__appScope), []);");
  });
});

// ─── startMemoryWatch 的处置行为（此前只测了阈值分级）────────────
//
// 既有 11 条只覆盖 memoryWatchLevelFor（纯分级）与两个源码扫描守卫。
// startMemoryWatch 里真正会动用户数据的三条处置 —— 裁剪撤销历史、清空撤销栈、
// 落盘恢复点后硬刷新 —— 一条行为断言都没有。而 level 3 会 **window.location.reload()**，
// 是全仓少数几个会直接丢掉用户现场的地方，恰恰最该有守卫。
//
// 做法：注入假的 performance.memory（用可写属性描述符，因为原生 performance.memory
// 是只读 getter），用 intervalMs 极小的 interval 驱动 tick，再在断言后 stop。
describe("startMemoryWatch 的三条处置路径", () => {
  type MemoryWatchHandle = { stop: () => void };

  const GB = 1024 * 1024 * 1024;

  /** 在 node 里造出可写的 performance.memory，并在返回的 cleanup 里还原。 */
  function stubHeapUsedBytes(value: number) {
    const target = performance as unknown as { memory?: { usedJSHeapSize: number } };
    const had = "memory" in target;
    const original = (target as { memory?: unknown }).memory;
    Object.defineProperty(target, "memory", {
      value: { usedJSHeapSize: value },
      configurable: true,
      writable: true
    });
    return () => {
      if (had) {
        Object.defineProperty(target, "memory", { value: original, configurable: true, writable: true });
      } else {
        delete (target as { memory?: unknown }).memory;
      }
    };
  }

  it("level 1：只裁剪撤销历史，保留最近 10 条，不提示用户", async () => {
    const restore = stubHeapUsedBytes(1.3 * GB);
    const trimmed: number[] = [];
    const { startMemoryWatch } = await import("./memoryWatch");
    const handle: MemoryWatchHandle = startMemoryWatch({
      onTrimUndoHistory: (keep) => trimmed.push(keep),
      intervalMs: 1
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    handle.stop();
    restore();
    expect(trimmed).toEqual([10]);
  });

  it("level 2：清空撤销历史（keep=0），与 level 1 区分", async () => {
    const restore = stubHeapUsedBytes(1.7 * GB);
    const trimmed: number[] = [];
    const { startMemoryWatch } = await import("./memoryWatch");
    const handle: MemoryWatchHandle = startMemoryWatch({
      onTrimUndoHistory: (keep) => trimmed.push(keep),
      intervalMs: 1
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    handle.stop();
    restore();
    expect(trimmed).toEqual([0]);
    // 同一次升档只弹一次：这条断言把「基线钉死」本身也变成可执行的守卫 ——
    // 若 showGlobalMessage 变回会抛的实现（共享注册表下的真弹窗），tick 会在
    // 记处置与记 lastLevel 之间抛出，弹窗桩收不到文案、且 trimmed 会多出一项。
    expect(baselineMessages).toHaveLength(1);
  });

  it("同一档位不重复处置：堆没继续涨时不重复裁剪", async () => {
    const restore = stubHeapUsedBytes(1.3 * GB);
    const trimmed: number[] = [];
    const { startMemoryWatch } = await import("./memoryWatch");
    const handle: MemoryWatchHandle = startMemoryWatch({
      onTrimUndoHistory: (keep) => trimmed.push(keep),
      intervalMs: 1
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    handle.stop();
    restore();
    // 停在同一档 ⇒ 只处置一次。这是 level 去重（lastLevel）的契约
    expect(trimmed).toEqual([10]);
  });

  it("堆回落到 soft 以下后再次升档，会重新处置", async () => {
    let used = 1.3 * GB;
    const restore = stubHeapUsedBytes(used);
    const trimmed: number[] = [];
    const { startMemoryWatch } = await import("./memoryWatch");
    const handle: MemoryWatchHandle = startMemoryWatch({
      onTrimUndoHistory: (keep) => trimmed.push(keep),
      intervalMs: 1
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    used = 0.5 * GB;
    stubHeapUsedBytes(used);
    await new Promise((resolve) => setTimeout(resolve, 30));
    used = 1.3 * GB;
    stubHeapUsedBytes(used);
    await new Promise((resolve) => setTimeout(resolve, 30));
    handle.stop();
    restore();
    expect(trimmed.length).toBeGreaterThanOrEqual(2);
  });

  it("读不到堆占用时静默空转：不调任何回调", async () => {
    const target = performance as unknown as { memory?: unknown };
    const had = "memory" in target;
    const original = target.memory;
    delete target.memory;
    const trimmed: number[] = [];
    const { startMemoryWatch } = await import("./memoryWatch");
    const handle: MemoryWatchHandle = startMemoryWatch({
      onTrimUndoHistory: (keep) => trimmed.push(keep),
      intervalMs: 1
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    handle.stop();
    if (had) {
      Object.defineProperty(target, "memory", { value: original, configurable: true, writable: true });
    }
    expect(trimmed).toEqual([]);
  });

  it("stop 之后不再处置：定时器真的被清掉了", async () => {
    const restore = stubHeapUsedBytes(0.5 * GB);
    const trimmed: number[] = [];
    const { startMemoryWatch } = await import("./memoryWatch");
    const handle: MemoryWatchHandle = startMemoryWatch({
      onTrimUndoHistory: (keep) => trimmed.push(keep),
      intervalMs: 1
    });
    // 先停在 soft 以下（level 0），stop 之后再把堆推到 soft 以上。
    // 若定时器真的停了，stop 后的 tick 不会跑，trimmed 保持空；
    // 若没停（clearInterval 被摘掉），那次 tick 会把 level 从 0 推到 1 而裁一次。
    //
    // 两个必须做对的地方：
    // ① stop 之后**不能**先 restore() —— 那等于删掉 performance.memory，
    //    tick 会走 `if (used === null) return` 直接返回，断言恒绿。
    // ② 必须换档 —— 停在同一档时 `level === lastLevel` 会短路，即便定时器还在跑
    //    也不会有第二次回调，测不出 clearInterval 有没有生效。
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(trimmed).toEqual([]);
    handle.stop();
    stubHeapUsedBytes(1.3 * GB);
    await new Promise((resolve) => setTimeout(resolve, 30));
    restore();
    expect(trimmed).toEqual([]);
  });});

// ─── readJsHeapUsedBytes 的取数守卫 ─────────────────────────────────────
//
// 缺陷：函数体里写的是**裸标识符** `performance`，不是 `globalThis.performance`。
// `performance` 不是语言内建全局，缺失时（node 老版本、worker 沙箱、被人为 delete ——
// 下面第一条用例就是）裸标识符求值直接抛 `ReferenceError: performance is not defined`，
// 而本函数的契约是「取不到就返回 null」。守望一旦踩进去，setInterval 的回调抛错、
// 连 level 都不再计算，「静默空转」的语义退化成「静默炸掉」。
//
// 本组用例自带 performance 的快照/还原，不挂文件顶部那份 BASELINE_GLOBALS ——
// 那里明确把 performance.memory 排除在外（理由见文件头注释）。
describe("readJsHeapUsedBytes 的取数守卫", () => {
  const GB = 1024 * 1024 * 1024;

  /** 裸标识符求值是否真会抛。用于校验本组用例的桩没失效（否则核心那条会假绿）。 */
  function barePerformanceThrows() {
    try {
      // new Function 造出的函数体在**全局**作用域求值，裸标识符 performance 只在它真是
      // 全局时才解析得到；解析不到就抛。不能用 `typeof performance` 代替 ——
      // typeof 对未声明标识符返回 "undefined" 而不抛，测不出任何东西。
      new Function("return performance;")();
      return false;
    } catch {
      return true;
    }
  }

  /** 逐例精确还原 globalThis.performance 的自有属性描述符（含 node 的 getter/setter 形态）。 */
  function snapshotPerformance() {
    return Object.getOwnPropertyDescriptor(globalThis, "performance");
  }
  function restorePerformance(desc: PropertyDescriptor | undefined) {
    if (desc) {
      Object.defineProperty(globalThis, "performance", desc);
    } else {
      delete (globalThis as Record<string, unknown>).performance;
    }
  }

  /** 整个替换 globalThis.performance（node 里它是可配置访问器，故用 defineProperty）。 */
  function stubGlobalPerformance(value: unknown) {
    Object.defineProperty(globalThis, "performance", {
      value,
      configurable: true,
      writable: true,
      enumerable: true
    });
  }

  /** 只改 performance.memory，返回还原函数（浏览器原生 memory 是只读 getter）。 */
  function stubMemory(perfObject: unknown, memory: unknown) {
    const target = perfObject as Record<string, unknown>;
    const original = Object.getOwnPropertyDescriptor(target, "memory");
    Object.defineProperty(target, "memory", { value: memory, configurable: true, writable: true });
    return () => {
      if (original) Object.defineProperty(target, "memory", original);
      else delete target.memory;
    };
  }

  let perfSnapshot: PropertyDescriptor | undefined;
  beforeEach(() => {
    perfSnapshot = snapshotPerformance();
  });
  afterEach(() => {
    restorePerformance(perfSnapshot);
    perfSnapshot = undefined;
  });

  it("globalThis.performance 整个不存在时：返回 null，不抛 ReferenceError", () => {
    delete (globalThis as Record<string, unknown>).performance;
    // 桩的自检（两条都必须为 true，否则下面那条 not.toThrow 就是假绿）：
    // ① 属性要**彻底不存在**，而不是被置成 undefined —— 后者之下裸标识符仍解析得到
    //    undefined，表达式不抛、只是取到空，于是「回退成裸标识符」的变异照样全绿；
    // ② 裸标识符确实要抛，否则本用例压根没覆盖到「全局缺失」这条真实路径。
    expect("performance" in globalThis).toBe(false);
    expect(barePerformanceThrows()).toBe(true);

    expect(() => readJsHeapUsedBytes()).not.toThrow();
    expect(readJsHeapUsedBytes()).toBeNull();
  });

  it("performance 存在但没有 memory 字段（普通 node 环境）时：返回 null", () => {
    stubGlobalPerformance({ now: () => 123 });
    expect(() => readJsHeapUsedBytes()).not.toThrow();
    expect(readJsHeapUsedBytes()).toBeNull();
  });

  it("performance.memory 存在但缺 usedJSHeapSize 字段时：返回 null", () => {
    stubGlobalPerformance({ memory: {} });
    expect(readJsHeapUsedBytes()).toBeNull();
  });

  it("usedJSHeapSize 为 0 时：返回 0 而不是 null（0 是合法读数，不是假值）", () => {
    // 这条咬住「把 0 当假值」：`used || null`、`used && ...`、`used > 0` 三种写法都会
    // 把 0 吞成 null，从而把「堆恰好为空」和「读不到堆」两种状态混为一谈。
    // 守卫若退回 `used > 0`，本用例立刻红。
    stubGlobalPerformance({});
    const restore = stubMemory(globalThis.performance, { usedJSHeapSize: 0 });
    try {
      const used = readJsHeapUsedBytes();
      expect(used).not.toBeNull();
      expect(used).toBe(0);
    } finally {
      restore();
    }
  });

  it("usedJSHeapSize 为 NaN 时：返回 null（无效读数按读不到处理）", () => {
    stubGlobalPerformance({});
    const restore = stubMemory(globalThis.performance, { usedJSHeapSize: Number.NaN });
    try {
      expect(readJsHeapUsedBytes()).toBeNull();
    } finally {
      restore();
    }
  });

  it("usedJSHeapSize 为负数时：返回 null（物理上不可能的读数按读不到处理）", () => {
    stubGlobalPerformance({});
    const restore = stubMemory(globalThis.performance, { usedJSHeapSize: -4096 });
    try {
      expect(readJsHeapUsedBytes()).toBeNull();
    } finally {
      restore();
    }
  });

  it("usedJSHeapSize 为 Infinity 时：返回 null（Number.isFinite 这道守卫就在这里承重）", () => {
    // Infinity >= 0 为 true，所以「只判非负、不判有限」会把 Infinity 当成合法读数放行。
    // 删掉 Number.isFinite 子句的变异，正是被本用例咬住。
    stubGlobalPerformance({});
    const restore = stubMemory(globalThis.performance, { usedJSHeapSize: Number.POSITIVE_INFINITY });
    try {
      expect(readJsHeapUsedBytes()).toBeNull();
    } finally {
      restore();
    }
  });

  it("usedJSHeapSize 为数字字符串时：返回 null（只认真 number，不做隐式转换）", () => {
    // 本条真正守住的是「不做隐式转换」这层语义（typeof 子句）。
    // 注意：单把 Number.isFinite 换成全局 isFinite，本组用例测不出差别 —— 原因见文末记档 ①。
    stubGlobalPerformance({});
    const restore = stubMemory(globalThis.performance, { usedJSHeapSize: "1024" });
    try {
      expect(readJsHeapUsedBytes()).toBeNull();
    } finally {
      restore();
    }
  });

  it("Chrome 正常读数：原样返回 usedJSHeapSize（取数改造没动浏览器路径）", () => {
    stubGlobalPerformance({ memory: { usedJSHeapSize: 1.3 * GB } });
    expect(readJsHeapUsedBytes()).toBe(1.3 * GB);
  });

  // ── 变异验证记档（两条「绿但有据」的等价变异，别再重新调查一遍）─────────
  //
  // 守卫写的是 `typeof used === "number" && Number.isFinite(used) && used >= 0`，
  // 三道子句各自都被上面的用例咬住，唯独下面两种改法测不出差别 —— 且**可证明**它们等价，
  // 不是「输入太薄」：
  //
  // ① `Number.isFinite(used)` → 全局 `isFinite(used)`：仍全绿。因 `typeof used === "number"`
  //    在前短路，字符串根本走不到 isFinite，全局版对非 number 的强转（isFinite("1024") 为 true）
  //    在此恒不可观察。
  // ② 删掉 `typeof used === "number" &&` 整句：仍全绿。`Number.isFinite` 对一切非 number
  //    返回 false（它是刻意不做强转的那个版本），故在 Number.isFinite 在场时，
  //    typeof 子句在整个定义域上都不改变结果。
  //
  // 反过来，「删掉 Number.isFinite」**不是**等价变异：Infinity >= 0 为 true，
  // 只判非负会把 Infinity 当合法读数放行 —— 由上面那条 Infinity 用例咬住。
});

// ─── critical 档（level 3）与 reloading 守卫 ──────────────────────────────
//
// level 3 是全仓少数会直接丢掉用户现场的地方：落盘恢复点 → 置 skip-beforeunload →
// window.setTimeout(() => window.location.reload(), 400)。两处细节决定夹具怎么造：
// ① 写的是 window. 前缀而不是 globalThis，node 测试环境没有 window ⇒ 必须整体桩掉 window；
// ② 桩里的 setTimeout **只记录不排程** —— 真排程会在 400ms 后去 reload，而那时用例早已结束。
//
// 断言「reloading 守卫」时的三个坑（§8）：
// - 堆读数在整个被测窗口里必须始终有效：还原 performance.memory 等于删掉被探测的输入，
//   tick 会走 used === null 早退，断言恒绿；
// - 堆必须**停在 critical 这一档**：level 3 走的是 return，不更新 lastLevel，
//   所以「同档去重」不会替它兜底 —— 守卫若被删掉，persistRecovery 会在每轮 tick 重复调用。
//   反之若此时把堆压到 soft 以下，去重会把守卫缺失的效应完全遮住；
// - **不能用「堆读数次数」证明定时器活着**：reloading 守卫在 readJsHeapUsedBytes **之前**
//   就 return，第二轮起根本不再读堆（实测读数恒为 1，无论守卫在与不在）。
//   故这里给 startMemoryWatch 自己的 setInterval 套一层计数，直接数 tick 的点火次数。
describe("startMemoryWatch 的 critical 档与 reloading 守卫", () => {
  const GB = 1024 * 1024 * 1024;
  type MemoryWatchHandle = { stop: () => void };

  /** 本组用例开过的 handle：afterEach 统一 stop，残留定时器会污染同文件后续用例。 */
  const openHandles: MemoryWatchHandle[] = [];

  afterEach(() => {
    while (openHandles.length > 0) openHandles.pop()?.stop();
    // spaceSwitch 的跳过挽留标志是模块级 let：critical 分支会把它置 true，
    // 用完必须复位，否则同文件后续用例读到的是残留状态。
    setSkipBeforeUnload(false);
  });

  /** 给 startMemoryWatch 自己的 setInterval 套计数层：证明 tick 在窗口里真的点火过多轮。 */
  function countIntervalFires(counter: { fires: number }) {
    const holder = globalThis as unknown as Record<string, unknown>;
    const original = holder.setInterval as (fn: () => void, ms?: number) => unknown;
    Object.defineProperty(globalThis, "setInterval", {
      value: (fn: () => void, ms?: number) => original(() => { counter.fires += 1; fn(); }, ms),
      configurable: true,
      writable: true
    });
    return () => {
      Object.defineProperty(globalThis, "setInterval", { value: original, configurable: true, writable: true });
    };
  }

  /** 桩出 critical 分支要用的两个 window 出口；返回还原函数。 */
  function stubReloadWindow(record: { scheduled: number[]; reloaded: number }) {
    const had = "window" in globalThis;
    const original = (globalThis as Record<string, unknown>).window;
    Object.defineProperty(globalThis, "window", {
      value: {
        setTimeout: (_fn: () => void, ms: number) => {
          record.scheduled.push(ms);
          return 0;
        },
        location: {
          reload: () => {
            record.reloaded += 1;
          }
        }
      },
      configurable: true,
      writable: true
    });
    return () => {
      if (had) {
        Object.defineProperty(globalThis, "window", { value: original, configurable: true, writable: true });
      } else {
        delete (globalThis as Record<string, unknown>).window;
      }
    };
  }

  /** 固定堆读数（窗口内始终有效）；返回还原函数。 */
  function stubHeapAt(usedBytes: number) {
    const target = performance as unknown as { memory?: unknown };
    const had = "memory" in target;
    const original = target.memory;
    Object.defineProperty(target, "memory", {
      value: { usedJSHeapSize: usedBytes },
      configurable: true,
      writable: true
    });
    return () => {
      if (had) {
        Object.defineProperty(target, "memory", { value: original, configurable: true, writable: true });
      } else {
        delete target.memory;
      }
    };
  }

  it("level 3：落盘恢复点 + 置跳过挽留 + 排 400ms 延迟刷新，且 reloading 守卫挡住后续 tick 重复处置", async () => {
    const CRITICAL = 1.9 * GB;
    const record = { scheduled: [] as number[], reloaded: 0 };
    const fires = { fires: 0 };
    const restoreTimers = countIntervalFires(fires);
    const restoreWindow = stubReloadWindow(record);
    const restoreHeap = stubHeapAt(CRITICAL);
    const persisted: string[] = [];
    const trimmed: number[] = [];
    const { startMemoryWatch } = await import("./memoryWatch");
    const handle: MemoryWatchHandle = startMemoryWatch({
      onTrimUndoHistory: (keep) => trimmed.push(keep),
      persistRecovery: () => persisted.push("persisted"),
      intervalMs: 1
    });
    openHandles.push(handle);
    const skipBefore = isSkipBeforeUnload();
    try {
      // 堆必须停在 critical：**降档会把 reloading 缺失的效应吃掉**（见描述里的 ②）。
      await new Promise((resolve) => setTimeout(resolve, 60));
      const skipFlagAfterTick = isSkipBeforeUnload();

      // 活性自检：60ms / intervalMs=1 下 tick 必须点火过多轮，否则下面「只处置一次」是空断言。
      expect(fires.fires).toBeGreaterThanOrEqual(3);
      // 被测的核心契约：critical 只处置一次，reloading 守卫把后续 tick 全部挡在门外。
      expect(persisted).toEqual(["persisted"]);
      // 刷新是延迟 400ms 的，且**只排一次**（重复排程正是守卫缺失的另一个可见后果）。
      expect(record.scheduled).toEqual([400]);
      // 400ms 未到，不该真的 reload —— 也说明桩确实没把那个回调排进真定时器。
      expect(record.reloaded).toBe(0);
      // critical 分支不走裁剪分支。
      expect(trimmed).toEqual([]);
      // 绕过未保存挽留弹窗的标志真的在窗口内由 false 翻成了 true
      //（该标志读的是 spaceSwitch 的模块级状态，故要断言前后两档而不只是终态）。
      expect(skipBefore).toBe(false);
      expect(skipFlagAfterTick).toBe(true);
      expect(baselineMessages).toEqual(["内存占用接近上限，即将自动刷新页面释放内存（已保存恢复点）。"]);
    } finally {
      handle.stop();
      restoreHeap();
      restoreWindow();
      restoreTimers();
    }
    // 还原自检：window 桩与 setInterval 计数层都已摘掉（node 下本来没有 window）。
    expect("window" in globalThis).toBe(false);
  });

  it("恢复点抛异常也继续刷新（critical 是最后防线，catch 不许把刷新一起吞掉）", async () => {
    const record = { scheduled: [] as number[], reloaded: 0 };
    const fires = { fires: 0 };
    const restoreTimers = countIntervalFires(fires);
    const restoreWindow = stubReloadWindow(record);
    const restoreHeap = stubHeapAt(1.9 * GB);
    const { startMemoryWatch } = await import("./memoryWatch");
    const handle: MemoryWatchHandle = startMemoryWatch({
      persistRecovery: () => {
        throw new Error("snapshot failed");
      },
      intervalMs: 1
    });
    openHandles.push(handle);
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      // 抛异常的处置不该影响刷新：延迟刷新仍被排上，且守卫仍把重复处置挡在外面。
      expect(record.scheduled).toEqual([400]);
      expect(record.reloaded).toBe(0);
      expect(fires.fires).toBeGreaterThanOrEqual(3);
    } finally {
      handle.stop();
      restoreHeap();
      restoreWindow();
      restoreTimers();
    }
    expect("window" in globalThis).toBe(false);
  });
});