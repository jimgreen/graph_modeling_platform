import { describe, expect, test } from "vitest";
import { installDomShim } from "./domShim.mjs";

installDomShim();

describe("Node 直载前端 E 导出源码", () => {
  test("可直接 import src/export/e-file.ts 并构建选项", async () => {
    const mod = await import("../src/export/e-file.ts");
    expect(typeof mod.buildEFileExportOptionsFromLibrary).toBe("function");
    const options = mod.buildEFileExportOptionsFromLibrary({ libraryTemplates: [], labels: {} });
    expect(options.interfaceDefinitions).toEqual([]);
  });

  test("可直接 import src/model-eexport.ts 并生成 E 文本", async () => {
    const { buildEFileExport } = await import("../src/model-eexport.ts");
    const project = {
      name: "探针模型",
      canvasWidth: 1920,
      canvasHeight: 1024,
      powerBaseValue: 100,
      voltageUnit: "kV",
      powerUnit: "MW",
      currentUnit: "kA",
      nodes: [
        {
          id: "n1",
          kind: "busbar",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 20 },
          params: { name: "母线1", vbase: "10" },
          terminals: []
        }
      ],
      edges: []
    };
    const out = buildEFileExport(project, ["默认方案"]);
    expect(out.filename).toBe("探针模型.e");
    expect(out.text).toContain("<Model>");
    expect(out.text).toContain("<basevoltage>");
  });
});
