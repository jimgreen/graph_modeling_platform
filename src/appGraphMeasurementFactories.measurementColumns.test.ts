// computeMeasurementColumnPositions：量测框内一列（标签/值/单位）的三段 x 分界。
// 纯算术，但列序号偏移最容易写错（-width/2 起、列间距两段），三条都要钉死。
import { describe, expect, test } from "vitest";

import { computeMeasurementColumnPositions } from "./appExtracted/appGraphMeasurementFactories";

const metrics = (columnMetrics: Array<{ labelWidth: number; valueWidth: number; unitWidth: number }>) => ({
  width: 200,
  columnWidth: 100,
  columnMetrics,
  interColumnGap: 4
});

describe("computeMeasurementColumnPositions", () => {
  test("第 0 列从 -width/2 起，标签宽度直接推进", () => {
    const result = computeMeasurementColumnPositions(metrics([{ labelWidth: 20, valueWidth: 30, unitWidth: 5 }]), 0);

    expect(result.labelEndX).toBe(-100 + 20);
    expect(result.valueEndX).toBe(-100 + 20 + 4 + 30);
    expect(result.unitStartX).toBe(-100 + 20 + 4 + 30 + 4);
  });

  test("第 1 列整体右移一个 columnWidth", () => {
    const first = computeMeasurementColumnPositions(
      metrics([{ labelWidth: 20, valueWidth: 30, unitWidth: 5 }, { labelWidth: 20, valueWidth: 30, unitWidth: 5 }]),
      0
    );
    const second = computeMeasurementColumnPositions(
      metrics([{ labelWidth: 20, valueWidth: 30, unitWidth: 5 }, { labelWidth: 20, valueWidth: 30, unitWidth: 5 }]),
      1
    );

    expect(second.labelEndX - first.labelEndX).toBe(100);
  });

  test("两列宽度不同时各用自己的 columnMetric", () => {
    const m = metrics([
      { labelWidth: 10, valueWidth: 10, unitWidth: 0 },
      { labelWidth: 40, valueWidth: 60, unitWidth: 0 }
    ]);

    expect(computeMeasurementColumnPositions(m, 1)).toEqual({
      labelEndX: -100 + 100 + 40,
      valueEndX: -100 + 100 + 40 + 4 + 60,
      unitStartX: -100 + 100 + 40 + 4 + 60 + 4
    });
  });

  test("unitWidth 不参与三段分界（只影响列总宽）", () => {
    const narrow = computeMeasurementColumnPositions(metrics([{ labelWidth: 10, valueWidth: 10, unitWidth: 0 }]), 0);
    const wide = computeMeasurementColumnPositions(metrics([{ labelWidth: 10, valueWidth: 10, unitWidth: 99 }]), 0);

    expect(narrow).toEqual(wide);
  });
});
