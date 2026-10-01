// 按名字定位模型时，方案目录读不到必须报错，不能说成「模型不存在」。
//
// projectJsonFileForName 此前把 stat 与 readdir 的失败一律当「没找到」：精确路径 stat
// 失败就静默落到历史文件名扫描，readdir 失败直接 return null。调用方据此得到的是
// 「模型不存在」，而模型其实好好地在磁盘上：
//   · readSchemeProjectRecord → 回 404「模型不存在」；
//   · existingStoredProjectIndex（模型改名/保存时分配 idx 走它）→ 认为「该模型还没有 idx」，
//     于是重新分配一个**新 idx**：旧 idx 上挂着的全局线路引用（projectIdx）就此对不上，
//     导出的 model_id 也跟着变。
//
// 与 readSchemeDirectory / archiveSchemeStoreEntry / listSpaceFiles 同一口径：
// 只有 ENOENT 算「不存在」，其余 IO 失败上抛。
//
// 注入方式：Windows 上 chmod 不可移植，故只对特定目录名让 readdir 抛 EACCES。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { apiPath } from "./config.mjs";

const UNREADABLE_SCHEME = "不可读方案";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readdir: async (dir, options) => {
      if (String(dir).endsWith(UNREADABLE_SCHEME)) {
        const error = new Error(`EACCES: permission denied, scandir '${dir}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.readdir(dir, options);
    }
  };
});

let server;
let baseUrl;
let dataDir;

const modelJson = (name, idx) => JSON.stringify({
  version: 1, name, idx, modelType: "厂站", canvasWidth: 800, canvasHeight: 600, nodes: [], edges: []
});

const readModel = (scheme, name) =>
  fetch(`${baseUrl}${apiPath(`/schemes/project?schemePath=${encodeURIComponent(JSON.stringify([scheme]))}&name=${encodeURIComponent(name)}`)}`);

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "project-lookup-read-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // 正常方案：对照组，任何时候都该 200
  const okDir = join(dataDir, "schemes", "files", "正常方案");
  mkdirSync(okDir, { recursive: true });
  writeFileSync(join(okDir, "正常模型.json"), modelJson("正常模型", 1), "utf-8");

  // 目录读不到，但模型文件确实在。文件名带存储后缀：这样按「模型一」定位时精确路径
  // <dir>/模型一.json 不存在（stat ENOENT），**必须**落到 readdir 的历史文件名扫描 ——
  // 否则精确 stat 就命中了，注入的 readdir 失败根本走不到（探针实测：首版正是这样假绿）。
  const badDir = join(dataDir, "schemes", "files", UNREADABLE_SCHEME);
  mkdirSync(badDir, { recursive: true });
  writeFileSync(join(badDir, "模型一__project-abc123.json"), modelJson("模型一", 2), "utf-8");
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

describe("方案目录读不到时的模型定位", () => {
  test("★ 回 500 且说明是目录读失败，而不是 404「模型不存在」", async () => {
    const response = await readModel(UNREADABLE_SCHEME, "模型一");
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain("目录读取失败");
    expect(text).not.toContain("模型不存在");
  });

  test("★ 导出适配层同样不再把它说成「模型不存在」", async () => {
    const response = await fetch(
      `${baseUrl}${apiPath(`/v1/schemes/model/cim-xml?schemePath=${encodeURIComponent(JSON.stringify([UNREADABLE_SCHEME]))}&name=${encodeURIComponent("模型一")}`)}`
    );
    expect(response.status).not.toBe(404);
  });

  test("正常方案不受影响（回归：别把正常路径也拦下）", async () => {
    const response = await readModel("正常方案", "正常模型");
    expect(response.status).toBe(200);
    expect((await response.json()).project.name).toBe("正常模型");
  });

  test("方案目录真的不存在 → 仍按既有语义回 404", async () => {
    expect((await readModel("根本没有这个方案", "模型一")).status).toBe(404);
  });
});