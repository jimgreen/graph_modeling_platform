// 连线 / 可布线路径的轴锁：按住 Ctrl 时把预览锁到主正交轴，松开即释放。
// 锁的粒度是「同一个源节点 + 同一个端子」——换源就重新判轴，否则上一次的方向会粘到下一次连接上。
import { describe, expect, test, vi } from "vitest";

import {
  createConnectSourceEndpointPoint,
  createLockConnectPreviewAxis,
  createLockRoutableLinePreviewAxis,
  createReleaseConnectPreviewAxisLock,
  createReleaseRoutableLinePreviewAxisLock
} from "./appExtracted/appCanvasInteractionFactories";

const pt = (x: number, y: number) => ({ x, y });

/** 主轴：位移大的那个方向即主轴。 */
const primaryOrthogonalAxis = (from: any, to: any) => (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? "x" : "y");

function createLockScope(over: Record<string, any> = {}) {
  return {
    primaryOrthogonalAxis,
    connectSource: { nodeId: "n1", terminalId: "t1" },
    connectPreviewAxisReferencePoint: vi.fn(() => pt(0, 0)),
    connectPreviewAxisLockRef: { current: null as any },
    routableLinePlacement: { source: { node: { id: "n1" }, terminalId: "t1" } },
    routableLinePreviewAxisReferencePoint: vi.fn(() => pt(0, 0)),
    routableLinePreviewAxisLockRef: { current: null as any },
    ...over
  };
}

describe("createLockConnectPreviewAxis", () => {
  test("无连接源时返回 null", () => {
    expect(createLockConnectPreviewAxis(createLockScope({ connectSource: null }))(pt(10, 0))).toBeNull();
  });

  test("无参考点时返回 null 且不上锁", () => {
    const scope = createLockScope({ connectPreviewAxisReferencePoint: vi.fn(() => null) });

    expect(createLockConnectPreviewAxis(scope)(pt(10, 0))).toBeNull();
    expect(scope.connectPreviewAxisLockRef.current).toBeNull();
  });

  test("位移与参考点重合时返回 null（无从判轴）", () => {
    const scope = createLockScope();

    expect(createLockConnectPreviewAxis(scope)(pt(0, 0))).toBeNull();
    expect(scope.connectPreviewAxisLockRef.current).toBeNull();
  });

  test("按主轴上锁并记录源", () => {
    const scope = createLockScope();

    expect(createLockConnectPreviewAxis(scope)(pt(30, 5))).toBe("x");
    expect(scope.connectPreviewAxisLockRef.current).toEqual({ axis: "x", nodeId: "n1", terminalId: "t1" });
  });

  test("同一源重复调用直接返回已锁的轴（不重判）", () => {
    const scope = createLockScope();
    const lock = createLockPreviewAxisAlias(scope);

    lock(pt(30, 5));
    const primaryOrthogonalAxisSpy = scope.primaryOrthogonalAxis;
    expect(lock(pt(0, 40))).toBe("x");
    expect(primaryOrthogonalAxisSpy).toBe(primaryOrthogonalAxis);
    expect(scope.connectPreviewAxisLockRef.current.axis).toBe("x");
  });

  test("换端子后重新判轴", () => {
    const scope = createLockScope();
    const lock = createLockConnectPreviewAxis(scope);

    lock(pt(30, 5));
    scope.connectSource = { nodeId: "n1", terminalId: "t2" };

    expect(lock(pt(0, 40))).toBe("y");
  });

  test("换节点后重新判轴", () => {
    const scope = createLockScope();
    const lock = createLockConnectPreviewAxis(scope);

    lock(pt(30, 5));
    scope.connectSource = { nodeId: "n2", terminalId: "t1" };

    expect(lock(pt(0, 40))).toBe("y");
  });

  test("释放后清空锁", () => {
    const scope = createLockScope();
    createLockConnectPreviewAxis(scope)(pt(30, 5));

    createReleaseConnectPreviewAxisLock(scope)();

    expect(scope.connectPreviewAxisLockRef.current).toBeNull();
  });

  test("重复释放是空操作", () => {
    const scope = createLockScope();

    expect(() => createReleaseConnectPreviewAxisLock(scope)()).not.toThrow();
  });
});

