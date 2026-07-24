// 内部 /webgrp/* 读写层集成测试：起真实 image-server（GRAPH_MODEL_DATA_DIR 指向 tmpdir 隔离），
// 打真实请求测图片/方案/配置 CRUD + 错误码（400/404/409）。
// 动态 import：在设 env 后加载 server.mjs，确保 dataRoot 指向 tmpdir。

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { apiPath } from "./config.mjs";

let server;
let baseUrl;
let dataDir;
let createImageServer;

// 全局 tmpdir：所有用例共享同一 dataRoot（image-server 模块加载时求值一次）。
// 用例间靠独立 server 实例 + 数据自身隔离（不同方案名/图片 id）。
beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "api-internal-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  process.env.GRAPH_MODEL_ICON_LIBRARY_DIR = join(dataDir, "icon-library");
  // 动态 import：env 已设，模块求值时 dataRoot 取 tmpdir
  ({ createImageServer } = await import("./server.mjs"));
});

afterAll(async () => {
  if (dataDir) {
    await rm(dataDir, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function fetchJson(pathname, opts = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: res.status, headers: res.headers, text, json };
}

const PNG_1X1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const SP_A = encodeURIComponent(JSON.stringify(["方案A"]));

// ============ 图片资源 ============
describe("图片资源 /webgrp/images & /webgrp/image-folders", () => {
  test("GET /webgrp/images 空清单", async () => {
    const { status, json } = await fetchJson(apiPath("/images"));
    expect(status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(0);
  });

  test("POST /webgrp/images 上传后出现在清单", async () => {
    const up = await fetchJson(apiPath("/images"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: PNG_1X1, name: "示例.png" })
    });
    expect(up.status).toBe(201);
    expect(up.json.id).toBeTruthy();
    expect(up.json.url).toBe(apiPath(`/images/${up.json.id}`));
    const list = await fetchJson(apiPath("/images"));
    expect(list.json).toHaveLength(1);
    expect(list.json[0].id).toBe(up.json.id);
  });

  test("POST /webgrp/images 缺 dataUrl → 400", async () => {
    const { status, json } = await fetchJson(apiPath("/images"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "无数据.png" })
    });
    expect(status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  test("GET /webgrp/images/{id} 下载二进制", async () => {
    const up = await fetchJson(apiPath("/images"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: PNG_1X1, name: "dl.png" })
    });
    const res = await fetch(`${baseUrl}${apiPath(`/images/${up.json.id}`)}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(0);
  });

  test("GET /webgrp/images/{id} 不存在 → 404", async () => {
    const { status } = await fetchJson(apiPath("/images/nope-id"));
    expect(status).toBe(404);
  });

  test("DELETE /webgrp/images/{id} 删除图片资源", async () => {
    const up = await fetchJson(apiPath("/images"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: PNG_1X1, name: "待删除.png" })
    });
    expect(up.status).toBe(201);

    const deleted = await fetchJson(apiPath(`/images/${up.json.id}`), { method: "DELETE" });
    expect(deleted.status).toBe(200);
    expect(deleted.json.ok).toBe(true);

    const list = await fetchJson(apiPath("/images"));
    expect(list.json.some((item) => item.id === up.json.id)).toBe(false);
    const download = await fetch(`${baseUrl}${apiPath(`/images/${up.json.id}`)}`);
    expect(download.status).toBe(404);
  });

  test("图片文件夹 CRUD", async () => {
    // 初始有 root
    const list0 = await fetchJson(apiPath("/image-folders"));
    expect(list0.status).toBe(200);
    expect(Array.isArray(list0.json)).toBe(true);
    const root = list0.json.find((f) => f.id === "root");
    expect(root).toBeTruthy();

    // 新建
    const created = await fetchJson(apiPath("/image-folders"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "测试夹" })
    });
    expect(created.status).toBe(201);
    expect(created.json.name).toBe("测试夹");
    const fid = created.json.id;

    // 重命名
    const renamed = await fetchJson(apiPath(`/image-folders/${fid}`), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "改名夹" })
    });
    expect(renamed.status).toBe(200);
    expect(renamed.json.name).toBe("改名夹");

    // 重名冲突 → 409
    await fetchJson(apiPath("/image-folders"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "另一个" })
    });
    const dup = await fetchJson(apiPath(`/image-folders/${fid}`), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "另一个" })
    });
    expect(dup.status).toBe(409);

    // 删除
    const del = await fetchJson(apiPath(`/image-folders/${fid}`), { method: "DELETE" });
    expect(del.status).toBe(200);
    expect(del.json.ok).toBe(true);

    // root 不可删
    const delRoot = await fetchJson(apiPath("/image-folders/root"), { method: "DELETE" });
    expect(delRoot.status).toBe(400);
  });

  test("POST /webgrp/icon-library/import 批量恢复图标库并保留资源 ID", async () => {
    const imported = await fetchJson(apiPath("/icon-library/import"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        folders: [
          { id: "root", name: "默认文件夹" },
          { id: "custom-icons", name: "自定义图标" }
        ],
        assets: [
          {
            id: "img-preserved-id",
            name: "保留ID.png",
            folderId: "custom-icons",
            dataUrl: PNG_1X1
          }
        ]
      })
    });
    expect(imported.status).toBe(200);
    expect(imported.json).toMatchObject({ ok: true, importedCount: 1 });

    const folders = await fetchJson(apiPath("/image-folders"));
    expect(folders.json.some((folder) => folder.id === "custom-icons" && folder.name === "自定义图标")).toBe(true);

    const list = await fetchJson(apiPath("/images"));
    const preservedAsset = list.json.find((item) => item.id === "img-preserved-id");
    expect(preservedAsset).toMatchObject({
      id: "img-preserved-id",
      name: "保留ID.png",
      folderId: "custom-icons",
      url: apiPath("/images/img-preserved-id")
    });

    const downloaded = await fetch(`${baseUrl}${apiPath("/images/img-preserved-id")}`);
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers.get("content-type")).toContain("image/png");
  });
});

// ============ 方案域 ============
describe("方案域 /webgrp/schemes", () => {
  test("GET /webgrp/schemes 空方案树", async () => {
    const { status, json } = await fetchJson(apiPath("/schemes"));
    expect(status).toBe(200);
    expect(json.schemes).toEqual([]);
  });

  test("PUT /webgrp/schemes 保存方案树 → GET 读回", async () => {
    const saved = await fetchJson(apiPath("/schemes"), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemes: [{ name: "方案A", updatedAt: "2026-01-01T00:00:00Z", projects: [], children: [] }] })
    });
    expect(saved.status).toBe(200);
    expect(saved.json.ok).toBe(true);
    const got = await fetchJson(apiPath("/schemes"));
    expect(got.json.schemes[0].name).toBe("方案A");
  });

  test("PUT /webgrp/schemes 缺数据 → 400", async () => {
    const { status } = await fetchJson(apiPath("/schemes"), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    expect(status).toBe(400);
  });

  test("模型 CRUD：保存/读取/删除", async () => {
    // 保存模型
    const saved = await fetchJson(apiPath("/schemes/project"), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemePath: ["方案A"], name: "模型1", project: { canvasWidth: 1920, canvasHeight: 1024, nodes: [], edges: [] } })
    });
    expect(saved.status).toBe(200);
    expect(saved.json.ok).toBe(true);

    // 读取
    const got = await fetchJson(apiPath(`/schemes/project?schemePath=${SP_A}&name=模型1`));
    expect(got.status).toBe(200);
    expect(got.json.ok).toBe(true);
    expect(got.json.project).toBeTruthy();

    // 缺 name → 400
    const bad = await fetchJson(apiPath(`/schemes/project?schemePath=${SP_A}`));
    expect(bad.status).toBe(400);

    // 不存在 → 404
    const nf = await fetchJson(apiPath(`/schemes/project?schemePath=${SP_A}&name=不存在`));
    expect(nf.status).toBe(404);

    // 删除
    const del = await fetchJson(apiPath("/schemes/project"), {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemePath: ["方案A"], name: "模型1" })
    });
    expect(del.status).toBe(200);
    expect(del.json.ok).toBe(true);
  });

  test("方案目录 保存/删除", async () => {
    const saved = await fetchJson(apiPath("/schemes/scheme"), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemePath: ["方案B"] })
    });
    expect(saved.status).toBe(200);
    expect(saved.json.ok).toBe(true);

    const del = await fetchJson(apiPath("/schemes/scheme"), {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemePath: ["方案B"] })
    });
    expect(del.status).toBe(200);
    expect(del.json.ok).toBe(true);

    // 缺路径 → 400
    const bad = await fetchJson(apiPath("/schemes/scheme"), {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    expect(bad.status).toBe(400);
  });

  test("GET /webgrp/schemes/export 不存在 → 404", async () => {
    const sp = encodeURIComponent(JSON.stringify(["不存在方案"]));
    const { status } = await fetchJson(apiPath(`/schemes/export?schemePath=${sp}`));
    expect(status).toBe(404);
  });
});

// ============ 配置域 ============
describe("配置域 /webgrp/color-config & measurement-config & device-library", () => {
  test("color-config 读取 → 保存 → 再读取", async () => {
    const got0 = await fetchJson(apiPath("/color-config"));
    expect(got0.status).toBe(200);
    expect(got0.json).toBeTruthy();

    const saved = await fetchJson(apiPath("/color-config"), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ colorDisplayMode: "voltage", colorPalette: { test: 1 } })
    });
    expect(saved.status).toBe(200);
    expect(saved.json.ok).toBe(true);

    const got1 = await fetchJson(apiPath("/color-config"));
    expect(got1.status).toBe(200);
    expect(got1.json.colorDisplayMode).toBe("voltage");
  });

  test("measurement-config 保存 → 读取", async () => {
    const saved = await fetchJson(apiPath("/measurement-config"), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        measurementTypes: [{ id: "m1", name: "测点1" }],
        deviceProfiles: [],
        groupDefaults: {
          backgroundColor: "#fef3c7",
          borderColor: "#d97706",
          borderWidth: 3,
          borderStyle: "dashed"
        }
      })
    });
    expect(saved.status).toBe(200);
    expect(saved.json.ok).toBe(true);
    const got = await fetchJson(apiPath("/measurement-config"));
    expect(got.status).toBe(200);
    expect(Array.isArray(got.json.measurementTypes)).toBe(true);
    expect(got.json.groupDefaults).toEqual({
      backgroundColor: "#fef3c7",
      borderColor: "#d97706",
      borderWidth: 3,
      borderStyle: "dashed"
    });
  });

  test("device-library 保存 → 读取", async () => {
    const saved = await fetchJson(apiPath("/device-library"), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customComponentLibraries: [],
        customCategoryLibraries: [],
        eDeviceDefinitionLabels: { ACGenerator: "ACGeneratorRenamed" },
        eDeviceDefinitionClassExportEnabled: { ACGenerator: false }
      })
    });
    expect(saved.status).toBe(200);
    expect(saved.json.ok).toBe(true);
    expect(saved.json.eDeviceDefinitionLabels).toEqual({ ACGenerator: "ACGeneratorRenamed" });
    expect(saved.json.eDeviceDefinitionClassExportEnabled).toEqual({ ACGenerator: false });
    const got = await fetchJson(apiPath("/device-library"));
    expect(got.status).toBe(200);
    expect(got.json.eDeviceDefinitionLabels).toEqual({ ACGenerator: "ACGeneratorRenamed" });
    expect(got.json.eDeviceDefinitionClassExportEnabled).toEqual({ ACGenerator: false });
  });
});
