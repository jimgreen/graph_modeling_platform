// 连线 / 可布线路径的预览点解析：Shift 临时正交、Ctrl 上锁正交、其余原样。
// 三条容易写串的分支：
//  ① 没有放置状态时也要释放轴锁（否则上一次连接的锁会粘到下一次）；
//  ② Ctrl 分支用「上锁返回的轴」，锁不上时原样返回，不做约束；
//  ③ 参考点取不到时用连接源端点兜底（连线）/ 直接原样返回（可布线路径，两条路径不同）。
import { describe, expect, test, vi } from "vitest";

import {
  createResolveConnectPreviewPoint,
  createResolveRoutableLinePreviewPoint
} from "./appExtracted/appCanvasInteractionFactories";

const pt = (x: number, y: number) => ({ x, y });
const keys = (over: Partial<{ shiftKey: boolean; ctrlKey: boolean }> = {}) => ({ shiftKey: false, ctrlKey: false, ...over });

function createConnectScope(over: Record<string, any> = {}) {
  return {
    connectSource: { nodeId: "n1", terminalId: "t1" },
    connectSourceEndpointPoint: vi.fn(() => pt(0, 0)),
    connectPreviewAxisReferencePoint: vi.fn(() => null),
    lockConnectPreviewAxis: vi.fn(() => "x" as any),
    releaseConnectPreviewAxisLock: vi.fn(),
    constrainPointToOrthogonalAxis: vi.fn((_ref: any, p: any) => ({ x: p.x, y: 0 })),
    clampPointToCanvas: vi.fn((p: any) => p),
    ...over
  };
}

describe("createResolveConnectPreviewPoint", () => {
  const resolve = (scope: any) => createResolveConnectPreviewPoint(scope);

  test("无连接源：释放轴锁并原样返回", () => {
    const scope = createConnectScope({ connectSource: null });

    expect(resolve(scope)(pt(3, 4), keys())).toEqual(pt(3, 4));
    expect(scope.releaseConnectPreviewAxisLock).toHaveBeenCalled();
  });

  test("端点解析不出来时原样返回", () => {
    const scope = createConnectScope({ connectSourceEndpointPoint: vi.fn(() => null) });

    expect(resolve(scope)(pt(3, 4), keys({ shiftKey: true }))).toEqual(pt(3, 4));
    expect(scope.constrainPointToOrthogonalAxis).not.toHaveBeenCalled();
  });

  test("无修饰键：原样返回并释放锁", () => {
    const scope = createConnectScope();

    expect(resolve(scope)(pt(3, 4), keys())).toEqual(pt(3, 4));
    expect(scope.releaseConnectPreviewAxisLock).toHaveBeenCalled();
    expect(scope.constrainPointToOrthogonalAxis).not.toHaveBeenCalled();
  });

  test("Shift：相对参考点做正交约束", () => {
    const scope = createConnectScope();

    const result = resolve(scope)(pt(3, 4), keys({ shiftKey: true }));

    // 参考点缺省时回落到连接源端点 (0,0)
    expect(scope.constrainPointToOrthogonalAxis).toHaveBeenCalledWith(pt(0, 0), pt(3, 4));
    expect(result).toEqual(pt(3, 0));
  });

  test("Shift 且已有参考点时用参考点而非端点", () => {
    const scope = createConnectScope({ connectPreviewAxisReferencePoint: vi.fn(() => pt(9, 9)) });

    resolve(scope)(pt(3, 4), keys({ shiftKey: true }));

    expect(scope.constrainPointToOrthogonalAxis).toHaveBeenCalledWith(pt(9, 9), pt(3, 4));
  });

  test("Shift 结果会被夹到画布内", () => {
    const scope = createConnectScope({ clampPointToCanvas: vi.fn(() => pt(-999, -999)) });

    expect(resolve(scope)(pt(3, 4), keys({ shiftKey: true }))).toEqual(pt(-999, -999));
  });

  test("Ctrl：按上锁的轴约束，且不释放锁", () => {
    const scope = createConnectScope({ lockConnectPreviewAxis: vi.fn(() => "y" as any) });

    const result = resolve(scope)(pt(3, 4), keys({ ctrlKey: true }));

    expect(scope.lockConnectPreviewAxis).toHaveBeenCalledWith(pt(3, 4));
    expect(scope.constrainPointToOrthogonalAxis).toHaveBeenCalledWith(pt(0, 0), pt(3, 4), "y");
    expect(result).toEqual(pt(3, 0));
    expect(scope.releaseConnectPreviewAxisLock).not.toHaveBeenCalled();
  });

  test("Ctrl 上锁失败时原样返回，不做约束", () => {
    const scope = createConnectScope({ lockConnectPreviewAxis: vi.fn(() => null) });

    expect(resolve(scope)(pt(3, 4), keys({ ctrlKey: true }))).toEqual(pt(3, 4));
    expect(scope.constrainPointToOrthogonalAxis).not.toHaveBeenCalled();
  });

  test("Ctrl 优先于 Shift", () => {
    const scope = createConnectScope();

    resolve(scope)(pt(3, 4), keys({ ctrlKey: true, shiftKey: true }));

    expect(scope.lockConnectPreviewAxis).toHaveBeenCalled();
    expect(scope.releaseConnectPreviewAxisLock).not.toHaveBeenCalled();
  });
});

