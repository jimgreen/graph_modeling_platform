import { describe, expect, it, vi } from "vitest";
import { createCimExport } from "./cim-export";
import type { ModelNode } from "../model";

const node = (id: string, kind: ModelNode["kind"], params: Record<string, string>): ModelNode => ({
  id, kind, name: id, nodeNumber: "1", acTopologyNode: -1, dcTopologyNode: -1,
  position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, rotation: 0, scale: 1,
  terminals: [], params
});

describe("createCimExport", () => {
  it("空模型不导出并返回 false，且提示全局消息", async () => {
    const saveLazyTextFile = vi.fn();
    const writeOperationLog = vi.fn();
    const showGlobalMessage = vi.fn();
    const exportFn = createCimExport({
      nodes: [], edges: [], projectName: "空站", activeModelId: "m1",
      safeFilePart: (s: string) => s || "未命名",
      saveLazyTextFile, writeOperationLog, showGlobalMessage
    } as never);
    await expect(exportFn()).resolves.toBe(false);
    expect(saveLazyTextFile).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith("当前模型无可导出的电力设备，未生成 CIM/XML 文件");
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
    // 操作日志仅在保存成功后记录，且带实际文件名
    expect(writeOperationLog).toHaveBeenCalledWith(`导出 CIM/XML：${options.filename}`);
  });

  it("保存失败时不记录操作日志", async () => {
    const saveLazyTextFile = vi.fn().mockResolvedValue(false);
    const writeOperationLog = vi.fn();
    const exportFn = createCimExport({
      nodes: [node("bus1", "ac-bus", { i_vbase: "110" })],
      edges: [], projectName: "示范站", activeModelId: "m1",
      saveLazyTextFile, writeOperationLog
    } as never);
    await expect(exportFn()).resolves.toBe(false);
    expect(writeOperationLog).not.toHaveBeenCalled();
  });

  it("文件名优先使用 scope.safeFilePart 的输出", async () => {
    const saveLazyTextFile = vi.fn().mockResolvedValue(true);
    const exportFn = createCimExport({
      nodes: [node("bus1", "ac-bus", { i_vbase: "110" })],
      edges: [], projectName: "示范站", activeModelId: "m1",
      safeFilePart: () => "sanitized-name",
      saveLazyTextFile
    } as never);
    await expect(exportFn()).resolves.toBe(true);
    const options = saveLazyTextFile.mock.calls[0][0];
    expect(options.filename).toMatch(/^sanitized-name_\d{8}_\d{6}_CIM16\.xml$/);
  });

  it("modelId 空串回退并卫生化为 NCName 安全字符", async () => {
    const saveLazyTextFile = vi.fn().mockResolvedValue(true);
    const exportFn = createCimExport({
      nodes: [node("bus1", "ac-bus", { i_vbase: "110" })],
      edges: [], projectName: "示范站", activeModelId: "", activeProjectKey: "方案/1 号",
      saveLazyTextFile
    } as never);
    await expect(exportFn()).resolves.toBe(true);
    const text = saveLazyTextFile.mock.calls[0][0].loadText();
    // "方案/1 号" → 非 [A-Za-z0-9_.-] 全部替换为 _ → "___1__"
    expect(text).toContain('rdf:about="urn:uuid:___1__"');
    expect(text).not.toContain('rdf:about="urn:uuid:current"');
  });

  it("缺关键参数时弹确认，确认后继续导出", async () => {
    const saveLazyTextFile = vi.fn().mockResolvedValue(true);
    const showGlobalConfirm = vi.fn().mockResolvedValue(true);
    const exportFn = createCimExport({
      nodes: [
        node("line1", "ac-line", {}), // 无电压等级 + 无阻抗参数
        node("bus1", "ac-bus", { i_vbase: "110" })
      ],
      edges: [], projectName: "示范站", activeModelId: "m1",
      saveLazyTextFile, showGlobalConfirm
    } as never);
    await expect(exportFn()).resolves.toBe(true);
    expect(showGlobalConfirm).toHaveBeenCalledTimes(1);
    const text = showGlobalConfirm.mock.calls[0][0];
    expect(text).toContain("缺少关键参数");
    expect(text).toContain("1 个设备");
    expect(text).toContain("电压等级");
    expect(text).toContain("线路阻抗 r/x");
    expect(saveLazyTextFile).toHaveBeenCalledTimes(1);
  });

  it("缺参数且用户取消则不导出", async () => {
    const saveLazyTextFile = vi.fn().mockResolvedValue(true);
    const showGlobalConfirm = vi.fn().mockResolvedValue(false);
    const exportFn = createCimExport({
      nodes: [
        node("line1", "ac-line", {}),
        node("bus1", "ac-bus", { i_vbase: "110" })
      ],
      edges: [], projectName: "示范站", activeModelId: "m1",
      saveLazyTextFile, showGlobalConfirm
    } as never);
    await expect(exportFn()).resolves.toBe(false);
    expect(showGlobalConfirm).toHaveBeenCalledTimes(1);
    expect(saveLazyTextFile).not.toHaveBeenCalled();
  });
});
