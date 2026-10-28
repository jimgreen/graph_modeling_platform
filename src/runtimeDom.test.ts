// runtimeDom.ts 的单测。
//
// 这里测的是**纯函数**（buildDomOutline / serializeDomHtml）：它们只依赖 duck-typed
// 元素对象，故用假节点树即可，不需要 jsdom。
//
// 三条要害：
//   ① 默认 outline 且受 maxDepth / maxNodes 双重截断，截断必须**置 truncated**；
//   ② 文本只取直接文本子节点（父节点不重复子树的文字）且按 maxTextLength 截断；
//   ③ script/style 等无信息量的标签被跳过 —— 它们体积大、对「页面长什么样」零贡献。
import { describe, expect, test } from "vitest";
import { buildDomOutline, serializeDomHtml } from "./runtimeDom";

// ---- 假 DOM：只实现被序列化器用到的那些字段 ----

type FakeEl = {
  nodeType: number;
  tagName?: string;
  nodeName?: string;
  id?: string;
  className?: string;
  childNodes: any[];
  attrs?: Record<string, string>;
  getAttribute?: (name: string) => string | null;
  outerHTML?: string;
  querySelectorAll?: (selector: string) => any[];
};

function el(tagName: string, options: { id?: string; className?: string; attrs?: Record<string, string>; children?: any[] } = {}): FakeEl {
  const attrs = options.attrs ?? {};
  const childNodes = options.children ?? [];
  return {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    nodeName: tagName.toUpperCase(),
    id: options.id,
    className: options.className,
    childNodes,
    attrs,
    getAttribute: (name: string) => attrs[name] ?? (name === "id" ? options.id ?? null : null)
  };
}

function text(nodeValue: string) {
  return { nodeType: 3, nodeValue, childNodes: [] };
}

describe("buildDomOutline", () => {
  test("基本结构：tag 小写、id/class/role/text 各自落地", () => {
    const root = el("div", {
      id: "root",
      className: "app shell",
      attrs: { role: "main" },
      children: [text("模型1"), el("button", { className: "btn" })]
    });
    const result = buildDomOutline(root);
    expect(result).not.toBeNull();
    expect(result!.root.tag).toBe("div");
    expect(result!.root.id).toBe("root");
    expect(result!.root.classes).toEqual(["app", "shell"]);
    expect(result!.root.role).toBe("main");
    expect(result!.root.text).toBe("模型1");
    expect(result!.root.children).toHaveLength(1);
    expect(result!.root.children![0].tag).toBe("button");
    expect(result!.truncated).toBe(false);
    expect(result!.nodeCount).toBe(2);
  });

  test("超过 maxDepth 停止深入并置 truncated（结构不完整要能看出来）", () => {
    // 三层嵌套：div > section > button
    const root = el("div", { children: [el("section", { children: [el("button")] })] });
    const result = buildDomOutline(root, { maxDepth: 2 });
    expect(result!.truncated).toBe(true);
    expect(result!.root.children![0].tag).toBe("section");
    // 第三层被砍掉
    expect(result!.root.children![0].children).toBeUndefined();
    expect(result!.nodeCount).toBe(2);
  });

  test("深度到顶但确实是叶子 → 不算截断", () => {
    const root = el("div", { children: [el("span")] });
    const result = buildDomOutline(root, { maxDepth: 2 });
    expect(result!.truncated).toBe(false);
  });

  test("超过 maxNodes 停止并置 truncated", () => {
    const root = el("div", {
      children: [el("a"), el("b"), el("c"), el("d")]
    });
    const result = buildDomOutline(root, { maxNodes: 3 });
    expect(result!.truncated).toBe(true);
    expect(result!.nodeCount).toBe(3);
    expect(result!.root.children).toHaveLength(2);
  });

  test("文本只取直接文本子节点，不含子元素里的文字（避免重复）", () => {
    const root = el("div", {
      children: [text("外层"), el("span", { children: [text("内层")] })]
    });
    const result = buildDomOutline(root);
    expect(result!.root.text).toBe("外层");
    expect(result!.root.children![0].text).toBe("内层");
  });

  test("文本超长被截断并带省略号", () => {
    const root = el("div", { children: [text("一二三四五六七八九十")] });
    const result = buildDomOutline(root, { maxTextLength: 4 });
    expect(result!.root.text).toBe("一二三四…");
  });

  test("maxTextLength=0 不取文本", () => {
    const root = el("div", { children: [text("有文字")] });
    const result = buildDomOutline(root, { maxTextLength: 0 });
    expect(result!.root.text).toBeUndefined();
  });

  test("script/style 等无信息量标签被跳过", () => {
    const root = el("body", { children: [el("script"), el("style"), el("div")] });
    const result = buildDomOutline(root);
    expect(result!.root.children).toHaveLength(1);
    expect(result!.root.children![0].tag).toBe("div");
    // 跳过的标签不计入节点数
    expect(result!.nodeCount).toBe(2);
  });

  test("根不是元素 → null（不返回空树冒充成功）", () => {
    expect(buildDomOutline(null)).toBeNull();
    expect(buildDomOutline(text("只有文字"))).toBeNull();
    expect(buildDomOutline({ nodeType: 1, tagName: "" })).toBeNull();
  });
});

describe("serializeDomHtml", () => {
  function htmlRoot(html: string, queryCount = 1) {
    return {
      nodeType: 1,
      tagName: "HTML",
      outerHTML: html,
      childNodes: [],
      querySelectorAll: () => new Array(queryCount).fill(null)
    };
  }

  test("未超上限 → 原样返回且 truncated=false", () => {
    const result = serializeDomHtml(htmlRoot("<html><body></body></html>"), { maxChars: 100 });
    expect(result!.html).toBe("<html><body></body></html>");
    expect(result!.truncated).toBe(false);
    expect(result!.totalChars).toBe(26);
  });

  test("超上限 → 截断并置 truncated，totalChars 仍是原始长度", () => {
    const html = "<html>" + "x".repeat(100) + "</html>";
    const result = serializeDomHtml(htmlRoot(html), { maxChars: 20 });
    expect(result!.truncated).toBe(true);
    expect(result!.html.startsWith("<html>")).toBe(true);
    expect(result!.html.endsWith("…")).toBe(true);
    expect(result!.html).toHaveLength(21);
    expect(result!.totalChars).toBe(html.length);
  });

  test("没有 outerHTML → null", () => {
    expect(serializeDomHtml(el("div"))).toBeNull();
    expect(serializeDomHtml(null)).toBeNull();
  });
});
