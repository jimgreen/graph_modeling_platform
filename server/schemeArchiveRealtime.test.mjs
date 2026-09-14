// 方案 ZIP 实时生成集成测试：GRAPH_MODEL_DATA_DIR 指向 tmpdir 种子数据 → 起真实 server（端口 0）
// → 断言 ZIP 内 json/e/svg 三件套齐全，且 e/svg 与对应单模型端点输出逐字节一致。
import { describe, expect, test, beforeAll, afterAll, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

// 「子方案目录读失败」注入：Windows 上 chmod/ACL 不可移植，故只对特定目录名让 readdir 抛 EACCES，
// 其余路径一律透传真实实现（server.mjs 的 readdir 调用不受影响）。
const UNREADABLE_DIR = "不可读子方案";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readdir: async (dir, options) => {
      if (String(dir).endsWith(UNREADABLE_DIR)) {
        const error = new Error(`EACCES: permission denied, scandir '${dir}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.readdir(dir, options);
    }
  };
});

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
let createSchemeArchiveBuffer;

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
  // 不可读方案：方案根目录本身可读（厂站.json 能被枚举），但子方案目录 readdir 抛 EACCES（由上面的 vi.mock 注入）
  const unreadableDir = join(dataDir, "schemes", "files", "不可读方案");
  mkdirSync(join(unreadableDir, UNREADABLE_DIR), { recursive: true });
  writeFileSync(join(unreadableDir, "厂站.json"), modelJson("厂站", 4), "utf-8");
  writeFileSync(join(unreadableDir, UNREADABLE_DIR, "线路.json"), modelJson("线路", 5), "utf-8");
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer, createSchemeArchiveBuffer: buildArchive } = await import("./server.mjs");
  createSchemeArchiveBuffer = buildArchive;
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

test("ZIP 内 .json 条目数等于方案内模型数（防某类文件被静默漏打包）", async () => {
  const { listModelJsonFiles } = await import("./schemeArchive.mjs");
  const schemeDir = join(dataDir, "schemes", "files", "嵌套方案");
  const models = await listModelJsonFiles(schemeDir);
  // 前提：该方案确有 2 个模型（厂站 + 子方案/线路）
  expect(models).toHaveLength(2);

  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${encodeSchemePath(["嵌套方案"])}`);
  expect(response.status).toBe(200);
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const jsonCount = zip.getEntries().filter((entry) => entry.entryName.endsWith(".json")).length;
  expect(jsonCount).toBe(models.length);
});

test("ZIP 内 e/svg 与单模型端点输出逐字节一致，json 与磁盘原文一致", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${schemePathParam()}`);
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const read = (entryName) => zip.getEntry(entryName).getData();

  const eUrl = `${baseUrl}${apiPath("/v1/schemes/model/e-file")}?schemePath=${schemePathParam()}&name=${encodeURIComponent("厂站")}&encoding=gbk`;
  const svgUrl = `${baseUrl}${apiPath("/v1/schemes/model/svg")}?schemePath=${schemePathParam()}&name=${encodeURIComponent("厂站")}&colorMode=voltage&encoding=utf-8`;

  expect(read("测试方案/厂站.e").equals(Buffer.from(await (await fetch(eUrl)).arrayBuffer()))).toBe(true);
  expect(read("测试方案/厂站.svg").equals(Buffer.from(await (await fetch(svgUrl)).arrayBuffer()))).toBe(true);
  // json 不进实时生成管线，直接搬磁盘字节：与磁盘原文逐字节一致
  expect(read("测试方案/厂站.json").equals(readFileSync(join(dataDir, "schemes", "files", "测试方案", "厂站.json")))).toBe(true);
});

test("损坏模型导致整体失败并返回 500，错误信息含模型名", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${encodeSchemePath(["坏方案"])}`);
  expect(response.status).toBe(500);
  const payload = await response.json();
  expect(payload.ok).toBe(false);
  expect(payload.error.message).toContain("坏模型");
});

// 原 server.test.mjs「exports one scheme directory as a zip while preserving child scheme folders」
// 用例的两个覆盖点在此承接：① 子方案目录层级保留 → 本用例；② 自选 filesRoot 的契约 → 下一条用例
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

