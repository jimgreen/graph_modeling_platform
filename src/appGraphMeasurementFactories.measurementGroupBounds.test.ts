// createIncludeMeasurementGroupBounds：把节点的量测组包围盒喂给视口 includeBox 回调。
// 关键：metrics 为 null（组不可见 / 无可显示行）的组必须被跳过，否则会把 {0,0} 尺寸的假盒子算进视口。
import { describe, expect, test, vi } from "vitest";

import { createIncludeMeasurementGroupBounds } from "./appExtracted/appGraphMeasurementFactories";

const node = { id: "n1" };

function createScope(groups: any[], metricsByGroup: Map<any, any>) {
  return {
    projectMeasurements: { groups: [] },
    measurementGroupsForNode: vi.fn(() => groups),
    measurementGroupRenderMetrics: vi.fn((_n: any, g: any) => metricsByGroup.get(g) ?? null),
    measurementGroupCanvasPosition: vi.fn(() => ({ x: 100, y: 200 }))
  };
}

describe("createIncludeMeasurementGroupBounds", () => {
  test("按 position 与 metrics 尺寸算出居中盒子", () => {
    const group = { id: "g1" };
    const scope = createScope([group], new Map([[group, { width: 60, height: 20 }]]));
    const includeBox = vi.fn();

    createIncludeMeasurementGroupBounds(scope)(node as any, includeBox);

    expect(includeBox).toHaveBeenCalledWith({ left: 70, right: 130, top: 190, bottom: 210 });
  });

  test("metrics 为 null 的组被跳过", () => {
    const shown = { id: "g1" };
    const hidden = { id: "g2" };
    const scope = createScope([hidden, shown], new Map([[shown, { width: 10, height: 10 }]]));
    const includeBox = vi.fn();

    createIncludeMeasurementGroupBounds(scope)(node as any, includeBox);

    expect(includeBox).toHaveBeenCalledTimes(1);
  });

  test("全部组都不可见时一次都不调 includeBox", () => {
    const scope = createScope([{ id: "g1" }], new Map());
    const includeBox = vi.fn();

    createIncludeMeasurementGroupBounds(scope)(node as any, includeBox);

    expect(includeBox).not.toHaveBeenCalled();
  });

  test("节点没有量测组时一次都不调 includeBox", () => {
    const scope = createScope([], new Map());
    const includeBox = vi.fn();

    createIncludeMeasurementGroupBounds(scope)(node as any, includeBox);

    expect(scope.measurementGroupsForNode).toHaveBeenCalledWith(scope.projectMeasurements, "n1");
    expect(includeBox).not.toHaveBeenCalled();
  });

  test("多组各交一个盒子", () => {
    const a = { id: "ga" };
    const b = { id: "gb" };
    const scope = createScope([a, b], new Map([[a, { width: 10, height: 10 }], [b, { width: 20, height: 20 }]]));
    const includeBox = vi.fn();

    createIncludeMeasurementGroupBounds(scope)(node as any, includeBox);

    expect(includeBox).toHaveBeenCalledTimes(2);
  });
});
