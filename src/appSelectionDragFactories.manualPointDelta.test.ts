// createManualPointDeltaForEdge：整条边被平移时，手工/路由点该跟着平移多少。
// 两端都动 → 取两端位移的平均（避免两端不等时整条路径被拉长）；只有一端动 → 就是那一端的位移。
import { describe, expect, test } from "vitest";

import { createManualPointDeltaForEdge } from "./appExtracted/appSelectionDragFactories";

const pt = (x: number, y: number) => ({ x, y });

describe("createManualPointDeltaForEdge", () => {
  const deltaFor = createManualPointDeltaForEdge({});
  const edge = { id: "e1", sourceId: "n1", targetId: "n2" };

  test("两端都没动时返回 null", () => {
    expect(deltaFor(edge, {})).toBeNull();
  });

  test("只有源端动时用源端位移", () => {
    expect(deltaFor(edge, { n1: pt(10, 20) })).toEqual(pt(10, 20));
  });

  test("只有目标端动时用目标端位移", () => {
    expect(deltaFor(edge, { n2: pt(-5, 0) })).toEqual(pt(-5, 0));
  });

  test("两端同向同量时取平均等于原值", () => {
    expect(deltaFor(edge, { n1: pt(10, 10), n2: pt(10, 10) })).toEqual(pt(10, 10));
  });

  test("两端位移不同时取平均（不偏向任一端）", () => {
    expect(deltaFor(edge, { n1: pt(0, 0), n2: pt(10, 20) })).toEqual(pt(5, 10));
  });

  test("多出的无关节点位移不参与平均", () => {
    expect(deltaFor(edge, { n1: pt(10, 0), n2: pt(10, 0), n3: pt(100, 100) })).toEqual(pt(10, 0));
  });

  test("值为 0 的位移也是有效位移（不会被 filter 掉）", () => {
    // {x:0,y:0} 是真值，能通过 filter；结果仍为 0
    expect(deltaFor(edge, { n1: pt(0, 0) })).toEqual(pt(0, 0));
  });

  test("传入 null 值的位移被忽略", () => {
    expect(deltaFor(edge, { n1: null as any, n2: pt(4, 4) })).toEqual(pt(4, 4));
  });
});
