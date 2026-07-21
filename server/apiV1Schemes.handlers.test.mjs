import { describe, expect, test, vi } from "vitest";
import AdmZip from "adm-zip";
import { handleV1Schemes, handleV1SchemesHierarchy, handleV1SchemeModels, handleV1SchemeExport, handleV1ModelJson, handleV1ModelSvg } from "./apiV1Schemes.mjs";

// handler 单测：mock image-server 依赖函数，验证成功分支（正路径）+ 信封。
// 覆盖 sendV1Json 成功路径，补 apiV1Schemes.test.mjs 的 HTTP 错误路径。

vi.mock("./image-server.mjs", () => ({
  readSchemes: vi.fn(),
  createSchemeArchiveBuffer: vi.fn(),
  readSchemeProjectRecord: vi.fn(),
  buildSvgFile: vi.fn(),
  readMeasurementConfig: vi.fn()
}));

import { readSchemes, createSchemeArchiveBuffer, readSchemeProjectRecord, buildSvgFile, readMeasurementConfig } from "./image-server.mjs";

function createMockResponse() {
  const chunks = [];
  return {
    statusCode: 0,
    headers: {},
    _rawBuffer: null,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers ?? {};
    },
    end(data) {
      if (data !== undefined) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        chunks.push(buf);
        this._rawBuffer = buf;
      }
    },
    body() {
      return Buffer.concat(chunks).toString("utf-8");
    },
    jsonBody() {
      return JSON.parse(this.body());
    }
  };
}

function mockUrl(pathname, search = "") {
  return new URL(`http://127.0.0.1${pathname}${search ? `?${search}` : ""}`);
}

describe("handleV1Schemes 正路径", () => {
  test("成功返方案树信封", async () => {
    readSchemes.mockResolvedValue([
      { name: "方案A", updatedAt: "2024-01-01", projects: [{ name: "模型1", updatedAt: "2024-01-01" }], children: [] }
    ]);
    const res = createMockResponse();
    await handleV1Schemes({ url: mockUrl("/webgrp/v1/schemes"), request: { headers: {} }, response: res });
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody()).toEqual({
      ok: true,
      data: { schemes: [{ name: "方案A", updatedAt: "2024-01-01", projects: [{ name: "模型1", updatedAt: "2024-01-01" }], children: [] }] }
    });
  });

  test("includeProjects=1 透传完整 schemes", async () => {
    const full = [{ name: "方案A", updatedAt: "x", projects: [{ name: "m", updatedAt: "y", project: { nodes: [] } }] }];
    readSchemes.mockResolvedValue(full);
    const res = createMockResponse();
    await handleV1Schemes({ url: mockUrl("/webgrp/v1/schemes", "includeProjects=1"), request: { headers: {} }, response: res });
    expect(res.jsonBody().data.schemes).toEqual(full);
  });

  test("readSchemes 抛错转 internal", async () => {
    readSchemes.mockRejectedValue(new Error("boom"));
    const res = createMockResponse();
    await handleV1Schemes({ url: mockUrl("/webgrp/v1/schemes"), request: { headers: {} }, response: res });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().error.code).toBe("internal");
  });
});

describe("handleV1SchemesHierarchy 正路径", () => {
  test("成功返层级树", async () => {
    readSchemes.mockResolvedValue([{ name: "A", updatedAt: "x", children: [{ name: "B", updatedAt: "y", children: [] }] }]);
    const res = createMockResponse();
    await handleV1SchemesHierarchy({ url: mockUrl("/webgrp/v1/schemes/hierarchy"), request: { headers: {} }, response: res });
    expect(res.jsonBody()).toEqual({ ok: true, data: { nodes: [{ name: "A", updatedAt: "x", children: [{ name: "B", updatedAt: "y", children: [] }] }] } });
  });
});

describe("handleV1SchemeModels 正路径", () => {
  test("成功返模型列表", async () => {
    readSchemes.mockResolvedValue([{ name: "方案A", updatedAt: "x", projects: [{ name: "m1", updatedAt: "y" }], children: [] }]);
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1SchemeModels({ url: mockUrl("/webgrp/v1/schemes/models", `schemePath=${sp}`), request: { headers: {} }, response: res });
    expect(res.jsonBody()).toEqual({ ok: true, data: { models: [{ name: "m1", updatedAt: "y" }] } });
  });

  test("嵌套方案路径查找", async () => {
    readSchemes.mockResolvedValue([{ name: "父", updatedAt: "x", projects: [], children: [{ name: "子", updatedAt: "y", projects: [{ name: "m", updatedAt: "z" }], children: [] }] }]);
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["父", "子"]));
    await handleV1SchemeModels({ url: mockUrl("/webgrp/v1/schemes/models", `schemePath=${sp}`), request: { headers: {} }, response: res });
    expect(res.jsonBody().data.models).toEqual([{ name: "m", updatedAt: "z" }]);
  });
});

describe("handleV1SchemeExport 正路径", () => {
  test("成功返 ZIP 二进制", async () => {
    const zip = new AdmZip();
    zip.addFile("test.txt", "hello");
    const buffer = zip.toBuffer();
    createSchemeArchiveBuffer.mockResolvedValue({ buffer, filename: "方案A.zip" });
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1SchemeExport({ url: mockUrl("/webgrp/v1/schemes/export", `schemePath=${sp}`), response: res });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/zip");
    expect(Buffer.isBuffer(res._rawBuffer)).toBe(true);
    expect(res._rawBuffer.length).toBe(buffer.length);
    expect(res.headers["content-disposition"]).toContain(encodeURIComponent("方案A.zip"));
  });

  test("createSchemeArchiveBuffer 抛缺少路径返 400", async () => {
    createSchemeArchiveBuffer.mockRejectedValue(new Error("缺少方案路径"));
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["x"]));
    await handleV1SchemeExport({ url: mockUrl("/webgrp/v1/schemes/export", `schemePath=${sp}`), response: res });
    expect(res.statusCode).toBe(400);
  });

  test("createSchemeArchiveBuffer 抛其他错返 404", async () => {
    createSchemeArchiveBuffer.mockRejectedValue(new Error("方案目录不存在"));
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["x"]));
    await handleV1SchemeExport({ url: mockUrl("/webgrp/v1/schemes/export", `schemePath=${sp}`), response: res });
    expect(res.statusCode).toBe(404);
  });
});

describe("handleV1ModelJson 正路径", () => {
  test("成功返 project", async () => {
    readSchemeProjectRecord.mockResolvedValue({ name: "m", project: { version: 1, name: "m", nodes: [], edges: [] } });
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelJson({ url: mockUrl("/webgrp/v1/schemes/model/json", `schemePath=${sp}&name=m`), request: { headers: {} }, response: res });
    expect(res.jsonBody()).toEqual({ ok: true, data: { project: { version: 1, name: "m", nodes: [], edges: [] } } });
  });
});

describe("handleV1ModelSvg 正路径", () => {
  test("成功返 SVG 文本", async () => {
    readSchemeProjectRecord.mockResolvedValue({ name: "m", project: { name: "m", nodes: [], edges: [] } });
    readMeasurementConfig.mockResolvedValue({ measurementTypes: [], deviceProfiles: [] });
    buildSvgFile.mockReturnValue("<svg>...</svg>");
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelSvg({ url: mockUrl("/webgrp/v1/schemes/model/svg", `schemePath=${sp}&name=m`), response: res });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/svg+xml; charset=utf-8");
    expect(res.body()).toBe("<svg>...</svg>");
  });
});
