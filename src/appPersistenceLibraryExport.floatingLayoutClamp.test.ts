// 浮动对话框布局钳制：窗口被拖出视口、尺寸被改得过大、字段是 NaN —— 三种都要能救回来。
// 关键是「先定尺寸再定位置」：位置的上限依赖已定的宽高，顺序反了会算出一个装不下的框。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  clampDeviceLibraryDialogLayout,
  clampFloatingDialogLayout,
  clampNodeDoubleClickDialogLayout,
  readStoredPanelDimension
} from "./appExtracted/appPersistenceLibraryExport";

const CONFIG = { defaultWidth: 200, defaultHeight: 150, minWidth: 100, minHeight: 80, margin: 10 };

function withViewport(width: number, height: number) {
  vi.stubGlobal("window", { innerWidth: width, innerHeight: height });
}

describe("clampFloatingDialogLayout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("视口内原样返回（位置取整）", () => {
    withViewport(1000, 800);

    expect(clampFloatingDialogLayout({ left: 100.4, top: 100.6, width: 200, height: 150 }, CONFIG)).toEqual({
      left: 100,
      top: 101,
      width: 200,
      height: 150
    });
  });

  test("超出右边时贴回内边距", () => {
    withViewport(500, 500);

    // 视口宽 500，margin 10 → 左边界上限 = 500 - 200 - 10 = 290
    expect(clampFloatingDialogLayout({ left: 999, top: 10, width: 200, height: 150 }, CONFIG).left).toBe(290);
  });

  test("超出左边时贴回内边距", () => {
    withViewport(1000, 800);

    expect(clampFloatingDialogLayout({ left: -999, top: 10, width: 200, height: 150 }, CONFIG).left).toBe(10);
  });

  test("宽度过大时收到视口内（仍不小于 minWidth）", () => {
    withViewport(300, 300);

    // maxWidth = max(100, 300 - 20) = 280
    expect(clampFloatingDialogLayout({ left: 10, top: 10, width: 9999, height: 150 }, CONFIG).width).toBe(280);
  });

  test("视口比 minWidth 还小时保底 minWidth（宁可溢出也不塌成 0）", () => {
    withViewport(50, 50);

    expect(clampFloatingDialogLayout({ left: 10, top: 10, width: 9999, height: 150 }, CONFIG).width).toBe(100);
  });

  test("宽高过小时抬到 minWidth / minHeight", () => {
    withViewport(1000, 800);

    const result = clampFloatingDialogLayout({ left: 10, top: 10, width: 1, height: 1 }, CONFIG);

    expect(result).toMatchObject({ width: 100, height: 80 });
  });

  test("非数值宽高落回默认尺寸", () => {
    withViewport(1000, 800);

    expect(clampFloatingDialogLayout({ left: 10, top: 10, width: NaN, height: NaN }, CONFIG)).toMatchObject({
      width: 200,
      height: 150
    });
  });

  test("非数值位置落回居中", () => {
    withViewport(1000, 800);

    // (1000 - 200) / 2 = 400；(800 - 150) / 2 = 325
    expect(clampFloatingDialogLayout({ left: NaN, top: NaN, width: 200, height: 150 }, CONFIG)).toMatchObject({
      left: 400,
      top: 325
    });
  });

  test("无 window 时按自身位置撑出的视口算（SSR 兜底）", () => {
    vi.stubGlobal("window", undefined);

    const result = clampFloatingDialogLayout({ left: 10, top: 10, width: 200, height: 150 }, CONFIG);

    expect(result).toMatchObject({ left: 10, top: 10, width: 200, height: 150 });
  });

  test("高度方向同样被钳住", () => {
    withViewport(1000, 300);

    // 视口高 300 → 上边界上限 = 300 - 150 - 10 = 140
    expect(clampFloatingDialogLayout({ left: 10, top: 999, width: 200, height: 150 }, CONFIG).top).toBe(140);
  });
});

