// 方案 ZIP 实时生成集成测试：GRAPH_MODEL_DATA_DIR 指向 tmpdir 种子数据 → 起真实 server（端口 0）
// → 断言 ZIP 内 json/e/svg 三件套齐全，且 e/svg 与对应单模型端点输出逐字节一致。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

const busNode = {
  id: "bus1",
  kind: "ac-bus",
  name: "母线1",
  position: { x: 100, y: 100 },
  size: { width: 120, height: 16 },
  rotation: 0,
  scale: 1,
  layerId: "default",
  terminals: [
    { id: "t1", anchor: { x: 0.5, y: 0 }, type: "ac", nodeNumber: "1" },
    { id: "t2", anchor: { x: 0.5, y: 1 }, type: "ac", nodeNumber: "2" }
  ],
  params: { name: "母线1", vbase: "10" }
};

let dataDir;
let server;
let baseUrl;

// 种子模型 JSON：结构齐备（层/节点/边），保证 E 与 SVG 能真实生成
function modelJson(name, idx) {
  return JSON.stringify({
    version: 1,
    name,
    idx,
    modelType: "厂站",
    canvasWidth: 800,
    canvasHeight: 400,
    canvasBackgroundColor: "#ffffff",
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default",
    nodes: [busNode],
    edges: []
  });
}

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "scheme-archive-"));
  const dir = join(dataDir, "schemes", "files", "测试方案");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "厂站.json"), modelJson("厂站", 1), "utf-8");
  // 坏模型单独放一个方案：同方案下有坏模型会让正路径用例（恰好三件套）一并失败
  const badDir = join(dataDir, "schemes", "files", "坏方案");
  mkdirSync(badDir, { recursive: true });
  // 坏 JSON：readSchemeProjectRecord 返回 null → 生成阶段报错，用于验证 500 而非静默跳过
  writeFileSync(join(badDir, "坏模型.json"), "{", "utf-8");
  // 嵌套方案：验证子方案目录层级被保留、ZIP 内路径分隔符统一为 "/"（旧用例覆盖点）
  const nestedDir = join(dataDir, "schemes", "files", "嵌套方案");
  mkdirSync(join(nestedDir, "子方案"), { recursive: true });
  writeFileSync(join(nestedDir, "厂站.json"), modelJson("厂站", 2), "utf-8");
  writeFileSync(join(nestedDir, "子方案", "线路.json"), modelJson("线路", 3), "utf-8");
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

const schemePathParam = () => encodeSchemePath(["测试方案"]);

test("ZIP 内含 json + e + svg 三件套", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${schemePathParam()}`);
  expect(response.status).toBe(200);
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const names = zip.getEntries().map((entry) => entry.entryName).sort();
  expect(names).toEqual([
    "测试方案/厂站.e",
    "测试方案/厂站.json",
    "测试方案/厂站.svg"
  ]);
});

test("ZIP 内 e/svg 与单模型端点输出逐字节一致，json 与磁盘原文一致", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${schemePathParam()}`);
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const read = (entryName) => zip.getEntry(entryName).getData();

  const eUrl = `${baseUrl}${apiPath("/v1/schemes/model/e-file")}?schemePath=${schemePathParam()}&name=${encodeURIComponent("厂站")}&encoding=gbk`;
  const svgUrl = `${baseUrl}${apiPath("/v1/schemes/model/svg")}?schemePath=${schemePathParam()}&name=${encodeURIComponent("厂站")}&colorMode=voltage&encoding=utf-8`;

  expect(read("测试方案/厂站.e").equals(Buffer.from(await (await fetch(eUrl)).arrayBuffer()))).toBe(true);
  expect(read("测试方案/厂站.svg").equals(Buffer.from(await (await fetch(svgUrl)).arrayBuffer()))).toBe(true);
});

test("损坏模型导致整体失败并返回 500，错误信息含模型名", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${encodeSchemePath(["坏方案"])}`);
  expect(response.status).toBe(500);
  const payload = await response.json();
  expect(payload.ok).toBe(false);
  expect(payload.error.message).toContain("坏模型");
});

// 原 server.test.mjs「preserving child scheme folders」用例的接续：新实现按数据根实时生成，
// 不再支持任意 filesRoot，故该覆盖点迁到本文件的 tmpdir 隔离路径下
test("子方案目录层级保留在 ZIP 内，条目路径统一用 / 分隔", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${encodeSchemePath(["嵌套方案"])}`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toContain(encodeURIComponent("嵌套方案.zip"));
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const names = zip.getEntries().map((entry) => entry.entryName);
  expect(names.slice().sort()).toEqual([
    "嵌套方案/厂站.e",
    "嵌套方案/厂站.json",
    "嵌套方案/厂站.svg",
    "嵌套方案/子方案/线路.e",
    "嵌套方案/子方案/线路.json",
    "嵌套方案/子方案/线路.svg"
  ].sort());
});
