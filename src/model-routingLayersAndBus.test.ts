// model-routing 里三处此前零断言的纯函数：图层排序、方案同级名、母线中心线投影。
// 三者都不抛异常，判错的后果分别是「节点画在错误的层序上」「重名校验拿错同级集合」
// 「连线端点落到母线实体之外」，属静默算错一类。
import { describe, expect, test } from "vitest";

import {
  orderNodesByModelLayer,
  projectPointToBusCenterlineIfInRange,
  projectPointToBusCenterlineUninset,
  savedSchemeSiblingNames
} from "./model-routing";
import type { ModelLayer, ModelNode, SavedSchemeRecord } from "./model";

const node = (id: string, layerId?: string) => ({ id, name: id, layerId }) as unknown as ModelNode;
const layer = (id: string): ModelLayer => ({ id, name: id }) as ModelLayer;
const ids = (nodes: readonly ModelNode[]) => nodes.map((item) => item.id);

describe("orderNodesByModelLayer", () => {
  const layers = [layer("base"), layer("L1"), layer("L2")];

  test("按 layers 声明顺序重排，层内保持原序（稳定）", () => {
    expect(ids(orderNodesByModelLayer([node("a", "L2"), node("b", "base"), node("c", "L1")], layers)))
      .toEqual(["b", "c", "a"]);
    // 同层节点的相对次序不变
    expect(ids(orderNodesByModelLayer([node("a1", "L1"), node("b", "base"), node("a2", "L1")], layers)))
      .toEqual(["b", "a1", "a2"]);
  });

  test("已是层序时原数组原样返回（同一引用，不复制）", () => {
    const ordered = [node("b", "base"), node("a", "L1")];
    expect(orderNodesByModelLayer(ordered, layers)).toBe(ordered);
  });

  test("少于 2 个节点直接返回同一引用，不做任何归一", () => {
    const single = [node("a", "L2")];
    expect(orderNodesByModelLayer(single, layers)).toBe(single);
    const empty: ModelNode[] = [];
    expect(orderNodesByModelLayer(empty, layers)).toBe(empty);
    // 已证明 `nodes.length < 2` 这道早退不能作为覆盖证据（属源码自身等价）：
    // 去掉后单/空数组仍走 nodesAlreadyInModelLayerOrder —— 长度 ≤1 的序列恒「已序」，
    // 于是仍返回 nodes 同一引用，行为逐字节相同。
  });

  test("缺 layerId 视作默认层（base），排在最前", () => {
    expect(ids(orderNodesByModelLayer([node("a", "L2"), node("b")], layers))).toEqual(["b", "a"]);
    // 全在默认层：已序，直接原样
    const allBase = [node("a"), node("b"), node("c")];
    expect(ids(orderNodesByModelLayer(allBase, layers))).toEqual(["a", "b", "c"]);
  });

  test("★ 未在 layers 里声明的节点层被自动补到末尾，不丢节点", () => {
    // normalizeModelLayers 依据 nodes 补齐未见过的 layerId，排在已声明层之后
    expect(ids(orderNodesByModelLayer([node("a", "ZZ"), node("b", "base")], layers))).toEqual(["b", "a"]);
  });

  test("不给 layers 时只按节点自身 layerId 推层序", () => {
    expect(ids(orderNodesByModelLayer([node("a", "L2"), node("b")], undefined))).toEqual(["b", "a"]);
  });
});

describe("savedSchemeSiblingNames", () => {
  const schemes = [
    { id: "s1", name: "根一", children: [{ id: "s1a", name: "子A" }, { id: "s1b", name: "子B" }] },
    { id: "s2", name: "根二", children: [] },
    { id: "s3", name: "根三" }
  ] as unknown as SavedSchemeRecord[];

  test("顶层方案：同级集合是全部顶层方案", () => {
    expect(savedSchemeSiblingNames(schemes, "s2")).toEqual(["根一", "根二", "根三"]);
    // 顶层自身没有父节点，仍按顶层集合算
    expect(savedSchemeSiblingNames(schemes, "s1")).toEqual(["根一", "根二", "根三"]);
  });

  test("子方案：同级集合是父节点的子列表，不是顶层", () => {
    expect(savedSchemeSiblingNames(schemes, "s1a")).toEqual(["子A", "子B"]);
  });

  test("★ excludeSchemeId 按 id 排除（重名校验时排除自己）", () => {
    expect(savedSchemeSiblingNames(schemes, "s1a", "s1a")).toEqual(["子B"]);
    expect(savedSchemeSiblingNames(schemes, "s1a", "s1b")).toEqual(["子A"]);
  });

  test("未知 id 退化为顶层集合（不抛错）", () => {
    expect(savedSchemeSiblingNames(schemes, "nope")).toEqual(["根一", "根二", "根三"]);
    expect(savedSchemeSiblingNames(schemes, "")).toEqual(["根一", "根二", "根三"]);
    // 已证明 `excludeSchemeId = ""` 这个默认值不能作为覆盖证据（属源码自身等价）：
    // 改成 null 后 `scheme.id !== null` 恒真，同样是「什么都不排除」，与 "" 逐字节同解。
  });
});

