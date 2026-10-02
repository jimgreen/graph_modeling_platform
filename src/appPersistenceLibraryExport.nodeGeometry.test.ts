// 节点几何：缩放变换串、变换后半宽、选择框、智能对齐用的定位副本。
// 贯穿规则：缩放取**绝对值**（镜像节点 scaleX 为负，半宽仍要是正的），
// 旋转用 |cos| / |sin| 算外接矩形（负号会让外接框反向缩成负尺寸）。
import { describe, expect, test } from "vitest";

import {
  defaultBackgroundLayerIdsForProject,
  nodeScaledLocalHalfExtents,
  nodeTransformedHalfExtents,
  nodeUprightScaleTransform,
  nodeUprightSelectionOutlineRect,
  positionedNodeForSmartAlignment
} from "./appExtracted/appPersistenceLibraryExport";

const pt = (x: number, y: number) => ({ x, y });

const node = (over: Record<string, any> = {}) => ({
  id: "n1",
  kind: "ac-load",
  rotation: 0,
  scale: 1,
  size: { width: 40, height: 30 },
  params: {},
  position: { x: 10, y: 20 },
  ...over
});

describe("nodeUprightScaleTransform", () => {
  test("无缩放时是 scale(1 1)", () => {
    expect(nodeUprightScaleTransform(node() as any)).toBe("scale(1 1)");
  });

  test("各向缩放分别写入", () => {
    expect(nodeUprightScaleTransform(node({ scaleX: 2, scaleY: 0.5 }) as any)).toBe("scale(2 0.5)");
  });

  test("scale 为 0 时按安全值兜底（不产生 scale(0 …) 的不可见节点）", () => {
    expect(nodeUprightScaleTransform(node({ scale: 0 }) as any)).toBe("scale(1 1)");
  });

  test("负缩放被安全值兜成 1（不产生会被浏览器忽略的负 scale）", () => {
    expect(nodeUprightScaleTransform(node({ scaleX: -1, scaleY: 1 }) as any)).toBe("scale(1 1)");
  });
});

describe("nodeScaledLocalHalfExtents", () => {
  test("不旋转时等于缩放后的尺寸一半", () => {
    expect(nodeScaledLocalHalfExtents(node({ scaleX: 2, scaleY: 3 }) as any)).toEqual({ halfWidth: 40, halfHeight: 45 });
  });

  test("不关心旋转（局部坐标）", () => {
    const flat = nodeScaledLocalHalfExtents(node({ scaleX: 2, scaleY: 2 }) as any);
    const rotated = nodeScaledLocalHalfExtents(node({ scaleX: 2, scaleY: 2, rotation: 45 }) as any);

    expect(rotated).toEqual(flat);
  });

  test("负缩放取绝对值", () => {
    expect(nodeScaledLocalHalfExtents(node({ scaleX: -2, scaleY: 1 }) as any).halfWidth).toBe(40);
  });
});

describe("nodeTransformedHalfExtents", () => {
  test("不旋转时等于局部半宽半高", () => {
    expect(nodeTransformedHalfExtents(node() as any)).toEqual({ halfWidth: 20, halfHeight: 15 });
  });

  test("旋转 90° 后宽高互换", () => {
    const result = nodeTransformedHalfExtents(node({ rotation: 90 }) as any);

    expect(result.halfWidth).toBeCloseTo(15, 6);
    expect(result.halfHeight).toBeCloseTo(20, 6);
  });

  test("旋转 45° 时外接框同时变大", () => {
    const result = nodeTransformedHalfExtents(node({ rotation: 45 }) as any);

    expect(result.halfWidth).toBeGreaterThan(20);
    expect(result.halfHeight).toBeGreaterThan(15);
  });

  test("includeUprightContent 为真时取「局部与旋转后」的较大者", () => {
    // 40×30 旋转 90°：局部半宽 20 / 半高 15，旋转后 15 / 20 → 取大者
    const withoutContent = nodeTransformedHalfExtents(node({ rotation: 90 }) as any);
    const withContent = nodeTransformedHalfExtents(node({ rotation: 90 }) as any, true);

    expect(withContent.halfWidth).toBe(20);
    expect(withContent.halfHeight).toBe(20);
    expect(withoutContent.halfWidth).toBeCloseTo(15, 6);
    expect(withoutContent.halfHeight).toBeCloseTo(20, 6);
  });

  test("不旋转时 includeUprightContent 不改变结果", () => {
    const withoutContent = nodeTransformedHalfExtents(node() as any);
    const withContent = nodeTransformedHalfExtents(node() as any, true);

    expect(withContent).toEqual(withoutContent);
  });

  test("负缩放不影响外接框尺寸", () => {
    const positive = nodeTransformedHalfExtents(node({ scaleX: 2, scaleY: 2 }) as any);
    const negative = nodeTransformedHalfExtents(node({ scaleX: -2, scaleY: -2 }) as any);

    expect(negative).toEqual(positive);
  });
});

