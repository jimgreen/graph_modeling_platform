// /webgrp/v1/schemes/model/svg 适配层测试：
// 1) 单元：直载 src/export/svg.ts（Node 原生 TS）验证 buildSvgDocument 纯函数；
// 2) 集成：GRAPH_MODEL_DATA_DIR 指向 tmpdir 种子数据 → 起真实 server（端口 0）→ 400/404/200 全链路。
import { describe, expect, test, beforeAll, afterAll, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

const svgPath = apiPath("/v1/schemes/model/svg");

// —— 单元：buildSvgDocument 纯函数 ——
describe("SVG 后端生成", () => {
  test("可直载 src/export/svg.ts", async () => {
    const mod = await import("../src/export/svg.ts");
    expect(typeof mod.buildSvgDocument).toBe("function");
  });

  test("母排节点渲染出 bus-glyph", async () => {
    const { buildSvgDocument } = await import("../src/export/svg.ts");
    const nodes = [{
      id: "bus1",
      kind: "ac-bus",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 16 },
      rotation: 0,
      layerId: "default",
      params: { name: "母线1", vbase: "10" },
      terminals: [{ id: "t1", anchor: { x: 0.5, y: 0.5 }, type: "ac", nodeNumber: "1" }]
    }];
    const svg = buildSvgDocument(nodes, [], {
      width: 400,
      height: 300,
      backgroundColor: "#ffffff",
      deviceTemplates: [],
      imageExportPathById: {},
      imageAssets: {}
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("bus-glyph");
  });
});

// —— 集成：真实 server + tmpdir 种子数据 ——
let dataDir;
let server;
let baseUrl;

const busNode = {
  id: "bus1",
  kind: "ac-bus",
  name: "母线1",
  position: { x: 100, y: 100 },
  size: { width: 120, height: 16 },
  rotation: 0,
  scale: 1,
  layerId: "default",
  terminals: [{ id: "t1", anchor: { x: 0.5, y: 0.5 }, type: "ac", nodeNumber: "1", vbase: "10" }],
  params: { name: "母线1", vbase: "10" }
};

// 被引用图片内联种子：1×1 PNG 真实写盘 + manifest 登记（data/images/<filename>）
const svgExportImageId = "img-svg-test";
const PNG_1X1_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// 静态图元带背景图（assetId + 后端 href 双写，与 normalizeProjectForStorage 落盘形态一致）
const imageNode = {
  id: "img1",
  kind: "static-image",
  name: "图片图元",
  position: { x: 200, y: 80 },
  size: { width: 120, height: 90 },
  rotation: 0,
  scale: 1,
  layerId: "default",
  terminals: [],
  params: {
    name: "图片图元",
    backgroundImage: apiPath(`/images/${svgExportImageId}`),
    backgroundImageAssetId: svgExportImageId
  }
};

// 断路器带状态定义（DEVICE_LIBRARY 内置）→ 输出应含 state_ 状态符号，验证库模板已传入
const breakerNode = {
  id: "br1",
  kind: "ac-breaker",
  name: "开关1",
  position: { x: 320, y: 100 },
  size: { width: 40, height: 60 },
  rotation: 0,
  scale: 1,
  layerId: "default",
  terminals: [
    { id: "t1", anchor: { x: 0.5, y: 0 }, type: "ac", nodeNumber: "2" },
    { id: "t2", anchor: { x: 0.5, y: 1 }, type: "ac", nodeNumber: "3" }
  ],
  params: { name: "开关1", status: "open" }
};

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "svg-export-"));
  const dir = join(dataDir, "schemes", "files", "测试方案");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "开关模型.json"), JSON.stringify({
    name: "开关模型",
    canvasWidth: 800,
    canvasHeight: 400,
    canvasBackgroundColor: "#ffffff",
    nodes: [busNode, breakerNode],
    edges: []
  }), "utf-8");
  // 无 canvasBackgroundColor：验证后端不写第二份默认字面量，由渲染器回落自身默认
  writeFileSync(join(dir, "无底色模型.json"), JSON.stringify({
    name: "无底色模型",
    canvasWidth: 400,
    canvasHeight: 300,
    nodes: [busNode],
    edges: []
  }), "utf-8");
  // 图片资源：manifest 登记 + 真实 PNG 文件落盘（imageFileToDataUrl 读 data/images/<filename>）
  const imageDir = join(dataDir, "images");
  mkdirSync(imageDir, { recursive: true });
  writeFileSync(join(imageDir, "manifest.json"), JSON.stringify([{
    id: svgExportImageId,
    name: "测试图.png",
    folderId: "root",
    mimeType: "image/png",
    size: Buffer.from(PNG_1X1_BASE64, "base64").length,
    filename: `${svgExportImageId}.png`,
    createdAt: new Date(0).toISOString()
  }, {
    // 已登记但文件不落盘：逼真走 readFile 失败路径（未登记只会被 filter 提前剔除，覆盖不到 catch）
    id: "img-svg-missing",
    name: "丢失图.png",
    folderId: "root",
    mimeType: "image/png",
    size: 0,
    filename: "img-svg-missing.png",
    createdAt: new Date(0).toISOString()
  }]), "utf-8");
  writeFileSync(join(imageDir, `${svgExportImageId}.png`), Buffer.from(PNG_1X1_BASE64, "base64"));
  // 画布背景 + 图元背景均引用该图片 → 导出须内联为 data URL，恢复自包含
  writeFileSync(join(dir, "图片模型.json"), JSON.stringify({
    name: "图片模型",
    canvasWidth: 400,
    canvasHeight: 300,
    canvasBackgroundColor: "#ffffff",
    canvasBackgroundImage: apiPath(`/images/${svgExportImageId}`),
    canvasBackgroundImageAssetId: svgExportImageId,
    nodes: [imageNode],
    edges: []
  }), "utf-8");
  // 混合引用：图元引用存在的图片，画布背景引用已登记但文件丢失的图片 → 读盘失败不阻断另一张内联
  writeFileSync(join(dir, "缺图模型.json"), JSON.stringify({
    name: "缺图模型",
    canvasWidth: 400,
    canvasHeight: 300,
    canvasBackgroundColor: "#ffffff",
    canvasBackgroundImage: apiPath("/images/img-svg-missing"),
    nodes: [imageNode],
    edges: []
  }), "utf-8");
  // 仅 assetId、无 href 的图元：只有把同一份映射也传给 imageAssets 才能解析出图（钉住 svgExport.mjs 那行）
  writeFileSync(join(dir, "仅资产ID模型.json"), JSON.stringify({
    name: "仅资产ID模型",
    canvasWidth: 400,
    canvasHeight: 300,
    canvasBackgroundColor: "#ffffff",
    nodes: [{ ...imageNode, id: "img2", params: { name: "仅资产ID图元", backgroundImageAssetId: svgExportImageId } }],
    edges: []
  }), "utf-8");
  // 背景页用例：背景模型 idx=91（含一个母排与两个图层），宿主模型引用它并只显示 default 层
  writeFileSync(join(dir, "背景模型.json"), JSON.stringify({
    version: 1,
    name: "背景模型",
    idx: 91,
    canvasWidth: 600,
    canvasHeight: 300,
    canvasBackgroundColor: "#eeeeee",
    layers: [
      { id: "default", name: "默认图层", visible: true },
      { id: "hid", name: "隐藏图层", visible: true }
    ],
    activeLayerId: "default",
    nodes: [
      { ...busNode, layerId: "default" },
      // 隐藏层节点取可区分的名称：服务端渲染按 params.idx 生成设备 id（bus1 之类原始 id 不落进 SVG），
      // 只有名称/标签能证明「隐藏层设备未出现」
      { ...busNode, id: "bus-hidden", name: "隐藏母排", layerId: "hid", params: { ...busNode.params, name: "隐藏母排" } }
    ],
    edges: []
  }), "utf-8");
  writeFileSync(join(dir, "宿主模型.json"), JSON.stringify({
    version: 1,
    name: "宿主模型",
    idx: 92,
    canvasWidth: 800,
    canvasHeight: 400,
    canvasBackgroundColor: "#ffffff",
    backgroundProjectIdx: 91,
    backgroundLayerIds: ["default"],
    nodes: [breakerNode],
    edges: []
  }), "utf-8");
  writeFileSync(join(dir, "悬空背景模型.json"), JSON.stringify({
    version: 1,
    name: "悬空背景模型",
    idx: 93,
    canvasWidth: 800,
    canvasHeight: 400,
    backgroundProjectIdx: 999,
    backgroundLayerIds: ["default"],
    nodes: [breakerNode],
    edges: []
  }), "utf-8");
  // 背景模型自带画布背景图（assetId + 后端 href 双写，与落盘形态一致）：
  // 宿主导出须把这张图也内联，否则背景页图层不自包含
  writeFileSync(join(dir, "带图背景模型.json"), JSON.stringify({
    version: 1,
    name: "带图背景模型",
    idx: 94,
    canvasWidth: 600,
    canvasHeight: 300,
    canvasBackgroundColor: "#eeeeee",
    canvasBackgroundImage: apiPath(`/images/${svgExportImageId}`),
    canvasBackgroundImageAssetId: svgExportImageId,
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default",
    nodes: [busNode],
    edges: []
  }), "utf-8");
  writeFileSync(join(dir, "引用带图背景模型.json"), JSON.stringify({
    version: 1,
    name: "引用带图背景模型",
    idx: 95,
    canvasWidth: 800,
    canvasHeight: 400,
    canvasBackgroundColor: "#ffffff",
    backgroundProjectIdx: 94,
    backgroundLayerIds: ["default"],
    nodes: [breakerNode],
    edges: []
  }), "utf-8");
  // —— backgroundProjectIdx 非法值 / 自引用种子 ——
  // 判据（svgExport.mjs buildBackgroundPageOption）：
  //   const backgroundIdx = Number(project?.backgroundProjectIdx);
  //   if (!Number.isSafeInteger(backgroundIdx) || backgroundIdx <= 0 || Number(project?.idx) === backgroundIdx) return 空;
  // 非法值在 findSchemeProjectRecordByIndex 之前就被短路，故这些模型「照常导出 + 零 warning」。
  // 注意：磁盘 JSON 无法承载 NaN（JSON.stringify 会写成 null，Number(null) 走 <= 0 分支而非 isSafeInteger），
  // 故 NaN 用非数字字符串制造（Number("不是数字") === NaN），并另配一个「数字但非安全整数」覆盖 isSafeInteger。
  const illegalIdxSeed = (fileName, name, idx, backgroundProjectIdx) => writeFileSync(join(dir, fileName), JSON.stringify({
    version: 1,
    name,
    idx,
    canvasWidth: 800,
    canvasHeight: 400,
    canvasBackgroundColor: "#ffffff",
    backgroundProjectIdx,
    backgroundLayerIds: ["default"],
    nodes: [breakerNode],
    edges: []
  }), "utf-8");
  illegalIdxSeed("零值背景模型.json", "零值背景模型", 96, 0);
  illegalIdxSeed("负值背景模型.json", "负值背景模型", 97, -5);
  illegalIdxSeed("小数背景模型.json", "小数背景模型", 98, 91.5);
  illegalIdxSeed("非数字背景模型.json", "非数字背景模型", 99, "不是数字");
  // Number("9007199254740993") = 9007199254740992，超出安全整数上限 → isSafeInteger 为 false
  illegalIdxSeed("超大背景模型.json", "超大背景模型", 100, "9007199254740993");
  // 自引用：backgroundProjectIdx === 自身 idx（种子工厂传同一个值）
  illegalIdxSeed("自引用背景模型.json", "自引用背景模型", 101, 101);
  // 对照组：真悬空（idx 997 落盘无此模型）→ 必产生一条 warning，用来证明 warn spy 通道本身有效，
  // 否则「非法值零 warning」这条断言可能是 spy 失灵导致的假绿
  illegalIdxSeed("对照悬空模型.json", "对照悬空模型", 102, 997);
  // 宿主不落 backgroundLayerIds 键（键缺席，非空数组、非数组）：normalizeProjectForStorage
  // 对未知键原样透传，故 svgExport.mjs 的 `Array.isArray(project.backgroundLayerIds) ? … : []`
  // 会走 `: []` 兜底 → 可见图层集合为空 → 背景模型全部图层不可见。
  writeFileSync(join(dir, "无图层引用宿主模型.json"), JSON.stringify({
    version: 1,
    name: "无图层引用宿主模型",
    idx: 103,
    canvasWidth: 800,
    canvasHeight: 400,
    canvasBackgroundColor: "#ffffff",
    backgroundProjectIdx: 91,
    // 故意不写 backgroundLayerIds
    nodes: [breakerNode],
    edges: []
  }), "utf-8");
  // 背景模型不落 canvasBackgroundColor 键 → svgExport.mjs 的 `?? undefined` 兜底生效，
  // 背景页底色回落渲染器默认（而非宿主 #ffffff）
  writeFileSync(join(dir, "无底色背景模型.json"), JSON.stringify({
    version: 1,
    name: "无底色背景模型",
    idx: 104,
    canvasWidth: 600,
    canvasHeight: 300,
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default",
    nodes: [busNode],
    edges: []
  }), "utf-8");
  writeFileSync(join(dir, "引用无底色背景模型.json"), JSON.stringify({
    version: 1,
    name: "引用无底色背景模型",
    idx: 105,
    canvasWidth: 800,
    canvasHeight: 400,
    canvasBackgroundColor: "#ffffff",
    backgroundProjectIdx: 104,
    backgroundLayerIds: ["default"],
    nodes: [breakerNode],
    edges: []
  }), "utf-8");

  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

