import { describe, expect, it, vi } from "vitest";
import { createCimExport } from "./cim-export";
import type { ModelNode } from "../model";

const node = (id: string, kind: ModelNode["kind"], params: Record<string, string>): ModelNode => ({
  id, kind, name: id, nodeNumber: "1", acTopologyNode: -1, dcTopologyNode: -1,
  position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, rotation: 0, scale: 1,
  terminals: [], params
});

describe("createCimExport", () => {
  it("空模型不导出并返回 false", async () => {
    const saveLazyTextFile = vi.fn();
    const writeOperationLog = vi.fn();
    const exportFn = createCimExport({
      nodes: [], edges: [], projectName: "空站", activeModelId: "m1",
      safeFilePart: (s: string) => s || "未命名",
      saveLazyTextFile, writeOperationLog
    } as never);
    await expect(exportFn()).resolves.toBe(false);
    expect(saveLazyTextFile).not.toHaveBeenCalled();
  });

  it("有设备时导出 XML 并调用 saveLazyTextFile", async () => {
    const saveLazyTextFile = vi.fn().mockResolvedValue(true);
    const writeOperationLog = vi.fn();
    const exportFn = createCimExport({
      nodes: [node("bus1", "ac-bus", { i_vbase: "110" })],
      edges: [], projectName: "示范站", activeModelId: "m1",
      safeFilePart: (s: string) => s || "未命名",
      saveLazyTextFile, writeOperationLog
    } as never);
    await expect(exportFn()).resolves.toBe(true);
    expect(saveLazyTextFile).toHaveBeenCalledTimes(1);
    const options = saveLazyTextFile.mock.calls[0][0];
    expect(options.filename).toMatch(/示范站_\d{8}_\d{6}_CIM16\.xml/);
    expect(options.mime).toBe("application/xml");
    expect(options.extensions).toEqual([".xml"]);
    const text = options.loadText();
    expect(text).toContain('xmlns:cim="http://iec.ch/TC57/2013/CIM-schema-cim16#"');
    expect(text).toContain('rdf:ID="N_bus1"');
    expect(writeOperationLog).toHaveBeenCalled();
  });
});
