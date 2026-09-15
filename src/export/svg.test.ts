import { describe, expect, test } from "vitest";
import * as legacy from "../appExtracted/appPersistenceLibraryExport";
import { DEFAULT_CANVAS_BACKGROUND } from "../appExtracted/appCoreCanvasUtilities";
import { buildSvgDocument } from "./svg";
import { SVG_BASELINE_EDGES, SVG_BASELINE_FIXTURE, SVG_BASELINE_NODES } from "./fixtures/svg-baseline";

describe("src/export/svg", () => {
  test("旧路径 re-export 保持同一引用", () => {
    expect(legacy.buildSvgDocument).toBe(buildSvgDocument);
  });

  test("可注入 imageAssets（不读 localStorage）", () => {
    const svg = buildSvgDocument(SVG_BASELINE_NODES as any, SVG_BASELINE_EDGES as any, {
      ...SVG_BASELINE_FIXTURE,
      imageAssets: {}
    } as any);
    expect(svg).toContain("<svg");
  });

  test("母排渲染出 bus-glyph", () => {
    const svg = buildSvgDocument(SVG_BASELINE_NODES as any, SVG_BASELINE_EDGES as any, SVG_BASELINE_FIXTURE as any);
    expect(svg).toContain("bus-glyph");
  });

  test("省略 backgroundColor 时用默认底色（与 appCoreCanvasUtilities.tsx 的同名常量副本一致）", () => {
    const svg = buildSvgDocument([], [], { width: 800, height: 600 });
    expect(svg).toContain(`fill="${DEFAULT_CANVAS_BACKGROUND}"`);
  });

  test("容器沉底：容器层在 segment（线路）层之前输出，且无容器时输出不变", () => {
    const box = {
      id: "box1", kind: "ac-vpp-box", name: "虚拟电厂", position: { x: 200, y: 300 },
      size: { width: 180, height: 112 }, rotation: 0, layerId: "layer-default", nodeNumber: "",
      acTopologyNode: 0, dcTopologyNode: 0, scale: 1, params: {}, terminals: []
    };
    const withBox = buildSvgDocument(
      [...SVG_BASELINE_NODES, box] as any,
      SVG_BASELINE_EDGES as any,
      { ...SVG_BASELINE_FIXTURE, imageAssets: {} } as any
    );
    // 容器层键取自 inferESection(容器)->"ACContainer"(容器段),不再回退到 kind
    const containerAt = withBox.indexOf('device-type="ACContainer"');
    const segmentAt = withBox.indexOf('<g id="Segment_Layer"');
    expect(containerAt).toBeGreaterThan(-1);
    expect(segmentAt).toBeGreaterThan(-1);
    // 容器是背景性装饰：必须排在 segment 层之前（= 更早绘制 = 被线路/设备覆盖）
    expect(containerAt).toBeLessThan(segmentAt);
    // 防空洞：容器层里必须真有该容器图元，不是空组
    expect(withBox.slice(containerAt, segmentAt)).toContain('dev-kind="ac-vpp-box"');
    // 无容器时不占位（逐字节一致性由 svg.golden 基线哈希守卫）
  });
});
