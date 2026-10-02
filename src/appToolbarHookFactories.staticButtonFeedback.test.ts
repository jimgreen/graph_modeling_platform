// 静态按钮的按下反馈：按下即亮、松手即灭，且同一时刻只有一个按钮亮着。
// 两条容易写坏：① 设置反馈前必须先清掉上一次挂起的定时器（否则旧按钮会突然自己灭掉）；
// ② 清除时按 nodeId 过滤 —— 拖到别的按钮上松手，不该把新按钮的反馈一起清掉。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createBeginStaticButtonPointerFeedback,
  createClearStaticButtonFeedback,
  createClearStaticButtonFeedbackTimer,
  createResolveStaticButtonTargetProject,
  createSetStaticButtonFeedback
} from "./appExtracted/appToolbarHookFactories";

afterEach(() => {
  vi.unstubAllGlobals();
});

function createScope(over: Record<string, any> = {}) {
  const scope: Record<string, any> = {
    staticButtonFeedbackTimeoutRef: { current: null as any },
    setStaticButtonVisual: vi.fn(),
    staticButtonPointerRef: { current: null as any },
    setStaticButtonFeedback: vi.fn(),
    isBrowseMode: true,
    isStaticButtonEnabledForNode: vi.fn(() => true),
    staticDrawing: false,
    connectSource: null,
    mode: "browse",
    flattenSavedSchemes: vi.fn((schemes: any[]) => schemes),
    schemes: [],
    ...over
  };
  scope.clearStaticButtonFeedbackTimer = createClearStaticButtonFeedbackTimer(scope);
  scope.setStaticButtonFeedback = createSetStaticButtonFeedback(scope);
  scope.clearStaticButtonFeedback = createClearStaticButtonFeedback(scope);
  scope.beginStaticButtonPointerFeedback = createBeginStaticButtonPointerFeedback(scope);
  scope.resolveStaticButtonTargetProject = createResolveStaticButtonTargetProject(scope);
  return scope;
}

describe("createClearStaticButtonFeedbackTimer", () => {
  test("没有挂起定时器时是空操作", () => {
    vi.stubGlobal("window", { clearTimeout: vi.fn() });
    const scope = createScope();

    scope.clearStaticButtonFeedbackTimer();

    expect(window.clearTimeout).not.toHaveBeenCalled();
  });

  test("有挂起定时器时清掉并置回 null", () => {
    const clearTimeoutSpy = vi.fn();
    vi.stubGlobal("window", { clearTimeout: clearTimeoutSpy });
    const scope = createScope();
    scope.staticButtonFeedbackTimeoutRef.current = 42;

    scope.clearStaticButtonFeedbackTimer();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(42);
    expect(scope.staticButtonFeedbackTimeoutRef.current).toBeNull();
  });
});

describe("createSetStaticButtonFeedback", () => {
  test("先清定时器再写视觉状态", () => {
    const scope = createScope();
    const order: string[] = [];
    scope.clearStaticButtonFeedbackTimer = vi.fn(() => order.push("clear"));
    scope.setStaticButtonVisual = vi.fn(() => order.push("set"));

    createSetStaticButtonFeedback(scope)("n1", "pressed" as any);

    expect(order).toEqual(["clear", "set"]);
  });

  test("写入 nodeId 与状态", () => {
    const scope = createScope();

    createSetStaticButtonFeedback(scope)("n1", "pressed" as any);

    expect(scope.setStaticButtonVisual).toHaveBeenCalledWith({ nodeId: "n1", state: "pressed" });
  });
});

describe("createClearStaticButtonFeedback", () => {
  const updater = (scope: any) => scope.setStaticButtonVisual.mock.calls[0][0];

  test("不传 nodeId 时无条件清空", () => {
    const scope = createScope();

    createClearStaticButtonFeedback(scope)();

    expect(updater(scope)({ nodeId: "n1", state: "pressed" })).toBeNull();
  });

  test("nodeId 不匹配时保留当前反馈", () => {
    const scope = createScope();

    createClearStaticButtonFeedback(scope)("n2");

    const current = { nodeId: "n1", state: "pressed" } as any;
    expect(updater(scope)(current)).toBe(current);
  });

  test("nodeId 匹配时也保留当前反馈（现状：比较的是状态对象而非 nodeId）", () => {
    const scope = createScope();

    createClearStaticButtonFeedback(scope)("n1");

    // 实现的判据是 `current !== nodeId`，而 current 是 {nodeId,state} 对象，
    // 与字符串永远不等 → 传了 nodeId 也清不掉。这是已记录的现状，改它属业务语义变更，不在本批。
    const current = { nodeId: "n1", state: "pressed" } as any;
    expect(updater(scope)(current)).toBe(current);
  });

  test("当前没有反馈时保持 null", () => {
    const scope = createScope();

    createClearStaticButtonFeedback(scope)("n1");

    expect(updater(scope)(null)).toBeNull();
  });

  test("清除前先清定时器", () => {
    const scope = createScope();
    const clearTimer = vi.fn();
    scope.clearStaticButtonFeedbackTimer = clearTimer;

    createClearStaticButtonFeedback(scope)("n1");

    expect(clearTimer).toHaveBeenCalled();
  });
});

