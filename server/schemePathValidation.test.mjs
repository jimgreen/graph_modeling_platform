// schemePath 传错时的行为：畸形一律 400，不再静默落到「默认方案」。
//
// 此前 server.mjs 里这份解析对畸形输入一律返回空数组，调用点再用
// `Array.isArray && length > 0 ? … : ["默认方案"]` 兜底，于是：
//   · PUT /webgrp/schemes/project 把 schemePath 写成字符串 → 200 ok，模型进了默认方案
//   · DELETE 同款错传 → 200 ok，**默认方案下的同名模型被 archive 进回收站**
//   · GET ?schemePath=%7Bbad（JSON 非法）→ 返回了另一个方案的模型
// /v1 那套（schemePath.mjs）对同样的畸形本来就会 400，只有界面用的这套在静默容错。
//
// 注意「空数组」是**正常用法**（src/global-lines.ts 主动传 `[]` 表示默认方案），
// 不在畸形之列 —— 判据是「有值但不是数组」与「JSON 解析失败」。
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { apiPath } from "./config.mjs";

let server;
let baseUrl;
let dataDir;
let createImageServer;

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "scheme-path-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  ({ createImageServer } = await import("./server.mjs"));
});

afterAll(async () => {
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

const post = (pathname, method, body) =>
  fetch(`${baseUrl}${apiPath(pathname)}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

const defaultSchemeDir = () => join(dataDir, "schemes", "files", "默认方案");

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const modelPayload = (name) => ({
  name,
  project: { canvasWidth: 800, canvasHeight: 600, nodes: [], edges: [] }
});

describe("保存模型：schemePath 畸形", () => {
  test("★ 传字符串而非数组 → 400，且默认方案下不落文件", async () => {
    const response = await post("/schemes/project", "PUT", { ...modelPayload("畸形保存"), schemePath: "方案A" });
    expect(response.status).toBe(400);
    expect(await exists(join(defaultSchemeDir(), "畸形保存.json"))).toBe(false);
  });

  test("传 null / 不传 → 仍走默认方案（这是正常用法，不算畸形）", async () => {
    for (const schemePath of [undefined, null]) {
      const response = await post("/schemes/project", "PUT", { ...modelPayload(`缺省${String(schemePath)}`), schemePath });
      expect(response.status).toBe(200);
    }
  });

  test("★ 空数组 → 仍走默认方案（src/global-lines.ts 的既有约定）", async () => {
    const response = await post("/schemes/project", "PUT", { ...modelPayload("空数组"), schemePath: [] });
    expect(response.status).toBe(200);
    expect(await exists(join(defaultSchemeDir(), "空数组.json"))).toBe(true);
  });

  test("正常数组不受影响", async () => {
    const response = await post("/schemes/project", "PUT", { ...modelPayload("正常"), schemePath: ["方案甲"] });
    expect(response.status).toBe(200);
    expect(await exists(join(dataDir, "schemes", "files", "方案甲", "正常.json"))).toBe(true);
  });
});

describe("删除模型：schemePath 畸形", () => {
  test("★ 错传字符串 → 400，默认方案下的同名模型**不被删掉**", async () => {
    const saved = await post("/schemes/project", "PUT", { ...modelPayload("同名模型"), schemePath: [] });
    expect(saved.status).toBe(200);

    const response = await post("/schemes/project", "DELETE", { name: "同名模型", schemePath: "方案A" });
    expect(response.status).toBe(400);
    // 这条是重点：此前错传会 200 ok 并把默认方案下的模型 archive 掉，不可逆
    expect(await exists(join(defaultSchemeDir(), "同名模型.json"))).toBe(true);
  });
});

describe("读取模型：query 里的 schemePath 畸形", () => {
  test("★ JSON 非法 → 400（此前静默返回另一个方案的模型）", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/schemes/project?schemePath=%7Bbad&name=X")}`);
    expect(response.status).toBe(400);
    // 两种畸形给不同提示，便于定位是哪一种
    expect(await response.text()).toContain("不是合法的 JSON 数组");
  });

  test("解码出来不是数组 → 400", async () => {
    const response = await fetch(`${baseUrl}${apiPath(`/schemes/project?schemePath=${encodeURIComponent('"方案A"')}&name=X`)}`);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("必须是方案路径数组");
  });

  test("合法数组照常工作", async () => {
    await post("/schemes/project", "PUT", { ...modelPayload("读得到"), schemePath: ["方案甲"] });
    const response = await fetch(
      `${baseUrl}${apiPath(`/schemes/project?schemePath=${encodeURIComponent(JSON.stringify(["方案甲"]))}&name=${encodeURIComponent("读得到")}`)}`
    );
    expect(response.status).toBe(200);
  });
});