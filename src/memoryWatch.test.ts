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
