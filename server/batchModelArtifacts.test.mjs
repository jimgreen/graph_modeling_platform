import { beforeEach, describe, expect, test, vi } from "vitest";
import iconv from "iconv-lite";

const mocks = vi.hoisted(() => ({
  renderSavedModelSvg: vi.fn(),
  buildCimForSavedModel: vi.fn(),
  buildEFilesForSavedModels: vi.fn(),
  eFileTemplateAllowsModelType: vi.fn(),
  readPredefinedTemplateBase64: vi.fn()
}));

vi.mock("./svgExport.mjs", () => ({
  renderSavedModelSvg: mocks.renderSavedModelSvg
}));

vi.mock("./cimExport.mjs", () => ({
  buildCimForSavedModel: mocks.buildCimForSavedModel
}));

vi.mock("./eFileExport.mjs", () => ({
  buildEFilesForSavedModels: mocks.buildEFilesForSavedModels,
  eFileTemplateAllowsModelType: mocks.eFileTemplateAllowsModelType
}));

vi.mock("./eFileTemplates.mjs", () => ({
  readPredefinedTemplateBase64: mocks.readPredefinedTemplateBase64
}));

import { buildBatchModelArtifacts } from "./batchModelArtifacts.mjs";

const paths = { root: "C:/tmp/batch-export", schemeFiles: "C:/tmp/batch-export/schemes/files" };

const stationModel = {
  id: 12,
  name: "厂站一",
  schemePath: ["默认方案"],
  modelType: "厂站",
  relativePath: "默认方案/厂站一",
  project: {
    idx: 12,
    name: "厂站一",
    modelType: "厂站",
    nodes: [],
    edges: []
  }
};

const feederModel = {
  id: 15,
  name: "馈线一",
  schemePath: ["默认方案", "子方案"],
  modelType: "馈线",
  relativePath: "默认方案/子方案/馈线一",
  project: {
    idx: 15,
    name: "馈线一",
    modelType: "馈线",
    nodes: [],
    edges: []
  }
};

const unreadableModel = {
  ...stationModel,
  name: "读盘失败模型",
  project: { ...stationModel.project, name: "读盘失败模型" }
};

const globalLineRecords = [];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.eFileTemplateAllowsModelType.mockImplementation((templateName, modelType) => {
    if (templateName === "国网E格式") return modelType === "厂站";
    return true;
  });
  mocks.readPredefinedTemplateBase64.mockResolvedValue(Buffer.from("template", "utf8").toString("base64"));
  mocks.renderSavedModelSvg.mockImplementation(async ({ name }) => ({ svg: `<svg>${name}</svg>` }));
  mocks.buildCimForSavedModel.mockImplementation(async ({ name }) => ({
    xml: `<cim>${name}</cim>`,
    filename: `${name}.xml`
  }));
  mocks.buildEFilesForSavedModels.mockImplementation(async (options) => ({
    files: options.models.map((model) => ({
      ...model,
      file: { filename: `${model.name}.e`, text: `e:${model.name}`, mime: "text/plain", warnings: [] }
    })),
    merged: {
      filename: `${options.models[0]?.modelType ?? "models"}.e`,
      text: `merged:${options.models[0]?.modelType ?? "models"}`,
      mime: "text/plain",
      warnings: []
    }
  }));
});

