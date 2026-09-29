// appModeToggleHint：浏览模式右键方案树时给顶栏「编辑/浏览」按钮加闪动提示。
// 此前零测试，而它有几条只有跑起来才看得见的契约：重入会重置计时器、
// 强制 reflow 才让动画重启、无 DOM 环境静默返回。
//
// 本仓 vitest 全局 environment 是 "node"（vite.config.ts），也没有装 jsdom
// —— 所以这里按 src/fileDownload.test.ts 的同款做法用 `vi.stubGlobal("document", …)`
// 造最小 DOM，而不是引入 jsdom 依赖。按钮只需要 classList / getElementById /
// offsetWidth 三个能力。
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { triggerModeToggleHint } from "./appModeToggleHint";

const HINT_CLASS = "mode-toggle-hint";
const BUTTON_ID = "topbar-mode-toggle";

type StubButton = {
  id: string;
  classes: Set<string>;
  classList: { add(c: string): void; remove(c: string): void; contains(c: string): boolean };
  offsetWidth: number;
  reflowReads: number;
};

function makeButton(): StubButton {
  const button: StubButton = {
    id: BUTTON_ID,
    classes: new Set<string>(),
    reflowReads: 0,
    offsetWidth: 0,
    classList: {
      add: (c) => { button.classes.add(c); },
      remove: (c) => { button.classes.delete(c); },
      contains: (c) => button.classes.has(c)
    }
  };
  // 用 getter 计数：代码靠读 offsetWidth 强制 reflow 让动画重启
  Object.defineProperty(button, "offsetWidth", {
    get() {
      button.reflowReads += 1;
      return 100;
    },
    configurable: true
  });
  return button;
}

/** 装上 document 桩。buttons 为 null 时表示页面上没有目标按钮。 */
function stubDocument(button: StubButton | null) {
  vi.stubGlobal("document", {
    getElementById: (id: string) => (id === BUTTON_ID ? button : null)
  });
}

let button: StubButton;

beforeEach(() => {
  vi.useFakeTimers();
  button = makeButton();
  stubDocument(button);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("triggerModeToggleHint", () => {
  it("目标按钮存在时加上提示 class", () => {
    triggerModeToggleHint();
    expect(button.classList.contains(HINT_CLASS)).toBe(true);
  });

  it("目标按钮不存在时静默返回，不抛", () => {
    stubDocument(null);
    expect(() => triggerModeToggleHint()).not.toThrow();
  });

  it("无 document 环境（SSR / node）时静默返回，不抛", () => {
    // 模块第一行就是 `if (typeof document === "undefined") return;`
    vi.stubGlobal("document", undefined);
    expect(() => triggerModeToggleHint()).not.toThrow();
  });

  it("3 秒后移除提示 class", () => {
    triggerModeToggleHint();
    expect(button.classList.contains(HINT_CLASS)).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(button.classList.contains(HINT_CLASS)).toBe(false);
  });

  it("3 秒内不移除（时长不是即时的）", () => {
    triggerModeToggleHint();
    vi.advanceTimersByTime(2999);
    expect(button.classList.contains(HINT_CLASS)).toBe(true);
  });

  it("可重入：重复调用会重置计时器，不会被旧计时器提前移除", () => {
    // 关键契约：第 2 次调用必须**重置**计时器。若只是再挂一次 class 而没清旧的，
    // 第一个计时器会在 t=3000 把 class 移除 —— 而那时第 2 次触发的动画才刚开始。
    triggerModeToggleHint();
    vi.advanceTimersByTime(2000);
    triggerModeToggleHint();
    // 第 1 个计时器原定 t=3000 触发；重入后应当顺延到 t=5000
    vi.advanceTimersByTime(1000);
    expect(button.classList.contains(HINT_CLASS)).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(button.classList.contains(HINT_CLASS)).toBe(false);
  });

  it("重入时读 offsetWidth 强制 reflow，动画从头开始", () => {
    // 同一 class 再次添加不会重启动画，代码靠读 offsetWidth 强制 reflow 绕过。
    // 少这一次读取，动画就不会重播。
    triggerModeToggleHint();
    expect(button.reflowReads).toBeGreaterThanOrEqual(1);
    const afterFirst = button.reflowReads;
    triggerModeToggleHint();
    expect(button.reflowReads).toBeGreaterThan(afterFirst);
  });

  it("重入三次后 class 仍只有一个，且在最后一次触发的 3 秒后移除", () => {
    triggerModeToggleHint();
    triggerModeToggleHint();
    triggerModeToggleHint();
    expect(button.classes.size).toBe(1);
    vi.advanceTimersByTime(3000);
    expect(button.classList.contains(HINT_CLASS)).toBe(false);
  });

  it("重入时先移除再添加：任何时刻 class 都不重复", () => {
    triggerModeToggleHint();
    triggerModeToggleHint();
    expect([...button.classes].filter((c) => c === HINT_CLASS)).toHaveLength(1);
  });
});
