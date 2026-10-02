// createCssSelectorEscape：优先用浏览器原生 CSS.escape，没有才退回自写的反斜杠/引号转义。
// 两条路径都要钉死 —— 原生路径在 node 里不存在，最容易只测到退回分支。
import { afterEach, describe, expect, test, vi } from "vitest";

import { createCssSelectorEscape } from "./appExtracted/appSelectionDragFactories";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createCssSelectorEscape", () => {
  test("有原生 CSS.escape 时优先用它", () => {
    const escape = vi.fn(() => "原生结果");
    vi.stubGlobal("CSS", { escape });

    expect(createCssSelectorEscape({ CSS: { escape } })('a"b\\c')).toBe("原生结果");
    expect(escape).toHaveBeenCalledWith('a"b\\c');
  });

  test("没有 window.CSS 时走退回实现", () => {
    vi.stubGlobal("CSS", undefined);

    expect(createCssSelectorEscape({})('a"b')).toBe('a\\"b');
  });

  test("CSS 存在但没有 escape 方法时走退回实现", () => {
    vi.stubGlobal("CSS", {});

    expect(createCssSelectorEscape({ CSS: {} })('a"b')).toBe('a\\"b');
  });

  test("escape 不是函数时走退回实现", () => {
    vi.stubGlobal("CSS", { escape: "not-a-function" });

    expect(createCssSelectorEscape({ CSS: { escape: "not-a-function" } })('a"b')).toBe('a\\"b');
  });

  test("反斜杠先被转义，避免与引号转义互相吃掉", () => {
    vi.stubGlobal("CSS", undefined);

    expect(createCssSelectorEscape({})('\\"')).toBe('\\\\\\"');
  });

  test("不含特殊字符时原样返回", () => {
    vi.stubGlobal("CSS", undefined);

    expect(createCssSelectorEscape({})("edge-1")).toBe("edge-1");
  });

  test("空串返回空串", () => {
    vi.stubGlobal("CSS", undefined);

    expect(createCssSelectorEscape({})("")).toBe("");
  });
});
