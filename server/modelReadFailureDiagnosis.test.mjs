// 读取模型时区分「磁盘/注册表写失败」与「模型不存在」。
//
// readSchemeProjectFile 此前把「读文件 + JSON 解析 + 往全局线路注册表 hydrate 写盘」
// 全裹在一个 try 里，任何失败都 return null，调用方一律报「模型文件不存在。」
// 于是磁盘写权限没了 / 磁盘满 / 注册表写失败，用户与排查者都会得到「模型被删了」
// 的错误结论；方案树里该模型的条目也跟着消失。
//
// 拆分后：读盘失败（非 ENOENT）与注册表写失败上抛 500，文件真的不存在（ENOENT）
// 与文件损坏仍按既有语义返回「不存在」—— 那两种情况下「模型不存在」确实是事实。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, beforeAll, afterAll, vi } from "vitest";
import { apiPath } from "./config.mjs";

// 只让「全局线路注册表的临时文件写入」失败，其余写入透传真实实现。
// 用开关控制：建种子模型时关掉（否则保存自己就失败），断言时再打开。
let failRegistryWrites = false;
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    writeFile: async (path, data, options) => {
      if (failRegistryWrites && String(path).includes("global-lines.json.")) {
        const error = new Error(`EACCES: permission denied, open '${path}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.writeFile(path, data, options);
    }
  };
});

let server;
let baseUrl;
let dataDir;
let createImageServer;

const schemePathParam = () => encodeURIComponent(JSON.stringify(["方案甲"]));

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "model-read-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  ({ createImageServer } = await import("./server.mjs"));
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // 种子模型：先在「注册表可写」状态下建好
  mkdirSync(join(dataDir, "schemes", "files", "方案甲"), { recursive: true });
  writeFileSync(
    join(dataDir, "schemes", "files", "方案甲", "模型1.json"),
    JSON.stringify({ version: 1, name: "模型1", idx: 1, canvasWidth: 800, canvasHeight: 600, nodes: [], edges: [] }),
    "utf-8"
  );
  // 另一个方案下的损坏模型：JSON 非法
  mkdirSync(join(dataDir, "schemes", "files", "方案乙"), { recursive: true });
  writeFileSync(join(dataDir, "schemes", "files", "方案乙", "坏模型.json"), "{ 坏的", "utf-8");
});

afterAll(async () => {
  failRegistryWrites = false;
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

const readModel = (scheme, name) =>
  fetch(`${baseUrl}${apiPath(`/schemes/project?schemePath=${encodeURIComponent(JSON.stringify([scheme]))}&name=${encodeURIComponent(name)}`)}`);

describe("注册表写盘失败时的模型读取", () => {
  test("★ 500 并说明是写注册表失败，而不是 404「模型不存在」", async () => {
    failRegistryWrites = true;
    try {
      const response = await readModel("方案甲", "模型1");
      expect(response.status).toBe(500);
      expect(await response.text()).toContain("注册表");
    } finally {
      failRegistryWrites = false;
    }
  });

  test("★ 同一场景下方案树里该模型的条目也不再凭空消失", async () => {
    failRegistryWrites = true;
    try {
      const response = await fetch(`${baseUrl}${apiPath("/v1/schemes?includeProjects=1")}`);
      // v1 域对同一读失败的处理由它自己决定；这里只断言不是「静默返回空 projects」
      expect(response.status).not.toBe(200);
    } finally {
      failRegistryWrites = false;
    }
  });

  test("恢复正常后同一个请求照常 200", async () => {
    const response = await readModel("方案甲", "模型1");
    expect(response.status).toBe(200);
    expect((await response.json()).project.name).toBe("模型1");
  });
});

describe("文件真的不存在 / 文件损坏：仍按既有语义报「不存在」", () => {
  test("名字不存在 → 404", async () => {
    expect((await readModel("方案甲", "根本没有这个模型")).status).toBe(404);
  });

  test("★ JSON 损坏 → 仍 404（这是既有行为：内容坏了，「读不出这个模型」是事实）", async () => {
    expect((await readModel("方案乙", "坏模型")).status).toBe(404);
  });
});