// 图元库飞出面板的定位：默认贴在表头右侧，放不下就往左收；与表头横向重叠时改放到表头上/下方。
// 两条关键决策：① 横向位置永远不小于 margin（不能被挤出屏幕左边）；
// ② 放不下时比较「下方溢出」与「上方溢出」，选溢出小的那个 —— 写反了会在底部面板上疯狂抖动。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createFitLibraryFlyoutsToVisibleArea,
  createLibraryFlyoutStyle
} from "./appExtracted/appGraphMeasurementFactories";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createLibraryFlyoutStyle", () => {
  const build = (positions: Record<string, { top: number; left: number }>) =>
    createLibraryFlyoutStyle({ libraryFlyoutPositions: positions });

  test("有位置时写 CSS 变量并可见", () => {
    expect(build({ "flyout:a": { top: 10, left: 20 } })("flyout:a")).toEqual({
      "--library-flyout-top": "10px",
      "--library-flyout-left": "20px",
      visibility: "visible"
    });
  });

  test("没有位置时坐标归零并隐藏", () => {
    expect(build({})("flyout:a")).toEqual({
      "--library-flyout-top": "0px",
      "--library-flyout-left": "0px",
      visibility: "hidden"
    });
  });

  test("位置存在但坐标为 0 也算可见（0 是合法位置）", () => {
    expect(build({ "flyout:a": { top: 0, left: 0 } })("flyout:a").visibility).toBe("visible");
  });

  test("不同 key 互不影响", () => {
    const style = build({ "flyout:a": { top: 1, left: 2 } });

    expect(style("flyout:b").visibility).toBe("hidden");
  });
});