describe("projectPointToBusCenterlineUninset", () => {
  // 横向母线：宽 200（半宽 100），中心 (100, 50)
  const bus = {
    id: "b", kind: "ac-bus", name: "b",
    position: { x: 100, y: 50 }, size: { width: 200, height: 20 },
    rotation: 0, scale: 1, terminals: [], params: {}
  } as unknown as ModelNode;

  test("投影到母线中心线，横向超出即夹到端点", () => {
    expect(projectPointToBusCenterlineUninset(bus, { x: 100, y: 50 })).toEqual({ x: 100, y: 50 });
    expect(projectPointToBusCenterlineUninset(bus, { x: 900, y: 50 })).toEqual({ x: 200, y: 50 });
    // 正好在半宽端点上：闭区间，不再夹
    expect(projectPointToBusCenterlineUninset(bus, { x: 200, y: 50 })).toEqual({ x: 200, y: 50 });
  });

  test("★ 不扣两端 10% 禁绘区（与 projectPointToBusCenterline 的唯一差别）", () => {
    // BUS_CONNECTABLE_INSET_RATIO = 0.1 时半宽 100 收成 80，x=200 会被带回 180；
    // Uninset 版本不扣，同一坐标原样落在端点 200 上
    expect(projectPointToBusCenterlineUninset(bus, { x: 200, y: 50 })).toEqual({ x: 200, y: 50 });
    expect(projectPointToBusCenterlineUninset(bus, { x: 180, y: 50 })).toEqual({ x: 180, y: 50 });
  });

  test("随节点旋转：先转回局部系夹取，再按 rotation 转回世界系", () => {
    const rotated = { ...bus, rotation: 90 } as unknown as ModelNode;
    expect(projectPointToBusCenterlineUninset(rotated, { x: 100, y: 200 })).toEqual({ x: 100, y: 150 });
  });

  test("★ 半宽随 scale 放大：scale=2 时夹取端点从 200 推到 300", () => {
    const scaled = { ...bus, scale: 2 } as unknown as ModelNode;
    expect(projectPointToBusCenterlineUninset(scaled, { x: 900, y: 50 })).toEqual({ x: 300, y: 50 });
    // scale 取绝对值：负 scale 同结论
    expect(projectPointToBusCenterlineUninset({ ...bus, scale: -2 } as unknown as ModelNode, { x: 900, y: 50 }))
      .toEqual({ x: 300, y: 50 });
  });

  test("边界型母线（储罐）走矩形边界投影，不做半宽夹取", () => {
    const tank = { ...bus, kind: "hydrogen-tank", size: { width: 100, height: 100 } } as unknown as ModelNode;
    expect(projectPointToBusCenterlineUninset(tank, { x: 140, y: 90 })).toEqual({ x: 150, y: 90 });
  });
});

describe("projectPointToBusCenterlineIfInRange", () => {
  const bus = {
    id: "b", kind: "ac-bus", name: "b",
    position: { x: 100, y: 50 }, size: { width: 200, height: 20 },
    rotation: 0, scale: 1, terminals: [], params: {}
  } as unknown as ModelNode;
  const tank = { ...bus, kind: "hydrogen-tank", size: { width: 100, height: 100 } } as unknown as ModelNode;

  test("非母线返回 null（调用方据此判定不适用）", () => {
    expect(projectPointToBusCenterlineIfInRange({ ...bus, kind: "ac-load" } as unknown as ModelNode, { x: 100, y: 50 }))
      .toBeNull();
  });

  test("★ 横向在半宽内才投影，出界返回 null（闭区间含端点）", () => {
    expect(projectPointToBusCenterlineIfInRange(bus, { x: 180, y: 50 })).toEqual({ x: 180, y: 50 });
    // 正好落在半宽端点上仍算命中
    expect(projectPointToBusCenterlineIfInRange(bus, { x: 200, y: 50 })).toEqual({ x: 180, y: 50 });
    expect(projectPointToBusCenterlineIfInRange(bus, { x: 260, y: 50 })).toBeNull();
  });

  test("★ 命中界与投影界不是同一个：判定用半宽 100，投影收到禁绘区的 80", () => {
    // x=200 命中（<= 半宽 100）却仍被投影带走 —— 判据与结果各用一套界
    expect(projectPointToBusCenterlineIfInRange(bus, { x: 200, y: 50 })).toEqual({ x: 180, y: 50 });
  });

  test("★ 命中界也随 scale 放大：scale=2 时半宽 200、投影收到 160", () => {
    const scaled = { ...bus, scale: 2 } as unknown as ModelNode;
    expect(projectPointToBusCenterlineIfInRange(scaled, { x: 300, y: 50 })).toEqual({ x: 260, y: 50 });
    expect(projectPointToBusCenterlineIfInRange(scaled, { x: 400, y: 50 })).toBeNull();
  });

  test("边界型母线不做范围判定：任意点都投影到矩形边界", () => {
    expect(projectPointToBusCenterlineIfInRange(tank, { x: 400, y: 400 })).toEqual({ x: 150, y: 100 });
    expect(projectPointToBusCenterlineIfInRange(tank, { x: 120, y: 60 })).toEqual({ x: 150, y: 60 });
  });
});