const schemePath = encodeSchemePath(["测试方案"]);

async function fetchSvg(name) {
  const response = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent(name)}`);
  expect(response.status).toBe(200);
  return response.text();
}

describe(`${svgPath} 参数校验与错误路径`, () => {
  test("缺 schemePath → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${svgPath}?name=x`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("缺 name → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("模型不存在 → 404 not-found", async () => {
    const res = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("不存在")}`);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not-found");
  });

  test("colorMode 非法 → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("开关模型")}&colorMode=rainbow`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });
});

describe(`${svgPath} 正路径`, () => {
  test("共享 buildSvgDocument 渲染：含图元符号与状态图标，no-store 不参与缓存", async () => {
    const res = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("开关模型")}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    // 行为变更：旧实现 no-cache（ETag 协商缓存），新实现 no-store（与 v1 运行时态一致）
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(text).toContain("<svg");
    expect(text).toContain("bus-glyph");
    // 内置库模板已透传 → 断路器开关状态符号（模板合并丢失时会消失；旧简化实现自带状态符号，不能用于区分渲染器）
    expect(text).toContain("ac-breaker_state_");
    // 新渲染器独有结构标记：图层定义组（旧简化实现不产出）——防「整体换回旧 buildSvgFile」而本测试仍绿
    expect(text).toContain('class="export-layer-definitions"');
  });

  test("colorMode 缺省等于 energy（旧契约），voltage 可选且着色不同", async () => {
    const url = `${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("开关模型")}`;
    const defaultText = await (await fetch(url)).text();
    const energyText = await (await fetch(`${url}&colorMode=energy`)).text();
    const voltageText = await (await fetch(`${url}&colorMode=voltage`)).text();
    expect(defaultText).toContain("<svg");
    // 缺省必须保持第三方契约的 energy 行为
    expect(defaultText).toBe(energyText);
    expect(voltageText).toContain("<svg");
    expect(voltageText).not.toBe(energyText);
    // 电压配色独有：按 vbase 生成 kv10 样式类（种子母线端子 vbase=10）
    expect(voltageText).toContain("kv10");
    expect(energyText).not.toContain("kv10");
  });

  test("模型无 canvasBackgroundColor 时用渲染器默认底色", async () => {
    const res = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("无底色模型")}`);
    expect(res.status).toBe(200);
    // 渲染器默认 DEFAULT_CANVAS_BACKGROUND（前端侧同值），后端不再写 "#f8fafc" 第二份默认
    expect(await res.text()).toContain('fill="#f1f5f9"');
  });

  test("deviceDefinitionOverrides 生效：改写内置模板状态定义后 SVG 随之变化", async () => {
    const url = `${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("开关模型")}`;
    const baseline = await (await fetch(url)).text();
    // 基线：内置 ac-breaker 模板自带开/合状态定义
    expect(baseline).toContain("ac-breaker_state_");
    const libraryDir = join(dataDir, "device-library");
    const libraryPath = join(libraryDir, "library.json");
    try {
      mkdirSync(libraryDir, { recursive: true });
      writeFileSync(libraryPath, JSON.stringify({
        schemaVersion: 4,
        customDeviceTemplates: [],
        // 覆盖字段真名：deviceDefinitionOverrides（readDeviceLibraryConfig 归一化后原样返回）
        deviceDefinitionOverrides: {
          "ac-breaker": { kind: "ac-breaker", stateDefinitions: [] }
        }
      }), "utf-8");
      const overridden = await (await fetch(url)).text();
      // 覆盖被套用 → 状态定义清空后不再产出状态符号（未套用覆盖时与 baseline 逐字相同）
      expect(overridden).not.toBe(baseline);
      expect(overridden).not.toContain("ac-breaker_state_");
    } finally {
      rmSync(libraryPath, { force: true });
    }
    // 清理后回归基线，避免污染同文件其它用例
    expect(await (await fetch(url)).text()).toBe(baseline);
  });

  test("被引用的后端图片内联为 data URL：响应含 data:image/ 且不含后端图片 URL", async () => {
    const res = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("图片模型")}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    // 画布背景与图元背景都引用同一张图 → 内联的就是种子里那张 1×1 PNG
    expect(text).toContain("data:image/png;base64,");
    expect(text).toContain(PNG_1X1_BASE64);
    // 不再残留指向后端的 href（离线/拷贝到别处打开时必须仍能显示）
    expect(text).not.toContain(`${apiPath("/images")}/`);
  });

  test("仅 assetId（无 href）的图元也内联：由 imageAssets 映射解析出图", async () => {
    const res = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("仅资产ID模型")}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    // 该图元没有可替换的 href，唯一来源是传给 buildSvgDocument 的 imageAssets（同映射）→ 删掉那行即丢图
    expect(text).toContain(PNG_1X1_BASE64);
  });

  test("单张图片读取失败不阻断导出：失败者保留原始 href，其余照常内联", async () => {
    const res = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("缺图模型")}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("<svg");
    // 存在的图内联成功
    expect(text).toContain(PNG_1X1_BASE64);
    expect(text).not.toContain(apiPath(`/images/${svgExportImageId}`));
    // 文件丢失的图保留原始 href，不抛错、不影响导出
    expect(text).toContain(apiPath("/images/img-svg-missing"));
  });

  test("配色取自 color-config.json；文件缺失时输出与默认调色板一致", async () => {
    const settingsDir = join(dataDir, "settings");
    const configPath = join(settingsDir, "color-config.json");
    const url = `${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("开关模型")}`;
    // 未提供 color-config.json 的基线（等价于接线前的默认调色板输出）
    const baselineEnergy = await (await fetch(`${url}&colorMode=energy`)).text();
    const baselineVoltage = await (await fetch(`${url}&colorMode=voltage`)).text();
    try {
      mkdirSync(settingsDir, { recursive: true });
      writeFileSync(configPath, JSON.stringify({
        colorDisplayMode: "energy",
        colorPalette: {
          energy: { ac: "#123456" },
          // 电压调色板取键须带类型前缀（voltageLevelColor 优先 typed key，裸 "10" 会被默认 "ac:10" 遮蔽）
          voltage: { "ac:10": "#ff00ff" }
        }
      }), "utf-8");
      const energyText = await (await fetch(`${url}&colorMode=energy`)).text();
      const voltageText = await (await fetch(`${url}&colorMode=voltage`)).text();
      // 两个 colorMode 均使用部署配色
      expect(energyText).not.toBe(baselineEnergy);
      expect(energyText).toContain("#123456");
      expect(voltageText).not.toBe(baselineVoltage);
      expect(voltageText).toContain("#ff00ff");
    } finally {
      rmSync(configPath, { force: true });
    }
    // 回归保护：color-config.json 不存在时回落内置默认调色板，输出与接线前逐字一致
    expect(await (await fetch(`${url}&colorMode=energy`)).text()).toBe(baselineEnergy);
    expect(await (await fetch(`${url}&colorMode=voltage`)).text()).toBe(baselineVoltage);
  });
});

// 背景页重建：宿主模型只落盘 backgroundProjectIdx + backgroundLayerIds，图层由服务端读被引用模型重建
describe(`${svgPath} 背景页重建`, () => {
  test("设了 backgroundProjectIdx 时输出背景页图层，且按 backgroundLayerIds 过滤图层", async () => {
    const text = await fetchSvg("宿主模型");
    expect(text).toContain('class="export-background-page-layer"');
    expect(text).toContain("export_bg_");
    // 转换矩阵非空：背景页按背景模型画布与宿主画布（600×300 → 800×400）缩放
    expect(text).toContain('class="export-background-page-layer" transform="translate(');
    // 背景底色取自背景模型的 canvasBackgroundColor，而非宿主的 #ffffff
    expect(text).toContain("#eeeeee");
    // 可见图层内的母排出现（正向对照），隐藏图层内的母排不出现（图层过滤生效）
    expect(text).toContain("母线1");
    expect(text).not.toContain("隐藏母排");
  });

  test("背景模型的被引用图片并入 imageExportPathById：宿主 SVG 内联背景页的图", async () => {
    const text = await fetchSvg("引用带图背景模型");
    expect(text).toContain('class="export-background-page-layer"');
    // 背景页的 canvasBackgroundImage 被内联为 data URL，且不残留后端 href
    expect(text).toContain(PNG_1X1_BASE64);
    expect(text).not.toContain(`${apiPath("/images")}/${svgExportImageId}`);
  });

  test("无 backgroundProjectIdx 时不输出背景页图层", async () => {
    const text = await fetchSvg("开关模型");
    expect(text).not.toContain("export-background-page-layer");
  });

  test("backgroundProjectIdx 指向已删除模型时静默跳过且返回 200，warning 进程内只记一次", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      // 连打两次：行为不变，且同一悬空 idx 只留一条 warning（进程内去重，防第三方轮询刷日志）
      for (let round = 0; round < 2; round += 1) {
        const response = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("悬空背景模型")}`);
        expect(response.status).toBe(200);
        expect(await response.text()).not.toContain("export-background-page-layer");
      }
      const warnings = warnSpy.mock.calls.filter((call) => String(call[0]).includes("999"));
      expect(warnings).toHaveLength(1);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

