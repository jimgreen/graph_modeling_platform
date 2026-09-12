// 未定义名审计：穿透 `// @ts-nocheck` / `// @ts-ignore` 的 TypeScript 语义检查。
//
// 背景：src/App.tsx 与 src/appExtracted/** 大量文件带 `// @ts-nocheck`，其中的工厂函数
// 从 `__appScope: Record<string, any>` 里解构依赖。若函数体用了没解构的名字，TypeScript
// 完全静默（@ts-nocheck 压掉整个文件的语义诊断），运行时才抛
// `Uncaught ReferenceError: xxx is not defined`。
//
// 做法：在内存里剥掉抑制指令后再把源码交给编译器，只保留 TS2304 / TS2552
// （Cannot find name 'X'）两条诊断。
//
// 用法：
//   node scripts/audit-undefined-names.mjs                       # 审计 tsconfig.json include 覆盖的全部文件（只报值位置）
//   node scripts/audit-undefined-names.mjs --files a.ts b.tsx    # 只审计给定文件
//   node scripts/audit-undefined-names.mjs --all                 # 连类型位置命中一起列出
// 退出码：0 = 无未定义名；1 = 有命中（逐条打印 相对路径:行:列  名字）。

import ts from "typescript";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

// 白名单：仅限「确实由外部注入、源码里无绑定但属预期」的全局名，逐个写明原因。
// 不要放宽整体规则；真实漏解构必须修代码而不是往这里加名字。
const IGNORED_NAMES = new Set([
  // vite.config.ts 的 define 在编译期做文本替换，源码中不存在 declare
  "__API_PREFIX__",
  "__FRONTEND_BASE__"
]);

// 与仓库 tsconfig.json 对齐（target/module/moduleResolution/jsx/lib 取真实值）；
// 少了 DOM 会把 window/document 之类的浏览器全局误报成未定义名。
// 注意：程序化传 lib 必须用 lib.xxx.d.ts 全名（tsconfig 里的 "DOM" 由
// parseJsonConfigFileContent 转换成全名，直接传 "DOM" 会被静默忽略）。
const COMPILER_OPTIONS = {
  noEmit: true,
  allowJs: false,
  jsx: ts.JsxEmit.ReactJSX,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  allowImportingTsExtensions: true,
  strict: false,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"]
};

// 2304: Cannot find name 'X'
// 2552: Cannot find name 'X'. Did you mean ...?
const UNDEFINED_NAME_CODES = new Set([2304, 2552]);

// 判断命中是否落在类型位置（类型注解、`typeof X` 类型查询、implements 子句等）。
// 类型位置的名字在编译期被整体擦除，不可能抛运行时 ReferenceError；
// 本仓库历史存量 1400+ 条这类命中（类型没 import 进 @ts-nocheck 文件），
// 默认不计入「未定义名」以免淹没真正的运行时缺陷。
function isTypeOnlyPosition(node) {
  if (!node) return false;
  if (ts.isTypeNode(node)) return true;
  for (let current = node.parent; current; current = current.parent) {
    if (
      ts.isTypeNode(current) ||
      ts.isTypeAliasDeclaration(current) ||
      ts.isInterfaceDeclaration(current) ||
      ts.isTypeParameterDeclaration(current) ||
      ts.isImportTypeNode(current)
    ) {
      return true;
    }
    if (ts.isExpressionWithTypeArguments(current)) {
      // class A extends B 的 B 是运行时求值；implements 子句是类型位置
      const clause = current.parent;
      return !(ts.isHeritageClause(clause) && clause.token === ts.SyntaxKind.ExtendsKeyword);
    }
    if (ts.isStatement(current) || ts.isExpression(current) || ts.isSourceFile(current)) {
      return false;
    }
  }
  return false;
}

function nodeAtPosition(sourceFile, position) {
  let found;
  const visit = (node) => {
    if (node.pos <= position && position < node.end) {
      found = node;
      ts.forEachChild(node, visit);
    }
  };
  visit(sourceFile);
  return found;
}

// 剥掉会压掉语义诊断的整行注释（保留换行，行号不变）。
// @ts-nocheck 压整个文件；@ts-ignore / @ts-expect-error 压下一行，同样会隐藏 2304。
function stripSuppressions(text) {
  return text.replace(/^[ \t]*\/\/[ \t]*@ts-(nocheck|ignore|expect-error)\b.*$/gm, "");
}

