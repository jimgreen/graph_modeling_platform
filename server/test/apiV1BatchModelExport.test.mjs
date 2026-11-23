import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  parseBatchModelExportQuery: vi.fn(),
  collectBatchModels: vi.fn(),
  expandAssociatedModels: vi.fn(),
  buildBatchModelArtifacts: vi.fn(),
  readGlobalLineRecords: vi.fn()
}));

vi.mock("../batchModelSelection.mjs", () => ({
  parseBatchModelExportQuery: mocks.parseBatchModelExportQuery,
  collectBatchModels: mocks.collectBatchModels,
  expandAssociatedModels: mocks.expandAssociatedModels,
  stableBatchModelKey: (model) => `${model.id}:${model.name}`
}));

vi.mock("../batchModelArtifacts.mjs", () => ({
  buildBatchModelArtifacts: mocks.buildBatchModelArtifacts
}));

vi.mock("../server.mjs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, readGlobalLineRecords: mocks.readGlobalLineRecords };
});

import { handleV1BatchModelExport, v1BatchModelExportRoutes } from "../apiV1BatchModelExport.mjs";

const paths = { root: "C:/tmp/batch-export", schemeFiles: "C:/tmp/batch-export/schemes/files" };
const station = { id: 12, name: "厂站一", schemePath: ["默认方案"], schemeId: 1, modelType: "厂站", project: {} };
const feeder = { id: 15, name: "馈线一", schemePath: ["默认方案", "子方案"], schemeId: 2, modelType: "馈线", project: {} };

function response() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    headersSent: false,
    writeHead(status, headers = {}) {
      this.statusCode = status;
      this.headers = headers;
      this.headersSent = true;
    },
    end(body) {
      this.body = body;
      this.headersSent = true;
    },
    json() {
      return JSON.parse(String(this.body));
    }
  };
}

function url(query = "") {
  return new URL(`http://127.0.0.1/webgrp/v1/models/export${query ? `?${query}` : ""}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.parseBatchModelExportQuery.mockReturnValue({
    scope: "space",
    formats: ["json", "svg"],
    encoding: "utf-8",
    templateName: "",
    includeDescendants: true,
    mergeE: false,
    includeAssociatedModels: false,
    colorMode: "energy",
    strict: false
  });
  mocks.collectBatchModels.mockResolvedValue({
    selectedModels: [station, feeder],
    allModels: [station, feeder],
    selectedBy: { scope: "space" }
  });
  mocks.readGlobalLineRecords.mockResolvedValue([]);
  mocks.expandAssociatedModels.mockReturnValue({
    models: [station, feeder],
    warnings: [],
    expandedModelKeys: []
  });
  mocks.buildBatchModelArtifacts.mockResolvedValue({
    modelArtifacts: [
      [{ format: "json", contentBase64: "c3RhdGlvbg==" }, { format: "svg", contentBase64: "c3Zn" }],
      [{ format: "json", contentBase64: "ZmVlZGVy" }, { format: "svg", contentBase64: "c3Zn" }]
    ],
    mergedE: [],
    warnings: []
  });
});

describe("handleV1BatchModelExport", () => {
  test("scope=space returns all requested formats as Base64 artifacts", async () => {
    const res = response();
    await handleV1BatchModelExport({ url: url("scope=space&formats=json,svg"), response: res, paths });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        selectedModelCount: 2,
        expandedModelCount: 0,
        modelCount: 2,
        models: [
          expect.objectContaining({ modelId: 12, artifacts: expect.any(Array) }),
          expect.objectContaining({ modelId: 15, artifacts: expect.any(Array) })
        ]
      })
    }));
    expect(mocks.buildBatchModelArtifacts).toHaveBeenCalledWith(expect.objectContaining({
      models: [station, feeder],
      paths
    }));
  });

  test("scope=scheme includes descendants and returns selectedBy metadata", async () => {
    mocks.parseBatchModelExportQuery.mockReturnValueOnce({
      scope: "scheme",
      schemePath: ["默认方案"],
      includeDescendants: true,
      formats: ["json"],
      encoding: "utf-8",
      templateName: "",
      mergeE: false,
      includeAssociatedModels: false,
      colorMode: "energy",
      strict: false
    });
    mocks.collectBatchModels.mockResolvedValueOnce({
      selectedModels: [station, feeder],
      allModels: [station, feeder],
      selectedBy: { scope: "scheme", schemePath: ["默认方案"] }
    });
    const res = response();
    await handleV1BatchModelExport({ url: url("scope=scheme&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&formats=json"), response: res, paths });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.selectedBy).toEqual({ scope: "scheme", schemePath: ["默认方案"] });
    expect(mocks.collectBatchModels).toHaveBeenCalledWith({ paths, query: expect.objectContaining({ scope: "scheme" }) });
  });

  test("scope=model resolves modelId and parser errors return 400", async () => {
    const ok = response();
    mocks.parseBatchModelExportQuery.mockReturnValueOnce({
      scope: "model",
      modelId: 12,
      formats: ["json"],
      encoding: "utf-8",
      templateName: "",
      includeDescendants: true,
      mergeE: false,
      includeAssociatedModels: false,
      colorMode: "energy",
      strict: false
    });
    await handleV1BatchModelExport({ url: url("scope=model&modelId=12&formats=json"), response: ok, paths });
    expect(ok.statusCode).toBe(200);

    mocks.parseBatchModelExportQuery.mockReturnValueOnce({ error: { code: "bad-request", message: "selector conflict" } });
    const bad = response();
    await handleV1BatchModelExport({ url: url("scope=model&modelId=12&name=x"), response: bad, paths });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toEqual({ code: "bad-request", message: "selector conflict" });
  });

  test("missing model returns 404 and a generator failure returns 500 without partial success", async () => {
    mocks.collectBatchModels.mockRejectedValueOnce(Object.assign(new Error("模型不存在。"), { code: "not-found" }));
    const missing = response();
    await handleV1BatchModelExport({ url: url("scope=model&modelId=999999"), response: missing, paths });
    expect(missing.statusCode).toBe(404);

    mocks.buildBatchModelArtifacts.mockRejectedValueOnce(new Error("render failed"));
    const failed = response();
    await handleV1BatchModelExport({ url: url("scope=space&formats=svg"), response: failed, paths });
    expect(failed.statusCode).toBe(500);
    expect(failed.json().ok).toBe(false);
  });

  test("output budget failure returns 413 payload-too-large", async () => {
    mocks.buildBatchModelArtifacts.mockRejectedValueOnce(
      Object.assign(new Error("批量导出产物过大"), { code: "payload-too-large" })
    );
    const failed = response();
    await handleV1BatchModelExport({ url: url("scope=space&formats=json"), response: failed, paths });
    expect(failed.statusCode).toBe(413);
    expect(failed.json().error.code).toBe("payload-too-large");
  });
});

describe("v1BatchModelExportRoutes", () => {
  test("registers GET /webgrp/v1/models/export through withSpacePaths", () => {
    expect(v1BatchModelExportRoutes).toHaveLength(1);
    expect(v1BatchModelExportRoutes[0].method).toBe("GET");
    expect(v1BatchModelExportRoutes[0].pattern.test("/webgrp/v1/models/export")).toBe(true);
    expect(typeof v1BatchModelExportRoutes[0].handle).toBe("function");
  });
});
