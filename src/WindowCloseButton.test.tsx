import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WindowCloseButton, type WindowCloseButtonProps } from "./WindowCloseButton";

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

  // 以下用例锁定 WindowCloseButton 的 props 契约：
  //   强制（不可被 props 覆盖）：type、className 的基础部分、aria-label 由 label 兜底。
  //   可覆盖：显式 aria-label、显式 title、追加进 className 的自定义类名、其余原生属性透传。
  // 源码里 `{...buttonProps}` 排在 `type="button"` **之前**，所以 type 是强制值；
  // 而 `label` / `className` / `title` 被解构出 props，不会进 spread（className 走拼接、title 走显式赋值）。

  it("显式 aria-label 优先于由 label 推出的默认值", () => {
    const html = renderToStaticMarkup(createElement(WindowCloseButton, {
      "aria-label": "显式无障碍名称"
    }));

    expect(html).toContain('aria-label="显式无障碍名称"');
    // 未传 label 时的默认值是 关闭窗口；出现它就说明 aria-label 被 label 兜底覆盖了
    expect(html).not.toContain('aria-label="关闭窗口"');
  });

  it("同时传入 label 与 aria-label 时以 aria-label 为准", () => {
    const html = renderToStaticMarkup(createElement(WindowCloseButton, {
      label: "标签推出的名称",
      "aria-label": "显式无障碍名称"
    }));

    expect(html).toContain('aria-label="显式无障碍名称"');
    expect(html).not.toContain('aria-label="标签推出的名称"');
  });

  it("空字符串 aria-label 不回退到 label（用的是 ?? 而非 ||）", () => {
    // 空串是 `??` 与 `||` 唯一的分歧输入：?? 判 nullish，空串原样透出；改成 || 就会红
    const html = renderToStaticMarkup(createElement(WindowCloseButton, {
      label: "标签推出的名称",
      "aria-label": ""
    }));

    expect(html).toContain('aria-label=""');
    expect(html).not.toContain('aria-label="标签推出的名称"');
  });

  it("显式 title 覆盖默认标题", () => {
    const html = renderToStaticMarkup(createElement(WindowCloseButton, {
      title: "关闭当前面板"
    }));

    expect(html).toContain('title="关闭当前面板"');
    // 默认值是 关闭；带闭引号的完整属性串不与 title="关闭当前面板" 构成子串
    expect(html).not.toContain('title="关闭"');
  });

  it("className 追加在基础类名之后而不是替换它", () => {
    const html = renderToStaticMarkup(createElement(WindowCloseButton, {
      className: "is-active custom-close"
    }));

    expect(html).toContain('class="window-close-button is-active custom-close"');
    expect(html).not.toContain('class="window-close-button"');
  });

  it("type 被强制为 button，显式传入的 type 不会覆盖它", () => {
    // WindowCloseButtonProps 把 type 从 ButtonHTMLAttributes 里 Omit 掉了，
    // 故类型层已拒绝；这里交叉一个 type 以验证运行时顺序（spread 在前、type 在后）。
    const html = renderToStaticMarkup(createElement(WindowCloseButton, {
      label: "关闭测试窗口",
      type: "submit"
    } as WindowCloseButtonProps & { type: string }));

    expect(html).toContain('type="button"');
    expect(html).not.toContain('type="submit"');
  });

  it("其余 props 原样透传到 button 上", () => {
    const html = renderToStaticMarkup(createElement(WindowCloseButton, {
      id: "close-window-button",
      tabIndex: 3,
      name: "closeAction",
      "aria-describedby": "close-hint",
      // @types/react 19 的 HTMLAttributes 没有 data-* 索引签名，
      // 组件 props 类型里也拿不到 data-testid；故按运行时真实透传语义交叉该属性。
      "data-testid": "window-close"
    } as WindowCloseButtonProps & Record<`data-${string}`, string>));

    expect(html).toContain('id="close-window-button"');
    expect(html).toContain('tabindex="3"');
    expect(html).toContain('name="closeAction"');
    expect(html).toContain('aria-describedby="close-hint"');
    expect(html).toContain('data-testid="window-close"');
  });

  it("只传 label 时其余属性保持默认（回归）", () => {
    const html = renderToStaticMarkup(createElement(WindowCloseButton, {
      label: "关闭测试窗口"
    }));

    expect(html).toContain('aria-label="关闭测试窗口"');
    expect(html).toContain('title="关闭"');
    // 闭引号紧贴基础类名 ⇒ className 为空时没有多拼空格
    expect(html).toContain('class="window-close-button"');
    expect(html).toContain('type="button"');
  });
});