// 自定义 paths 与实时生成必须同源：json 按路径集合枚举，e/svg 也必须按同一路径集合渲染。
// 模型名刻意与默认根下同名方案的「厂站」错开——若派生格式读错根，本模型在默认根下必然
// not-found，生成整段报错；而不是静默产出「json 来自根 A、e/svg 来自根 B」的混合 ZIP。
test("自定义 paths 下的方案 ZIP 成功生成，json 与派生格式同源", async () => {
  const { spacePathsFor } = await import("./spaceStore.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  const spaceFiles = join(paths.schemeFiles, "测试方案");
  mkdirSync(spaceFiles, { recursive: true });
  writeFileSync(join(spaceFiles, "空间厂站.json"), JSON.stringify({
    version: 1, name: "空间厂站", canvasWidth: 800, canvasHeight: 400,
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default", nodes: [], edges: []
  }), "utf-8");

  const { buffer } = await createSchemeArchiveBuffer({ paths, schemePath: ["测试方案"] });
  const zip = new AdmZip(buffer);
  const names = zip.getEntries().map((e) => e.entryName).sort();
  // json 与 e/svg 三件套齐全：e/svg 只能由本路径集合下的模型实时生成
  expect(names).toEqual([
    "测试方案/空间厂站.e",
    "测试方案/空间厂站.json",
    "测试方案/空间厂站.svg"
  ]);
  // json 侧的同源正证：打包进去的就是空间根那份磁盘原文
  expect(zip.getEntry("测试方案/空间厂站.json").getData()
    .equals(readFileSync(join(spaceFiles, "空间厂站.json")))).toBe(true);
  // 默认根下不应出现本空间落的任何文件：枚举与渲染都不该往默认根写。
  // 这条同时是「读对根」的前提：默认根没有本模型，故派生格式若读错根必定 not-found，
  // renderArtifacts 直接抛错、上面三件套断言必红 —— 不会静默混入另一个根的产物。
  expect(existsSync(join(dataDir, "schemes", "files", "测试方案", "空间厂站.json"))).toBe(false);

  // 组合三：显式传一个与 paths 同根的 filesRoot → 不得触发拒绝（防守卫过度触发）
  await expect(createSchemeArchiveBuffer({
    paths,
    filesRoot: paths.schemeFiles,
    schemePath: ["测试方案"]
  })).resolves.toBeTruthy();
});

// filesRoot 与 paths 指向不同根时必须显式拒绝：渲染链只跟随 paths.schemeFiles，
// 放行会产出「json 来自 filesRoot、e/svg 来自 paths」的静默混根 ZIP ——
// 症状是「ZIP 里 e/svg 是别处的模型」，极难归因，故宁可报错。
// 组合一：只传非默认 filesRoot（paths 回落默认根）→ 不一致 → 抛错
test("只传自定义 filesRoot 时显式拒绝，不静默混根", async () => {
  await expect(createSchemeArchiveBuffer({
    filesRoot: join(dataDir, "schemes", "files-自定义"),
    schemePath: ["测试方案"]
  })).rejects.toThrow(/filesRoot 与解析出的 paths 指向不同根/);
});

// 组合二：同时传 paths 与一个指向别处的 filesRoot → 同样不一致 → 抛错。
// 这条是「锚点由 defaultPaths.schemeFiles 改为 paths.schemeFiles」的判别证据：
// 旧形态（含 !options.paths 合取项）只拦组合一，本组合会静默生成混根 ZIP。
test("paths 与 filesRoot 指向不同根时显式拒绝", async () => {
  const { spacePathsFor } = await import("./spaceStore.mjs");
  await expect(createSchemeArchiveBuffer({
    paths: spacePathsFor(dataDir, "王五"),
    filesRoot: join(dataDir, "schemes", "files-另一根"),
    schemePath: ["测试方案"]
  })).rejects.toThrow(/filesRoot 与解析出的 paths 指向不同根/);
});

// 子方案目录读失败必须上抛，而非静默丢弃整棵子树后仍产出「看似成功」的 ZIP
test("子方案目录读失败即上抛，不静默丢弃子树", async () => {
  const { listModelJsonFiles, buildSchemeArchiveBuffer } = await import("./schemeArchive.mjs");
  const { readdir } = await import("node:fs/promises");
  const schemeDir = join(dataDir, "schemes", "files", "不可读方案");

  // 先证前提：方案根可读且确实列出了该子目录（失败只可能来自递归读子目录那一次）
  expect((await readdir(schemeDir)).map(String)).toContain(UNREADABLE_DIR);

  await expect(listModelJsonFiles(schemeDir)).rejects.toThrow(/EACCES/);
  await expect(buildSchemeArchiveBuffer({
    schemeDir,
    schemeName: "不可读方案",
    // 枚举阶段就该失败；若被调用说明错误仍被吞掉，用不含 EACCES 的消息让断言失败
    renderArtifacts: async () => {
      throw new Error("renderArtifacts 不应被调用：枚举阶段就该失败");
    }
  })).rejects.toThrow(/EACCES/);
});
