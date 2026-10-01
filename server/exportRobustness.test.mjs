// 保存接口接受的模型，必须也能被四种导出格式处理。
//
// PUT /webgrp/schemes/project 不校验 record.project 的结构（手写 JSON、ZIP 导入、
// 外部工具产出都可能缺字段或塞进非对象项），而 SVG / E 文件 / CIM 三条导出链各自
// 按结构假设解引用。实测：一个 `nodes: [null]` 的模型存得进去（200），随后
// json / e-file / svg / cim-xml 四个端点里有三个直接 500：
//
//   Cannot read properties of undefined (reading 'endsWith')   → baseDeviceKind
//   Cannot read properties of undefined (reading 'width')      → visualHalfExtentsForNode
//   Cannot read properties of null (reading 'sourceId')        → synchronizeBusTerminalsWithEdges
//   node.terminals is not iterable                             → cim-builder.nodeVoltageValues
//   Cannot read properties of undefined (reading 'map')        → svg.ts measurementMarkup
//
// 用户视角是「存得好好的，怎么导不出来」，且四个端点给出的是四种不同的内部错误，
// 排查者看不出它们其实是同一个病：存储边界没有把模型归一成「渲染层可无条件解引用」的形状。
// 方案 ZIP 导出更狠：它一次性渲染该方案下每个模型，一个畸形模型就能把整包打挂。
//
// 修法在 normalizeProjectForStorage（读到的模型一律先过它）把形状补齐，
// 而不是给每个渲染点各补一次 `?.`：入口只有一处，所有消费方一次受益。
//
// **注意**：这里的期望是「不 5xx」。畸形模型被归一（丢掉非对象项、缺的字段取默认值）
// 之后导出得出来就已达成目的——正常模型的导出字节必须逐字不变，由既有守卫盯着。
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

const SCHEME_NAME = "畸形模型方案";

let server;
let baseUrl;
let dataDir;
let schemePath;
let schemeFilesRoot;

const EXPORTS = [
  ["json", (name) => apiPath(`/v1/schemes/model/json?schemePath=${schemePath}&name=${encodeURIComponent(name)}`)],
  ["e-file", (name) => apiPath(`/v1/schemes/model/e-file?schemePath=${schemePath}&name=${encodeURIComponent(name)}`)],
  ["svg", (name) => apiPath(`/v1/schemes/model/svg?schemePath=${schemePath}&name=${encodeURIComponent(name)}`)],
  ["cim-xml", (name) => apiPath(`/v1/schemes/model/cim-xml?schemePath=${schemePath}&name=${encodeURIComponent(name)}`)],
  // 方案 ZIP：一次性渲染该方案下**每个**模型，一个畸形模型就能把整包导出打挂，
  // 影响面比单模型端点大得多，故一并钉住。
  ["方案 ZIP", () => apiPath(`/schemes/export?schemePath=${schemePath}`)]
];

