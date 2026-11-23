import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createSpaceStore } from "../spaceStore.mjs";
import { parseBatchModelExportQuery, collectBatchModels, expandAssociatedModels } from "../batchModelSelection.mjs";

const url = (search) => new URL(`http://127.0.0.1/webgrp/v1/models/export${search ? `?${search}` : ""}`);

let dataDir;
let paths;
let stationModel;
let feederModel;
let stationModelWithMissingTarget;
let lineRecord;

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "batch-model-selection-"));
  paths = createSpaceStore(dataDir).resolvePaths("default");
  const root = join(paths.schemeFiles, "默认方案");
  const child = join(root, "子方案");
  await mkdir(child, { recursive: true });
  stationModel = {
    id: 12,
    name: "厂站一",
    schemePath: ["默认方案"],
    modelType: "厂站",
    project: { idx: 12, modelType: "厂站", nodes: [{ id: "source", kind: "ac-feeder-source", params: { model_id: "15" } }], edges: [] }
  };
  feederModel = {
    id: 15,
    name: "馈线一",
    schemePath: ["默认方案", "子方案"],
    modelType: "馈线",
    project: { idx: 15, modelType: "馈线", nodes: [], edges: [] }
  };
  stationModelWithMissingTarget = {
    ...stationModel,
    project: { ...stationModel.project, nodes: [{ id: "source", kind: "ac-feeder-source", params: { model_id: "999999" } }] }
  };
  lineRecord = {
    id: "line-1",
    endpointSlots: {
      source: { projectIdx: 12, projectName: "厂站一" },
      target: { projectIdx: 15, projectName: "馈线一" }
    }
  };
  await writeFile(join(root, "厂站一.json"), JSON.stringify(stationModel.project));
  await writeFile(join(child, "馈线一.json"), JSON.stringify(feederModel.project));
});

afterAll(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe("parseBatchModelExportQuery", () => {
  test("defaults to space and all formats", () => {
    expect(parseBatchModelExportQuery(url(""))).toEqual({
      scope: "space",
      includeDescendants: true,
      formats: ["json", "svg", "cim", "e"],
      encoding: "utf-8",
      templateName: "",
      mergeE: false,
      includeAssociatedModels: false,
      colorMode: "energy",
      strict: false
    });
  });

  test("deduplicates formats and parses booleans", () => {
    const result = parseBatchModelExportQuery(url(
      "scope=scheme&schemeId=3&formats=e,svg,cim,e&includeDescendants=0&mergeE=1&strict=true"
    ));
    expect(result.formats).toEqual(["svg", "cim", "e"]);
    expect(result.includeDescendants).toBe(false);
    expect(result.mergeE).toBe(true);
    expect(result.strict).toBe(true);
  });

  test("rejects selector combinations and format-specific parameters", () => {
    expect(parseBatchModelExportQuery(url("scope=space&schemeId=3")).error.code).toBe("bad-request");
    expect(parseBatchModelExportQuery(url("scope=model&modelId=12&name=x&schemeId=3")).error.code).toBe("bad-request");
    expect(parseBatchModelExportQuery(url("formats=json&template=配网实时库")).error.code).toBe("bad-request");
    expect(parseBatchModelExportQuery(url("formats=svg&mergeE=true")).error.code).toBe("bad-request");
  });
});

describe("collectBatchModels", () => {
  test("space scope returns all saved models in deterministic path order", async () => {
    const result = await collectBatchModels({ paths, query: { scope: "space", includeDescendants: true } });
    expect(result.selectedModels.map((model) => `${model.schemePath.join("/")}/${model.name}`)).toEqual([
      "默认方案/厂站一",
      "默认方案/子方案/馈线一"
    ]);
  });

  test("scheme scope includes descendants by default and excludes them when false", async () => {
    const withChildren = await collectBatchModels({ paths, query: { scope: "scheme", schemePath: ["默认方案"], includeDescendants: true } });
    const directOnly = await collectBatchModels({ paths, query: { scope: "scheme", schemePath: ["默认方案"], includeDescendants: false } });
    expect(withChildren.selectedModels).toHaveLength(2);
    expect(directOnly.selectedModels).toHaveLength(1);
  });

  test("model scope resolves numeric idx and schemePath plus name", async () => {
    const byIdx = await collectBatchModels({ paths, query: { scope: "model", modelId: 12 } });
    const byPath = await collectBatchModels({ paths, query: { scope: "model", schemePath: ["默认方案"], name: "厂站一" } });
    expect(byIdx.selectedModels[0].id).toBe(12);
    expect(byPath.selectedModels[0].name).toBe("厂站一");
  });

  test("rejects input models over the batch input budget before loading them", async () => {
    await expect(collectBatchModels({
      paths,
      query: { scope: "space", includeDescendants: true },
      maxInputBytes: 1
    })).rejects.toMatchObject({ code: "payload-too-large" });
  });
});

describe("expandAssociatedModels", () => {
  test("association closure follows model_id references in both directions", () => {
    const result = expandAssociatedModels({ selectedModels: [stationModel], allModels: [stationModel, feederModel], globalLineRecords: [], includeAssociatedModels: true });
    expect(result.models.map((model) => model.id)).toEqual([12, 15]);
    expect(result.expandedModelKeys).toContain("idx:馈线:15");
  });

  test("association closure follows global-line source/target references and stops cycles", () => {
    const result = expandAssociatedModels({ selectedModels: [stationModel], allModels: [stationModel, feederModel], globalLineRecords: [lineRecord], includeAssociatedModels: true });
    expect(result.models).toHaveLength(2);
    expect(result.warnings).toEqual([]);
  });

  test("missing association target creates a warning without adding a fake model", () => {
    const result = expandAssociatedModels({ selectedModels: [stationModelWithMissingTarget], allModels: [stationModelWithMissingTarget], globalLineRecords: [], includeAssociatedModels: true });
    expect(result.models).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({ code: "associated-model-not-found" });
  });
});
