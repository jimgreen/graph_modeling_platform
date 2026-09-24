import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  MEMORY_WATCH_CRITICAL_LIMIT_BYTES,
  MEMORY_WATCH_HARD_LIMIT_BYTES,
  MEMORY_WATCH_SOFT_LIMIT_BYTES,
  memoryWatchLevelFor,
  readJsHeapUsedBytes
} from "./memoryWatch";

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
