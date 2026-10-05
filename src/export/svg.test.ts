import { afterEach, describe, expect, test } from "vitest";
import * as legacy from "../appExtracted/appPersistenceLibraryExport";
import { DEFAULT_CANVAS_BACKGROUND } from "../appExtracted/appCoreCanvasUtilities";
import { createDefaultNode, DEVICE_LIBRARY, getTerminalPoint, type ModelNode, type ProjectFile } from "../model";
import { decodeSvgImageSource } from "../svgUtils";
import {
  createRoutableLineDeviceFromEndpoints,
  pointsToOrthogonalPath,
  routeRoutableLineDevice,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceLocalPoints,
  setRoutableLineDeviceCanvasPoints
} from "../model-routing";
import {
  backgroundPageCanvasTransform,
  buildSvgDeviceConnectorMarkup,
  buildSvgDocument,
  exportElectricTerminals,
  exportSvgImageHref,
  setSvgImageAssetsReader
} from "./svg";
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

// ---------------------------------------------------------------------------
// buildSvgDocument：图元前景图解析（resolveNodeForegroundImage）
// ---------------------------------------------------------------------------

/** 非静态、非母排的普通图元（前景图在 body 里以 node-foreground-image 输出）。 */
const imageNode = (params: Record<string, string>): ModelNode => {
  const node = createDefaultNode("ac-load", { x: 200, y: 200 });
  return { ...node, id: "fg-node", name: "fg-node", params: { ...node.params, ...params } };
};

const ASSET_PNG = "data:image/png;base64,ASSETBYTES";
const PARAM_PNG = "data:image/png;base64,PARAMBYTES";

describe("resolveNodeForegroundImage（前景图的 assetId / param 两条来源）", () => {
  test("assetId 在 imageAssets 里命中时用它，不看 foregroundImage 参数", () => {
    // 两个来源同时给且**故意给成不同字节**：只断「有图」的话，
    // `|| params.foregroundImage` 被删掉后仍会出图（恒绿），断不出优先级。
    const svg = buildSvgDocument(
      [imageNode({ foregroundImageAssetId: "fg-1", foregroundImage: PARAM_PNG })] as never,
      [],
      { width: 800, height: 600, imageAssets: { "fg-1": ASSET_PNG } } as never
    );
    expect(svg).toContain("node-foreground-image");
    expect(svg).toContain(ASSET_PNG);
    expect(svg).not.toContain(PARAM_PNG);
  });

  test("assetId 查不到时回落到 foregroundImage 参数（不是「无图」）", () => {
    // 与上一条互为对照：换掉的是 assetId 的**命中与否**，图仍在。
    const svg = buildSvgDocument(
      [imageNode({ foregroundImageAssetId: "missing", foregroundImage: PARAM_PNG })] as never,
      [],
      { width: 800, height: 600, imageAssets: { "fg-1": ASSET_PNG } } as never
    );
    expect(svg).toContain("node-foreground-image");
    expect(svg).toContain(PARAM_PNG);
    expect(svg).not.toContain(ASSET_PNG);
  });

  test("两个来源都没有时不输出前景图", () => {
    const svg = buildSvgDocument([imageNode({})] as never, [], {
      width: 800,
      height: 600,
      imageAssets: { "fg-1": ASSET_PNG }
    } as never);
    expect(svg).not.toContain("node-foreground-image");
    expect(svg).not.toContain(ASSET_PNG);
  });
});

// ---------------------------------------------------------------------------
// buildSvgDocument：背景页子文档（backgroundPage 的来源优先级 + 画布变换）
// ---------------------------------------------------------------------------

/** 取出背景页图层自身的标记区间（层组开标签 → 外框 rect），排除画布自身的背景标记。 */
const backgroundLayerMarkup = (svg: string) => {
  const start = svg.indexOf('class="export-background-page-layer"');
  const end = svg.indexOf('class="export-background-page-frame"');
  return start >= 0 && end > start ? svg.slice(start, end) : "";
};

const PAGE_IMAGE = "data:image/png;base64,PAGEIMAGEBYTES";
const PROJECT_IMAGE = "data:image/png;base64,PROJECTIMAGEBYTES";
const PROJECT_BACKGROUND = "#123456";

const backgroundPageProject = (): ProjectFile => {
  const first = createDefaultNode("ac-load", { x: 100, y: 100 });
  const second = createDefaultNode("ac-load", { x: 320, y: 100 });
  return {
    version: 1,
    name: "背景工程",
    canvasWidth: 640,
    canvasHeight: 480,
    canvasBackgroundColor: PROJECT_BACKGROUND,
    canvasBackgroundImage: PROJECT_IMAGE,
    nodes: [{ ...first, id: "page-node-1" }, { ...second, id: "page-node-2" }],
    edges: [{
      id: "page-edge-1",
      sourceId: "page-node-1",
      targetId: "page-node-2",
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      sourcePoint: { x: 175, y: 100 },
      targetPoint: { x: 245, y: 100 }
    }]
  };
};

