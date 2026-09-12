import { describe, expect, test, vi } from "vitest";
import AdmZip from "adm-zip";
import { handleV1Schemes, handleV1SchemesHierarchy, handleV1SchemeModels, handleV1SchemeExport, handleV1ModelJson, handleV1ModelSvg } from "./apiV1Schemes.mjs";
import { apiPath } from "./config.mjs";

// handler 单测：mock image-server 依赖函数，验证成功分支（正路径）+ 信封。
// 覆盖 sendV1Json 成功路径，补 apiV1Schemes.test.mjs 的 HTTP 错误路径。

vi.mock("./server.mjs", () => ({
  readSchemes: vi.fn(),
  createSchemeArchiveBuffer: vi.fn(),
  readSchemeProjectRecord: vi.fn(),
  // 保留桩：cimExport.mjs 顶层从 server.mjs 导入该名字，缺导出会在触发 CIM handler 时抛 vitest 报错
  readMeasurementConfig: vi.fn()
}));

vi.mock("./svgExport.mjs", () => ({
  renderSavedModelSvg: vi.fn()
}));

import { readSchemes, createSchemeArchiveBuffer, readSchemeProjectRecord } from "./server.mjs";
import { renderSavedModelSvg } from "./svgExport.mjs";

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
    await handleV1Schemes({ url: mockUrl(apiPath("/v1/schemes")), request: { headers: {} }, response: res });
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
    await handleV1Schemes({ url: mockUrl(apiPath("/v1/schemes"), "includeProjects=1"), request: { headers: {} }, response: res });
    expect(res.jsonBody().data.schemes).toEqual(full);
  });

  test("readSchemes 抛错转 internal", async () => {
    readSchemes.mockRejectedValue(new Error("boom"));
    const res = createMockResponse();
    await handleV1Schemes({ url: mockUrl(apiPath("/v1/schemes")), request: { headers: {} }, response: res });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().error.code).toBe("internal");
  });
});

describe("handleV1SchemesHierarchy 正路径", () => {
  test("成功返层级树", async () => {
    readSchemes.mockResolvedValue([{ name: "A", updatedAt: "x", children: [{ name: "B", updatedAt: "y", children: [] }] }]);
    const res = createMockResponse();
    await handleV1SchemesHierarchy({ url: mockUrl(apiPath("/v1/schemes/hierarchy")), request: { headers: {} }, response: res });
    expect(res.jsonBody()).toEqual({ ok: true, data: { nodes: [{ name: "A", updatedAt: "x", children: [{ name: "B", updatedAt: "y", children: [] }] }] } });
  });
});

describe("handleV1SchemeModels 正路径", () => {
  test("成功返模型列表", async () => {
    readSchemes.mockResolvedValue([{ name: "方案A", updatedAt: "x", projects: [{ name: "m1", updatedAt: "y" }], children: [] }]);
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1SchemeModels({ url: mockUrl(apiPath("/v1/schemes/models"), `schemePath=${sp}`), request: { headers: {} }, response: res });
    expect(res.jsonBody()).toEqual({ ok: true, data: { models: [{ name: "m1", updatedAt: "y" }] } });
  });

  test("嵌套方案路径查找", async () => {
    readSchemes.mockResolvedValue([{ name: "父", updatedAt: "x", projects: [], children: [{ name: "子", updatedAt: "y", projects: [{ name: "m", updatedAt: "z" }], children: [] }] }]);
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["父", "子"]));
    await handleV1SchemeModels({ url: mockUrl(apiPath("/v1/schemes/models"), `schemePath=${sp}`), request: { headers: {} }, response: res });
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
    await handleV1SchemeExport({ url: mockUrl(apiPath("/v1/schemes/export"), `schemePath=${sp}`), response: res });
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
    await handleV1SchemeExport({ url: mockUrl(apiPath("/v1/schemes/export"), `schemePath=${sp}`), response: res });
    expect(res.statusCode).toBe(400);
  });

  test("createSchemeArchiveBuffer 抛其他错返 404", async () => {
    createSchemeArchiveBuffer.mockRejectedValue(new Error("方案目录不存在"));
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["x"]));
    await handleV1SchemeExport({ url: mockUrl(apiPath("/v1/schemes/export"), `schemePath=${sp}`), response: res });
    expect(res.statusCode).toBe(404);
  });
});

