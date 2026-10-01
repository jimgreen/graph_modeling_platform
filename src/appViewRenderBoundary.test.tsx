import { describe, expect, test, vi } from "vitest";

import {
  MemoizedViewSection,
  areViewSectionPropsEqual,
  type ViewSectionProps
} from "./appExtracted/appViewRenderBoundary";

describe("app view render boundaries", () => {
  test("reuses a section when unrelated page state changes", () => {
    const renderBefore = vi.fn(() => null);
    const renderAfter = vi.fn(() => null);
    const sharedInputs = ["model-118", "graph", 458, 175];

    // 比较器的形参只声明 section + inputs（render 被刻意排除在比较之外），
    // 但这里仍按完整 props 构造，保留「render 不同也不影响相等」这层文档意义。
    const previous: ViewSectionProps = { inputs: sharedInputs, render: renderBefore, section: "inspector" };
    const next: ViewSectionProps = { inputs: [...sharedInputs], render: renderAfter, section: "inspector" };

    expect(areViewSectionPropsEqual(previous, next)).toBe(true);
  });

  test("invalidates only the section whose render inputs changed", () => {
    const render = vi.fn(() => null);
    const previousInspector = {
      inputs: ["node-1", "graph"],
      render,
      section: "inspector"
    };
    const nextInspector = {
      ...previousInspector,
      inputs: ["node-2", "graph"]
    };
    const previousCanvas = {
      inputs: ["project-118", 0.14],
      render,
      section: "canvas"
    };
    const nextCanvas = {
      ...previousCanvas,
      inputs: [...previousCanvas.inputs]
    };

    expect(areViewSectionPropsEqual(previousInspector, nextInspector)).toBe(false);
    expect(areViewSectionPropsEqual(previousCanvas, nextCanvas)).toBe(true);
  });

  test("the memoized component uses the section comparator", () => {
    expect((MemoizedViewSection as any).compare).toBe(areViewSectionPropsEqual);
  });
});
