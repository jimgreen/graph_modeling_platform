import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { InlineEditableValue } from "./InputComponents";

describe("InlineEditableValue", () => {
  test("emits a stable marker for values modified since persistence", () => {
    const html = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "11",
      modified: true,
      onCommit: vi.fn()
    }));

    expect(html).toContain('class="inline-property-value modified"');
    expect(html).toContain('data-modified="true"');
  });
});