/** 语义别名，读起来更贴近用例语义。 */
function createLockPreviewAxisAlias(scope: any) {
  return createLockConnectPreviewAxis(scope);
}

describe("createLockRoutableLinePreviewAxis", () => {
  test("无放置源时返回 null", () => {
    expect(createLockRoutableLinePreviewAxis(createLockScope({ routableLinePlacement: null }))(pt(10, 0))).toBeNull();
  });

  test("无参考点时返回 null", () => {
    const scope = createLockScope({ routableLinePreviewAxisReferencePoint: vi.fn(() => null) });

    expect(createLockRoutableLinePreviewAxis(scope)(pt(10, 0))).toBeNull();
  });

  test("位移重合时返回 null", () => {
    expect(createLockRoutableLinePreviewAxis(createLockScope())(pt(0, 0))).toBeNull();
  });

  test("按主轴上锁并记录源节点与端子", () => {
    const scope = createLockScope();

    expect(createLockRoutableLinePreviewAxis(scope)(pt(0, 40))).toBe("y");
    expect(scope.routableLinePreviewAxisLockRef.current).toEqual({ axis: "y", nodeId: "n1", terminalId: "t1" });
  });

  test("同一源重复调用返回已锁的轴", () => {
    const scope = createLockScope();
    const lock = createLockRoutableLinePreviewAxis(scope);

    lock(pt(0, 40));

    expect(lock(pt(50, 0))).toBe("y");
  });

  test("换源后重新判轴", () => {
    const scope = createLockScope();
    const lock = createLockRoutableLinePreviewAxis(scope);

    lock(pt(0, 40));
    scope.routableLinePlacement = { source: { node: { id: "n2" }, terminalId: "t1" } };

    expect(lock(pt(50, 0))).toBe("x");
  });

  test("释放后清空锁", () => {
    const scope = createLockScope();
    createLockRoutableLinePreviewAxis(scope)(pt(30, 5));

    createReleaseRoutableLinePreviewAxisLock(scope)();

    expect(scope.routableLinePreviewAxisLockRef.current).toBeNull();
  });
});

describe("createConnectSourceEndpointPoint", () => {
  test("无连接源时返回 null", () => {
    expect(createConnectSourceEndpointPoint({ connectSource: null })()).toBeNull();
  });

  test("源节点不可见时返回 null", () => {
    const scope = { connectSource: { nodeId: "n1", terminalId: "t1" }, visibleNodeById: new Map(), getModelEdgeEndpointPoint: vi.fn() };

    expect(createConnectSourceEndpointPoint(scope)()).toBeNull();
  });

  test("显式点优先", () => {
    const scope = {
      connectSource: { nodeId: "n1", terminalId: "t1", point: pt(5, 6) },
      visibleNodeById: new Map([["n1", { id: "n1" }]]),
      getModelEdgeEndpointPoint: vi.fn(() => pt(1, 1))
    };

    expect(createConnectSourceEndpointPoint(scope)()).toEqual(pt(5, 6));
    expect(scope.getModelEdgeEndpointPoint).not.toHaveBeenCalled();
  });

  test("无显式点时按端子解析端点", () => {
    const scope = {
      connectSource: { nodeId: "n1", terminalId: "t1" },
      visibleNodeById: new Map([["n1", { id: "n1" }]]),
      getModelEdgeEndpointPoint: vi.fn(() => pt(1, 1))
    };

    expect(createConnectSourceEndpointPoint(scope)()).toEqual(pt(1, 1));
    expect(scope.getModelEdgeEndpointPoint).toHaveBeenCalledWith({ id: "n1" }, undefined, "t1");
  });
});
