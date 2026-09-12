// /webgrp/v1/schemes/model/cim-xml 适配层测试：
// 1) 单元：直载 src/cim/cim-export.ts（Node 原生 TS）验证 buildCimXml 纯函数；
// 2) 集成：GRAPH_MODEL_DATA_DIR 指向 tmpdir 种子数据 → 起真实 server（端口 0）→ 400/404/200/strict 全链路。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

const cimXmlPath = apiPath("/v1/schemes/model/cim-xml");

// —— 单元：buildCimXml 纯函数 ——
describe("CIM/XML 后端生成", () => {
  test("可直载 src/cim/cim-export.ts", async () => {
    const mod = await import("../src/cim/cim-export.ts");
    expect(typeof mod.buildCimXml).toBe("function");
  });

  test("空模型生成最小 XML 且含 cim 命名空间", async () => {
    const { buildCimXml } = await import("../src/cim/cim-export.ts");
    const xml = buildCimXml([], [], "测试模型", "m1");
    expect(xml).toContain("<cim:");
    expect(xml.startsWith("<?xml")).toBe(true);
  });

  test("母排节点进入 CIM 模型", async () => {
    const { buildCimXml } = await import("../src/cim/cim-export.ts");
    const nodes = [{
      id: "n1",
      kind: "busbar",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 20 },
      params: { name: "母线1", vbase: "10" },
      terminals: []
    }];
    const xml = buildCimXml(nodes, [], "测试模型", "m1");
    expect(xml.length).toBeGreaterThan(100);
  });
});

// —— 集成：真实 server + tmpdir 种子数据 ——
let dataDir;
let server;
let baseUrl;
let createImageServer;

const busbar = (id, name, params) => ({
  id,
  kind: "ac-bus",
  name,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 20 },
  rotation: 0,
  scale: 1,
  terminals: [],
  params: { name, ...params }
});

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "cim-export-"));
  const seed = (scheme, name, project) => {
    const dir = join(dataDir, "schemes", "files", scheme);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(project), "utf-8");
  };
  seed("测试方案", "完整模型", {
    name: "完整模型",
    nodes: [busbar("bus1", "母线1", { i_vbase: "110" })],
    edges: []
  });
  seed("测试方案", "缺参数模型", {
    name: "缺参数模型",
    nodes: [busbar("bus2", "母线2", {})],
    edges: []
  });
  seed("测试方案", "纯静态模型", {
    name: "纯静态模型",
    nodes: [{
      id: "s1",
      kind: "static-text",
      name: "标注",
      position: { x: 0, y: 0 },
      size: { width: 10, height: 10 },
      rotation: 0,
      scale: 1,
      terminals: [],
      params: {}
    }],
    edges: []
  });
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  ({ createImageServer } = await import("./server.mjs"));
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

describe(`${cimXmlPath} 参数校验与错误路径`, () => {
  test("缺 schemePath → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${cimXmlPath}?name=${encodeURIComponent("完整模型")}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("缺 name → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${cimXmlPath}?schemePath=${schemePath}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("模型不存在 → 404 not-found", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("不存在的模型")}`
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not-found");
  });

  test("只有 static-* 节点 → 400 无可导出的电力设备", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("纯静态模型")}`
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("电力设备");
  });
});

describe(`${cimXmlPath} 正路径与 strict 语义`, () => {
  test("完整模型导出 XML（attachment + _CIM16.xml 文件名）", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("完整模型")}`
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(res.headers.get("content-disposition")).toContain("_CIM16.xml");
    const text = await res.text();
    expect(text.startsWith("<?xml")).toBe(true);
    expect(text).toContain("<cim:");
    expect(text).toContain("BusbarSection");
  });

  test("modelId 覆盖默认 idx → 输出 SUB_<modelId>", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("完整模型")}&modelId=my-model-1`
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('rdf:ID="SUB_my-model-1"');
  });

  test("strict=1 且参数齐全 → 200", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("完整模型")}&strict=1`
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<cim:");
  });

  test("strict=1 且缺关键参数 → 400 关键参数缺失", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("缺参数模型")}&strict=1`
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("bad-request");
    expect(body.error.message).toContain("关键参数缺失");
  });

  test("缺参数模型非 strict → 默认导出 200", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("缺参数模型")}`
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<cim:");
  });
});
