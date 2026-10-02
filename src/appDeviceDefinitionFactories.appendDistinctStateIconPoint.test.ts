// 状态图标折线的点集追加。两条语义要分开：
//  ① 新点先被夹进画布（0..240 / 0..160），再判重；
//  ② 与末点「几乎重合」（< 0.01）时只夹不追加，避免拖出零长线段。
import { describe, expect, test } from "vitest";

import { appendDistinctStateIconDrawingPoint } from "./appExtracted/appDeviceDefinitionFactories";

const pt = (x: number, y: number) => ({ x, y });

describe("appendDistinctStateIconDrawingPoint", () => {
  test("空点集直接追加", () => {
    expect(appendDistinctStateIconDrawingPoint([], pt(10, 10))).toEqual([pt(10, 10)]);
  });

  test("与末点不同则追加", () => {
    expect(appendDistinctStateIconDrawingPoint([pt(0, 0)], pt(10, 0))).toHaveLength(2);
  });

  test("与末点完全重合时不追加", () => {
    expect(appendDistinctStateIconDrawingPoint([pt(10, 10)], pt(10, 10))).toHaveLength(1);
  });

  test("与末点差 0.009 视为重合（阈值 0.01）", () => {
    expect(appendDistinctStateIconDrawingPoint([pt(10, 10)], pt(10.009, 10))).toHaveLength(1);
  });

  test("与末点差 0.011 视为不同点", () => {
    expect(appendDistinctStateIconDrawingPoint([pt(10, 10)], pt(10.011, 10))).toHaveLength(2);
  });

  test("只与末点比较，中间重合不影响", () => {
    const points = [pt(0, 0), pt(10, 10)];

    expect(appendDistinctStateIconDrawingPoint(points, pt(0, 0))).toHaveLength(3);
  });

  test("越界坐标被夹进画布", () => {
    expect(appendDistinctStateIconDrawingPoint([], pt(-50, 999))).toEqual([pt(0, 160)]);
  });

  test("已有的越界点也会被夹（不只夹新点）", () => {
    const result = appendDistinctStateIconDrawingPoint([pt(-50, -50)], pt(10, 10));

    expect(result[0]).toEqual(pt(0, 0));
  });

  test("夹后与末点重合时仍不追加", () => {
    // 新点 x=300 被夹到 240，与已有的 240 重合
    expect(appendDistinctStateIconDrawingPoint([pt(240, 80)], pt(300, 80))).toHaveLength(1);
  });

  test("不改动传入的数组", () => {
    const points = [pt(0, 0)];

    appendDistinctStateIconDrawingPoint(points, pt(50, 50));

    expect(points).toEqual([pt(0, 0)]);
  });
});
