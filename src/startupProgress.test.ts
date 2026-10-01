import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { finishBoot, setBootPhase } from "./startupProgress";

// 测试环境是 node（无 jsdom）：手动注入最小 document 桩，与 appTour.test.ts / spaceCache.test.ts 同模式。
// 只桩遮罩真实用到的那几个动作：getElementById / createElement / appendChild / classList / remove。

type StubNode = {
  className: string;
  textContent: string;
  children: StubNode[];
  classList: { add: (c: string) => void; contains: (c: string) => boolean };
  appendChild: (child: StubNode) => void;
  querySelector: (selector: string) => StubNode | null;
  remove: () => void;
};

function mountBootOverlay(): void {
  const registry = new Map<string, StubNode>();
  const createStubNode = (className: string): StubNode => {
    const classes = new Set(className ? [className] : []);
    const node: StubNode = {
      className,
      textContent: "",
      children: [],
      classList: {
        add: (c) => void classes.add(c),
        contains: (c) => classes.has(c)
      },
      appendChild(child) {
        node.children.push(child);
      },
      querySelector(selector) {
        const wanted = selector.replace(/^\./, "");
        return node.children.find((child) => child.className === wanted) ?? null;
      },
      remove() {
        registry.delete("app-boot");
      }
    };
    return node;
  };

  const boot = createStubNode("app-boot");
  boot.appendChild(createStubNode("boot-phase"));
  registry.set("app-boot", boot);

  vi.stubGlobal("document", {
    getElementById: (id: string) => registry.get(id) ?? null,
    createElement: () => createStubNode("")
  });
}

describe("首屏启动遮罩", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mountBootOverlay();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("切换阶段文案，并重建 span 让 CSS 淡入重放", () => {
    setBootPhase("正在加载方案树…");
    const phase = document.getElementById("app-boot")!.querySelector(".boot-phase")!;
    expect(phase.children).toHaveLength(1);
    expect(phase.children[0].textContent).toBe("正在加载方案树…");
  });

  test("同一句文案不重复重建节点（否则动画反复重放）", () => {
    setBootPhase("正在加载方案树…");
    const first = document.getElementById("app-boot")!.querySelector(".boot-phase")!.children[0];
    setBootPhase("正在加载方案树…");
    expect(document.getElementById("app-boot")!.querySelector(".boot-phase")!.children[0]).toBe(first);
  });

  test("加载完成后先淡出、再移除遮罩", () => {
    const boot = document.getElementById("app-boot")!;
    finishBoot();
    expect(boot.classList.contains("is-done")).toBe(true);
    expect(document.getElementById("app-boot")).not.toBeNull();
    vi.advanceTimersByTime(400);
    expect(document.getElementById("app-boot")).toBeNull();
  });

  test("遮罩已移除后再调用不抛错", () => {
    finishBoot();
    vi.advanceTimersByTime(400);
    expect(() => {
      finishBoot();
      setBootPhase("随便什么");
    }).not.toThrow();
  });

  // 回归守卫：启动闸门在关键路径上调用本模块，外层 catch 是「失败也不阻断启动」。
  // 这里一旦抛，整段空间缓存归属对齐会被静默跳过 —— 恰恰是本模块最不该破坏的前置条件。
  test("没有 DOM 时静默跳过，绝不抛错", () => {
    vi.unstubAllGlobals();
    expect(() => {
      setBootPhase("正在校验工作空间缓存归属…");
      finishBoot();
    }).not.toThrow();
  });
});