describe("createFitLibraryFlyoutsToVisibleArea", () => {
  const rect = (left: number, top: number, width: number, height: number) => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height
  });

  const SCROLL_RECT = rect(0, 0, 1000, 800);

  function createScope(options: { lists?: Array<[string, any]>; headers?: Array<[string, any]>; scroll?: any } = {}) {
    const scope: Record<string, any> = {
      libraryScrollRef: { current: options.scroll === undefined ? { getBoundingClientRect: () => SCROLL_RECT } : options.scroll },
      libraryComponentListRefs: { current: new Map(options.lists ?? []) },
      libraryComponentLibraryHeaderRefs: { current: new Map(options.headers ?? []) },
      libraryFlyoutPositionsRef: { current: {} },
      setLibraryFlyoutPositions: vi.fn()
    };
    scope.fitLibraryFlyoutsToVisibleArea = createFitLibraryFlyoutsToVisibleArea(scope);
    return scope;
  }

  test("滚动容器未挂载时直接返回", () => {
    const scope = createScope({ scroll: null });

    scope.fitLibraryFlyoutsToVisibleArea();

    expect(scope.setLibraryFlyoutPositions).not.toHaveBeenCalled();
  });

  test("非 flyout 前缀的列表被跳过（与已有位置一致 → 不触发更新）", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const list = { getBoundingClientRect: () => rect(0, 0, 200, 100) };
    const scope = createScope({ lists: [["普通项", list]], headers: [["普通项", { getBoundingClientRect: () => rect(0, 0, 50, 20) }]] });

    scope.fitLibraryFlyoutsToVisibleArea();

    expect(scope.setLibraryFlyoutPositions).not.toHaveBeenCalled();
  });

  test("表头元素缺失时跳过", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const list = { getBoundingClientRect: () => rect(0, 0, 200, 100) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [] });

    scope.fitLibraryFlyoutsToVisibleArea();

    expect(scope.setLibraryFlyoutPositions).not.toHaveBeenCalled();
  });

  test("表头缺失但已有旧位置时清空该位置", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const list = { getBoundingClientRect: () => rect(0, 0, 200, 100) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [] });
    scope.libraryFlyoutPositionsRef.current = { "flyout:a": { left: 10, top: 10 } };

    scope.fitLibraryFlyoutsToVisibleArea();

    expect(scope.setLibraryFlyoutPositions).toHaveBeenCalledWith({});
  });

  test("默认贴在表头右侧 + 8px 间距", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const list = { getBoundingClientRect: () => rect(400, 100, 200, 150) };
    const header = { getBoundingClientRect: () => rect(100, 100, 60, 20) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [["flyout:a", header]] });

    scope.fitLibraryFlyoutsToVisibleArea();

    expect(scope.setLibraryFlyoutPositions).toHaveBeenCalledWith({
      "flyout:a": { left: 100 + 60 + 8, top: 100 }
    });
  });

  test("右侧放不下时往左收到「视口右 - 面板宽」", () => {
    vi.stubGlobal("window", { innerWidth: 400 });
    const list = { getBoundingClientRect: () => rect(390, 100, 200, 150) };
    const header = { getBoundingClientRect: () => rect(380, 100, 20, 20) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [["flyout:a", header]] });

    scope.fitLibraryFlyoutsToVisibleArea();

    // maxRight = 400 - 8 = 392；面板宽 200 → 左边界收到 192
    const positions = scope.setLibraryFlyoutPositions.mock.calls[0][0];
    expect(positions["flyout:a"].left).toBe(192);
  });

  test("面板比视口还宽时左边界保底为 margin", () => {
    vi.stubGlobal("window", { innerWidth: 400 });
    const list = { getBoundingClientRect: () => rect(380, 100, 390, 150) };
    const header = { getBoundingClientRect: () => rect(370, 100, 20, 20) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [["flyout:a", header]] });

    scope.fitLibraryFlyoutsToVisibleArea();

    // 392 - 390 = 2 < margin 8 → 取 8
    expect(scope.setLibraryFlyoutPositions.mock.calls[0][0]["flyout:a"].left).toBe(8);
  });

  test("顶部放不下时向下贴 margin", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const list = { getBoundingClientRect: () => rect(400, -50, 200, 150) };
    const header = { getBoundingClientRect: () => rect(100, -50, 60, 20) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [["flyout:a", header]] });

    scope.fitLibraryFlyoutsToVisibleArea();

    // 滚动区上边 0 + margin 8
    expect(scope.setLibraryFlyoutPositions.mock.calls[0][0]["flyout:a"].top).toBe(8);
  });

  test("底部放不下时收进可视区", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const list = { getBoundingClientRect: () => rect(400, 700, 200, 300) };
    const header = { getBoundingClientRect: () => rect(100, 700, 60, 20) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [["flyout:a", header]] });

    scope.fitLibraryFlyoutsToVisibleArea();

    // 可视区下边 800 - margin 8 = 792
    expect(scope.setLibraryFlyoutPositions.mock.calls[0][0]["flyout:a"].top).toBe(792 - 300);
  });

  test("位置不变时不触发 state 更新（避免每帧重渲染）", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const list = { getBoundingClientRect: () => rect(400, 100, 200, 150) };
    const header = { getBoundingClientRect: () => rect(100, 100, 60, 20) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [["flyout:a", header]] });

    scope.fitLibraryFlyoutsToVisibleArea();
    scope.libraryFlyoutPositionsRef.current = scope.setLibraryFlyoutPositions.mock.calls[0][0];
    scope.setLibraryFlyoutPositions.mockClear();
    scope.fitLibraryFlyoutsToVisibleArea();

    expect(scope.setLibraryFlyoutPositions).not.toHaveBeenCalled();
  });

  test("位置变了才触发 state 更新", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const list = { getBoundingClientRect: () => rect(400, 100, 200, 150) };
    const header = { getBoundingClientRect: () => rect(100, 100, 60, 20) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [["flyout:a", header]] });

    scope.fitLibraryFlyoutsToVisibleArea();
    scope.libraryFlyoutPositionsRef.current = { "flyout:a": { left: 0, top: 0 } };
    scope.fitLibraryFlyoutsToVisibleArea();

    expect(scope.setLibraryFlyoutPositions).toHaveBeenCalledTimes(2);
  });

  test("多个 flyout 各自定位", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const scope = createScope({
      lists: [
        ["flyout:a", { getBoundingClientRect: () => rect(400, 100, 200, 150) }],
        ["flyout:b", { getBoundingClientRect: () => rect(400, 300, 200, 150) }]
      ],
      headers: [
        ["flyout:a", { getBoundingClientRect: () => rect(100, 100, 60, 20) }],
        ["flyout:b", { getBoundingClientRect: () => rect(100, 300, 60, 20) }]
      ]
    });

    scope.fitLibraryFlyoutsToVisibleArea();

    const positions = scope.setLibraryFlyoutPositions.mock.calls[0][0];
    expect(Object.keys(positions).sort()).toEqual(["flyout:a", "flyout:b"]);
    expect(positions["flyout:b"].top).toBe(300);
  });

  test("无 innerWidth 时退回 document.documentElement.clientWidth", () => {
    vi.stubGlobal("window", { innerWidth: 0 });
    vi.stubGlobal("document", { documentElement: { clientWidth: 700 } });
    const list = { getBoundingClientRect: () => rect(650, 100, 200, 150) };
    const header = { getBoundingClientRect: () => rect(640, 100, 20, 20) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [["flyout:a", header]] });

    scope.fitLibraryFlyoutsToVisibleArea();

    // 0 || 700 = 700 → maxRight 692；面板宽 200 → 左边界 492
    expect(scope.setLibraryFlyoutPositions.mock.calls[0][0]["flyout:a"].left).toBe(492);
  });

  test("坐标取整", () => {
    vi.stubGlobal("window", { innerWidth: 1600 });
    const list = { getBoundingClientRect: () => rect(400, 100, 200, 150) };
    const header = { getBoundingClientRect: () => rect(100, 100, 60, 20) };
    const scope = createScope({ lists: [["flyout:a", list]], headers: [["flyout:a", header]] });

    scope.fitLibraryFlyoutsToVisibleArea();

    const position = scope.setLibraryFlyoutPositions.mock.calls[0][0]["flyout:a"];
    expect(Number.isInteger(position.top)).toBe(true);
    expect(Number.isInteger(position.left)).toBe(true);
  });
});
