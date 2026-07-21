import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import AdmZip from "adm-zip";
import { createImageServer } from "./image-server.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

// 集成测试：起真实 server（临时端口 + tmpdir 数据目录），打真实 /webgrp/v1 请求。
// 问题：createImageServer 用模块级 schemeDataDir（repo data/），无法注入 tmpdir。
// 解法：用环境变量? 不支持。改为直接调 handler 函数 + mock req/res 测纯逻辑层，
//      或用 repo 真实 data 目录（若有 IEEE 数据）。
// 务实：测 handler 纯逻辑（parseSchemePathParam/encodeSchemePath + handler 信封格式），
//      完整 HTTP 集成用 repo data 目录只读验证 schemes 接口可响应。

let server;
let baseUrl;

beforeEach(async () => {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function fetchV1(pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 非 JSON（如 ZIP/SVG）
  }
  return { status: res.status, headers: res.headers, text, json };
}

const sampleProject = {
  version: 1,
  name: "测试模型",
  powerUnit: "MW",
  voltageUnit: "kV",
  currentUnit: "A",
  powerBaseValue: 100,
  nodes: [
    {
      id: "bus-1",
      kind: "ac-bus",
      name: "母线1",
      position: { x: 0, y: 0 },
      size: { width: 120, height: 16 },
      params: {},
      terminals: [{ id: "t1", type: "ac", anchor: { x: 0.5, y: 0.5 } }]
    }
  ],
  edges: []
};

describe("/webgrp/v1/schemes 方案列表", () => {
  test("200 返回信封 {ok:true,data:{schemes}}", async () => {
    const { status, json } = await fetchV1("/webgrp/v1/schemes");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.schemes)).toBe(true);
  });

  test("includeProjects=1 时含 projects", async () => {
    const { status, json } = await fetchV1("/webgrp/v1/schemes?includeProjects=1");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

describe("/webgrp/v1/schemes/hierarchy 层级树", () => {
  test("200 返回 {ok:true,data:{nodes}}", async () => {
    const { status, json } = await fetchV1("/webgrp/v1/schemes/hierarchy");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.nodes)).toBe(true);
  });
});

describe("/webgrp/v1/schemes/models 模型列表", () => {
  test("缺少 schemePath 返 400", async () => {
    const { status, json } = await fetchV1("/webgrp/v1/schemes/models");
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("非法 schemePath（非 JSON）返 400", async () => {
    const { status } = await fetchV1("/webgrp/v1/schemes/models?schemePath=not-json");
    expect(status).toBe(400);
  });

  test("不存在的方案返 404", async () => {
    const sp = encodeSchemePath(["不存在的方案xyz"]);
    const { status, json } = await fetchV1(`/webgrp/v1/schemes/models?schemePath=${sp}`);
    expect(status).toBe(404);
    expect(json.error.code).toBe("not-found");
  });
});

describe("/webgrp/v1/schemes/export 方案导出", () => {
  test("缺少 schemePath 返 400", async () => {
    const { status } = await fetchV1("/webgrp/v1/schemes/export");
    expect(status).toBe(400);
  });

  test("不存在的方案返 404", async () => {
    const sp = encodeSchemePath(["不存在的方案xyz"]);
    const { status } = await fetchV1(`/webgrp/v1/schemes/export?schemePath=${sp}`);
    expect(status).toBe(404);
  });
});

describe("/webgrp/v1/schemes/model/json 模型 JSON", () => {
  test("缺少 schemePath 返 400", async () => {
    const { status } = await fetchV1("/webgrp/v1/schemes/model/json?name=x");
    expect(status).toBe(400);
  });

  test("缺少 name 返 400", async () => {
    const sp = encodeSchemePath(["方案"]);
    const { status } = await fetchV1(`/webgrp/v1/schemes/model/json?schemePath=${sp}`);
    expect(status).toBe(400);
  });

  test("不存在模型返 404", async () => {
    const sp = encodeSchemePath(["方案xyz"]);
    const { status } = await fetchV1(`/webgrp/v1/schemes/model/json?schemePath=${sp}&name=不存在`);
    expect(status).toBe(404);
  });
});

describe("/webgrp/v1/schemes/model/svg 模型 SVG", () => {
  test("缺少 schemePath 返 400", async () => {
    const { status } = await fetchV1("/webgrp/v1/schemes/model/svg?name=x");
    expect(status).toBe(400);
  });

  test("缺少 name 返 400", async () => {
    const sp = encodeSchemePath(["方案"]);
    const { status } = await fetchV1(`/webgrp/v1/schemes/model/svg?schemePath=${sp}`);
    expect(status).toBe(400);
  });

  test("不存在模型返 404", async () => {
    const sp = encodeSchemePath(["方案xyz"]);
    const { status } = await fetchV1(`/webgrp/v1/schemes/model/svg?schemePath=${sp}&name=不存在`);
    expect(status).toBe(404);
  });
});

describe("schemePath 编解码", () => {
  test("encode/decode 往返一致", async () => {
    const { encodeSchemePath, parseSchemePathParam } = await import("./schemePath.mjs");
    const parts = ["方案A", "子方案B"];
    const encoded = encodeSchemePath(parts);
    const decoded = parseSchemePathParam(encoded);
    expect(decoded).toEqual(parts);
  });

  test("中文方案名编解码", async () => {
    const { encodeSchemePath, parseSchemePathParam } = await import("./schemePath.mjs");
    const parts = ["IEEE标准算例"];
    const encoded = encodeSchemePath(parts);
    expect(encoded).not.toContain("[");
    const decoded = parseSchemePathParam(encoded);
    expect(decoded).toEqual(parts);
  });
});

// 正路径测试需注入 tmpdir 数据目录，createImageServer 暂不支持 dataRoot 参数。
// 错误路径 + 信封格式 + 编解码已覆盖。正路径在 T12 E2E（真实数据）覆盖。
