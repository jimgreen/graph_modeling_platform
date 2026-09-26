import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  APP_TOUR_SEEN_KEY,
  APP_TOUR_STEPS,
  clearTourSeen,
  isSidePanelLockedByTour,
  readTourSeen,
  tourGateSatisfied,
  writeTourSeen
} from "./appTour";
import { TOUR_SIDE_PANEL_STEP_TARGETS } from "./sidePanelVisibility";

// 测试环境是 node（无 jsdom）：手动注入 localStorage 桩，与 spaceCache.test.ts 同模式。

function createStorageStub(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    }
  };
}

let originalLocalStorage: unknown;

beforeEach(() => {
  originalLocalStorage = (globalThis as any).localStorage;
  (globalThis as any).localStorage = createStorageStub();
});

afterEach(() => {
  (globalThis as any).localStorage = originalLocalStorage;
});

// ---------- 步骤定义校验 ----------

describe("app tour step definitions", () => {
  test("steps 非空", () => {
    expect(APP_TOUR_STEPS.length).toBeGreaterThan(0);
  });

  test("每步都有 target + title + content", () => {
    for (const step of APP_TOUR_STEPS) {
      expect(step.target).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.content).toBeTruthy();
    }
  });

  test("target 无重复（避免同一元素被高亮两次）", () => {
    const targets = APP_TOUR_STEPS.map((s) => String(s.target));
    expect(new Set(targets).size).toBe(targets.length);
  });

  test("共 7 步（编辑模式 / 图元库 / 画布 / 画布工具 / 属性面板 / 保存 / 顶栏总览）", () => {
    expect(APP_TOUR_STEPS.length).toBe(7);
  });

  test("只有第 1 步标记 actionStep（其余为纯介绍步骤）", () => {
    expect((APP_TOUR_STEPS[0].data as { actionStep?: boolean })?.actionStep).toBe(true);
    for (let i = 1; i < APP_TOUR_STEPS.length; i++) {
      expect((APP_TOUR_STEPS[i].data as { actionStep?: boolean } | undefined)?.actionStep).toBeFalsy();
    }
  });
});

// ---------- localStorage helpers ----------

describe("app tour localStorage helpers", () => {
  test("readTourSeen 默认返回 false（未写过）", () => {
    expect(readTourSeen()).toBe(false);
  });

  test("writeTourSeen 后 readTourSeen 返回 true", () => {
    writeTourSeen();
    expect(readTourSeen()).toBe(true);
  });

  test("clearTourSeen 清除后 readTourSeen 返回 false", () => {
    writeTourSeen();
    expect(readTourSeen()).toBe(true);
    clearTourSeen();
    expect(readTourSeen()).toBe(false);
  });

  test("key 与 APP_TOUR_SEEN_KEY 常量一致", () => {
    writeTourSeen();
    expect(localStorage.getItem(APP_TOUR_SEEN_KEY)).toBe("1");
  });

  test("localStorage 不可用时 readTourSeen 返回 false 不抛错", () => {
    // 模拟隐私模式：setItem 抛错
    (globalThis as any).localStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
      length: 0,
      key: () => null,
      clear: () => { /* no-op */ }
    };
    expect(readTourSeen()).toBe(false);
    // write / clear 也不应抛出
    expect(() => writeTourSeen()).not.toThrow();
    expect(() => clearTourSeen()).not.toThrow();
  });
});

// ---------- 动作闸门（tourGateSatisfied）纯函数 ----------

describe("tourGateSatisfied", () => {
  test("步骤 0：未切编辑模式 → false", () => {
    expect(tourGateSatisfied(0, { isEditMode: false })).toBe(false);
  });

  test("步骤 0：切到编辑模式 → true（唯一带闸门的一步）", () => {
    expect(tourGateSatisfied(0, { isEditMode: true })).toBe(true);
  });

  test("其余步骤一律不自动跳（纯介绍，由用户点「下一步」推进）", () => {
    for (const stepIndex of [1, 2, 3, 4, 5, 6]) {
      expect(tourGateSatisfied(stepIndex, { isEditMode: true })).toBe(false);
      expect(tourGateSatisfied(stepIndex, { isEditMode: false })).toBe(false);
    }
  });

  test("越界 index 返回 false（防御性）", () => {
    expect(tourGateSatisfied(-1, { isEditMode: true })).toBe(false);
    expect(tourGateSatisfied(99, { isEditMode: true })).toBe(false);
  });
});

// ---------- 侧边栏步骤的强制展开 / 锁定 ----------

