// 页面 DOM 结构序列化。
//
// MCP / v1 的 `runtime.dom` 用它回答「当前前端页面长什么样」。
//
// ## 两种格式，默认 outline
//
// · `outline`：元素树 { tag, id, classes, role, text, children }，深度/节点数双上限。
//   给 LLM 看「页面有哪些区域、当前模型名在哪」，体积可控。
// · `html`：`document.documentElement.outerHTML`，按 maxChars 截断。
//   带画布的页面动辄几百 KB，整段塞进 MCP 响应会挤爆上下文 —— 故**不是默认**。
//
// ## 为什么要一个纯函数
//
// `buildDomOutline` / `serializeDomHtml` 只依赖 duck-typed 元素对象
// （tagName / id / className / getAttribute / childNodes / outerHTML），
// 不碰 `document`。于是 node 单测可以塞一棵假节点树，不需要 jsdom；
// 真的取 DOM 的那一步在 `serializeDom` 里，且显式判空。
//
// ## 为什么文本要截断
//
// 图元名字、量测值都可能很长；不截断时一个画布节点就能吃掉几千字符。
// 默认每节点 120 字符，且只取**直接文本子节点**（不递归 textContent），
// 否则父节点的 text 会把整棵子树的文字重复一遍。

/** 元素树节点（outline 格式） */
export type DomOutlineNode = {
  tag: string;
  id?: string;
  classes?: string[];
  role?: string;
  text?: string;
  children?: DomOutlineNode[];
};

/** outline 序列化选项 */
export type DomOutlineOptions = {
  /** 最大递归深度（根为 1）。默认 6。 */
  maxDepth?: number;
  /** 最大节点数（含根）。默认 800。 */
  maxNodes?: number;
  /** 每节点文本上限。默认 120 字符；传 0 表示不取文本。 */
  maxTextLength?: number;
};

export type DomOutlineResult = {
  root: DomOutlineNode;
  /** 实际输出的节点数 */
  nodeCount: number;
  /** 是否因深度/节点数/文本长度被截断 */
  truncated: boolean;
};

const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_NODES = 800;
const DEFAULT_MAX_TEXT_LENGTH = 120;

/** 不参与结构的元素（内容对「页面长什么样」没有信息量，体积却不小） */
const SKIPPED_TAGS = new Set(["script", "style", "noscript", "template", "link", "meta"]);

/** 取元素的 tag 名（小写）。非元素节点返回空串。 */
function tagOf(node: any): string {
  if (!node || node.nodeType !== undefined && node.nodeType !== 1) {
    return "";
  }
  const raw = String(node.tagName ?? node.nodeName ?? "");
  return raw.toLowerCase();
}

/** 取类名数组（过滤空串）。 */
function classesOf(node: any): string[] {
  const raw = typeof node.className === "string"
    ? node.className
    : String(node.getAttribute?.("class") ?? "");
  return raw.split(/\s+/u).filter(Boolean);
}

/**
 * 取元素的**直接文本子节点**拼接（截断到 maxTextLength）。
 *
 * 刻意不用 `textContent`：那会把整棵子树的文字收进来，同一个名字在父节点和
 * 子节点里各出现一次，输出体积翻倍而信息量不变。
 */
function directTextOf(node: any, maxTextLength: number): string {
  if (maxTextLength <= 0) {
    return "";
  }
  const parts = [];
  for (const child of Array.from(node.childNodes ?? [])) {
    if ((child as any).nodeType === 3) {
      const text = String((child as any).nodeValue ?? (child as any).textContent ?? "").trim();
      if (text) {
        parts.push(text);
      }
    }
  }
  const joined = parts.join(" ").replace(/\s+/gu, " ").trim();
  return joined.length > maxTextLength ? `${joined.slice(0, maxTextLength)}…` : joined;
}

/**
 * 把一棵（duck-typed 的）DOM 树折成 outline。
 *
 * 截断语义：达到 maxNodes 或 maxDepth 时**停止深入**，并把 `truncated` 置真 ——
 * 调用方据此知道「结构不完整」，而不是误以为页面就这么点东西。
 *
 * @param root 根元素（浏览器里是 document.documentElement；测试里可以是假对象）
 * @param options 深度 / 节点数 / 文本上限
 * @returns outline 与截断标记；root 不是元素时返回 null
 */
