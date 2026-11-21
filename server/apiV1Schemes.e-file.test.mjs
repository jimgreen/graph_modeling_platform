// /webgrp/v1/schemes/model/export?format=e-file 集成测试：起真实 server（临时端口 + repo 真实 data/）。
// 与 apiV1Schemes.test.mjs 同模式：createImageServer 用模块级 schemeDataDir（repo data/），
// 无法注入 tmpdir，所以错误路径 + 信封格式覆盖；200 路径探测 repo 真实数据，存在才跑。
import { describe, expect, test, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import iconv from "iconv-lite";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSpaceStore } from "./spaceStore.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

let createImageServer;
let dataDir;
let previousDataRoot;
let spaceStore;
let server;
let baseUrl;

beforeAll(async () => {
  previousDataRoot = process.env.GRAPH_MODEL_DATA_DIR;
  dataDir = await mkdtemp(join(tmpdir(), "api-v1-e-file-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  ({ createImageServer } = await import("./server.mjs"));
});

beforeEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(dataDir, { recursive: true });
  spaceStore = createSpaceStore(dataDir);
  const schemeDir = join(spaceStore.resolvePaths("default").schemeFiles, "四川");
  await mkdir(schemeDir, { recursive: true });
  await writeFile(join(schemeDir, "所有图元.json"), JSON.stringify({
    name: "所有图元",
    modelType: "厂站",
    idx: 1,
    canvasWidth: 800,
    canvasHeight: 400,
    nodes: [{
      id: "bus1",
      kind: "ac-bus",
      name: "母线1",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 20 },
      terminals: [{ id: "t1", type: "ac", anchor: { x: 0.5, y: 0.5 }, nodeNumber: "1", vbase: "10" }],
      params: { name: "母线1", vbase: "10" }
    }],
    edges: []
  }));
  server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const initialized = await fetch(`${baseUrl}${apiPath("/spaces/initialize")}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "默认空间" })
  });
  if (!initialized.ok) throw new Error(`default space initialization failed: ${initialized.status}`);
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

afterAll(async () => {
  await rm(dataDir, { recursive: true, force: true });
  if (previousDataRoot === undefined) delete process.env.GRAPH_MODEL_DATA_DIR;
  else process.env.GRAPH_MODEL_DATA_DIR = previousDataRoot;
});

const eFilePath = apiPath("/v1/schemes/model/export?format=e-file");
// 「默认方案」目录在 repo data/ 下不存在，但 404/400 用例不依赖真实数据
const schemePath = encodeSchemePath(["默认方案"]);

describe(`${eFilePath} 参数校验`, () => {
  test("缺 schemePath → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${eFilePath}&name=x`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("未知模板 → 400 且列出可用模板", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}&schemePath=${schemePath}&name=任意&template=不存在的模板`
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("国网E格式");
  });

  test("模型不存在 → 404 not-found", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}&schemePath=${schemePath}&name=不存在的模型调试用`
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not-found");
  });

  test("encoding 非法 → 400", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}&schemePath=${schemePath}&name=任意&encoding=big5`
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("encoding");
  });
});

// GBK 字节与库装配的深入断言见 server/eFileExport.test.mjs。
describe(`${eFilePath} 正路径（临时数据）`, () => {
  const realSchemePath = ["四川"];
  const realModelName = "所有图元";

  test("真实模型导出 GBK E 文件", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}&schemePath=${encodeSchemePath(realSchemePath)}&name=${encodeURIComponent(realModelName)}`
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("charset=gbk");
    const bytes = Buffer.from(await res.arrayBuffer());
    const text = iconv.decode(bytes, "gbk");
    expect(text).toContain("<Model>");
  }, 30000);

  test("预定义模板（国网E格式）走通且输出含模型名", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}&schemePath=${encodeSchemePath(realSchemePath)}&name=${encodeURIComponent(realModelName)}&template=${encodeURIComponent("国网E格式")}`
    );
    expect(res.status).toBe(200);
    const text = iconv.decode(Buffer.from(await res.arrayBuffer()), "gbk");
    expect(text).toContain(realModelName);
  }, 30000);

  test("POST 自定义模板文本导出（model-type 匹配校验在解析前不拦截）", async () => {
    const templateText = "<Model>\n@ path name\n# 自定义\n</Model>\n<node 类=\"ACNode+交流母线\" 表号=\"00401\">\n@ idx,name,dev_type,node\n// 序号,名称,类型,节点\n</node>\n</Model>\n";
    const res = await fetch(
      `${baseUrl}${eFilePath}&schemePath=${encodeSchemePath(realSchemePath)}&name=${encodeURIComponent(realModelName)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateText })
      }
    );
    expect(res.status).toBe(200);
    const text = iconv.decode(Buffer.from(await res.arrayBuffer()), "gbk");
    expect(text).toContain("<node>");
  }, 30000);
});
