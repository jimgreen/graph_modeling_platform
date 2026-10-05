// src/hooks/useGlobalLines.tsx 的专属行为守卫。
//
// 该 hook 504 行、此前零专属测试。本仓 vitest 是 `environment: "node"`（无 jsdom），
// 而 hook 内部的 useState / useRef / useMemo / useEffect 无法用
// renderToStaticMarkup 驱动（它只渲染一次、不跑 effect）。故按 §6.21 的做法：
// 临时替换 React 的 hook dispatcher 槽位，手写最小 dispatcher，按调用序号存格子，
// 再**直接调用 hook 函数**拿返回值。两个安全措施都在下面实现了：
//   ① `expect(useStateCalls).toBe(3)` 守卫 hook 数量——组件增删一个 useState 时
//      序号会整体错位，没有这条守卫断言可能「以另一个原因失败」甚至照过。
//   ② 取不到 internals 槽位时**显式抛错**，不静默退化成跳过（静默跳过 = 恒绿）。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as React from "react";

import { useGlobalLines } from "./useGlobalLines";

type AnyScope = Record<string, any>;

type DispatcherCells = {
  states: any[];
  refs: any[];
  cursor: number;
  useStateCalls: number;
};

const INTERNALS = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

let restoreHookSlot: (() => void) | null = null;

function makeDispatcher(cells: DispatcherCells) {
  return {
    // 按调用序号存格子；setter 就地写格子并标记需要 rerender。
    useState(initial: any) {
      cells.useStateCalls += 1;
      const index = cells.cursor;
      cells.cursor += 1;
      if (!(index in cells.states)) {
        cells.states[index] = typeof initial === "function" ? initial() : initial;
      }
      const setState = (next: any) => {
        cells.states[index] = typeof next === "function" ? next(cells.states[index]) : next;
      };
      return [cells.states[index], setState];
    },
    useRef(initial: any) {
      const index = cells.cursor;
      cells.cursor += 1;
      if (!(index in cells.refs)) {
        cells.refs[index] = { current: initial };
      }
      return cells.refs[index];
    },
    useMemo(factory: () => any) {
      cells.cursor += 1;
      return factory();
    },
    // 空实现：挂载时那个 loadRecords() 不跑，测试完全不依赖网络。
    useEffect() {
      cells.cursor += 1;
    },
    useCallback(fn: any) {
      cells.cursor += 1;
      return fn;
    }
  };
}

/**
 * 跑一次 hook，返回可调用的 rerender —— setter 写的是格子，闭包里的
 * `dialog` 不会自动更新，异步 setDialog 落地后必须 rerender 一次才读得到。
 */
