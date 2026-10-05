import { describe, expect, test } from "vitest";
import { isGlobalSaveShortcut, resolveKeyboardShortcutScope } from "./keyboardShortcuts";

type SaveShortcutInput = Parameters<typeof isGlobalSaveShortcut>[0];

/**
 * 测试侧故意绕过 `key: string` 的静态标注，直测运行时的类型守卫。
 * `isGlobalSaveShortcut` 的公开签名不能改，畸形输入只能从这里喂进去。
 */
function saveShortcutWithKey(key: unknown, modifiers: Record<string, unknown> = {}): boolean {
  return isGlobalSaveShortcut({
    key,
    ctrlKey: true,
    metaKey: false,
    ...modifiers
  } as unknown as SaveShortcutInput);
}

/** 一次性喂完全部畸形形状，避免各用例各写一份清单而漏项。 */
const MALFORMED_KEYS: ReadonlyArray<readonly [label: string, value: unknown]> = [
  ["undefined", undefined],
  ["null", null],
  ["数字 0", 0],
  ["数字 83", 83],
  ["NaN", Number.NaN],
  ["布尔 true", true],
  ["普通对象", {}],
  ["空数组", []],
  ["字符数组", ["s"]],
  ["带 toString 的对象", { toString: () => "s" }],
  ["装箱 String 对象", new String("s")]
];

describe("keyboard shortcut scope", () => {
  test("uses record shortcuts only while the pointer is inside the model list", () => {
    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasInteractionActive: false,
        isProjectListPointerInside: true
      })
    ).toBe("records");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasInteractionActive: true,
        isProjectListPointerInside: true
      })
    ).toBe("records");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasInteractionActive: false,
        isProjectListPointerInside: false
      })
    ).toBe("none");
  });

  test("keeps canvas shortcuts scoped to the canvas", () => {
    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: true,
        isCanvasPointerUnblocked: false,
        isCanvasInteractionActive: false,
        isProjectListPointerInside: false
      })
    ).toBe("canvas");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasPointerUnblocked: true,
        isCanvasInteractionActive: false,
        isProjectListPointerInside: false
      })
    ).toBe("canvas");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasPointerUnblocked: false,
        isCanvasInteractionActive: true,
        isProjectListPointerInside: false
      })
    ).toBe("canvas");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: true,
        isCanvasPointerUnblocked: true,
        isCanvasInteractionActive: true,
        isProjectListPointerInside: true
      })
    ).toBe("canvas");
  });

  test("treats Ctrl+S and Meta+S as page-wide save shortcuts", () => {
    expect(isGlobalSaveShortcut({ key: "s", ctrlKey: true, metaKey: false })).toBe(true);
    expect(isGlobalSaveShortcut({ key: "S", ctrlKey: false, metaKey: true })).toBe(true);
    expect(isGlobalSaveShortcut({ key: "s", ctrlKey: false, metaKey: false })).toBe(false);
    expect(isGlobalSaveShortcut({ key: "c", ctrlKey: true, metaKey: false })).toBe(false);
  });
});

describe("save shortcut 非字符串 key 守卫", () => {
  // 回归防线：守卫是加在 `.toLowerCase()` 之前的早退，字符串路径必须一字不变。
  test("字符串 key 的大小写与修饰键组合行为不变", () => {
    expect(saveShortcutWithKey("s")).toBe(true);
    expect(saveShortcutWithKey("S")).toBe(true);
    // 混合大小写里只有 S/s 命中，其余大小写变体都不能被守卫误伤成 true。
    expect(saveShortcutWithKey("c")).toBe(false);
    expect(saveShortcutWithKey("C")).toBe(false);
    expect(saveShortcutWithKey("Save")).toBe(false);
    expect(saveShortcutWithKey(" ")).toBe(false);

    // ctrl / meta / 两者同真的组合，逐个显式覆盖。
    expect(isGlobalSaveShortcut({ key: "s", ctrlKey: true, metaKey: false })).toBe(true);
    expect(isGlobalSaveShortcut({ key: "S", ctrlKey: false, metaKey: true })).toBe(true);
    expect(isGlobalSaveShortcut({ key: "s", ctrlKey: true, metaKey: true })).toBe(true);
    // 修饰键缺失 / 假值时，即使 key 是 S 也不该触发保存。
    expect(isGlobalSaveShortcut({ key: "s" })).toBe(false);
    expect(isGlobalSaveShortcut({ key: "s", ctrlKey: false, metaKey: false })).toBe(false);
    expect(isGlobalSaveShortcut({ key: "s", ctrlKey: false, metaKey: false, shiftKey: true } as never)).toBe(false);
  });

  // 承重断言：删掉守卫后这两条会同时变红（一条抛 TypeError，一条返回 true/false 反了）。
  test("非字符串 key 一律返回 false 不命中保存快捷键", () => {
    for (const [label, value] of MALFORMED_KEYS) {
      expect(saveShortcutWithKey(value), `key = ${label} 应当返回 false`).toBe(false);
      // Meta 侧也要覆盖：守卫写在修饰键判断之前，两条修饰键路径都该走同一条早退。
      expect(saveShortcutWithKey(value, { ctrlKey: false, metaKey: true }), `Meta+key = ${label} 应当返回 false`).toBe(
        false
      );
    }
  });

  test("非字符串 key 不抛 TypeError", () => {
    for (const [label, value] of MALFORMED_KEYS) {
      expect(() => saveShortcutWithKey(value), `key = ${label} 不应抛异常`).not.toThrow();
      expect(() => saveShortcutWithKey(value, { ctrlKey: false, metaKey: true }), `Meta+key = ${label} 不应抛异常`).not.toThrow();
    }
    // 整个 key 字段缺失（undefined）与显式传 undefined 是同一条路径，一并钉住。
    expect(() => isGlobalSaveShortcut({ ctrlKey: true } as unknown as SaveShortcutInput)).not.toThrow();
    expect(isGlobalSaveShortcut({ ctrlKey: true } as unknown as SaveShortcutInput)).toBe(false);
  });

  test("空字符串 key 返回 false 而不是抛异常", () => {
    expect(saveShortcutWithKey("")).toBe(false);
    expect(saveShortcutWithKey("", { ctrlKey: false, metaKey: true })).toBe(false);
    expect(() => saveShortcutWithKey("")).not.toThrow();
  });

  test("只带 Shift 的 S 不触发保存快捷键", () => {
    // shiftKey 不在本函数的契约里，单独存在时不得命中。
    expect(saveShortcutWithKey("s", { ctrlKey: false, metaKey: false, shiftKey: true })).toBe(false);
    expect(saveShortcutWithKey("S", { ctrlKey: false, metaKey: false, shiftKey: true })).toBe(false);
  });
});
