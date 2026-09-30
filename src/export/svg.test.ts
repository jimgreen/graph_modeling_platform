import { afterEach, describe, expect, test } from "vitest";
import * as legacy from "../appExtracted/appPersistenceLibraryExport";
import { DEFAULT_CANVAS_BACKGROUND } from "../appExtracted/appCoreCanvasUtilities";
import { createDefaultNode, DEVICE_LIBRARY, getTerminalPoint, type ModelNode } from "../model";
import { decodeSvgImageSource } from "../svgUtils";
import {
  createRoutableLineDeviceFromEndpoints,
  pointsToOrthogonalPath,
  routeRoutableLineDevice,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceLocalPoints,
  setRoutableLineDeviceCanvasPoints
} from "../model-routing";
import { buildSvgDocument, exportElectricTerminals, exportSvgImageHref, setSvgImageAssetsReader } from "./svg";
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

// ---------------------------------------------------------------------------
// exportSvgImageHref：导出产物里「图片引用」的唯一归一入口
// ---------------------------------------------------------------------------

const PNG_A = "data:image/png;base64,AAAA";
const PNG_B = "data:image/png;base64,BBBB";
const backendHref = (id: string) => `/webgrp/images/${encodeURIComponent(id)}`;
const svgDataUrl = (inner: string) => `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;

describe("exportSvgImageHref", () => {
  test("非后端 href 原样返回（映射表里有没有对应键都无所谓）", () => {
    expect(exportSvgImageHref(PNG_A)).toBe(PNG_A);
    expect(exportSvgImageHref(PNG_A, { "icon-1": PNG_B })).toBe(PNG_A);
  });

  test("后端 href 在映射表里没有对应键时原样返回（不做兜底猜测）", () => {
    expect(exportSvgImageHref(backendHref("icon-1"))).toBe(backendHref("icon-1"));
    expect(exportSvgImageHref(backendHref("icon-1"), { "icon-2": PNG_B })).toBe(backendHref("icon-1"));
  });

  // 变异验证补记：`exportSvgImageHref` 里的 `if (!id) return href` 删掉后仍然全绿 ——
  // id 为空时 `imageExportPathById[""]` 恒为 undefined（没人拿空串当图片 id），
  // 两条分支结果相同。属等价变异，不是这条测试没守住。

  test("后端 href 命中映射表时换成映射后的路径", () => {
    expect(exportSvgImageHref(backendHref("icon-1"), { "icon-1": PNG_B })).toBe(PNG_B);
  });

  test("映射表的键是 URL 解码后的图片 id（href 里是百分号编码）", () => {
    const href = backendHref("图片");
    expect(href).toBe("/webgrp/images/%E5%9B%BE%E7%89%87");
    expect(exportSvgImageHref(href, { 图片: PNG_B })).toBe(PNG_B);
    // 反过来：拿未解码的串当键命中不了，导出产物会留一条指向后端的死链
    expect(exportSvgImageHref(href, { "%E5%9B%BE%E7%89%87": PNG_B })).toBe(href);
  });

  test("id 只取到 ? / # 之前（带 query 的 href 也能命中映射表）", () => {
    expect(exportSvgImageHref("/webgrp/images/icon-1?v=2", { "icon-1": PNG_B })).toBe(PNG_B);
    expect(exportSvgImageHref("/webgrp/images/icon-1#frag", { "icon-1": PNG_B })).toBe(PNG_B);
  });

  test("带首尾空白的后端 href 也能命中映射表（裁白发生在更上游）", () => {
    expect(exportSvgImageHref(`  ${backendHref("icon-1")}  `, { "icon-1": PNG_B })).toBe(PNG_B);
  });

  // 变异验证补记：`backendImageIdFromHref` 里那个 `.trim()` 删掉后仍然全绿 ——
  // 走到这里的 href 必先过 `inlineBackendImageRefsInSvgDataUrl`，那里已经裁过一遍。
  // 属等价变异，不是这条测试没守住；也别把它当成「trim 有覆盖」的证据。

  test("空值返回空串，不返回 undefined 字面量", () => {
    expect(exportSvgImageHref("")).toBe("");
    expect(exportSvgImageHref(undefined as never)).toBe("");
  });

  test("SVG data URL 里的后端图片引用被换成 data URL 后整串重新编码", () => {
    const inner = `<svg xmlns="http://www.w3.org/2000/svg"><image href="/webgrp/images/icon-1"/></svg>`;
    const out = exportSvgImageHref(svgDataUrl(inner), { "icon-1": PNG_B });
    expect(out.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeSvgImageSource(out)).toContain(`href="${PNG_B}"`);
    expect(decodeSvgImageSource(out)).not.toContain("/webgrp/images/icon-1");
  });

  test("xlink:href 形式的嵌套引用同样被内联", () => {
    const inner = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href='/webgrp/images/icon-1'/></svg>`;
    const out = exportSvgImageHref(svgDataUrl(inner), { "icon-1": PNG_B });
    expect(decodeSvgImageSource(out)).toContain(`xlink:href='${PNG_B}'`);
  });

  test("映射值不是 data URL 时不内嵌（避免把一条后端链再套一层 data:）", () => {
    const inner = `<svg xmlns="http://www.w3.org/2000/svg"><image href="/webgrp/images/icon-1"/></svg>`;
    const outer = svgDataUrl(inner);
    expect(exportSvgImageHref(outer, { "icon-1": backendHref("other") })).toBe(outer);
  });

  test("SVG 里没有可内联的引用时保持原串（不触发重编码）", () => {
    const outer = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>`);
    expect(exportSvgImageHref(outer, { "icon-1": PNG_B })).toBe(outer);
  });

  test("裸 <svg> 串（不是 data URL）内联后被转成 data:image/svg+xml;utf8", () => {
    // 既有行为：decodeSvgImageSource 认裸串，但输出端只会产出 data URL 形式
    const inner = `<svg xmlns="http://www.w3.org/2000/svg"><image href="/webgrp/images/icon-1"/></svg>`;
    const out = exportSvgImageHref(inner, { "icon-1": PNG_B });
    expect(out.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeSvgImageSource(out)).toContain(`href="${PNG_B}"`);
  });
});

// ---------------------------------------------------------------------------
// setSvgImageAssetsReader：readImageAssets 的惰性注入口
// ---------------------------------------------------------------------------

const staticNodeWithAsset = (params: Record<string, string>) => ({
  id: "st-img", kind: "static-text", name: "标题", position: { x: 40, y: 40 },
  size: { width: 120, height: 24 }, rotation: 0, layerId: "layer-default", nodeNumber: "",
  acTopologyNode: 0, dcTopologyNode: 0, scale: 1, params, terminals: []
});

describe("setSvgImageAssetsReader", () => {
  afterEach(() => setSvgImageAssetsReader(() => ({})));

  test("注册后不传 imageAssets 时走 reader 的返回值", () => {
    setSvgImageAssetsReader(() => ({ "bg-1": PNG_B }));
    const svg = buildSvgDocument([staticNodeWithAsset({ text: "标题", backgroundImageAssetId: "bg-1" })] as any, [], {
      width: 800, height: 600
    });
    expect(svg).toContain("node-background-image");
    expect(svg).toContain(PNG_B);
  });

  test("显式 imageAssets 优先于 reader（注入项是给无浏览器的导出链用的后门）", () => {
    setSvgImageAssetsReader(() => ({ "bg-1": PNG_B }));
    const svg = buildSvgDocument([staticNodeWithAsset({ text: "标题", backgroundImageAssetId: "bg-1" })] as any, [], {
      width: 800, height: 600, imageAssets: { "bg-1": PNG_A }
    });
    expect(svg).toContain(PNG_A);
    expect(svg).not.toContain(PNG_B);
  });

  test("reader 惰性求值：给了 imageAssets 就不该被调用", () => {
    let calls = 0;
    setSvgImageAssetsReader(() => { calls += 1; return {}; });
    buildSvgDocument([staticNodeWithAsset({ text: "标题" })] as any, [], { width: 800, height: 600, imageAssets: {} });
    expect(calls).toBe(0);
  });

  test("assetId 在 reader 里查不到时按「无图」处理，不回落到别的键", () => {
    setSvgImageAssetsReader(() => ({ "bg-2": PNG_B }));
    const svg = buildSvgDocument([staticNodeWithAsset({ text: "标题", backgroundImageAssetId: "bg-1" })] as any, [], {
      width: 800, height: 600
    });
    expect(svg).not.toContain("node-background-image");
  });
});

// ---------------------------------------------------------------------------
// exportElectricTerminals：端子槽 / 锚点 / 电压槽共用的电端子子序列
// ---------------------------------------------------------------------------

const terminalNode = (terminals: ModelNode["terminals"]): ModelNode => ({
  ...createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }),
  id: "EL-1", name: "EL-1", rotation: 0, scaleX: 1, scaleY: 1, layerId: "layer-default", terminals
});
const terminal = (id: string, type?: string) =>
  ({ id, label: "", type, anchor: { x: 0, y: 0 }, nodeNumber: "N1" }) as unknown as ModelNode["terminals"][number];

describe("exportElectricTerminals", () => {
  test("只留 ac/dc，其余原样剔除", () => {
    const node = terminalNode([terminal("t1", "ac"), terminal("t2", "h2"), terminal("t3", "dc"), terminal("t4", "heat")]);
    expect(exportElectricTerminals(node).map((item) => item.id)).toEqual(["t1", "t3"]);
  });

  test("序号按「电端子子序列」重排，被剔掉的非电端子不占槽位", () => {
    // 这条是端子槽 var(--tN) 与锚点 terminal-index 的同一基数，基数错了颜色会串到别的绕组
    const node = terminalNode([terminal("t1", "h2"), terminal("t2", "ac"), terminal("t3", "heat"), terminal("t4", "ac")]);
    expect(exportElectricTerminals(node).map((item) => item.id)).toEqual(["t2", "t4"]);
  });

  test("没有 type 字段的端子按非电处理（不靠真值判断）", () => {
    expect(exportElectricTerminals(terminalNode([terminal("t1")])).map((item) => item.id)).toEqual([]);
  });

  test("零端子返回空数组", () => {
    expect(exportElectricTerminals(terminalNode([]))).toEqual([]);
  });

  test("返回的是原端子对象本身（不是副本），下游按 id 找得到", () => {
    const terminals = [terminal("t1", "ac"), terminal("t2", "ac")];
    const picked = exportElectricTerminals(terminalNode(terminals));
    expect(picked[0]).toBe(terminals[0]);
    expect(picked[1]).toBe(terminals[1]);
  });
});
