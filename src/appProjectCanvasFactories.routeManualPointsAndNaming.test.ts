// 重命名对话框：取消 / 空名 / 重名 三种拒绝路径都只提示不抛，且都返回 null。
// 提示走全局消息系统（不是 alert），所以要打桩 showGlobalMessage。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createPromptUniqueRecordName } from "./appExtracted/appProjectCanvasFactories";

describe("createPromptUniqueRecordName", () => {
  let showGlobalMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** 执行一次询问：window.prompt 返回 input。 */
  function run(input: string | null, existing: string[] = []) {
    vi.stubGlobal("window", { prompt: vi.fn(() => input) });
    return createPromptUniqueRecordName({ hasSameName: vi.fn((name: string, names: string[]) => names.includes(name)) })(
      "请输入名称",
      "默认值",
      existing,
      "名称不能为空",
      "名称已存在"
    );
  }

  test("输入有效且不重名时返回去空格的名称", () => {
    expect(run("  新名字  ")).toBe("新名字");
    expect(showGlobalMessage).not.toHaveBeenCalled();
  });

  test("取消对话框时返回 null 且不提示", () => {
    expect(run(null)).toBeNull();
    expect(showGlobalMessage).not.toHaveBeenCalled();
  });

  test("空名或全空格时提示并返回 null", () => {
    expect(run("")).toBeNull();
    expect(showGlobalMessage).toHaveBeenCalledWith("名称不能为空");
  });

  test("全空格同样按空名处理", () => {
    expect(run("   ")).toBeNull();
    expect(showGlobalMessage).toHaveBeenCalledWith("名称不能为空");
  });

  test("重名时提示并返回 null", () => {
    expect(run("已存在", ["已存在"])).toBeNull();
    expect(showGlobalMessage).toHaveBeenCalledWith("名称已存在");
  });

  test("对话框标题与默认值原样传给 prompt", () => {
    vi.stubGlobal("window", { prompt: vi.fn(() => "新") });

    createPromptUniqueRecordName({ hasSameName: () => false })("标题", "默认值", [], "空", "重");

    expect(window.prompt).toHaveBeenCalledWith("标题", "默认值");
  });

  test("空名时不再做重名判断", () => {
    const hasSameName = vi.fn(() => false);
    vi.stubGlobal("window", { prompt: vi.fn(() => "") });

    createPromptUniqueRecordName({ hasSameName })("标题", "默认值", ["x"], "空", "重");

    expect(hasSameName).not.toHaveBeenCalled();
  });

  test("重名判断收到去空格后的名称", () => {
    const hasSameName = vi.fn(() => true);
    vi.stubGlobal("window", { prompt: vi.fn(() => "  重名  ") });

    createPromptUniqueRecordName({ hasSameName })("标题", "默认值", ["重名"], "空", "重复");

    expect(hasSameName).toHaveBeenCalledWith("重名", ["重名"]);
  });
});