function createHost() {
  const host = ts.createCompilerHost(COMPILER_OPTIONS);
  const readFile = host.readFile.bind(host);
  host.readFile = (fileName) => {
    const text = readFile(fileName);
    return typeof text === "string" ? stripSuppressions(text) : text;
  };
  host.getSourceFile = (fileName, languageVersion) => {
    const text = host.readFile(fileName);
    if (typeof text !== "string") return undefined;
    return ts.createSourceFile(fileName, text, languageVersion, true);
  };
  return host;
}

// TS 在 Windows 上把诊断文件名规范成正斜杠形式，这里映射回调用方传入的原始路径
function pathKey(filePath) {
  return path.resolve(filePath).replace(/\\/g, "/").toLowerCase();
}

/**
 * 审计给定文件里的未定义名。
 * @param {string[]} filePaths 待审计文件（绝对或相对路径均可）
 * @param {{ includeTypePositions?: boolean }} [options] 默认只返回值位置命中；
 *   includeTypePositions=true 时连类型位置一起返回（kind 字段区分）
 * @returns {Array<{ file: string; line: number; column: number; name: string; kind: "value" | "type" }>}
 *   行号列号均从 1 起
 */
export function findUndefinedNames(filePaths, options = {}) {
  if (!filePaths || filePaths.length === 0) return [];
  const originalByKey = new Map(filePaths.map((p) => [pathKey(p), p]));
  const program = ts.createProgram({
    rootNames: filePaths.map((p) => path.resolve(p)),
    options: COMPILER_OPTIONS,
    host: createHost()
  });
  const hits = [];
  for (const diag of program.getSemanticDiagnostics()) {
    if (!UNDEFINED_NAME_CODES.has(diag.code)) continue;
    if (!diag.file || diag.start === undefined) continue;
    const fileName = diag.file.fileName;
    if (fileName.replace(/\\/g, "/").includes("node_modules/")) continue;
    const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
    const match = /Cannot find name '([^']+)'/.exec(message);
    if (!match) continue;
    const name = match[1];
    if (IGNORED_NAMES.has(name)) continue;
    const kind = isTypeOnlyPosition(nodeAtPosition(diag.file, diag.start)) ? "type" : "value";
    if (kind === "type" && !options.includeTypePositions) continue;
    const pos = diag.file.getLineAndCharacterOfPosition(diag.start);
    hits.push({
      file: originalByKey.get(pathKey(fileName)) ?? fileName,
      line: pos.line + 1,
      column: pos.character + 1,
      name,
      kind
    });
  }
  hits.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column
  );
  return hits;
}

// 无参数时：取 tsconfig.json 的 include 覆盖到的全部文件
function collectTsconfigFiles() {
  const configPath = path.join(repoRoot, "tsconfig.json");
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) {
    throw new Error(`读取 tsconfig.json 失败: ${ts.flattenDiagnosticMessageText(read.error.messageText, "\n")}`);
  }
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, repoRoot);
  return parsed.fileNames;
}

function main() {
  const args = process.argv.slice(2);
  const includeTypePositions = args.includes("--all");
  const rest = args.filter((arg) => arg !== "--all");
  let files;
  if (rest[0] === "--files") {
    files = rest.slice(1);
    if (files.length === 0) {
      console.error("--files 需要至少一个文件路径");
      process.exit(2);
    }
  } else {
    files = collectTsconfigFiles();
  }
  const hits = findUndefinedNames(files, { includeTypePositions });
  if (hits.length === 0) {
    console.log("未发现未定义名。");
    process.exit(0);
  }
  for (const hit of hits) {
    const marker = hit.kind === "type" ? "  (类型位置，运行时无影响)" : "";
    console.log(`${path.relative(repoRoot, hit.file)}:${hit.line}:${hit.column}  ${hit.name}${marker}`);
  }
  const valueCount = hits.filter((hit) => hit.kind === "value").length;
  console.log(`\n共 ${hits.length} 处未定义名（值位置 ${valueCount} 处）。`);
  if (!includeTypePositions) {
    console.log("加 --all 可同时列出类型位置命中（编译期擦除，不产生 ReferenceError）。");
  }
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