describe("buildSvgDocument：背景页从 project 取尺寸 / 节点 / 连线 / 底色 / 背景图", () => {
  const renderWithProjectOnly = () => buildSvgDocument([], [], {
    width: 1000,
    height: 800,
    backgroundColor: "#000000",
    imageAssets: {},
    backgroundPage: { project: backgroundPageProject() }
  } as never);

  test("project.canvasWidth/canvasHeight 决定背景页尺寸（不是画布尺寸）", () => {
    const layer = backgroundLayerMarkup(renderWithProjectOnly());
    expect(layer).toContain('width="640"');
    expect(layer).toContain('height="480"');
    expect(layer).toContain('viewBox="0,0,640,480"');
  });

  test("backgroundPage.nodes 缺省时用 project.nodes，且 id 带背景页前缀", () => {
    const layer = backgroundLayerMarkup(renderWithProjectOnly());
    expect(layer).toContain('id="export_bg_page-node-1"');
    expect(layer).toContain('id="export_bg_page-node-2"');
  });

  test("backgroundPage.edges 缺省时用 project.edges（背景页里真的有连线）", () => {
    expect(backgroundLayerMarkup(renderWithProjectOnly())).toContain('id="export_bg_edge-1"');
  });

  test("背景页底色取 project.canvasBackgroundColor，不取 backgroundPage.backgroundColor", () => {
    // backgroundColor 显式给成画布那份 #000000：若误取它，背景页底色就不是 #123456。
    expect(backgroundLayerMarkup(renderWithProjectOnly())).toContain(`fill="${PROJECT_BACKGROUND}"`);
  });

  test("背景图取 project.canvasBackgroundImage", () => {
    expect(backgroundLayerMarkup(renderWithProjectOnly())).toContain(PROJECT_IMAGE);
  });

  test("backgroundPage.transform 缺省时按两套画布算等比缩放居中", () => {
    const layer = backgroundLayerMarkup(renderWithProjectOnly());
    const expected = backgroundPageCanvasTransform(
      { width: 640, height: 480 },
      { width: 1000, height: 800 }
    );
    expect(expected).not.toBe("translate(0 0) scale(1)");
    expect(layer).toContain(`transform="${expected}"`);
  });
});

describe("buildSvgDocument：backgroundPage 自身字段优先于 project", () => {
  const renderWithBoth = () => buildSvgDocument([], [], {
    width: 1000,
    height: 800,
    imageAssets: {},
    backgroundPage: {
      nodes: [createDefaultNode("ac-load", { x: 100, y: 100 })],
      edges: [],
      backgroundBounds: { width: 300, height: 200 },
      backgroundColor: "#abcdef",
      backgroundImageUrl: PAGE_IMAGE,
      transform: "translate(7 9) scale(0.25)",
      project: backgroundPageProject()
    }
  } as never);

  test("backgroundBounds / backgroundColor / backgroundImageUrl / transform 都压过 project", () => {
    const layer = backgroundLayerMarkup(renderWithBoth());
    expect(layer).toContain('viewBox="0,0,300,200"');
    expect(layer).toContain('fill="#abcdef"');
    expect(layer).toContain('transform="translate(7 9) scale(0.25)"');
    expect(layer).toContain(PAGE_IMAGE);
    // project 那份的图与底色都不该进背景页
    expect(layer).not.toContain(PROJECT_IMAGE);
    expect(layer).not.toContain(PROJECT_BACKGROUND);
  });

  test("backgroundPage.nodes 存在时 project.nodes 完全不参与（连同 project.edges）", () => {
    const layer = backgroundLayerMarkup(renderWithBoth());
    expect(layer).toContain('id="export_bg_');
    expect(layer).not.toContain('id="export_bg_page-node-1"');
    expect(layer).not.toContain('id="export_bg_page-node-2"');
    expect(layer).not.toContain('id="export_bg_edge-1"');
  });
});

describe("buildSvgDocument：backgroundPage 两级缺省（无 nodes 无 project）", () => {
  test("背景页仍被输出，但尺寸回落画布尺寸、底色回落默认、节点与连线为空", () => {
    const layer = backgroundLayerMarkup(buildSvgDocument([], [], {
      width: 1000,
      height: 800,
      imageAssets: {},
      backgroundPage: {}
    } as never));
    expect(layer).toContain('viewBox="0,0,1000,800"');
    expect(layer).toContain(`fill="${DEFAULT_CANVAS_BACKGROUND}"`);
    // 画布尺寸与背景页尺寸相同 → 变换退化成单位阵（不是恒真的「有 transform 属性」）
    expect(layer).toContain(`transform="translate(0 0) scale(1)"`);
    expect(layer).not.toContain("<symbol");
    expect(layer).not.toContain("<use");
    expect(layer).not.toContain("export-canvas-background-image");
  });
});