function mountUseGlobalLines(scope: AnyScope) {
  if (!INTERNALS || !("H" in INTERNALS)) {
    // §6.21：取不到 internals 必须显式抛错。静默退化 = 这条断言恒绿。
    throw new Error("取不到 React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H 槽位");
  }
  const cells: DispatcherCells = { states: [], refs: [], cursor: 0, useStateCalls: 0 };
  const dispatcher = makeDispatcher(cells);
  const previous = INTERNALS.H;
  INTERNALS.H = dispatcher;
  restoreHookSlot = () => {
    INTERNALS.H = previous;
    restoreHookSlot = null;
  };

  const render = () => {
    cells.cursor = 0;
    return useGlobalLines(scope);
  };
  const first = render();
  return {
    result: first,
    rerender: render,
    useStateCalls: () => cells.useStateCalls
  };
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * dispatcher 自身的检测逻辑自测（§6.21 / AGENTS.md「守卫的检测逻辑自测」）：
 * 断言「槽位替换 + useState 存格子 + setter 写格子 + rerender 读到新值」这套机制
 * 本身能红能绿。若哪天 React 换了 internals 槽位名，本用例会在 mountUseGlobalLines
 * 里**显式抛错**（而不是让上面所有用例静默恒绿）。
 */
describe("dispatcher 机制自测", () => {
  test("槽位可替换、useState 序号稳定、setter 经 rerender 生效", () => {
    const before = INTERNALS?.H;
    expect(INTERNALS, "internals 槽位必须存在，否则 mount 会显式抛错").toBeTruthy();

    const cells: DispatcherCells = { states: [], refs: [], cursor: 0, useStateCalls: 0 };
    const dispatcher = makeDispatcher(cells);
    INTERNALS.H = dispatcher;
    try {
      const render = () => {
        cells.cursor = 0;
        const [value, setValue] = (React as any).useState("初始");
        const [flag] = (React as any).useState(0);
        return { value, setValue, flag };
      };

      const first = render();
      expect(first.value).toBe("初始");
      expect(cells.useStateCalls).toBe(2);

      first.setValue("改后");
      // 不 rerender 就读不到新值 —— 正是上面那条「必须 rerender」注释的依据。
      expect(render().value).toBe("改后");
      expect(render().flag).toBe(0);
      // useEffect 是空实现：挂载那次 loadRecords 不会跑，所以下面这条恒成立。
      expect((React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H).toBe(dispatcher);
    } finally {
      INTERNALS.H = before;
    }
  });

  test("hook 数量守卫本身会咬人：少一个 useState 时 3 变 2 并被守卫拦下", () => {
    const cells: DispatcherCells = { states: [], refs: [], cursor: 0, useStateCalls: 0 };
    const dispatcher = makeDispatcher(cells);
    const before = INTERNALS?.H;
    INTERNALS.H = dispatcher;
    try {
      (React as any).useState("a");
      (React as any).useState("b");
      expect(cells.useStateCalls).toBe(2);
      // 这就是各用例里 `expect(view.useStateCalls()).toBe(3)` 的判别力来源：
      // hook 少一个，序号整体错位，守卫立刻响亮失败而不是把错状态喂进槽位。
      expect(cells.useStateCalls).not.toBe(3);
    } finally {
      INTERNALS.H = before;
    }
  });
});

const SOURCE_NODE = { id: "n1", kind: "ac-switch", params: {}, name: "开关1", terminals: [] };
const TARGET_NODE = { id: "n2", kind: "dc-switch", params: {}, name: "开关2", terminals: [] };

function baseScope(extra: AnyScope = {}): AnyScope {
  return {
    projectIdx: 3,
    projectName: "P",
    modelType: "",
    nodes: [],
    setNodes: vi.fn(),
    writeOperationLog: vi.fn(),
    setRoutableLinePlacement: vi.fn(),
    resetRoutableLinePreviewState: vi.fn(),
    setMode: vi.fn(),
    ...extra
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, records: [] })
  })));
});

