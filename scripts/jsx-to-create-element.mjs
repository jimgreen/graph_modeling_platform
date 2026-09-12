// JSX → createElement 文本级 codemod。
// 只替换最外层 JSX 节点区间（含其内部递归生成的 createElement 文本），
// 其余源码（类型标注、注释、格式）逐字节保留 —— 用于 .tsx → .ts 去 JSX 重构。
// 仅依赖仓库内 `typescript` 包，无其它运行时依赖。
import ts from "typescript";

let SOURCE = "";
let SF = null;
let ALL = []; // 全文件 JSX 节点，按 start 升序

const isJsxNode = (node) =>
  node.kind === ts.SyntaxKind.JsxElement ||
  node.kind === ts.SyntaxKind.JsxSelfClosingElement ||
  node.kind === ts.SyntaxKind.JsxFragment;

function collect(node) {
  if (isJsxNode(node)) ALL.push(node);
  ts.forEachChild(node, collect);
}

// 区间 [start, end) 内的最外层 JSX 节点：按位置包含关系（容器 end 扫描）判定
function outermostJsxWithin(start, end) {
  const inRange = ALL.filter((n) => n.getStart(SF) >= start && n.end <= end);
  const outer = [];
  let containerEnd = -1;
  for (const node of inRange) {
    const s = node.getStart(SF);
    if (s >= containerEnd) {
      outer.push(node);
      containerEnd = node.end;
    }
  }
  return outer;
}

// 表达式源文本原样保留，仅递归替换其中嵌套的 JSX（如 map 回调体内的 <g>）
function renderExpr(expr) {
  const start = expr.getStart(SF);
  let text = SOURCE.slice(start, expr.end);
  for (const node of [...outermostJsxWithin(start, expr.end)].reverse()) {
    const s = node.getStart(SF) - start;
    text = text.slice(0, s) + renderJsx(node) + text.slice(node.end - start);
  }
  return text;
}

function renderTagName(tagName) {
  const kind = tagName.kind;
  if (kind === ts.SyntaxKind.Identifier) {
    // 小写开头 = 内建元素（"rect"），否则是组件标识符（Rect）
    return /^[a-z]/.test(tagName.text) ? JSON.stringify(tagName.text) : tagName.text;
  }
  if (kind === ts.SyntaxKind.PropertyAccessExpression) {
    return SOURCE.slice(tagName.getStart(SF), tagName.end);
  }
  throw new Error(
    `jsx-to-create-element: 不支持的 JSX 标签类型 ${ts.SyntaxKind[kind]}（命名空间标签需手工处理）`
  );
}

function renderAttrName(name) {
  // TS AST 中 JSX 属性名是普通 Identifier（JsxIdentifier kind 实际未使用）
  if (name.kind === ts.SyntaxKind.Identifier) return name.text;
  if (name.kind === ts.SyntaxKind.JsxNamespacedName) {
    throw new Error("jsx-to-create-element: 命名空间属性（如 xlink:href）需手工处理");
  }
  throw new Error(`jsx-to-create-element: 未知 JSX 属性名类型 ${ts.SyntaxKind[name.kind]}`);
}

function renderProps(attributes) {
  const props = attributes.properties;
  if (props.length === 0) return "null";
  const parts = [];
  for (const attr of props) {
    if (attr.kind === ts.SyntaxKind.JsxSpreadAttribute) {
      // 展开属性直接并入对象字面量（...expr 是合法 TS，语义与 JSX 逐位一致）
      parts.push("..." + renderExpr(attr.expression));
    } else if (attr.kind === ts.SyntaxKind.JsxAttribute) {
      const name = renderAttrName(attr.name);
      if (attr.initializer === undefined) {
        parts.push(`${name}: true`);
        continue;
      }
      let valueText;
      if (attr.initializer.kind === ts.SyntaxKind.StringLiteral) {
        valueText = SOURCE.slice(attr.initializer.getStart(SF), attr.initializer.end);
      } else if (attr.initializer.kind === ts.SyntaxKind.JsxExpression) {
        valueText = attr.initializer.expression ? renderExpr(attr.initializer.expression) : "true";
      } else {
        valueText = renderExpr(attr.initializer);
      }
      // 名值相同（width={width}）用简写
      // JSX 属性名可含连字符（data-*），作为对象字面量键必须加引号
      const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
      parts.push(valueText === name ? name : `${key}: ${valueText}`);
    } else {
      throw new Error(`jsx-to-create-element: 未知 JSX 属性类型 ${ts.SyntaxKind[attr.kind]}`);
    }
  }
  return `{ ${parts.join(", ")} }`;
}

