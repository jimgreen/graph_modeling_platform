// 自定义参数定义解析失败要留痕（storedEParameterDefinitions）。
//
// 归 [] 是既有降级，但代价很具体：E 导出会**静默丢掉**该元件的全部自定义参数定义，
// 生成的 .e 文件参数变少，而界面与导出都不报错——只有事后拿到文件比对才发现。
//
// 触发面不止「JSON 写坏」：_customParamDefinitions 被存成对象/数组时 JSON.parse 同样抛。
//
// 该函数是**逐节点**调用的，所以同一份坏载荷只告警一次——否则一个带坏定义的模型在导出时
// 能刷出成百上千条同样的日志，把真正有用的内容淹掉。第三条用多节点模型钉住这个去重。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

const warnings = [];
let originalWarn;
let server;
let baseUrl;
let dataDir;

const busNode = (id, params) => ({
  id,
  kind: "ac-bus",
  name: `母线${id}`,
  params: { vbase: "10", _customDeviceTemplate: "1", ...params },
  size: { width: 100, height: 40 },
  position: { x: 0, y: 0 },
  terminals: [{ id: "t1", label: "1", type: "ac", anchor: { x: 0.5, y: 0.5 }, nodeNumber: "1", vbase: "10" }]
});

/** 种一个模型并导出 E 文件，返回 { status } */
const exportModel = async (scheme, name, nodes) => {
  const { defaultPaths } = await import("./server.mjs");
  const dir = join(defaultPaths.schemeFiles, scheme);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${name}.json`),
    JSON.stringify({ version: 1, name, idx: 1, modelType: "厂站", nodes, edges: [] }),
    "utf-8"
  );
  return fetch(
    `${baseUrl}${apiPath(`/v1/schemes/model/e-file?schemePath=${encodeSchemePath([scheme])}&name=${encodeURIComponent(name)}`)}`
  );
};

const paramDefinitionWarnings = () =>
  warnings.filter((line) => line.includes("[E导出]") && line.includes("自定义参数定义解析失败"));

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "custom-param-warn-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  mkdirSync(join(dataDir, "device-library"), { recursive: true });
  writeFileSync(
    join(dataDir, "device-library", "library.json"),
    JSON.stringify({ schemaVersion: 4, customDeviceTemplates: [], deviceDefinitionOverrides: {} }),
    "utf-8"
  );

  originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(" "));
  };

  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  console.warn = originalWarn;
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

describe("自定义参数定义解析失败", () => {
  test("★ 坏定义会告警，并说清 E 导出会缺参数", async () => {
    warnings.length = 0;
    const response = await exportModel("坏定义方案", "模型一", [
      busNode("n1", { _customParamDefinitions: "{ 这不是合法 JSON" })
    ]);

    // 降级不阻断导出
    expect(response.status).toBe(200);
    const hit = paramDefinitionWarnings();
    expect(hit.length, "坏的自定义参数定义没有留痕").toBeGreaterThan(0);
    expect(hit[0]).toContain("缺");
  });

  test("★ _customParamDefinitions 存成对象/数组时同样留痕", async () => {
    warnings.length = 0;
    const response = await exportModel("坏定义方案", "模型二", [
      busNode("n1", { _customParamDefinitions: { enName: "x" } })
    ]);
    expect(response.status).toBe(200);
    expect(paramDefinitionWarnings().length).toBeGreaterThan(0);
  });

  test("★ 多节点同坏载荷只告警一次（逐节点调用不刷屏）", async () => {
    warnings.length = 0;
    const response = await exportModel("坏定义方案", "模型三", [
      busNode("n1", { _customParamDefinitions: "{ 同一份坏定义" }),
      busNode("n2", { _customParamDefinitions: "{ 同一份坏定义" }),
      busNode("n3", { _customParamDefinitions: "{ 同一份坏定义" }),
      busNode("n4", { _customParamDefinitions: "{ 同一份坏定义" })
    ]);
    expect(response.status).toBe(200);
    expect(paramDefinitionWarnings().length, "同一份坏载荷被重复告警，会淹掉日志").toBe(1);
  });

  test("对照组：正常定义不产生告警", async () => {
    warnings.length = 0;
    const response = await exportModel("好定义方案", "模型四", [
      busNode("n1", { _customParamDefinitions: JSON.stringify([{ enName: "容量", exportName: "CAP" }]) })
    ]);
    expect(response.status).toBe(200);
    expect(paramDefinitionWarnings()).toEqual([]);
  });
});