describe("nodeUprightSelectionOutlineRect", () => {
  test("以节点中心为原点的居中矩形", () => {
    expect(nodeUprightSelectionOutlineRect(node() as any)).toEqual({ x: -20, y: -15, width: 40, height: 30 });
  });

  test("尺寸随缩放放大", () => {
    expect(nodeUprightSelectionOutlineRect(node({ scaleX: 2, scaleY: 2 }) as any)).toMatchObject({ width: 80, height: 60 });
  });

  test("零缩放时保底 1px（不产生不可见的 0 宽选择框）", () => {
    const result = nodeUprightSelectionOutlineRect(node({ scaleX: 0, scaleY: 0 }) as any);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  test("负缩放取绝对值", () => {
    expect(nodeUprightSelectionOutlineRect(node({ scaleX: -2 }) as any).width).toBe(80);
  });
});

describe("positionedNodeForSmartAlignment", () => {
  test("位置变化时返回带新位置的副本", () => {
    const source = node();
    const positioned = positionedNodeForSmartAlignment(source as any, pt(100, 200));

    expect(positioned.position).toEqual(pt(100, 200));
    expect(positioned).not.toBe(source);
  });

  test("位置未变时返回同一个对象（不产生多余的重渲染）", () => {
    const source = node();

    expect(positionedNodeForSmartAlignment(source as any, pt(10, 20))).toBe(source);
  });

  test("只有 x 变化也算变化", () => {
    const source = node();

    expect(positionedNodeForSmartAlignment(source as any, pt(11, 20))).not.toBe(source);
  });

  test("原节点不被改动", () => {
    const source = node();

    positionedNodeForSmartAlignment(source as any, pt(100, 200));

    expect(source.position).toEqual(pt(10, 20));
  });
});

describe("defaultBackgroundLayerIdsForProject", () => {
  // normalizeProjectLayers 要求 ProjectFile 全形（nodes / layers / activeLayerId）
  const project = (layers: any[]) => ({ nodes: [], layers, activeLayerId: "l1" } as any);

  test("返回全部可见图层 id（归一时补出的默认图层也在内）", () => {
    const result = defaultBackgroundLayerIdsForProject(project([{ id: "l1" }, { id: "l2", visible: true }]));

    expect(result).toContain("l1");
    expect(result).toContain("l2");
  });

  test("visible 为 false 的图层被排除", () => {
    const result = defaultBackgroundLayerIdsForProject(project([{ id: "l1" }, { id: "l2", visible: false }]));

    expect(result).toContain("l1");
    expect(result).not.toContain("l2");
  });

  test("没有图层时归一出一个默认图层", () => {
    expect(defaultBackgroundLayerIdsForProject(project([]))).toHaveLength(1);
  });

  test("layers 缺省时也归一出默认图层而不是崩", () => {
    expect(defaultBackgroundLayerIdsForProject({ nodes: [] } as any)).toHaveLength(1);
  });
});
