import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WindowCloseButton } from "./WindowCloseButton";

describe("WindowCloseButton", () => {
  it("renders an accessible Windows-style close command", () => {
    const html = renderToStaticMarkup(createElement(WindowCloseButton, {
      label: "关闭测试窗口",
      onClick: vi.fn()
    }));

    expect(html).toContain('type="button"');
    expect(html).toContain('class="window-close-button"');
    expect(html).toContain('aria-label="关闭测试窗口"');
    expect(html).toContain('title="关闭"');
    expect(html).toContain("lucide-x");
  });
});
