import { describe, expect, test } from "vitest";
import * as legacy from "../appExtracted/appPersistenceLibraryExport";
import { DEFAULT_CANVAS_BACKGROUND } from "../appExtracted/appCoreCanvasUtilities";
import { createDefaultNode, DEVICE_LIBRARY, getTerminalPoint, type ModelNode } from "../model";
import {
  createRoutableLineDeviceFromEndpoints,
  pointsToOrthogonalPath,
  routeRoutableLineDevice,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceLocalPoints,
  setRoutableLineDeviceCanvasPoints
} from "../model-routing";
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

  test("容器与静态图元共享层键（Other）时不整层沉底：整层皆容器才搬", () => {
    const containerInStaticLayer = {
      id: "box2", kind: "ac-vpp-box", name: "虚拟电厂2", position: { x: 200, y: 300 },
      size: { width: 180, height: 112 }, rotation: 0, layerId: "layer-default", nodeNumber: "",
      acTopologyNode: 0, dcTopologyNode: 0, scale: 1,
      // 手工塞入 static 库参数 → exportNodeLayerKey 判静态 → 与静态图元同落 "Other" 层
      params: { component_type: "StaticTextSymbol" }, terminals: []
    };
    const staticText = {
      id: "st1", kind: "static-text", name: "标题", position: { x: 40, y: 40 },
      size: { width: 120, height: 24 }, rotation: 0, layerId: "layer-default", nodeNumber: "",
      acTopologyNode: 0, dcTopologyNode: 0, scale: 1, params: { text: "标题" }, terminals: []
    };
    const svg = buildSvgDocument(
      [...SVG_BASELINE_NODES, staticText, containerInStaticLayer] as any,
      SVG_BASELINE_EDGES as any,
      { ...SVG_BASELINE_FIXTURE, imageAssets: {} } as any
    );
    const otherAt = svg.indexOf('device-type="Other"');
    const segmentAt = svg.indexOf('<g id="Segment_Layer"');

    expect(otherAt).toBeGreaterThan(-1);
    expect(segmentAt).toBeGreaterThan(-1);
    // 该层还住着静态图元:整层搬会把装饰图元一并沉到线路底下,故不动
    expect(otherAt).toBeGreaterThan(segmentAt);
  });

  test("导出时按容器豁免口径回填设备型线路的存量路径", () => {
    const inner = createDefaultNode("ac-switch", { x: 300, y: 200 });
    const outer = createDefaultNode("ac-load", { x: 950, y: 200 });
    const box: ModelNode = { ...createDefaultNode("ac-vpp-box", { x: 300, y: 200 }), size: { width: 500, height: 300 } };
    const innerInBox: ModelNode = { ...inner, containerId: box.id };
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line")!;
    const start = getTerminalPoint(innerInBox, "t1");
    const end = getTerminalPoint(outer, "t1");
    const line = createRoutableLineDeviceFromEndpoints(template, start, end, "layer-a", {
      source: routableLineDeviceEndpointRefForNode(innerInBox, "t1"),
      target: routableLineDeviceEndpointRefForNode(outer, "t1")
    });
    // 存量绕行路径(容器当障碍物时代的产物)
    const detour = setRoutableLineDeviceCanvasPoints(line, [start, { x: start.x, y: 30 }, { x: end.x, y: 30 }, end]);
    const bounds = { width: 1200, height: 800 };
    const fixture = { ...SVG_BASELINE_FIXTURE, ...bounds, imageAssets: {} } as any;
    const withMembership = [innerInBox, outer, box, detour] as any;
    const settled = routeRoutableLineDevice(detour, withMembership, bounds);

    const linePathData = (node: any) => pointsToOrthogonalPath(routableLineDeviceLocalPoints(node));

    // 端点连容器内设备 → 导出按豁免口径回填:渲染的就是回填后的路径
    const exported = buildSvgDocument(withMembership, [], fixture);
    expect(exported).toContain(`d="${linePathData(settled)}"`);
    expect(exported).not.toContain(`d="${linePathData(detour)}"`);
    // 同一个「已回填」的模型(盘上数据)应与导出回填后的渲染逐字一致
    expect(exported).toBe(buildSvgDocument([innerInBox, outer, box, settled] as any, [], fixture));
    // 端点不连容器内设备 → 不属回填对象,存量绕行路径原样导出
    expect(buildSvgDocument([inner, outer, box, detour] as any, [], fixture)).toContain(`d="${linePathData(detour)}"`);
  });
});