// JSX 文本规范化（Babel 同款算法）：首尾换行剥离、行内空白折叠
function normalizeJsxText(text) {
  const lines = text.split(/\r\n|\n|\r/);
  let lastNonEmptyLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/[^ \t]/)) lastNonEmptyLine = i;
  }
  let str = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isFirstLine = i === 0;
    const isLastLine = i === lines.length - 1;
    const isLastNonEmptyLine = i === lastNonEmptyLine;
    let trimmedLine = line.replace(/\t/g, " ");
    if (!isFirstLine) trimmedLine = trimmedLine.replace(/^ +/, "");
    if (!isLastLine) trimmedLine = trimmedLine.replace(/ +$/, "");
    if (trimmedLine) {
      if (!isLastNonEmptyLine) trimmedLine += " ";
      str += trimmedLine;
    }
  }
  return str;
}

function renderChildren(children) {
  const parts = [];
  for (const child of children) {
    if (child.kind === ts.SyntaxKind.JsxText) {
      // 纯空白文本（元素间换行缩进）直接丢弃，与 React 渲染结果等价
      const text = normalizeJsxText(child.text);
      if (text) parts.push(JSON.stringify(text));
    } else if (child.kind === ts.SyntaxKind.JsxExpression) {
      if (child.expression) parts.push(renderExpr(child.expression));
    } else if (isJsxNode(child)) {
      parts.push(renderJsx(child));
    } else {
      throw new Error(`jsx-to-create-element: 未知 JSX 子节点类型 ${ts.SyntaxKind[child.kind]}`);
    }
  }
  return parts.join(", ");
}

function renderJsx(node) {
  if (node.kind === ts.SyntaxKind.JsxFragment) {
    const children = renderChildren(node.children);
    return `createElement(Fragment, null${children ? ", " + children : ""})`;
  }
  // JsxElement 的 tagName/attributes 在 openingElement 上；JsxSelfClosingElement 直接持有
  const tag = renderTagName(node.tagName ?? node.openingElement.tagName);
  const attributes = node.attributes ?? node.openingElement.attributes;
  const props = renderProps(attributes);
  if (node.kind === ts.SyntaxKind.JsxSelfClosingElement) {
    return `createElement(${tag}, ${props})`;
  }
  const children = renderChildren(node.children);
  return `createElement(${tag}, ${props}${children ? ", " + children : ""})`;
}

export function convertJsxToCreateElement(source, fileName) {
  SOURCE = source;
  SF = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  ALL = [];
  collect(SF);
  ALL.sort((a, b) => a.getStart(SF) - b.getStart(SF));

  // 只替换最外层 JSX（内层节点在其外层生成的替换文本里，避免重复替换）
  const outer = [];
  let containerEnd = -1;
  for (const node of ALL) {
    const s = node.getStart(SF);
    if (s >= containerEnd) {
      outer.push(node);
      containerEnd = node.end;
    }
  }

  let out = source;
  for (const node of [...outer].reverse()) {
    const s = node.getStart(SF);
    out = out.slice(0, s) + renderJsx(node) + out.slice(node.end);
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith("jsx-to-create-element.mjs")) {
  const [, , input, output] = process.argv;
  const { readFileSync, writeFileSync } = await import("node:fs");
  const source = readFileSync(input, "utf8");
  writeFileSync(output, convertJsxToCreateElement(source, input), "utf8");
}