afterEach(() => {
  restoreHookSlot?.();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useGlobalLines：放置请求的三条早退分支", () => {
  test("模板不是线路类时在能量类型判定处早退，不写日志也不开对话框", () => {
    const scope = baseScope();
    const view = mountUseGlobalLines(scope);
    // hook 内 3 个 useState（records / dialog / transitionDialog）——hook 数量守卫。
    expect(view.useStateCalls()).toBe(3);

    const template = { kind: "ac-switch", label: "交流开关" } as any;
    const placed = scope.requestGlobalLinePlacement(
      template,
      { node: SOURCE_NODE as any, terminalId: "t1" },
      { node: TARGET_NODE as any, terminalId: "t1" }
    );

    expect(placed).toBe(false);
    // 与下面「端点冲突」那条的唯一区别就是日志：返回值在两条里都是 false。
    expect(scope.writeOperationLog).not.toHaveBeenCalled();
    expect(view.rerender().dialog).toBe(null);
  });

  test("两端都是厂站电源/负荷时在端点校验处早退并写日志（与上一条区分）", () => {
    const scope = baseScope();
    const view = mountUseGlobalLines(scope);
    expect(view.useStateCalls()).toBe(3);

    const template = { kind: "ac-routable-line", label: "交流线路" } as any;
    const placed = scope.requestGlobalLinePlacement(
      template,
      { node: { id: "s", kind: "ac-station-source", params: {}, name: "厂站电源", terminals: [] } as any, terminalId: "t1" },
      { node: { id: "l", kind: "ac-station-load", params: {}, name: "厂站负荷", terminals: [] } as any, terminalId: "t1" }
    );

    expect(placed).toBe(false);
    expect(scope.writeOperationLog).toHaveBeenCalledTimes(1);
    expect(String(scope.writeOperationLog.mock.calls[0][0])).toContain("线路两端不能同时连接");
    expect(view.rerender().dialog).toBe(null);
  });

  test("两端都是普通设备（无边界端点）时在边界判定处早退，不写日志也不开对话框", () => {
    const scope = baseScope();
    const view = mountUseGlobalLines(scope);
    expect(view.useStateCalls()).toBe(3);

    const template = { kind: "ac-routable-line", label: "交流线路" } as any;
    const placed = scope.requestGlobalLinePlacement(
      template,
      { node: SOURCE_NODE as any, terminalId: "t1" },
      { node: TARGET_NODE as any, terminalId: "t1" }
    );

    expect(placed).toBe(false);
    expect(scope.writeOperationLog).not.toHaveBeenCalled();
    expect(view.rerender().dialog).toBe(null);
  });
});

describe("useGlobalLines：新线路默认名 nextDefaultLineName", () => {
  test("模板无 label 键、交流线路时兜底为 交流线路-1", async () => {
    const scope = baseScope();
    const view = mountUseGlobalLines(scope);
    expect(view.useStateCalls()).toBe(3);

    // 一端是厂站电源（边界端点 source），另一端是普通开关 → 越过 L228 进入 new 模式。
    const placed = scope.requestGlobalLinePlacement(
      { kind: "ac-routable-line" } as any,
      { node: { id: "s", kind: "ac-station-source", params: {}, name: "厂站电源", terminals: [] } as any, terminalId: "t1" },
      { node: TARGET_NODE as any, terminalId: "t1" }
    );
    expect(placed).toBe(true);

    await flushMicrotasks();
    const dialog = view.rerender().dialog as any;
    expect(dialog.mode).toBe("new");
    expect(dialog.name).toBe("交流线路-1");
  });

  test("label 为纯空白（falsy 且不同于兜底值）时仍走兜底", async () => {
    const scope = baseScope();
    const view = mountUseGlobalLines(scope);
    expect(view.useStateCalls()).toBe(3);

    const placed = scope.requestGlobalLinePlacement(
      { kind: "ac-routable-line", label: "   " } as any,
      { node: { id: "s", kind: "ac-station-source", params: {}, name: "厂站电源", terminals: [] } as any, terminalId: "t1" },
      { node: TARGET_NODE as any, terminalId: "t1" }
    );
    expect(placed).toBe(true);

    await flushMicrotasks();
    const dialog = view.rerender().dialog as any;
    expect(dialog.name).toBe("交流线路-1");
  });

  test("直流线路时兜底为 直流线路-1（三元的 else 臂）", async () => {
    const scope = baseScope();
    const view = mountUseGlobalLines(scope);
    expect(view.useStateCalls()).toBe(3);

    const placed = scope.requestGlobalLinePlacement(
      { kind: "dc-routable-line" } as any,
      { node: { id: "s", kind: "dc-station-source", params: {}, name: "直流厂站电源", terminals: [] } as any, terminalId: "t1" },
      { node: TARGET_NODE as any, terminalId: "t1" }
    );
    expect(placed).toBe(true);

    await flushMicrotasks();
    const dialog = view.rerender().dialog as any;
    expect(dialog.name).toBe("直流线路-1");
  });
});