// backgroundProjectIdx 非法值与自引用：判据在 svgExport.mjs buildBackgroundPageOption
//   const backgroundIdx = Number(project?.backgroundProjectIdx);
//   if (!Number.isSafeInteger(backgroundIdx) || backgroundIdx <= 0 || Number(project?.idx) === backgroundIdx) → 跳背景页
// 这条判据在 findSchemeProjectRecordByIndex 之前短路，所以这些模型「照常导出 + 零 warning」，
// 与「悬空 idx 记一条 warning」是两类不同的外部行为，分别断言。
describe(`${svgPath} 背景页引用键非法与自引用`, () => {
  // 只认本模块的 warn 通道（[svg-export] 前缀），避免第三方/框架日志污染计数。
  // 但「零 warning」若因 spy 失灵而恒成立就是假绿，故先用对照组证明 spy 有效。
  const captureSvgExportWarns = async (fn) => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const text = await fn();
      const warnings = warnSpy.mock.calls.filter((call) => String(call[0]).includes("[svg-export]"));
      return { text, warnings, totalWarnCalls: warnSpy.mock.calls.length };
    } finally {
      warnSpy.mockRestore();
    }
  };

  // 断言「照常被导出」：宿主自身图元渲染出来（断路器状态符号来自 deviceTemplates 装配）
  const expectHostExported = (text) => {
    expect(text).toContain("<svg");
    expect(text).toContain("ac-breaker_state_");
    // 没有背景页图层：非法/自引用引用键一律跳背景页
    expect(text).not.toContain("export-background-page-layer");
  };

  test("对照组自检：真悬空 idx 会记 warning，证明 warn spy 计数有效", async () => {
    const { text, warnings } = await captureSvgExportWarns(() => fetchSvg("对照悬空模型"));
    expectHostExported(text);
    expect(warnings).toHaveLength(1);
    expect(String(warnings[0][0])).toContain("997");
  });

  test("backgroundProjectIdx 为 0 时跳背景页：照常导出且零 warning", async () => {
    const { text, warnings, totalWarnCalls } = await captureSvgExportWarns(() => fetchSvg("零值背景模型"));
    expectHostExported(text);
    expect(warnings).toHaveLength(0);
    expect(totalWarnCalls).toBe(0);
  });

  test("backgroundProjectIdx 为负数时跳背景页：照常导出且零 warning", async () => {
    const { text, warnings, totalWarnCalls } = await captureSvgExportWarns(() => fetchSvg("负值背景模型"));
    expectHostExported(text);
    expect(warnings).toHaveLength(0);
    expect(totalWarnCalls).toBe(0);
  });

  test("backgroundProjectIdx 为小数时跳背景页：照常导出且零 warning", async () => {
    const { text, warnings, totalWarnCalls } = await captureSvgExportWarns(() => fetchSvg("小数背景模型"));
    expectHostExported(text);
    expect(warnings).toHaveLength(0);
    expect(totalWarnCalls).toBe(0);
  });

  test("backgroundProjectIdx 非数字字符串（Number 得 NaN）时跳背景页：照常导出且零 warning", async () => {
    const { text, warnings, totalWarnCalls } = await captureSvgExportWarns(() => fetchSvg("非数字背景模型"));
    expectHostExported(text);
    expect(warnings).toHaveLength(0);
    expect(totalWarnCalls).toBe(0);
  });

  test("backgroundProjectIdx 超安全整数上限时跳背景页：照常导出且零 warning", async () => {
    const { text, warnings, totalWarnCalls } = await captureSvgExportWarns(() => fetchSvg("超大背景模型"));
    expectHostExported(text);
    expect(warnings).toHaveLength(0);
    expect(totalWarnCalls).toBe(0);
  });

  test("自引用：backgroundProjectIdx 等于自身 idx 时自身背景页被跳过", async () => {
    const { text, warnings, totalWarnCalls } = await captureSvgExportWarns(() => fetchSvg("自引用背景模型"));
    // 宿主本体照常导出（种子 idx=101 且 backgroundProjectIdx=101）
    expectHostExported(text);
    expect(warnings).toHaveLength(0);
    expect(totalWarnCalls).toBe(0);
  });

  // 兜底分支：backgroundLayerIds 键缺席 → `Array.isArray(...) ? … : []` 走 `: []`
  // （分支记在 svgExport.mjs:50 的三元右臂）。
  // 可达性依据：宿主 project 经 normalizeProjectForStorage 时只补齐已知键，未知键
  // backgroundLayerIds 原样透传；读盘路径不碰它，故「不落该键」就能让右侧兜底生效。
  // 形态对应 `: []` 兜底的可观测后果：可见图层集合为空 → 背景模型 default/hid 两层全不可见
  // → 背景页容器仍产出（证明走的是「有背景引用」分支，而非「跳过背景页」）。
  test("backgroundLayerIds 键缺席时兜底为空集合：背景页容器在、背景设备一个不出", async () => {
    const text = await fetchSvg("无图层引用宿主模型");
    // 对照：宿主自身照常导出（若整段 SVG 为空，下面两条 not.toContain 就是假绿）
    expect(text).toContain("ac-breaker_state_");
    // 背景页容器仍在：backgroundProjectIdx=91 合法 → 不是「跳过背景页」分支
    expect(text).toContain('class="export-background-page-layer"');
    expect(text).toContain('class="export-background-page-layer" transform="translate(');
    // 但可见集合为空 → 背景模型里 default 与 hid 两层的母排都不出现
    expect(text).not.toContain("母线1");
    expect(text).not.toContain("隐藏母排");
  });
});

