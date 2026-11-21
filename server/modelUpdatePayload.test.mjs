import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import iconv from "iconv-lite";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { installDomShim } from "./domShim.mjs";
import { spacePathsFor } from "./spaceStore.mjs";

let buildModelUpdatePayload;
try {
  ({ buildModelUpdatePayload } = await import("./modelUpdatePayload.mjs"));
} catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") {
    throw error;
  }
}

installDomShim();

const project = {
  version: 1,
  name: "厂站模型",
  idx: 12,
  modelType: "厂站",
  powerUnit: "MW",
  voltageUnit: "kV",
  currentUnit: "A",
  powerBaseValue: 100,
  canvasWidth: 800,
  canvasHeight: 400,
  nodes: [
    {
      id: "bus1",
      kind: "ac-bus",
      name: "母线一",
      nodeNumber: "1",
      acTopologyNode: 0,
      dcTopologyNode: 0,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 40 },
      rotation: 0,
      scale: 1,
      terminals: [{ id: "t1", type: "ac", nodeNumber: "1", vbase: "10", anchor: { x: 0.5, y: 0.5 } }],
      params: { vbase: "10" }
    },
    {
      id: "load1",
      kind: "ac-load",
      name: "负荷一",
      nodeNumber: "2",
      acTopologyNode: 0,
      dcTopologyNode: 0,
      position: { x: 200, y: 0 },
      size: { width: 80, height: 40 },
      rotation: 0,
      scale: 1,
      terminals: [{ id: "t1", type: "ac", nodeNumber: "2", anchor: { x: 0.5, y: 0 } }],
      params: { vbase: "10", p_set: "1", q_set: "0.2" }
    }
  ],
  edges: []
};

let dataRoot;
let paths;

beforeEach(() => {
  dataRoot = mkdtempSync(join(tmpdir(), "model-update-payload-"));
  paths = spacePathsFor(dataRoot, "default");
  const schemeDirectory = join(paths.schemeFiles, "发送方案");
  mkdirSync(schemeDirectory, { recursive: true });
  writeFileSync(
    join(schemeDirectory, "厂站模型.json"),
    JSON.stringify(project),
    "utf-8"
  );
});

afterEach(() => {
  if (dataRoot) {
    rmSync(dataRoot, { recursive: true, force: true });
    dataRoot = undefined;
    paths = undefined;
  }
});

const buildFromFixture = (files) => (buildModelUpdatePayload ?? (() => null))({
  record: { name: project.name, project },
  schemePath: ["发送方案"],
  files,
  paths,
  now: () => new Date("2026-11-21T10:00:00.000Z")
});

describe("model update multipart-compatible payload", () => {
  test("serializes the raw ProjectFile into json_file with sender field metadata", async () => {
    const json = JSON.stringify(project);
    const payload = await buildFromFixture([{ kind: "json" }]);

    expect(payload).toEqual({
      model_id: "12",
      model_name: "厂站模型",
      template_name: "",
      scheme_path: "[\"发送方案\"]",
      sent_at: "2026-11-21T10:00:00.000Z",
      files: [{
        kind: "json",
        field: "json_file",
        filename: "厂站模型.json",
        contentType: "application/json; charset=utf-8",
        encoding: "utf-8",
        bytes: Buffer.byteLength(json, "utf-8"),
        contentBase64: Buffer.from(json, "utf-8").toString("base64")
      }]
    });
    expect(JSON.parse(Buffer.from(payload.files[0].contentBase64, "base64").toString("utf-8")))
      .toEqual(project);
  });

  test("maps XML selection to the sender's cim_file field and XML bytes", async () => {
    const payload = await buildFromFixture([{ kind: "xml" }]);
    const [file] = payload.files;
    const xml = Buffer.from(file.contentBase64, "base64").toString("utf-8");

    expect(file).toMatchObject({
      kind: "cim",
      field: "cim_file",
      filename: "厂站模型.xml",
      contentType: "application/xml; charset=utf-8",
      encoding: "utf-8"
    });
    expect(file.bytes).toBe(Buffer.byteLength(xml, "utf-8"));
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(xml).toContain("母线一");
  });

  test("encodes E file bytes as GBK when requested", async () => {
    const payload = await buildFromFixture([{ kind: "e", encoding: "gbk" }]);
    const [file] = payload.files;
    const bytes = Buffer.from(file.contentBase64, "base64");
    const eText = iconv.decode(bytes, "gbk");

    expect(file).toMatchObject({
      kind: "e",
      field: "e_file",
      filename: "厂站模型.e",
      contentType: "text/plain; charset=gbk",
      encoding: "gbk"
    });
    expect(file.bytes).toBe(bytes.length);
    expect(eText.length).toBeGreaterThan(0);
    expect(iconv.encode(eText, "gbk").length).toBe(bytes.length);
  });
});