describe("createResolveRoutableLinePreviewPoint", () => {
  const resolve = (scope: any) => createResolveRoutableLinePreviewPoint(scope);

  function createScope(over: Record<string, any> = {}) {
    return {
      routableLinePlacement: { source: { node: { id: "n1" }, terminalId: "t1" } },
      routableLinePreviewAxisReferencePoint: vi.fn(() => pt(0, 0)),
      lockRoutableLinePreviewAxis: vi.fn(() => "x" as any),
      releaseRoutableLinePreviewAxisLock: vi.fn(),
      constrainPointToOrthogonalAxis: vi.fn((_ref: any, p: any) => ({ x: 0, y: p.y })),
      clampPointToCanvas: vi.fn((p: any) => p),
      ...over
    };
  }

  test("无放置源：释放锁并原样返回", () => {
    const scope = createScope({ routableLinePlacement: null });

    expect(resolve(scope)(pt(3, 4), keys())).toEqual(pt(3, 4));
    expect(scope.releaseRoutableLinePreviewAxisLock).toHaveBeenCalled();
  });

  test("放置源存在但没有 source 时按无放置处理", () => {
    const scope = createScope({ routableLinePlacement: {} });

    expect(resolve(scope)(pt(3, 4), keys())).toEqual(pt(3, 4));
    expect(scope.releaseRoutableLinePreviewAxisLock).toHaveBeenCalled();
  });

  test("无参考点时原样返回（与连线路径不同：这里不回落）", () => {
    const scope = createScope({ routableLinePreviewAxisReferencePoint: vi.fn(() => null) });

    expect(resolve(scope)(pt(3, 4), keys({ shiftKey: true }))).toEqual(pt(3, 4));
    expect(scope.constrainPointToOrthogonalAxis).not.toHaveBeenCalled();
  });

  test("无修饰键：原样返回并释放锁", () => {
    const scope = createScope();

    expect(resolve(scope)(pt(3, 4), keys())).toEqual(pt(3, 4));
    expect(scope.releaseRoutableLinePreviewAxisLock).toHaveBeenCalled();
  });

  test("Shift：按参考点约束", () => {
    const scope = createScope();

    expect(resolve(scope)(pt(3, 4), keys({ shiftKey: true }))).toEqual(pt(0, 4));
    expect(scope.constrainPointToOrthogonalAxis).toHaveBeenCalledWith(pt(0, 0), pt(3, 4));
  });

  test("Ctrl：按上锁的轴约束", () => {
    const scope = createScope({ lockRoutableLinePreviewAxis: vi.fn(() => "y" as any) });

    expect(resolve(scope)(pt(3, 4), keys({ ctrlKey: true }))).toEqual(pt(0, 4));
    expect(scope.constrainPointToOrthogonalAxis).toHaveBeenCalledWith(pt(0, 0), pt(3, 4), "y");
  });

  test("Ctrl 上锁失败时原样返回", () => {
    const scope = createScope({ lockRoutableLinePreviewAxis: vi.fn(() => null) });

    expect(resolve(scope)(pt(3, 4), keys({ ctrlKey: true }))).toEqual(pt(3, 4));
  });

  test("Ctrl 优先于 Shift", () => {
    const scope = createScope();

    resolve(scope)(pt(3, 4), keys({ ctrlKey: true, shiftKey: true }));

    expect(scope.lockRoutableLinePreviewAxis).toHaveBeenCalled();
    expect(scope.releaseRoutableLinePreviewAxisLock).not.toHaveBeenCalled();
  });
});
