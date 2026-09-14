// 导出适配层与 v1 模块按空间读模型与库配置（Task 8）：
// svgExport/eFileExport/cimExport/sendModel 与 apiV1Library/apiV1Schemes 都必须透传 paths，
// 否则「ZIP 的 json 来自本空间、派生格式来自默认空间」会静默混根。
import { expect, test, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { spacePathsFor } from "./spaceStore.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

let dataDir;
// 用 beforeAll 而非 beforeEach：server.mjs 在每个测试文件内只加载一次，dataRoot 在首次
// import 时求值并缓存。逐用例换目录会让后续用例的 defaultPaths 指向已删目录。
beforeAll(() => { dataDir = mkdtempSync(join(tmpdir(), "space-export-")); });
afterAll(() => { rmSync(dataDir, { recursive: true, force: true }); });

const SPACE_ID = "张三";
const SCHEME = "测试方案";
// 空间根下才有的模型名：默认根下同名方案里没有它 —— 忽略 paths 的调用必得 not-found，
// 而不是「碰巧也能读到」，故每条断言都能红。
const MODEL = "空间厂站";

const busNode = {
  id: "bus1", kind: "ac-bus", name: "母线1",
  position: { x: 100, y: 100 }, size: { width: 120, height: 16 },
  rotation: 0, scale: 1, layerId: "default", terminals: [],
  params: { name: "母线1", vbase: "10" }
};

// 种一个本空间专属方案：结构齐备到 E/SVG/CIM 都能真实生成
function seedSpaceModel(paths) {
  const dir = join(paths.schemeFiles, SCHEME);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${MODEL}.json`), JSON.stringify({
    version: 1, name: MODEL, idx: 1, modelType: "厂站",
    canvasWidth: 800, canvasHeight: 400,
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default", nodes: [busNode], edges: []
  }), "utf-8");
}

// v1 handler 只依赖 writeHead/end，用最小录制器替代真实 ServerResponse
function captureResponse() {
  const res = {
    status: 0, headers: {}, body: null, headersSent: false,
    writeHead(status, headers) { res.status = status; res.headers = headers; res.headersSent = true; },
    end(payload) { res.body = payload; }
  };
  return res;
}

// readJsonBody 按 async iterable 读取请求体
function bodyRequest(payload) {
  const raw = Buffer.from(JSON.stringify(payload), "utf-8");
  return {
    headers: {},
    async *[Symbol.asyncIterator]() { yield raw; }
  };
}

test("buildCimForSavedModel 按 paths 读空间模型", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { buildCimForSavedModel } = await import("./cimExport.mjs");
  const paths = spacePathsFor(dataDir, SPACE_ID);
  seedSpaceModel(paths);

  const { xml, error } = await buildCimForSavedModel({ parts: [SCHEME], name: MODEL, paths });
  expect(error).toBeUndefined();
  expect(xml).toContain("<cim:");

  // 不传 paths → 回落默认根，该模型不存在。若实现忽略 paths，上面 xml 断言必红。
  const fallback = await buildCimForSavedModel({ parts: [SCHEME], name: MODEL });
  expect(fallback.error?.code).toBe("not-found");
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("handleV1SchemeExport 按 paths 打包空间方案", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { handleV1SchemeExport } = await import("./apiV1Schemes.mjs");
  const paths = spacePathsFor(dataDir, SPACE_ID);
  seedSpaceModel(paths);
  const url = new URL(`http://x/?schemePath=${encodeSchemePath([SCHEME])}`);

  const res = captureResponse();
  await handleV1SchemeExport({ url, response: res, paths });
  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toBe("application/zip");
  // 条目名含空间专属模型：证明枚举的是本空间根，且 e/svg 也由同一根实时生成
  const AdmZip = (await import("adm-zip")).default;
  expect(new AdmZip(res.body).getEntries().map((entry) => entry.entryName).sort()).toEqual([
    `${SCHEME}/${MODEL}.e`,
    `${SCHEME}/${MODEL}.json`,
    `${SCHEME}/${MODEL}.svg`
  ]);

  // 不传 paths → 回落默认根，该方案不存在
  const miss = captureResponse();
  await handleV1SchemeExport({ url, response: miss });
  expect(miss.status).toBe(404);
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("handleV1LibraryMeasurements 按 paths 读空间量测配置", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { handleV1LibraryMeasurements } = await import("./apiV1Library.mjs");
  const paths = spacePathsFor(dataDir, SPACE_ID);
  mkdirSync(paths.settings, { recursive: true });
  // 「空间探针」只落空间根：忽略 paths 时会读到默认根（无此文件）→ measurementTypes 空 → 断言红
  writeFileSync(paths.measurementConfig,
    JSON.stringify({ measurementTypes: [{ id: "spaceProbe", name: "空间探针" }] }), "utf-8");

  const res = captureResponse();
  await handleV1LibraryMeasurements({ request: { headers: {} }, response: res, paths });
  expect(res.status).toBe(200);
  expect(res.body.toString("utf-8")).toContain("空间探针");
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("handleV1ModelSend 按 paths 取空间模型", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { handleV1ModelSend } = await import("./sendModel.mjs");
  const paths = spacePathsFor(dataDir, SPACE_ID);
  seedSpaceModel(paths);
  // 目标端只收 body，不解析 multipart
  const sink = http.createServer((request, response) => {
    request.on("data", () => {});
    request.on("end", () => { response.writeHead(200, { "content-type": "text/plain" }); response.end("ok"); });
  });
  await new Promise((resolve) => sink.listen(0, "127.0.0.1", resolve));
  try {
    const url = new URL(`http://x/?schemePath=${encodeSchemePath([SCHEME])}&name=${encodeURIComponent(MODEL)}`);
    const res = captureResponse();
    await handleV1ModelSend({
      request: bodyRequest({ url: `http://127.0.0.1:${sink.address().port}/receive`, files: [{ kind: "json" }] }),
      response: res,
      url,
      paths
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body.toString("utf-8")).ok).toBe(true);
  } finally {
    await new Promise((resolve) => sink.close(resolve));
  }
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

// 结构断言（非行为断言）：只证明 apiV1Schemes.mjs 源码里不再出现自建数据根推导的标识符，
// 不证明各 handler 真的用上了 ctx.paths —— 那由上面的行为用例覆盖。
test("apiV1Schemes 不再自建数据根推导", async () => {
  const source = await import("node:fs/promises")
    .then((fs) => fs.readFile(join(import.meta.dirname, "apiV1Schemes.mjs"), "utf-8"));
  expect(source).not.toContain("getSchemeDataDir");
  expect(source).not.toContain("GRAPH_MODEL_DATA_DIR");
});