// 保存接口的 schemePath 收**原始数组**（读接口才收 encodeSchemePath 后的编码串）
const save = (name, project) =>
  fetch(`${baseUrl}${apiPath("/schemes/project")}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemePath: [SCHEME_NAME], record: { name, project } })
  });

const busNode = {
  id: "b1",
  kind: "ac-bus",
  name: "母线",
  params: { vbase: "10" },
  size: { width: 100, height: 40 },
  position: { x: 0, y: 0 },
  terminals: [{ id: "t1", anchor: { x: 0.5, y: 0.5 }, type: "ac", nodeNumber: "1", vbase: "10" }]
};

// 「保存接口不拒绝、但下游按结构假设解引用」的载荷。全部配一条正常电气节点，
// 保证量测、电压、CIM 映射这些分支真的被走到，而不是靠「模型是空的」侥幸通过。
const CASES = [
  ["nodes 含 null", { nodes: [busNode, null], edges: [] }],
  ["nodes 含字符串", { nodes: [busNode, "ac-bus"], edges: [] }],
  ["nodes 含数字", { nodes: [busNode, 42], edges: [] }],
  ["节点缺 params", { nodes: [{ id: "n1", kind: "ac-bus", name: "母线" }], edges: [] }],
  ["节点 params 为 null", { nodes: [{ id: "n1", kind: "ac-bus", params: null }], edges: [] }],
  ["节点缺 size", { nodes: [{ id: "n1", kind: "ac-bus", params: {} }], edges: [] }],
  ["节点缺 position", { nodes: [{ id: "n1", kind: "ac-bus", params: {}, size: { width: 10, height: 10 } }], edges: [] }],
  ["节点缺 kind", { nodes: [{ id: "n1", params: {} }], edges: [] }],
  ["节点缺 terminals", { nodes: [{ id: "n1", kind: "ac-bus", params: {}, size: { width: 10, height: 10 } }], edges: [] }],
  ["terminals 为 null", { nodes: [{ ...busNode, terminals: null }], edges: [] }],
  ["terminals 含 null", { nodes: [{ ...busNode, terminals: [null] }], edges: [] }],
  ["边含 null", { nodes: [busNode], edges: [null] }],
  ["边缺 from/to", { nodes: [busNode], edges: [{ id: "e1" }] }],
  ["nodes 非数组", { nodes: "abc", edges: [] }],
  ["edges 非数组", { nodes: [busNode], edges: 7 }],
  ["measurements 为字符串", { nodes: [busNode], edges: [], measurements: "x" }],
  ["measurements.groups 含 null", { nodes: [busNode], edges: [], measurements: { groups: [null] } }],
  ["measurements.groups 非数组", { nodes: [busNode], edges: [], measurements: { groups: 5 } }],
  ["顶层非对象字段", { nodes: [busNode], edges: [], layers: null, measurements: null }],
  // ── 第二波：元素本身是对象、但字段类型不对（形状检查挡不住，得靠下游容忍）──
  ["端子缺 type/anchor", { nodes: [{ ...busNode, terminals: [{ id: "t1" }] }], edges: [] }],
  ["端子 vbase 为对象", { nodes: [{ ...busNode, terminals: [{ ...busNode.terminals[0], vbase: {} }] }], edges: [] }],
  ["params 值类型错乱", { nodes: [{ ...busNode, params: { vbase: 10, name: {}, i_p: [], idx: true } }], edges: [] }],
  ["kind 是未知值", { nodes: [{ ...busNode, kind: "根本不存在的外星设备" }], edges: [] }],
  ["kind 为空串", { nodes: [{ ...busNode, kind: "" }], edges: [] }],
  ["size 为字符串", { nodes: [{ ...busNode, size: "100x40" }], edges: [] }],
  ["position 为字符串", { nodes: [{ ...busNode, position: "0,0" }], edges: [] }],
  // 对象本身合法、但里面的数值是字符串 —— 归一化按「已是对象就原样复用」处理，
  // 这类值会一路带着字符串进算术，专门盯它。
  ["size 成员为字符串", { nodes: [{ ...busNode, size: { width: "100", height: "40" } }], edges: [] }],
  ["position 成员为字符串", { nodes: [{ ...busNode, position: { x: "0", y: "0" } }], edges: [] }],
  ["锚点成员为字符串", {
    nodes: [{ ...busNode, terminals: [{ ...busNode.terminals[0], anchor: { x: "0.5", y: "0.5" } }] }],
    edges: []
  }],
  ["size 成员为 null", { nodes: [{ ...busNode, size: { width: null, height: null } }], edges: [] }],
  ["activeLayerId 指向不存在的图层", { nodes: [busNode], edges: [], layers: [{ id: "L1", name: "图层" }], activeLayerId: "L9" }],
  ["canvasWidth 为字符串", { nodes: [busNode], edges: [], canvasWidth: "800", canvasHeight: "600" }],
  ["量测组指向不存在的节点", {
    nodes: [busNode],
    edges: [],
    measurements: { groups: [{ id: "g1", nodeId: "不存在", items: [null] }] }
  }]
];

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "export-robustness-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer, defaultPaths } = await import("./server.mjs");
  schemeFilesRoot = defaultPaths.schemeFiles;
  mkdirSync(join(schemeFilesRoot, SCHEME_NAME), { recursive: true });
  schemePath = encodeSchemePath([SCHEME_NAME]);
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

describe("畸形模型存得进去，就得导得出来", () => {
  for (const [label, project] of CASES) {
    test(`${label}`, async () => {
      const name = `畸形-${label}`;
      const saved = await save(name, { version: 1, modelType: "厂站", ...project });
      expect(saved.status, "前提：保存接口接受这个载荷（它不做结构校验）").toBe(200);

      for (const [format, buildUrl] of EXPORTS) {
        const response = await fetch(`${baseUrl}${buildUrl(name)}`);
        const body = await response.text();
        expect(
          response.status,
          `${format} 端点对「${label}」回 5xx：${body.slice(0, 200)}`
        ).toBeLessThan(500);
      }
    });
  }
});

describe("归一化只补形状，不丢正常模型", () => {
  test("正常模型：节点字段原样保留，导出可用", async () => {
    const name = "正常模型";
    const response = await save(name, { version: 1, modelType: "厂站", nodes: [busNode], edges: [] });
    expect(response.status).toBe(200);

    const stored = JSON.parse(readFileSync(join(schemeFilesRoot, SCHEME_NAME, `${name}.json`), "utf-8"));
    const node = stored.nodes.find((item) => item.id === "b1");
    expect(node.kind).toBe("ac-bus");
    expect(node.size).toEqual({ width: 100, height: 40 });
    expect(node.position).toEqual({ x: 0, y: 0 });
    expect(node.params.vbase).toBe("10");
    expect(node.terminals).toHaveLength(1);

    for (const [format, buildUrl] of EXPORTS) {
      expect((await fetch(`${baseUrl}${buildUrl(name)}`)).status, format).toBe(200);
    }
  });

  test("没有量测的模型不被凭空塞一个 measurements 字段", async () => {
    const name = "无量测模型";
    expect((await save(name, { version: 1, modelType: "厂站", nodes: [busNode], edges: [] })).status).toBe(200);

    const stored = JSON.parse(readFileSync(join(schemeFilesRoot, SCHEME_NAME, `${name}.json`), "utf-8"));
    expect(stored).not.toHaveProperty("measurements");
  });
});