// 状态图标绘制的分组 id：前缀固定、后缀随机，供多选分组与整组拖拽使用。
import { describe, expect, test } from "vitest";

import { stateIconDrawingGroupId } from "./appExtracted/appDeviceDefinitionFactories";

const pt = (x: number, y: number) => ({ x, y });

describe("stateIconDrawingGroupId", () => {
  test("带固定前缀", () => {
    expect(stateIconDrawingGroupId()).toMatch(/^state-icon-group-/);
  });

  test("两次调用不同（随机后缀）", () => {
    const ids = new Set(Array.from({ length: 20 }, () => stateIconDrawingGroupId()));

    expect(ids.size).toBeGreaterThan(1);
  });

  test("后缀是 36 进制短串，不含小数点", () => {
    const suffix = stateIconDrawingGroupId().slice("state-icon-group-".length);

    expect(suffix).toMatch(/^[0-9a-z]+$/);
  });
});