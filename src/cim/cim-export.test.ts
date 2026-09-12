import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import { createCimExport } from "./cim-export";
import type { ModelNode } from "../model";

const node = (id: string, kind: ModelNode["kind"], params: Record<string, string>): ModelNode => ({
  id, kind, name: id, nodeNumber: "1", acTopologyNode: -1, dcTopologyNode: -1,
  position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, rotation: 0, scale: 1,
  terminals: [], params
});

describe("createCimExport", () => {
  // 后端化后工厂内发起 fetch：各用例统一注入 200 XML 响应（内容满足既有 XML 断言）
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(
      '<?xml version="1.0" encoding="UTF-8"?><md:FullModel xmlns:cim="http://iec.ch/TC57/2013/CIM-schema-cim16#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><cim:Substation rdf:ID="N_bus1"/></md:FullModel>',
      { status: 200, headers: { "content-type": "application/xml" } }
    ));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    // 文件名固定不含时间戳：同一模型重复导出得到同名文件
    expect(options.filename).toBe("示范站_CIM16.xml");
    expect(options.mime).toBe("application/xml");
    expect(options.extensions).toEqual([".xml"]);
    const text = options.loadText();
    expect(text).toContain('xmlns:cim="http://iec.ch/TC57/2013/CIM-schema-cim16#"');
    expect(text).toContain('rdf:ID="N_bus1"');
    // 操作日志仅在保存成功后记录，且带实际文件名
    expect(writeOperationLog).toHaveBeenCalledWith(`导出 CIM/XML：${options.filename}`);
  });

  it("未保存时被 ensureSavedBeforeExport 拦截：不请求后端也不落盘", async () => {
    const ensureSavedBeforeExport = vi.fn().mockReturnValue(false);
    const saveLazyTextFile = vi.fn();
    const exportFn = createCimExport({
      nodes: [node("bus1", "ac-bus", { i_vbase: "110" })],
      edges: [], projectName: "示范站", activeModelId: "m1",
      ensureSavedBeforeExport, saveLazyTextFile
    } as never);
    await expect(exportFn()).resolves.toBe(false);
    expect(ensureSavedBeforeExport).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveLazyTextFile).not.toHaveBeenCalled();
  });

  // 回归：调用方是 `void doExport()`，rejection 逃逸即未处理拒绝（浏览器 console 报 Uncaught）
  it("保存层 reject 时提示并返回 false，不逃逸成未处理拒绝", async () => {
    const showGlobalMessage = vi.fn();
    const writeOperationLog = vi.fn();
    const exportFn = createCimExport({
      nodes: [node("bus1", "ac-bus", { i_vbase: "110" })],
      edges: [], projectName: "示范站", activeModelId: "m1",
      safeFilePart: (s: string) => s || "未命名",
      saveLazyTextFile: vi.fn().mockRejectedValue(new Error("磁盘只读")),
      writeOperationLog, showGlobalMessage
    } as never);
    await expect(exportFn()).resolves.toBe(false);
    expect(showGlobalMessage).toHaveBeenCalledWith("CIM/XML 导出失败（保存文件失败）。");
    expect(writeOperationLog).not.toHaveBeenCalled();
  });

  it("确认对话框 reject 时按取消处理，不发起后端请求", async () => {
    const exportFn = createCimExport({
      nodes: [node("bus1", "ac-bus", {})], // 无电压参数 → 走缺参确认分支
      edges: [], projectName: "示范站", activeModelId: "m1",
      safeFilePart: (s: string) => s || "未命名",
      saveLazyTextFile: vi.fn(),
      showGlobalConfirm: vi.fn().mockRejectedValue(new Error("对话框已卸载"))
    } as never);
    await expect(exportFn()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(options.filename).toBe("sanitized-name_CIM16.xml");
  });

  it("modelId 空串回退并卫生化为 NCName 安全字符", async () => {
    const saveLazyTextFile = vi.fn().mockResolvedValue(true);
    const exportFn = createCimExport({
      nodes: [node("bus1", "ac-bus", { i_vbase: "110" })],
      edges: [], projectName: "示范站", activeModelId: "", activeProjectKey: "方案/1 号",
      saveLazyTextFile
    } as never);
    await expect(exportFn()).resolves.toBe(true);
    // 卫生化落在后端 modelId 查询参数："方案/1 号" → 非 [A-Za-z0-9_.-] 全部替换为 _ → "___1__"
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("modelId=___1__");
    expect(url).not.toContain("modelId=current");
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

describe("createCimExport 走后端", () => {
  test("从 /v1/schemes/model/cim-xml 拉取 XML 并保存", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response("<?xml version=\"1.0\"?><cim:FullModel/>", {
      status: 200,
      headers: { "content-type": "application/xml" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    const saves: any[] = [];
    const exportCim = createCimExport({
      nodes: [{ id: "n1", kind: "busbar" } as any],
      edges: [],
      projectName: "线路",
      activeProjectKey: "m1",
      schemePath: ["默认方案"],
      apiPath: (path: string) => path,
      saveLazyTextFile: async (options: any) => {
        saves.push({ filename: options.filename, text: await options.loadText() });
        return true;
      }
    });
    await exportCim();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/v1/schemes/model/cim-xml");
    expect(saves[0].text).toContain("<cim:FullModel/>");
    vi.unstubAllGlobals();
  });

  test("网络层失败时不落盘并提示全局消息", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const showGlobalMessage = vi.fn();
    const saveLazyTextFile = vi.fn();
    const exportCim = createCimExport({
      nodes: [{ id: "n1", kind: "busbar" } as any],
      edges: [],
      projectName: "线路",
      schemePath: ["默认方案"],
      saveLazyTextFile,
      showGlobalMessage
    });
    await expect(exportCim()).resolves.toBe(false);
    expect(showGlobalMessage).toHaveBeenCalledWith("CIM/XML 导出失败（无法连接后端服务）。");
    expect(saveLazyTextFile).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  test("响应读体失败时走同一失败提示（不留未处理 rejection）", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => { throw new Error("terminated"); }
    })));
    const showGlobalMessage = vi.fn();
    const saveLazyTextFile = vi.fn();
    const exportCim = createCimExport({
      nodes: [{ id: "n1", kind: "busbar" } as any],
      edges: [],
      projectName: "线路",
      schemePath: ["默认方案"],
      saveLazyTextFile,
      showGlobalMessage
    });
    await expect(exportCim()).resolves.toBe(false);
    expect(showGlobalMessage).toHaveBeenCalledWith("CIM/XML 导出失败（无法连接后端服务）。");
    expect(saveLazyTextFile).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