describe("buildBatchModelArtifacts", () => {
  test("JSON artifact decodes to the saved project with requested encoding", async () => {
    const result = await buildBatchModelArtifacts({
      models: [stationModel],
      formats: ["json"],
      encoding: "gbk",
      paths
    });

    const text = iconv.decode(Buffer.from(result.modelArtifacts[0][0].contentBase64, "base64"), "gbk");
    expect(JSON.parse(text).name).toBe("厂站一");
    expect(result.modelArtifacts[0][0]).toMatchObject({
      format: "json",
      encoding: "gbk",
      mimeType: "application/json",
      filename: "厂站一.json"
    });
  });

  test("SVG and CIM artifacts include the matching XML declaration and bytes", async () => {
    const result = await buildBatchModelArtifacts({
      models: [stationModel],
      formats: ["svg", "cim"],
      encoding: "gbk",
      colorMode: "voltage",
      strict: false,
      paths
    });

    expect(mocks.renderSavedModelSvg).toHaveBeenCalledWith(expect.objectContaining({
      parts: stationModel.schemePath,
      name: stationModel.name,
      colorMode: "voltage",
      paths
    }));
    expect(mocks.buildCimForSavedModel).toHaveBeenCalledWith(expect.objectContaining({
      parts: stationModel.schemePath,
      name: stationModel.name,
      strict: false,
      paths
    }));
    for (const artifact of result.modelArtifacts[0]) {
      const text = iconv.decode(Buffer.from(artifact.contentBase64, "base64"), "gbk");
      expect(text).toContain('encoding="GBK"');
      expect(artifact.encoding).toBe("gbk");
    }
  });

  test("per-model E reuses buildEFilesForSavedModels", async () => {
    const result = await buildBatchModelArtifacts({
      models: [stationModel],
      formats: ["e"],
      encoding: "utf-8",
      mergeE: false,
      paths,
      globalLineRecords
    });

    expect(mocks.buildEFilesForSavedModels).toHaveBeenCalledWith(expect.objectContaining({
      models: [stationModel],
      paths,
      globalLineRecords
    }));
    expect(result.modelArtifacts[0][0]).toMatchObject({
      format: "e",
      mimeType: "text/plain",
      encoding: "utf-8",
      filename: "厂站一.e"
    });
  });

  test("mergeE groups inputs by modelType and returns one merged artifact per group", async () => {
    const result = await buildBatchModelArtifacts({
      models: [stationModel, feederModel],
      formats: ["e"],
      encoding: "utf-8",
      mergeE: true,
      paths,
      globalLineRecords
    });

    expect(result.mergedE.map((artifact) => artifact.modelType)).toEqual(["厂站", "馈线"]);
    expect(result.mergedE.map((artifact) => artifact.filename)).toEqual(["厂站.e", "馈线.e"]);
    expect(result.modelArtifacts).toEqual([[], []]);
    expect(mocks.buildEFilesForSavedModels).toHaveBeenCalledTimes(2);
  });

  test("template-incompatible models remain in models but receive an E warning", async () => {
    const result = await buildBatchModelArtifacts({
      models: [stationModel, feederModel],
      formats: ["json", "e"],
      encoding: "utf-8",
      templateName: "国网E格式",
      mergeE: false,
      paths,
      globalLineRecords
    });

    expect(result.modelArtifacts).toHaveLength(2);
    expect(result.modelArtifacts[0].map((artifact) => artifact.format)).toEqual(["json", "e"]);
    expect(result.modelArtifacts[1].map((artifact) => artifact.format)).toEqual(["json"]);
    expect(result.warnings.some((warning) => warning.code === "e-template-model-type-skipped")).toBe(true);
    expect(mocks.buildEFilesForSavedModels).toHaveBeenCalledWith(expect.objectContaining({ models: [stationModel] }));
  });

  test("a generator failure rejects the entire batch", async () => {
    mocks.renderSavedModelSvg.mockRejectedValueOnce(new Error("EACCES: injected read failure"));

    await expect(buildBatchModelArtifacts({
      models: [unreadableModel],
      formats: ["svg"],
      encoding: "utf-8",
      paths
    })).rejects.toThrow("EACCES");
  });

  test("rejects a batch whose encoded artifacts exceed the output budget", async () => {
    await expect(buildBatchModelArtifacts({
      models: [stationModel],
      formats: ["json"],
      encoding: "utf-8",
      maxOutputBytes: 10,
      paths
    })).rejects.toMatchObject({ code: "payload-too-large" });
  });
});
