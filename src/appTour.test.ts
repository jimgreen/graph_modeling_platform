import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  APP_TOUR_SEEN_KEY,
  APP_TOUR_STEPS,
  clearTourSeen,
  readTourSeen,
  tourGateSatisfied,
  writeTourSeen
} from "./appTour";

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
