// /webgrp/v1/schemes/model/e-file 适配层测试：
// tmpdir 种子（模型 + 库配置）→ GRAPH_MODEL_DATA_DIR → 起真实 server（端口 0）→ 端点到共享装配逐字比对。
// 关键锚点：适配层必须用「生效库」（内置 + 自定义 + 覆盖）装配库模板，否则输出与共享装配不一致。
// （仅传自定义模板时内置类无法匹配：列集/列序错位、`?template=` 整段丢失。）
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import iconv from "iconv-lite";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

const eFilePath = apiPath("/v1/schemes/model/e-file");
const scheme = "测试方案";
const schemePath = encodeSchemePath([scheme]);
const modelName = "厂站模型";

let dataDir;
let server;
let baseUrl;

function device(id, kind, name, params, terminals = []) {
  return {
    id,
    kind,
    name,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 40 },
    rotation: 0,
    scale: 1,
    layerId: "default",
    terminals,
    params: { name, ...params }
  };
}

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "e-file-export-"));
  const dir = join(dataDir, "schemes", "files", scheme);
  mkdirSync(dir, { recursive: true });
  // 内置类设备：母线/断路器/负荷/线路 —— 只有「生效库」才带得出这些内置类的段与列
  writeFileSync(join(dir, `${modelName}.json`), JSON.stringify({
    name: modelName,
    modelType: "厂站",
    idx: 1,
    canvasWidth: 800,
    canvasHeight: 400,
    nodes: [
      device("bus1", "ac-bus", "母线一", { vbase: "10" }, [
        { id: "t1", anchor: { x: 0.5, y: 0.5 }, type: "ac", nodeNumber: "1", vbase: "10" }
      ]),
      device("br1", "ac-breaker", "开关一", { status: "1" }, [
        { id: "t1", anchor: { x: 0.5, y: 0 }, type: "ac", nodeNumber: "2" },
        { id: "t2", anchor: { x: 0.5, y: 1 }, type: "ac", nodeNumber: "3" }
      ]),
      device("load1", "ac-load", "负荷一", { vbase: "10" }, [
        { id: "t1", anchor: { x: 0.5, y: 0 }, type: "ac", nodeNumber: "4" }
      ]),
      device("line1", "ac-line", "线路一", { vbase: "10" }, [
        { id: "t1", anchor: { x: 0, y: 0.5 }, type: "ac", nodeNumber: "5" },
        { id: "t2", anchor: { x: 1, y: 0.5 }, type: "ac", nodeNumber: "6" }
      ])
    ],
    edges: []
  }), "utf-8");
  // 未知 kind（无对应 E 段定义）→ 生成器产出「未导出设备」告警，经响应头侧信道带回
  writeFileSync(join(dir, "告警模型.json"), JSON.stringify({
    name: "告警模型",
    modelType: "其他",
    idx: 2,
    canvasWidth: 400,
    canvasHeight: 300,
    nodes: [
      device("bus1", "ac-bus", "母线一", { vbase: "10" }, [
        { id: "t1", anchor: { x: 0.5, y: 0.5 }, type: "ac", nodeNumber: "1", vbase: "10" }
      ]),
      device("u1", "unknown-kind-xyz", "未知设备", {})
    ],
    edges: []
  }), "utf-8");
  // 长中文名 + 多条目：告警头必须按编码后长度封顶（仅按条数截 20 不够）
  const longNameNode = (index) => device(
    `long-${index}`,
    "unknown-kind-long",
    `长名${index}-${"长".repeat(200)}`,
    {}
  );
  writeFileSync(join(dir, "长名告警模型.json"), JSON.stringify({
    name: "长名告警模型",
    modelType: "其他",
    idx: 3,
    canvasWidth: 400,
    canvasHeight: 300,
    nodes: Array.from({ length: 30 }, (_unused, index) => longNameNode(index)),
    edges: []
  }), "utf-8");
  // 单条即超上限：只回总数（不带 items）
  writeFileSync(join(dir, "超长名告警模型.json"), JSON.stringify({
    name: "超长名告警模型",
    modelType: "其他",
    idx: 4,
    canvasWidth: 400,
    canvasHeight: 300,
    nodes: [device("huge-1", "unknown-kind-huge", `超长${"超".repeat(1000)}`, {})],
    edges: []
  }), "utf-8");
  // 库配置：一个自定义模板 + 一条内置类（ac-bus）的元件定义覆盖 —— 覆盖只有经生效库才可能落到内置类上
  const libDir = join(dataDir, "device-library");
  mkdirSync(libDir, { recursive: true });
  writeFileSync(join(libDir, "library.json"), JSON.stringify({
    schemaVersion: 4,
    customDeviceTemplates: [{
      kind: "custom-wind-test",
      label: "自定义风机",
      custom: true,
      size: { width: 60, height: 60 },
      params: { name: "自定义风机" }
    }],
    deviceDefinitionOverrides: {
      "ac-bus": {
        kind: "ac-bus",
        parameterDefinitions: [{
          cnName: "覆盖列",
          enName: "override_col",
          valueType: "string",
          typicalValue: "覆盖值",
          exportEnabled: true
        }]
      }
    }
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

// 与适配层同源装配：读盘模型 + 生效库 → 共享装配文本（适配层输出必须逐字一致）
async function sharedAssemblyText() {
  const { readSchemeProjectRecord, readDeviceLibraryConfig } = await import("./server.mjs");
  const { buildEffectiveLibraryTemplates } = await import("../src/export/device-definition-shared.ts");
  const { buildEFileExportOptionsFromLibrary } = await import("../src/export/e-file.ts");
  const { buildEFileExport } = await import("../src/model-eexport.ts");
  const record = await readSchemeProjectRecord({ schemePath: [scheme], name: modelName });
  const library = await readDeviceLibraryConfig();
  const options = buildEFileExportOptionsFromLibrary({
    libraryTemplates: buildEffectiveLibraryTemplates(
      library.customDeviceTemplates ?? [],
      library.deviceDefinitionOverrides ?? {}
    ),
    labels: undefined
  });
  return buildEFileExport(record.project, [scheme], options);
}

async function fetchText(path) {
  const res = await fetch(`${baseUrl}${path}`);
  expect(res.status).toBe(200);
  return iconv.decode(Buffer.from(await res.arrayBuffer()), "gbk");
}

describe(`${eFilePath} GBK 与库模板装配`, () => {
  test("默认 GBK 字节经 iconv 解码含中文模型名", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${schemePath}&name=${encodeURIComponent(modelName)}`
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("charset=gbk");
    const text = iconv.decode(Buffer.from(await res.arrayBuffer()), "gbk");
    expect(text).toContain(modelName);
    expect(text).not.toContain("�");
  }, 30000);

  test("无模板：端点输出逐字等于共享装配（生效库）输出，且含覆盖列", async () => {
    const text = await fetchText(
      `${eFilePath}?schemePath=${schemePath}&name=${encodeURIComponent(modelName)}`
    );
    const { text: expected } = await sharedAssemblyText();
    expect(text).toBe(expected);
    // ac-bus 的元件定义覆盖列：只有「内置 + 自定义 + 覆盖」的生效库才可能落到内置类上
    expect(text).toContain("override_col");
  }, 30000);

  test("预定义模板：内置类段（node/line/load）不丢失", async () => {
    const text = await fetchText(
      `${eFilePath}?schemePath=${schemePath}&name=${encodeURIComponent(modelName)}&template=${encodeURIComponent("国网E格式")}`
    );
    // 模板推导需在内置类（ACNode/ACRealBs/ACGenerator/…）上匹配：库模板只有自定义时 matched=[]，
    // 这些设备段会整段消失（只剩 basevalue 等公共段）
    expect(text).toContain("<node>");
    expect(text).toContain("<line>");
    expect(text).toContain("<load>");
    expect(text).toContain(modelName);
  }, 30000);
});

describe(`${eFilePath} 未导出设备告警侧信道`, () => {
  test("有未导出设备时响应头带回明细（百分比编码 JSON）", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${schemePath}&name=${encodeURIComponent("告警模型")}`
    );
    expect(res.status).toBe(200);
    const raw = res.headers.get("x-e-file-warnings");
    expect(raw).toBeTruthy();
    const payload = JSON.parse(decodeURIComponent(raw));
    expect(payload.total).toBe(1);
    expect(payload.items[0].nodeName).toBe("未知设备");
    expect(payload.items[0].kind).toBe("unknown-kind-xyz");
  }, 30000);

  test("无未导出设备时不发该头", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${schemePath}&name=${encodeURIComponent(modelName)}`
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-e-file-warnings")).toBeNull();
  }, 30000);

  test("长中文名 30 条：头编码长度封顶、total 真实、可解析", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${schemePath}&name=${encodeURIComponent("长名告警模型")}`
    );
    expect(res.status).toBe(200);
    const raw = res.headers.get("x-e-file-warnings");
    expect(raw).toBeTruthy();
    // 编码后字符数上限 4096（低于 nginx proxy_buffer_size 常见 8KB）
    expect(raw.length).toBeLessThanOrEqual(4096);
    const payload = JSON.parse(decodeURIComponent(raw));
    expect(payload.total).toBe(30);
    // 按长度收条：长名条目放不下 20 条，但至少保留 1 条
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.items.length).toBeLessThan(20);
    expect(payload.items[0].nodeName.length).toBeGreaterThan(200);
  }, 30000);

  test("单条即超上限：只回总数（不带 items），长度远小于上限", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${schemePath}&name=${encodeURIComponent("超长名告警模型")}`
    );
    expect(res.status).toBe(200);
    const raw = res.headers.get("x-e-file-warnings");
    expect(raw).toBeTruthy();
    expect(raw.length).toBeLessThanOrEqual(4096);
    const payload = JSON.parse(decodeURIComponent(raw));
    expect(payload.total).toBe(1);
    expect(payload.items).toBeUndefined();
  }, 30000);
});