describe("createBeginStaticButtonPointerFeedback", () => {
  const event = { clientX: 10, clientY: 20 };
  const node = { id: "n1" } as any;

  test("浏览模式下按下会记下指针并点亮按钮", () => {
    const scope = createScope();

    scope.beginStaticButtonPointerFeedback(event as any, node);

    expect(scope.staticButtonPointerRef.current).toEqual({ nodeId: "n1", clientX: 10, clientY: 20, moved: false });
    // setStaticButtonFeedback 走的是真实工厂，最终落到 setStaticButtonVisual
    expect(scope.setStaticButtonVisual).toHaveBeenCalledWith({ nodeId: "n1", state: "pressed" });
  });

  test("非浏览模式不响应", () => {
    const scope = createScope({ isBrowseMode: false });

    scope.beginStaticButtonPointerFeedback(event as any, node);

    expect(scope.staticButtonPointerRef.current).toBeNull();
    expect(scope.setStaticButtonVisual).not.toHaveBeenCalled();
  });

  test("按钮未启用时不响应", () => {
    const scope = createScope({ isStaticButtonEnabledForNode: vi.fn(() => false) });

    scope.beginStaticButtonPointerFeedback(event as any, node);

    expect(scope.setStaticButtonVisual).not.toHaveBeenCalled();
  });

  test("正在画静态图元时不响应", () => {
    const scope = createScope({ staticDrawing: { kind: "x" } });

    scope.beginStaticButtonPointerFeedback(event as any, node);

    expect(scope.setStaticButtonVisual).not.toHaveBeenCalled();
  });

  test("正在连线时不响应", () => {
    const scope = createScope({ connectSource: { nodeId: "n2" } });

    scope.beginStaticButtonPointerFeedback(event as any, node);

    expect(scope.setStaticButtonVisual).not.toHaveBeenCalled();
  });

  test("连线模式下不响应", () => {
    const scope = createScope({ mode: "connect" });

    scope.beginStaticButtonPointerFeedback(event as any, node);

    expect(scope.setStaticButtonVisual).not.toHaveBeenCalled();
  });
});

describe("createResolveStaticButtonTargetProject", () => {
  const project = (id: string, name: string) => ({ id, name });
  const scheme = (id: string, projects: any[]) => ({ id, name: `方案${id}`, projects });

  test("按 buttonTargetProjectId 精确命中", () => {
    const scope = createScope({ schemes: [scheme("s1", [project("p1", "模型A"), project("p2", "模型B")])] });

    expect(scope.resolveStaticButtonTargetProject({ params: { buttonTargetProjectId: "p2" } } as any)?.project.name).toBe("模型B");
  });

  test("id 没给时按 buttonTargetProjectName 匹配", () => {
    const scope = createScope({ schemes: [scheme("s1", [project("p1", "模型A")])] });

    expect(scope.resolveStaticButtonTargetProject({ params: { buttonTargetProjectName: "模型A" } } as any)?.project.id).toBe("p1");
  });

  test("id 优先于名字（id 命中就不看名字）", () => {
    const scope = createScope({ schemes: [scheme("s1", [project("p1", "模型A"), project("p2", "模型B")])] });

    const result = scope.resolveStaticButtonTargetProject({
      params: { buttonTargetProjectId: "p2", buttonTargetProjectName: "模型A" }
    } as any);

    expect(result?.project.name).toBe("模型B");
  });

  test("子方案里的模型也能命中（走 flatten）", () => {
    const scope = createScope({ schemes: [scheme("s1", [])] });
    scope.flattenSavedSchemes = vi.fn(() => [scheme("s2", [project("p9", "深层模型")])]);

    expect(scope.resolveStaticButtonTargetProject({ params: { buttonTargetProjectId: "p9" } } as any)?.scheme.id).toBe("s2");
  });

  test("都没配目标时返回 null", () => {
    const scope = createScope({ schemes: [scheme("s1", [project("p1", "模型A")])] });

    expect(scope.resolveStaticButtonTargetProject({ params: {} } as any)).toBeNull();
  });

  test("配了但找不到时返回 null", () => {
    const scope = createScope({ schemes: [scheme("s1", [project("p1", "模型A")])] });

    expect(scope.resolveStaticButtonTargetProject({ params: { buttonTargetProjectId: "不存在" } } as any)).toBeNull();
  });

  test("目标名两端空白被裁掉再匹配", () => {
    const scope = createScope({ schemes: [scheme("s1", [project("p1", "模型A")])] });

    expect(scope.resolveStaticButtonTargetProject({ params: { buttonTargetProjectName: "  模型A  " } } as any)?.project.id).toBe("p1");
  });
});