// —— 打桩上游读盘层，覆盖被 normalize* 恒赋值挡死的兜底分支 ——
// 真实读盘路径（readSchemeProjectFile → normalizeProjectForStorage → hydrateProject）恒把
// nodes/edges 补成真数组、恒把 record.project 补成对象；readDeviceLibraryConfig 恒返回
// normalizeDeviceLibraryConfig 的完整产物。故 svgExport.mjs 里这些兜底右臂
//   `record.project ?? {}` / `Array.isArray(project.nodes|project.edges) ? … : []`
//   / `library.customDeviceTemplates ?? []` / `library.deviceDefinitionOverrides ?? {}`
// 在集成路径上不可达 —— 「让磁盘 JSON 少写一个键」根本到不了它们（上游先补上了）。
// 于是改用打桩：把 server.mjs 的读盘函数换成返回值可控的桩，直接对新求值出的
// svgExport.mjs 实例调 renderSavedModelSvg，观察兜底本身的行为。
//
// 桩用 vi.doMock（局部生效）而非 vi.mock（文件级提升）：本文件顶部的集成 describe 已经
// 起了一个真实 server，vi.mock 会把它依赖的 server.mjs 一起替换掉。
// vi.resetModules() 清空模块注册表 → 下面这个静态 specifier 每次都会重新求值，
// 也就重新执行 svgExport.mjs 顶层的 `await import("./server.mjs")`（拿到新桩）。
// 写不成模板字符串：Vite 的 dynamic-import-helper 解析不了变量 import，
// 会抛 "Unknown variable dynamic import"（实测）。
async function renderSavedModelSvgWithStubs(stubs) {
  vi.resetModules();
  vi.doMock("./server.mjs", async (importOriginal) => ({ ...(await importOriginal()), ...stubs }));
  try {
    const mod = await import("./svgExport.mjs");
    return await mod.renderSavedModelSvg({ parts: encodeSchemePath(["打桩方案"]), name: "打桩模型" });
  } finally {
    // 顺序要紧：先 doUnmock 撤掉注册，再 resetModules 把注册表里那份「被桩过的 server.mjs」
    // 缓存冲掉。只 doUnmock 不够 —— 注册表里缓存的仍是桩版，而本文件顶部起的真实 server
    // 走的是同一份 server.mjs 命名空间，实测会连带被桩掉（后续 fetchSvg 拿到打桩数据）。
    vi.doUnmock("./server.mjs");
    vi.resetModules();
  }
}

