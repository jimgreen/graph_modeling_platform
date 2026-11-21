import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { X } from "lucide-react";
import { AppCanvasDialogs } from "./appCanvasDialogs";

describe("auto-align progress dialog", () => {
  test("renders the current stage, progress value, and terminate action", () => {
    const cancelAutoAlign = vi.fn();
    const markup = renderToStaticMarkup(createElement(AppCanvasDialogs, {
      section: "canvas-dialogs",
      inputs: [],
      scope: {
        X,
        autoAlignProgress: { percent: 42, stage: "正在重新规划线路" },
        cancelAutoAlign
      }
    }));

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("正在重新规划线路");
    expect(markup).toContain('max="100" value="42"');
    expect(markup).toContain("终止自动对齐");
  });
});