export function buildDomOutline(root: any, options: DomOutlineOptions = {}): DomOutlineResult | null {
  const { maxDepth: rawMaxDepth, maxNodes: rawMaxNodes, maxTextLength: rawMaxTextLength } = options;
  // `typeof === "number"` 而不是 `Number.isFinite(x)`：TS 不对后者做类型收窄，
  // 门禁会报 maxDepth「可能是 undefined」。
  const maxDepth = typeof rawMaxDepth === "number" && Number.isFinite(rawMaxDepth) && rawMaxDepth > 0
    ? Math.floor(rawMaxDepth)
    : DEFAULT_MAX_DEPTH;
  const maxNodes = typeof rawMaxNodes === "number" && Number.isFinite(rawMaxNodes) && rawMaxNodes > 0
    ? Math.floor(rawMaxNodes)
    : DEFAULT_MAX_NODES;
  const maxTextLength =
    typeof rawMaxTextLength === "number" && Number.isFinite(rawMaxTextLength) && rawMaxTextLength >= 0
      ? Math.floor(rawMaxTextLength)
      : DEFAULT_MAX_TEXT_LENGTH;

  if (!tagOf(root)) {
    return null;
  }

  let nodeCount = 0;
  let truncated = false;

  const visit = (node: any, depth: number): DomOutlineNode | null => {
    const tag = tagOf(node);
    if (!tag || SKIPPED_TAGS.has(tag)) {
      return null;
    }
    if (nodeCount >= maxNodes) {
      truncated = true;
      return null;
    }
    nodeCount += 1;

    const id = String(node.id ?? node.getAttribute?.("id") ?? "").trim();
    const classes = classesOf(node);
    const role = String(node.getAttribute?.("role") ?? "").trim();
    const text = directTextOf(node, maxTextLength);
    const outline: DomOutlineNode = { tag };
    if (id) outline.id = id;
    if (classes.length) outline.classes = classes;
    if (role) outline.role = role;
    if (text) outline.text = text;

    if (depth >= maxDepth) {
      // 还有子元素却不再深入 → 结构不完整
      const hasElementChild = Array.from(node.childNodes ?? []).some((child: any) => tagOf(child));
      if (hasElementChild) {
        truncated = true;
      }
      return outline;
    }

    const children = [];
    for (const child of Array.from(node.childNodes ?? [])) {
      const childOutline = visit(child, depth + 1);
      if (childOutline) {
        children.push(childOutline);
      }
    }
    if (children.length) outline.children = children;
    return outline;
  };

  const outlineRoot = visit(root, 1);
  if (!outlineRoot) {
    return null;
  }
  return { root: outlineRoot, nodeCount, truncated };
}

/** html 序列化选项 */
export type DomHtmlOptions = {
  /** 最大字符数，默认 200000。超出即截断并置 truncated。 */
  maxChars?: number;
};

export type DomHtmlResult = {
  html: string;
  /** 原始（未截断）字符数 */
  totalChars: number;
  truncated: boolean;
  /** 粗略节点数（不遍历整页，用 querySelectorAll("*") 的数组长度） */
  nodeCount: number;
};

const DEFAULT_MAX_HTML_CHARS = 200_000;

/**
 * 取整页 outerHTML（按 maxChars 截断）。
 *
 * @param root 根元素
 * @param options 字符上限
 * @returns html 与截断标记；根元素没有 outerHTML 时返回 null
 */
export function serializeDomHtml(root: any, options: DomHtmlOptions = {}): DomHtmlResult | null {
  const { maxChars: rawMaxChars } = options;
  const maxChars = typeof rawMaxChars === "number" && Number.isFinite(rawMaxChars) && rawMaxChars > 0
    ? Math.floor(rawMaxChars)
    : DEFAULT_MAX_HTML_CHARS;
  const outer = typeof root?.outerHTML === "string" ? root.outerHTML : "";
  if (!outer) {
    return null;
  }
  const totalChars = outer.length;
  const nodeCount = typeof root.querySelectorAll === "function"
    ? root.querySelectorAll("*").length + 1
    : 0;
  if (totalChars <= maxChars) {
    return { html: outer, totalChars, truncated: false, nodeCount };
  }
  return { html: `${outer.slice(0, maxChars)}…`, totalChars, truncated: true, nodeCount };
}