// 兜底探测用宿主模型：kind 用内置库里的 ac-breaker（断路器自带状态定义，
// 渲染出 ac-breaker_state_ 即证明 deviceTemplates 已装配到位 —— 库模板相关的兜底要靠它观察）
const stubProject = (extra = {}) => ({
  name: "打桩模型",
  canvasWidth: 400,
  canvasHeight: 300,
  canvasBackgroundColor: "#ffffff",
  nodes: [breakerNode],
  edges: [],
  ...extra
});

describe(`${svgPath} 上游归一化挡死的兜底（打桩读盘层）`, () => {
  // 桩自检：打桩返回的 canvasWidth=321 在磁盘上不存在任何对应模型，
  // 它出现在 viewBox 里才能证明下面每条用例测的确实是桩喂进来的数据。
  test("桩自检：打桩 project 的 canvasWidth 出现在 viewBox", async () => {
    const result = await renderSavedModelSvgWithStubs({
      readSchemeProjectRecord: async () => ({ name: "打桩模型", project: stubProject({ canvasWidth: 321 }) })
    });
    expect(result.error).toBeUndefined();
    expect(result.svg).toContain('viewBox="0,0,321,300"');
  });

  // 覆盖 `record.project ?? {}`（L95）+ `Array.isArray(project.nodes) ? … : []`（L106）
  // + `Array.isArray(project.edges) ? … : []`（L128）三条兜底的右臂。
  // 三条都在同一次调用里被触到：record 存在但 project 键缺席 → 兜底空对象 →
  // 它的 nodes/edges 都是 undefined → 两个 Array.isArray 兜底再各给一个空数组。
  test("record 缺 project 键时兜底空对象：画布落默认 1920×1024，无图元无连线", async () => {
    const result = await renderSavedModelSvgWithStubs({
      readSchemeProjectRecord: async () => ({ name: "打桩模型" })
    });
    expect(result.error).toBeUndefined();
    // canvasWidth/canvasHeight 取自兜底空对象 → undefined → canvasBoundsOf 落渲染器默认
    expect(result.svg).toContain('viewBox="0,0,1920,1024"');
    // nodes 兜底空数组 → 无母排无断路器
    expect(result.svg).not.toContain("bus-glyph");
    expect(result.svg).not.toContain("ac-breaker_state_");
    // edges 兜底空数组 → 无连线（source-dev-id 只出现在边 <path> 上）
    expect(result.svg).not.toContain("source-dev-id=");
    // 背景引用键也取自同一个兜底空对象 → Number(undefined)=NaN → 跳背景页（不抛）
    expect(result.svg).not.toContain("export-background-page-layer");
  });

  // 覆盖 `library.customDeviceTemplates ?? []`（L102）的右臂。
  // 桩里显式给 deviceDefinitionOverrides（键在）→ 同一行左侧的 `?? {}` 不取兜底，
  // 于是一条变异只该打红本条、碰不到下面 deviceDefinitionOverrides 那条。
  test("库配置缺 customDeviceTemplates 键时兜底空数组：模板集只剩内置库", async () => {
    const result = await renderSavedModelSvgWithStubs({
      readSchemeProjectRecord: async () => ({ name: "打桩模型", project: stubProject() }),
      readDeviceLibraryConfig: async () => ({ exists: true, deviceDefinitionOverrides: {} })
    });
    expect(result.error).toBeUndefined();
    // 兜底空数组 → 自定义模板一条都不装配，内置 ac-breaker 模板照常出状态符号
    expect(result.svg).toContain("ac-breaker_state_");
  });

  // 覆盖 `library.deviceDefinitionOverrides ?? {}`（L103）的右臂。
  // 桩里显式给 customDeviceTemplates（键在）→ L102 那行不取兜底，两条互不干扰。
  test("库配置缺 deviceDefinitionOverrides 键时兜底空对象：无覆盖生效，状态定义仍在", async () => {
    const result = await renderSavedModelSvgWithStubs({
      readSchemeProjectRecord: async () => ({ name: "打桩模型", project: stubProject() }),
      readDeviceLibraryConfig: async () => ({ exists: true, customDeviceTemplates: [] })
    });
    expect(result.error).toBeUndefined();
    expect(result.svg).toContain("ac-breaker_state_");
  });

  // 覆盖 `Array.isArray(project.nodes) ? project.nodes : []`（L106）的右臂：
  // project 键在（故 L95 不取兜底）、nodes 是非数组（故 L106 走右臂）。
  test("project.nodes 为非数组时兜底空数组：出图但无任何图元", async () => {
    const result = await renderSavedModelSvgWithStubs({
      readSchemeProjectRecord: async () => ({ name: "打桩模型", project: stubProject({ nodes: "不是数组" }) })
    });
    expect(result.error).toBeUndefined();
    expect(result.svg).toContain("<svg");
    expect(result.svg).not.toContain("bus-glyph");
    expect(result.svg).not.toContain("ac-breaker_state_");
  });

  // 覆盖 `Array.isArray(project.edges) ? project.edges : []`（L128）的右臂。
  // 判据形态是「结构有无」：边 <path> 才带 source-dev-id。先用同一条边的数组形态做正向对照，
  // 证明这个标记真的会出现在输出里（否则下面的 not.toContain 就是恒真的空断言），
  // 再看非数组形态下它是否消失。
  test("project.edges 为非数组时兜底空数组：出图但无连线（数组形态作正向对照）", async () => {
    const edge = { id: "e1", sourceId: "br1", targetId: "bus1", sourceTerminalId: "t1", targetTerminalId: "t1" };
    const withArrayEdges = await renderSavedModelSvgWithStubs({
      readSchemeProjectRecord: async () => ({ name: "打桩模型", project: stubProject({ nodes: [breakerNode, busNode], edges: [edge] }) })
    });
    expect(withArrayEdges.error).toBeUndefined();
    // 正向对照：真数组形态下连线标记确实出现
    expect(withArrayEdges.svg).toContain("source-dev-id=");

    const result = await renderSavedModelSvgWithStubs({
      readSchemeProjectRecord: async () => ({ name: "打桩模型", project: stubProject({ nodes: [breakerNode, busNode], edges: { 0: edge } }) })
    });
    expect(result.error).toBeUndefined();
    expect(result.svg).toContain("<svg");
    // 非数组 → 兜底空数组 → 一条连线都不画
    expect(result.svg).not.toContain("source-dev-id=");
  });

  // 覆盖 `backgroundProject.edges ?? []`（L58）的右臂。
  // 可达性依据：edges 是 normalizeProjectLayers 唯一**不**重写的字段（layers/nodes 都被
  // 重写成数组），所以只要背景记录打桩成 edges: null 就能让它原样透到那一行。
  // 判据形态仍是「结构有无」：背景页里的连线才带 source-dev-id；宿主 edges 为空，
  // 故输出里出现 source-dev-id 只可能来自背景页。
  test("背景记录 edges 缺键时兜底空数组：背景页照出、无连线（数组形态作正向对照）", async () => {
    const edge = { id: "e1", sourceId: "br1", targetId: "bus1", sourceTerminalId: "t1", targetTerminalId: "t1" };
    const backgroundProject = (extra = {}) => ({
      name: "打桩背景",
      canvasWidth: 600,
      canvasHeight: 300,
      layers: [{ id: "default", name: "默认图层", visible: true }],
      activeLayerId: "default",
      nodes: [breakerNode, busNode],
      edges: [],
      ...extra
    });
    const host = stubProject({ backgroundProjectIdx: 91, backgroundLayerIds: ["default"] });

    const withArrayEdges = await renderSavedModelSvgWithStubs({
      readSchemeProjectRecord: async () => ({ name: "打桩模型", project: host }),
      findSchemeProjectRecordByIndex: async () => ({ name: "打桩背景", project: backgroundProject({ edges: [edge] }) })
    });
    expect(withArrayEdges.error).toBeUndefined();
    // 正向对照：背景边是数组时，背景页里确实画出了连线
    expect(withArrayEdges.svg).toContain("source-dev-id=");
    expect(withArrayEdges.svg).toContain("母线1");

    const result = await renderSavedModelSvgWithStubs({
      readSchemeProjectRecord: async () => ({ name: "打桩模型", project: host }),
      findSchemeProjectRecordByIndex: async () => ({ name: "打桩背景", project: backgroundProject({ edges: null }) })
    });
    expect(result.error).toBeUndefined();
    // 背景页仍在、背景设备仍在（证明走的是「重建背景页」而非「跳过背景页」）
    expect(result.svg).toContain('class="export-background-page-layer"');
    expect(result.svg).toContain("母线1");
    // edges 缺键 → 兜底空数组 → 背景页一条连线都不画
    expect(result.svg).not.toContain("source-dev-id=");
  });
});