describe("tour side panel locking", () => {
  test("锚定侧边栏的两步索引与 APP_TOUR_STEPS 的 target 一致", () => {
    // 索引口径只能有一个来源：APP_TOUR_STEPS。这里逐条反查，防止步骤增删后索引漂移。
    for (const { stepIndex, side } of TOUR_SIDE_PANEL_STEP_TARGETS) {
      expect(APP_TOUR_STEPS[stepIndex]).toBeTruthy();
      expect(String(APP_TOUR_STEPS[stepIndex].target)).toBe(
        side === "left" ? ".library-panel" : ".inspector-panel"
      );
    }
  });

  test("只有第 2 步（索引 1）与第 5 步（索引 4）锚定侧边栏", () => {
    expect(TOUR_SIDE_PANEL_STEP_TARGETS.map((item) => item.stepIndex)).toEqual([1, 4]);
    expect(TOUR_SIDE_PANEL_STEP_TARGETS.map((item) => item.side)).toEqual(["left", "right"]);
  });

  test("引导未开启时任何侧边栏都不被锁定", () => {
    expect(
      isSidePanelLockedByTour("left", { tourActive: false, tourBody: false, tourSidePanel: null })
    ).toBe(false);
    expect(
      isSidePanelLockedByTour("right", {
        tourActive: false,
        tourBody: true,
        tourSidePanel: "right"
      })
    ).toBe(false);
  });

  test("引导过程中（第 1 步之后）两侧边栏都保持展开，避免 tooltip 被自动隐藏收掉", () => {
    const context = { tourActive: true, tourBody: true, tourSidePanel: "left" as const };
    expect(isSidePanelLockedByTour("left", context)).toBe(true);
    expect(isSidePanelLockedByTour("right", context)).toBe(true);
  });

  test("锚定步骤上锁定对应侧边栏（即使 tourBody 尚未置位）", () => {
    expect(
      isSidePanelLockedByTour("left", { tourActive: true, tourBody: false, tourSidePanel: "left" })
    ).toBe(true);
    expect(
      isSidePanelLockedByTour("right", {
        tourActive: true,
        tourBody: false,
        tourSidePanel: "right"
      })
    ).toBe(true);
  });

  test("两条「上一步」回退路径（1→0 与 4→3）都仍处于引导体内，锁定不中断", () => {
    // 回到第 0 步时 tourBody 为 false，但锁定目标仍是左侧栏（第 0 步切到编辑模式后
    // 左侧栏会多出「图元库 / 模板库」tab，第 1 步要锚定它）。
    expect(
      isSidePanelLockedByTour("left", { tourActive: true, tourBody: false, tourSidePanel: "left" })
    ).toBe(true);
    // 从第 5 步回到第 4 步：仍在引导体内，两侧边栏都锁。
    expect(
      isSidePanelLockedByTour("right", { tourActive: true, tourBody: true, tourSidePanel: "left" })
    ).toBe(true);
  });
});

// ---------- 装配点契约（源码扫描）----------
//
// 引导锁定依赖两条装配链，任一断裂都会静默失效（按钮看着可点但没反应 / 面板不重渲染）：
//   1. AppTour 把 tourBlockedSidePanelMode 挂到 scope 上；
//   2. AppLeftPanel / AppRightPanel 的 memo inputs 里带上它，否则 MemorizedViewSection 不重渲染。
// 组件渲染边界在 node 环境下测不出来，用源码扫描钉住（仓库先例：windowCloseCoverage.test.ts）。

describe("tour side panel lock wiring (source contract)", () => {
  const readSource = (relativePath: string) =>
    readFileSync(new URL(relativePath, import.meta.url), "utf8");

  test("AppTour 把 tourBlockedSidePanelMode 与 tourBody 挂到 scope", () => {
    const source = readSource("./appTour.tsx");
    expect(source).toContain("tourBlockedSidePanelMode:");
    expect(source).toContain("tourActive: run");
    expect(source).toContain("tourBody,");
    expect(source).toContain("isSidePanelLockedByTour");
  });

  test("左侧栏与右侧栏的 memo inputs 都带上 tourBlockedSidePanelMode", () => {
    const source = readSource("./appExtracted/appView.tsx");
    const occurrences = source.split("tourBlockedSidePanelMode").length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  test("renderAppView 里的 tourBlockedSidePanelMode 必须带 __appScope. 前缀", () => {
    // 回归护栏：renderAppView 顶层**没有**解构这个名字，写成裸标识符会在运行时抛
    // `Uncaught ReferenceError: tourBlockedSidePanelMode is not defined`
    // （tsc 查不出来 —— __appScope 是 Record<string, any>，而该名字有全局声明级别的宽容度）。
    // 只数出现次数是不够的，必须逐处校验前缀。
    const source = readSource("./appExtracted/appView.tsx");
    const bare: string[] = [];
    let index = source.indexOf("tourBlockedSidePanelMode");
    while (index !== -1) {
      const before = source.slice(Math.max(0, index - "__appScope.".length), index);
      if (before !== "__appScope.") {
        const line = source.slice(0, index).split("\n").length;
        bare.push(`appView.tsx:${line}`);
      }
      index = source.indexOf("tourBlockedSidePanelMode", index + 1);
    }
    expect(bare).toEqual([]);
  });

  test("三个侧边栏交互工厂都读 tourBlockedSidePanelMode", () => {
    const source = readSource("./appExtracted/appCanvasInteractionFactories.tsx");
    for (const factory of [
      "createSetSidePanelMode",
      "createUpdateAutoPanelVisibility",
      "createHideAutoPanelsFromWorkspace"
    ]) {
      const start = source.indexOf(`export function ${factory}(`);
      expect(start, `${factory} 未找到`).toBeGreaterThanOrEqual(0);
      const body = source.slice(start, source.indexOf("\n}\n", start));
      expect(body, `${factory} 缺少引导闸门`).toContain("tourBlockedSidePanelMode");
    }
  });

  test("styles.css 定义了引导锁定态，且排在 .inspector-title 覆盖规则之后", () => {
    // 右侧栏的模式按钮被 `.inspector-title .side-panel-mode-controls button` 以更高特异性着色，
    // 锁定态若放在它前面会被盖掉 —— 顺序是这份样式的硬要求，用文本位置钉住。
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const lockedIndex = css.indexOf('.side-panel-mode-controls[data-tour-locked="true"] button,');
    const inspectorIndex = css.indexOf(".inspector-title .side-panel-mode-controls button.active");
    expect(lockedIndex).toBeGreaterThanOrEqual(0);
    expect(inspectorIndex).toBeGreaterThanOrEqual(0);
    expect(lockedIndex).toBeGreaterThan(inspectorIndex);
    expect(css).toContain('cursor: not-allowed');
  });
});
