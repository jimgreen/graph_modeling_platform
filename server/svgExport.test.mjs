// /webgrp/v1/schemes/model/svg 适配层测试：
// 1) 单元：直载 src/export/svg.ts（Node 原生 TS）验证 buildSvgDocument 纯函数；
// 2) 集成：GRAPH_MODEL_DATA_DIR 指向 tmpdir 种子数据 → 起真实 server（端口 0）→ 400/404/200 全链路。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
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