// 覆盖 `backgroundProject.canvasBackgroundColor ?? undefined`（L77）的右臂。
// 可达性依据：背景模型不落 canvasBackgroundColor 键 → normalizeProjectForStorage
// 不补这个未知键 → 归一化透传 undefined → 兜底生效 → 背景页底色落渲染器默认
// （DEFAULT_CANVAS_BACKGROUND），而不是宿主自己的 #ffffff。
describe(`${svgPath} 背景页底色兜底`, () => {
  test("背景模型不落 canvasBackgroundColor 时兜底 undefined：背景页用渲染器默认底色", async () => {
    const text = await fetchSvg("引用无底色背景模型");
    // 背景页容器在（backgroundProjectIdx=104 合法）→ 不是「跳过背景页」分支
    expect(text).toContain('class="export-background-page-layer"');
    // 背景模型缺该键 → 兜底 undefined → 渲染器回落自身默认 #f1f5f9
    expect(text).toContain('fill="#f1f5f9"');
  });
});

// 记录两条在本仓上游恒赋值下不可达的兜底（不写空断言占位）：
//   L52 `backgroundProject.layers ?? []` —— backgroundProject 来自
//        normalizeProjectLayers(record.project)，其 layers 是 normalizeModelLayers 的返回值，
//        恒为数组（缺 layers 时 normalizeModelLayers 自己造 default 层）。
//   L57 `backgroundProject.nodes ?? []` —— normalizeProjectLayers 内 `project.nodes.map(...)`
//        对缺 nodes 直接抛 TypeError，永不返回缺 nodes 的对象。
//   L58 `backgroundProject.edges ?? []` —— edges 未被 normalizeProjectLayers 重写，
//        但上游 normalizeProjectForStorage:2946 恒产出数组，故集成路径同样到不了右臂；
//        仍可用打桩 findSchemeProjectRecordByIndex 覆盖（见上）。
//   L52/L57 要覆盖，前提是上游 normalizeProjectLayers 停止兜底；那时把本段改成真用例。