// ---------------------------------------------------------------------------
// buildSvgDocument：端子 nodeNumber 的存量回填（拓扑重算端子 vs 存量端子）
// ---------------------------------------------------------------------------

const useNodeAttribute = (svg: string, nodeId: string) =>
  svg.match(new RegExp(`<use id="${nodeId}"[^>]*>`))?.[0]?.match(/ node="[^"]*"/)?.[0] ?? "";

const busWithTerminals = (id: string, terminals: unknown[]): ModelNode => {
  const bus = createDefaultNode("ac-bus", { x: 100, y: 100 });
  return { ...bus, id, name: id, terminals: terminals as never };
};

const BUS_TERMINAL = (id: string, nodeNumber: string) => ({
  id,
  label: "",
  anchor: { x: 0.5, y: 0.5 },
  type: "ac",
  nodeNumber
});

const busToLoadEdge = (busId: string, load: ModelNode) => ({
  id: "bus-load-edge",
  sourceId: busId,
  targetId: load.id,
  sourceTerminalId: "t1",
  targetTerminalId: load.terminals[0].id,
  sourcePoint: { x: 200, y: 108 },
  targetPoint: { x: 280, y: 108 }
});

describe("buildSvgDocument：端子 nodeNumber 回填优先用存量端子表", () => {
  test("存量端子表里没有该端子 id 时，按下标取存量端子的 nodeNumber", () => {
    // 母排端子被 syncBusNodeTerminals 重算成 t1（存量表里只有 t2），于是
    // originalTerminalById.get("t1") 为空 → 走 node.terminals[0].nodeNumber = N7。
    // 拓扑算出来的号是 1：断 7 而不是 1，才断得出「按存量号回填」而不是「拓扑号恰好相同」。
    const bus = busWithTerminals("bus-mismatch", [BUS_TERMINAL("t2", "N7")]);
    const load = createDefaultNode("ac-load", { x: 300, y: 100 });
    const svg = buildSvgDocument([bus, load], [busToLoadEdge("bus-mismatch", load)] as never, {
      width: 800,
      height: 600,
      imageAssets: {}
    } as never);
    expect(useNodeAttribute(svg, "bus-mismatch")).toBe(' node="7"');
    expect(useNodeAttribute(svg, load.id)).not.toBe(' node="7"');
  });

  test("存量端子表里有该 id 时直接用存量号（与上一条构成对照）", () => {
    // 同样的图，只把母排存量端子改成 t1：这时拓扑号与存量号都落在同一条路径上，
    // 输出仍是存量号 —— 证明上一条不是「拓扑重算的号碰巧一样」。
    const bus = busWithTerminals("bus-match", [BUS_TERMINAL("t1", "N4")]);
    const load = createDefaultNode("ac-load", { x: 300, y: 100 });
    const svg = buildSvgDocument([bus, load], [busToLoadEdge("bus-match", load)] as never, {
      width: 800,
      height: 600,
      imageAssets: {}
    } as never);
    expect(useNodeAttribute(svg, "bus-match")).toBe(' node="4"');
  });
});

// ---------------------------------------------------------------------------
// buildSvgDeviceConnectorMarkup：voltagePaint.terminalRef 收到的端子 id
// ---------------------------------------------------------------------------

describe("buildSvgDeviceConnectorMarkup：terminalRef 收到的端子 id 形态", () => {
  const nodeWithTerminals = (terminals: unknown[]): ModelNode => {
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    return { ...node, terminals: terminals as never };
  };
  const collectTerminalRefArgs = (node: ModelNode) => {
    const seen: string[] = [];
    const markup = buildSvgDeviceConnectorMarkup(node, "energy", undefined, {
      terminalRef: (terminalId: string) => {
        seen.push(terminalId);
        return "var(--t7)";
      }
    });
    return { seen, markup };
  };

  test("端子有 id 时 terminalRef 收到原 id（对照组）", () => {
    const { seen, markup } = collectTerminalRefArgs(nodeWithTerminals([BUS_TERMINAL("t1", "N1")]));
    expect(seen).toEqual(["t1"]);
    expect(markup).toContain('stroke="var(--t7)"');
  });

  test("端子缺 id 时 terminalRef 收到空串（不是 undefined 字面量）", () => {
    // `String(terminal.id ?? "")`：id 缺失时传空串。若去掉 `?? ""`，
    // terminalRef 收到的是 "undefined" 字符串 —— 断 `seen` 才能看出来。
    const { seen, markup } = collectTerminalRefArgs(nodeWithTerminals([
      { label: "", anchor: { x: 0.5, y: 0 }, type: "ac", nodeNumber: "N1" }
    ]));
    expect(seen).toEqual([""]);
    expect(seen).not.toContain("undefined");
    expect(markup).toContain('stroke="var(--t7)"');
  });
});
