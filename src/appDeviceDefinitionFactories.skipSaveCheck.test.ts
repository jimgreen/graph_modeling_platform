// 导出前的「已保存」闸门：程序化导出流程会临时跳过人工确认，
// 用模块级标志而不是闭包捕获，避免旧闭包读到过期值。
// 副作用：createEnsureSavedBeforeExport 依赖 showGlobalMessage（全局函数）。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createEnsureSavedBeforeExport,
  getSkipSaveCheck,
  setSkipSaveCheck
} from "./appExtracted/appDeviceDefinitionFactories";

afterEach(() => {
  setSkipSaveCheck(false);
  vi.unstubAllGlobals();
});

describe("setSkipSaveCheck / getSkipSaveCheck", () => {
  test("默认关闭", () => {
    expect(getSkipSaveCheck()).toBe(false);
  });

  test("置位后可读回", () => {
    setSkipSaveCheck(true);

    expect(getSkipSaveCheck()).toBe(true);
  });

  test("可复位", () => {
    setSkipSaveCheck(true);
    setSkipSaveCheck(false);

    expect(getSkipSaveCheck()).toBe(false);
  });
});

describe("createEnsureSavedBeforeExport", () => {
  test("可以导出时直接放行", () => {
    const ensure = createEnsureSavedBeforeExport({ canExportCurrentModel: true });

    expect(ensure()).toBe(true);
  });

  test("跳过检查标志打开时放行，即使模型没保存", () => {
    setSkipSaveCheck(true);
    const ensure = createEnsureSavedBeforeExport({ canExportCurrentModel: false });

    expect(ensure()).toBe(true);
  });

  test("未保存且不跳过时拦截并提示", () => {
    const show = vi.fn();
    vi.stubGlobal("showGlobalMessage", show);
    const ensure = createEnsureSavedBeforeExport({ canExportCurrentModel: false });

    expect(ensure()).toBe(false);
    expect(show).toHaveBeenCalledWith("当前模型存在未保存修改，请先保存后再导出文件。");
  });

  test("每次调用都重新读标志（不缓存旧值）", () => {
    vi.stubGlobal("showGlobalMessage", vi.fn());
    const ensure = createEnsureSavedBeforeExport({ canExportCurrentModel: false });

    setSkipSaveCheck(true);
    expect(ensure()).toBe(true);

    setSkipSaveCheck(false);
    expect(ensure()).toBe(false);
  });
});