// —— 变异验证：上列 8 条断言逐条被证明会红 ——
// 注入器读 tmp/ai-svg-mut.json（8 行「旧行数组 → 新行数组」），按整行相等计数替换，
// 命中 0 次 / >1 次 / old 与 neu 相同一律 exit(1) 不注入；注入后回读被改的那行。
// 变异形态一律匹配断言的观测层：看结构「有无」的就换兜底内容（造出一条本不该有的
// 连线 / 图元），看颜色的就换兜底颜色。8/8 全红，且全是 AssertionError（无一是
// TypeError，说明红的原因确实是被验的契约本身，不是「删守卫后崩了」）。
//
//   行   兜底改动                                    红在哪条断言
//   50   `: []` → `: ["default"]`                     not.toContain("母线1")（背景设备冒出来了）
//   58   `?? []` → `?? [一条边]`                       not.toContain("source-dev-id=")
//   77   `?? undefined` → `?? "#123456"`               toContain('fill="#f1f5f9"')
//   95   `?? {}` → `?? { canvasWidth:111, canvasHeight:222 }`  toContain('viewBox="0,0,1920,1024"')
//   102  `?? []` → `?? [遮蔽 ac-breaker 的自定义模板]`     toContain("ac-breaker_state_")
//   103  `?? {}` → `?? { "ac-breaker": { stateDefinitions: [] } }`  同上
//   106  `: []` → `: [一个 ac-bus]`                     not.toContain("bus-glyph")
//   128  `: []` → `:[一条边]`                           not.toContain("source-dev-id=")
//   （106 同时让 L95 那条转红：record 缺 project 时 nodes 兜底也会生效，两条断言
//     各自独立地在自己的兜底上咬住，故记录为 2 failed。）
//
// L77 一条要留个反记：动手前曾判定 `?? undefined` 与 `?? backgroundProject?.canvasBackgroundColor`
//（下游 src/export/svg.ts:368 那条同款 `??`）互为「可证等价」，理由是兜底产 undefined 而下游
// 会重新供给同一值。**该判定是错的**，实测红：兜底一旦产出非 nullish 的值，下游那条 `??`
// 就不再触发，渲染器默认底色 `#f1f5f9` 被顶掉。记在这里，免得下一个人重推一遍。

