import { describe, expect, test, vi } from "vitest";

import {
  MemoizedViewSection,
  areViewSectionPropsEqual
} from "./appExtracted/appViewRenderBoundary";

describe("app view render boundaries", () => {
  test("reuses a section when unrelated page state changes", () => {
    const renderBefore = vi.fn(() => null);
    const renderAfter = vi.fn(() => null);
    const sharedInputs = ["model-118", "graph", 458, 175];

    expect(areViewSectionPropsEqual(
      { inputs: sharedInputs, render: renderBefore, section: "inspector" },
      { inputs: [...sharedInputs], render: renderAfter, section: "inspector" }
    )).toBe(true);
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