describe("handleV1ModelJson 正路径", () => {
  test("成功返 project", async () => {
    readSchemeProjectRecord.mockResolvedValue({ name: "m", project: { version: 1, name: "m", nodes: [], edges: [] } });
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelJson({ url: mockUrl(apiPath("/v1/schemes/model/json"), `schemePath=${sp}&name=m`), request: { headers: {} }, response: res });
    expect(res.jsonBody()).toEqual({ ok: true, data: { project: { version: 1, name: "m", nodes: [], edges: [] } } });
  });
});

describe("handleV1ModelSvg 正路径", () => {
  test("成功返 SVG 文本（no-store）", async () => {
    renderSavedModelSvg.mockResolvedValue({ svg: "<svg>...</svg>" });
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelSvg({ url: mockUrl(apiPath("/v1/schemes/model/svg"), `schemePath=${sp}&name=m`), response: res });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/svg+xml; charset=utf-8");
    expect(res.headers["cache-control"]).toBe("no-store");
    // XML 声明由后端产出（前端不再前置），保证响应体与前端落盘文件逐字节一致
    expect(res.body()).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<svg>...</svg>');
  });

  test("已有 XML 声明先剥离，不产生重复声明", async () => {
    renderSavedModelSvg.mockResolvedValue({ svg: '<?xml version="1.0"?>\n<svg>...</svg>' });
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelSvg({ url: mockUrl(apiPath("/v1/schemes/model/svg"), `schemePath=${sp}&name=m`), response: res });
    expect(res.body()).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<svg>...</svg>');
  });

  test("encoding=gbk → 声明标 GBK 且按 GBK 编码字节", async () => {
    renderSavedModelSvg.mockResolvedValue({ svg: "<svg>中文</svg>" });
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelSvg({ url: mockUrl(apiPath("/v1/schemes/model/svg"), `schemePath=${sp}&name=m&encoding=gbk`), response: res });
    expect(res.headers["content-type"]).toBe("image/svg+xml; charset=gbk");
    expect(res.body().startsWith('<?xml version="1.0" encoding="GBK"?>\n<svg>')).toBe(true);
  });

  test("encoding 非法 → 400", async () => {
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelSvg({ url: mockUrl(apiPath("/v1/schemes/model/svg"), `schemePath=${sp}&name=m&encoding=big5`), response: res });
    expect(res.statusCode).toBe(400);
  });

  test("renderSavedModelSvg 返 not-found → 404", async () => {
    renderSavedModelSvg.mockResolvedValue({ error: { code: "not-found", message: "模型不存在。" } });
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelSvg({ url: mockUrl(apiPath("/v1/schemes/model/svg"), `schemePath=${sp}&name=m`), response: res });
    expect(res.statusCode).toBe(404);
    expect(res.jsonBody().error.code).toBe("not-found");
  });

  test("renderSavedModelSvg 抛错 → 500 internal", async () => {
    renderSavedModelSvg.mockRejectedValue(new Error("boom"));
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelSvg({ url: mockUrl(apiPath("/v1/schemes/model/svg"), `schemePath=${sp}&name=m`), response: res });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().error.code).toBe("internal");
  });

  test("colorMode 透传：缺省 energy，voltage 可选", async () => {
    renderSavedModelSvg.mockClear();
    renderSavedModelSvg.mockResolvedValue({ svg: "<svg/>" });
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelSvg({ url: mockUrl(apiPath("/v1/schemes/model/svg"), `schemePath=${sp}&name=m`), response: createMockResponse() });
    expect(renderSavedModelSvg).toHaveBeenLastCalledWith(expect.objectContaining({ colorMode: "energy" }));
    await handleV1ModelSvg({ url: mockUrl(apiPath("/v1/schemes/model/svg"), `schemePath=${sp}&name=m&colorMode=voltage`), response: createMockResponse() });
    expect(renderSavedModelSvg).toHaveBeenLastCalledWith(expect.objectContaining({ colorMode: "voltage" }));
  });

  test("colorMode 非法 → 400 bad-request，不进入渲染", async () => {
    renderSavedModelSvg.mockClear();
    const res = createMockResponse();
    const sp = encodeURIComponent(JSON.stringify(["方案A"]));
    await handleV1ModelSvg({ url: mockUrl(apiPath("/v1/schemes/model/svg"), `schemePath=${sp}&name=m&colorMode=rainbow`), response: res });
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody().error.code).toBe("bad-request");
    expect(renderSavedModelSvg).not.toHaveBeenCalled();
  });
});
