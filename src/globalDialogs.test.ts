import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmAction, promptText } from "./globalDialogs";
import { createCreateGraphTemplateType } from "./appExtracted/appSelectionDragFactories";

describe("globalDialogs 非阻塞全局弹窗适配层", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("confirmAction 优先使用全局 showGlobalConfirm，不触碰原生 window.confirm", async () => {
    const showGlobalConfirm = vi.fn(async () => true);
    const nativeConfirm = vi.fn(() => false);
    vi.stubGlobal("showGlobalConfirm", showGlobalConfirm);
    vi.stubGlobal("window", { confirm: nativeConfirm });

    expect(await confirmAction("确认删除？")).toBe(true);
    expect(showGlobalConfirm).toHaveBeenCalledWith("确认删除？");
    expect(nativeConfirm).not.toHaveBeenCalled();
  });

  it("promptText 优先使用全局 showGlobalPrompt 并透传默认值", async () => {
    const showGlobalPrompt = vi.fn(async () => "新方案");
    const nativePrompt = vi.fn(() => "不应调用");
    vi.stubGlobal("showGlobalPrompt", showGlobalPrompt);
    vi.stubGlobal("window", { prompt: nativePrompt });

    expect(await promptText("请输入方案名称", "默认方案")).toBe("新方案");
    expect(showGlobalPrompt).toHaveBeenCalledWith("请输入方案名称", "默认方案");
    expect(nativePrompt).not.toHaveBeenCalled();
  });

  it("隔离单测未挂载全局弹窗时优雅回退到 window.confirm / window.prompt", async () => {
    vi.stubGlobal("showGlobalConfirm", undefined);
    vi.stubGlobal("showGlobalPrompt", undefined);
    vi.stubGlobal("window", {
      confirm: vi.fn(() => true),
      prompt: vi.fn(() => "回退值")
    });

    expect(await confirmAction("fallback")).toBe(true);
    expect(await promptText("title", "init")).toBe("回退值");
  });

  it("createCreateGraphTemplateType 在挂载 showGlobalPrompt 时走非阻塞弹窗路径", async () => {
    const showGlobalPrompt = vi.fn(async () => "新能源典型接线");
    vi.stubGlobal("showGlobalPrompt", showGlobalPrompt);
    const setTypes = vi.fn();
    const setExpanded = vi.fn();
    const setDraftType = vi.fn();
    const persist = vi.fn();
    const log = vi.fn();

    const action = createCreateGraphTemplateType({
      customGraphTemplateTypes: [],
      graphTemplateTypes: ["一次接线"],
      normalizeGraphTemplateTypeName: (v: string) => v.trim(),
      persistTemplateLibraryChange: persist,
      setCustomGraphTemplateTypes: setTypes,
      setExpandedGraphTemplateTypes: setExpanded,
      setTemplateDraftType: setDraftType,
      writeOperationLog: log
    });

    action();
    await Promise.resolve();
    await Promise.resolve();

    expect(showGlobalPrompt).toHaveBeenCalledWith("请输入模板类型名称", "");
    expect(setTypes).toHaveBeenCalledWith(["新能源典型接线"]);
    expect(persist).toHaveBeenCalledWith({ customGraphTemplateTypes: ["新能源典型接线"] });
    expect(log).toHaveBeenCalledWith("新增模板类型：新能源典型接线");
  });
});
