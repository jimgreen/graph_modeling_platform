// 摘要路径读模型失败时不再静默降级（readSchemeProjectSummaryFile）。
//
// 该函数此前把「读盘 + JSON 解析」裹在一个 try 里，任何失败都退化成「只有文件名」的
// 摘要条目。于是磁盘写权限没了 / 磁盘满 / 文件被占用时，方案树、层级树、模型列表里
// 那个模型照样在、名字还从文件名兜底推出来，字面上与正常条目无异，日志里一个字都没有
// —— 排查者只会得出「模型被改名或删了」的错误结论。
// 它的兄弟 readSchemeProjectFile 已在 01f6010a 修掉同一个洞（完整路径），这里补齐摘要路径。
//
// 拆分后：真读不动（非 ENOENT）上抛 → 各调用方既有 catch 映成 500；
// ENOENT（readdir 与读盘之间的删除竞态）与 JSON 损坏沿用既有降级语义。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, beforeAll, afterAll, vi } from "vitest";
import { apiPath } from "./config.mjs";

// 只让指定模型的 JSON 读盘失败，其余读盘透传真实实现（建种子、读配置都还要用）。
let unreadableModelFile = "";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: async (path, ...rest) => {
      if (unreadableModelFile && String(path) === unreadableModelFile) {
        const error = new Error(`EACCES: permission denied, open '${path}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.readFile(path, ...rest);
    }
  };
});

let server;
let baseUrl;
let dataDir;

const schemePathParam = () => encodeURIComponent(JSON.stringify(["方案甲"]));

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "scheme-summary-read-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  mkdirSync(join(dataDir, "schemes", "files", "方案甲"), { recursive: true });
  writeFileSync(
    join(dataDir, "schemes", "files", "方案甲", "模型1.json"),
    JSON.stringify({ version: 1, name: "模型1", idx: 1, canvasWidth: 800, canvasHeight: 600, nodes: [], edges: [] }),
    "utf-8"
  );
  unreadableModelFile = join(dataDir, "schemes", "files", "方案甲", "模型1.json");
});

afterAll(async () => {
  unreadableModelFile = "";
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

describe("摘要路径：模型文件真读不动时报错，而不是伪装成正常条目", () => {
  test("★ 内部 /schemes（includeProjects=0）不再返回带假名的模型条目", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/schemes")}`);
    expect(response.status).toBe(500);
    expect(await response.text()).toContain("读取失败");
  });

  test("★ v1 层级树回 internal 500（不是缺模型的 200 空树）", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/hierarchy")}`);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("internal");
  });

  test("★ v1 模型列表同样 500，不是一个只剩文件名的条目", async () => {
    const response = await fetch(`${baseUrl}${apiPath(`/v1/schemes/models?schemePath=${schemePathParam()}`)}`);
    expect(response.status).toBe(500);
    expect((await response.json()).ok).toBe(false);
  });

  test("★ v1 方案树摘要同样 500", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/v1/schemes")}`);
    expect(response.status).toBe(500);
  });

  test("恢复正常后同一个请求照常 200 且条目完整", async () => {
    unreadableModelFile = "";
    try {
      const response = await fetch(`${baseUrl}${apiPath("/schemes")}`);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.schemes[0].projects.map((p) => p.name)).toEqual(["模型1"]);
    } finally {
      unreadableModelFile = join(dataDir, "schemes", "files", "方案甲", "模型1.json");
    }
  });
});