describe("clampNodeDoubleClickDialogLayout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const LAYOUT = { left: 100, top: 100, width: 640, height: 560 };

  test("视口内原样返回", () => {
    withViewport(1600, 900);

    expect(clampNodeDoubleClickDialogLayout(LAYOUT)).toEqual(LAYOUT);
  });

  test("不抛且总在视口内", () => {
    withViewport(700, 500);

    const result = clampNodeDoubleClickDialogLayout({ left: 9999, top: 9999, width: 640, height: 560 });

    expect(result.left + result.width).toBeLessThanOrEqual(700);
    expect(result.top + result.height).toBeLessThanOrEqual(500);
  });

  test("视口小于最小尺寸时保底最小宽度（宁可溢出也不塌成 0）", () => {
    withViewport(200, 200);

    expect(clampNodeDoubleClickDialogLayout(LAYOUT).width).toBeGreaterThanOrEqual(420);
  });
});

describe("clampDeviceLibraryDialogLayout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const layout = { left: 10, top: 10, width: 400, height: 300 } as any;

  test("四种对话框种类都返回合法布局", () => {
    withViewport(1200, 900);

    for (const kind of ["definition", "custom", "measurementConfig", "measurementEditor"] as const) {
      const result = clampDeviceLibraryDialogLayout(kind, layout);

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    }
  });

  test("视口装不下时保底最小尺寸（宁可溢出也不塌成 0）", () => {
    withViewport(400, 400);

    const result = clampDeviceLibraryDialogLayout("definition", { left: 999, top: 999, width: 800, height: 800 });

    // 最小宽度远大于视口：宽度取 minWidth，位置退回内边距（而不是负数或 0）
    expect(result.left).toBe(12);
    expect(result.width).toBeGreaterThan(400);
  });

  test("视口足够大时整框落在视口内", () => {
    withViewport(2000, 1500);

    const result = clampDeviceLibraryDialogLayout("definition", { left: 9999, top: 9999, width: 800, height: 800 });

    expect(result.left + result.width).toBeLessThanOrEqual(2000);
    expect(result.top + result.height).toBeLessThanOrEqual(1500);
  });

  test("过大的请求宽高被收到视口内（视口大于最小尺寸时）", () => {
    withViewport(1000, 900);

    const result = clampDeviceLibraryDialogLayout("definition", { left: 10, top: 10, width: 9999, height: 9999 });

    expect(result.width).toBeLessThanOrEqual(1000);
    expect(result.height).toBeLessThanOrEqual(900);
  });
});

describe("readStoredPanelDimension", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const withStorage = (value: string | null) => {
    vi.stubGlobal("window", { localStorage: { getItem: () => value } });
  };

  test("读到合法数字时按上下限取整", () => {
    withStorage("250.6");

    expect(readStoredPanelDimension("k", 200, 100, 400)).toBe(251);
  });

  test("超出上限时收到上限", () => {
    withStorage("9999");

    expect(readStoredPanelDimension("k", 200, 100, 400)).toBe(400);
  });

  test("低于下限时抬到下限", () => {
    withStorage("1");

    expect(readStoredPanelDimension("k", 200, 100, 400)).toBe(100);
  });

  test("localStorage 取到 null 时 Number(null)=0 → 被抬到下限", () => {
    withStorage(null);

    expect(readStoredPanelDimension("k", 200, 100, 400)).toBe(100);
  });

  test("存的不是数字时回落 fallback", () => {
    withStorage("宽");

    expect(readStoredPanelDimension("k", 200, 100, 400)).toBe(200);
  });

  test("localStorage 抛错时回落 fallback（隐私模式 / 配额满）", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("不可用");
        }
      }
    });

    expect(readStoredPanelDimension("k", 200, 100, 400)).toBe(200);
  });

  test("存的是空串时 Number('')=0 → 被抬到下限", () => {
    withStorage("");

    expect(readStoredPanelDimension("k", 200, 100, 400)).toBe(100);
  });
});
