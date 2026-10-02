// 设备状态视觉 / 状态定义 / 是否允许缩放：三者都是「按 kind 查模板，查不到走各自兜底」。
// 兜底路径各不相同（null / 空数组 / 内置默认），混起来最容易写串。
import { describe, expect, test, vi } from "vitest";

import {
  createNodeKindAllowsResizeTransform,
  createResolveNodeStateVisual,
  createStatusStatesForNode
} from "./appExtracted/appGraphMeasurementFactories";

const template = { kind: "ac-breaker" };

function createScope() {
  const libraryTemplateByKind = new Map<string, any>([["ac-breaker", template]]);
  return {
    libraryTemplateByKind,
    resolveDeviceStateVisual: vi.fn(() => ({ state: "closed" })),
    getTemplateStateDefinitions: vi.fn(() => [{ value: "closed" }, { value: "open" }]),
    templateAllowsResizeTransform: vi.fn(() => true),
    defaultAllowsResizeTransformForKind: vi.fn(() => false)
  };
}

describe("createResolveNodeStateVisual", () => {
  test("kind 命中模板时委托给 resolveDeviceStateVisual", () => {
    const scope = createScope();

    expect(createResolveNodeStateVisual(scope)({ kind: "ac-breaker" } as any)).toEqual({ state: "closed" });
    expect(scope.resolveDeviceStateVisual).toHaveBeenCalledWith(template, { kind: "ac-breaker" });
  });

  test("kind 未命中模板时返回 null 且不委托", () => {
    const scope = createScope();

    expect(createResolveNodeStateVisual(scope)({ kind: "未知" } as any)).toBeNull();
    expect(scope.resolveDeviceStateVisual).not.toHaveBeenCalled();
  });
});

describe("createStatusStatesForNode", () => {
  test("命中模板时返回该模板的状态定义", () => {
    const scope = createScope();

    expect(createStatusStatesForNode(scope)({ kind: "ac-breaker" } as any)).toEqual([{ value: "closed" }, { value: "open" }]);
  });

  test("node 为 undefined 时返回空数组（不查模板）", () => {
    const scope = createScope();

    expect(createStatusStatesForNode(scope)(undefined)).toEqual([]);
    expect(scope.getTemplateStateDefinitions).not.toHaveBeenCalled();
  });

  test("kind 未命中模板时返回空数组", () => {
    const scope = createScope();

    expect(createStatusStatesForNode(scope)({ kind: "未知" } as any)).toEqual([]);
  });
});

describe("createNodeKindAllowsResizeTransform", () => {
  test("命中模板时用模板自己的判定", () => {
    const scope = createScope();

    expect(createNodeKindAllowsResizeTransform(scope)("ac-breaker")).toBe(true);
    expect(scope.defaultAllowsResizeTransformForKind).not.toHaveBeenCalled();
  });

  test("未命中模板时退回按 kind 的内置默认", () => {
    const scope = createScope();

    expect(createNodeKindAllowsResizeTransform(scope)("未知")).toBe(false);
    expect(scope.defaultAllowsResizeTransformForKind).toHaveBeenCalledWith("未知");
  });

  test("模板判定为 false 时不被内置默认覆盖", () => {
    const scope = createScope();
    scope.templateAllowsResizeTransform = vi.fn(() => false);

    expect(createNodeKindAllowsResizeTransform(scope)("ac-breaker")).toBe(false);
  });
});
