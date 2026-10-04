// 未定义名审计：穿透 `// @ts-nocheck` / `// @ts-ignore` 的 TypeScript 语义检查。
//
// 背景：src/App.tsx 与 src/appExtracted/** 大量文件带 `// @ts-nocheck`，其中的工厂函数
// 从 `__appScope: Record<string, any>` 里解构依赖。若函数体用了没解构的名字，TypeScript
// 完全静默（@ts-nocheck 压掉整个文件的语义诊断），运行时才抛
// `Uncaught ReferenceError: xxx is not defined`。
//
// 做法：在内存里剥掉抑制指令后再把源码交给编译器，保留三类运行时崩溃诊断：
// TS2304/TS2552（Cannot find name 'X'）、TS2339/TS2551（属性不存在）。
//
// 用法：
//   node scripts/audit-undefined-names.mjs                       # 审计 tsconfig.json include 覆盖的全部文件（只报值位置）
//   node scripts/audit-undefined-names.mjs --files a.ts b.tsx    # 只审计给定文件
//   node scripts/audit-undefined-names.mjs --all                 # 连类型位置命中一起列出
//   node scripts/audit-undefined-names.mjs --crash-only         # 只报「属性不存在」这类运行时 TypeError
//   node scripts/audit-undefined-names.mjs --crash-only --all-known-safe   # 连已核过安全的存量命中一起列出
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

// 崩溃类（属性不存在）已逐个人工核过：现存的 48 条命中**全部**是同一种形态 ——
// 在「推断出的窄类型 / 泛型 T / 可选链收窄后」上取属性，代码本身安全，运行时不会抛。
// 逐条核过依据（改动前请重读对应代码确认，不要照抄本注释）：
//   - `activeElement.blur`（appGraphMeasurementFactories）前一行有
//     `typeof activeElement.blur !== "function"` 守卫；
//   - `savedGroup?.items?.find(...)` 用了可选链；
//   - `payloadRecord.scheme` / `.schemes` 前有 `payloadRecord &&` 短路；
//   - `row.id` / `row.isNew`：泛型 `T extends { enName?: unknown }`（resolveCustomDeviceParameterRowsForDisplay）
//     或数组字面量联合，TS 看不见 `id`，但构造处都带 `id`。
// 按「文件:属性」登记为已知良性；**任何新命中都视为真缺陷**，放宽需逐条写明理由，
// 不要整文件放行。
const KNOWN_SAFE_PROPERTY_HITS = new Set([
  "src/appExtracted/appCanvasDialogs.tsx:scope",
  "src/appExtracted/appDeviceDefinitionDialogs.tsx:scope",
  "src/appExtracted/appProjectDialogs.tsx:scope",
  "src/appExtracted/appResourceDialogs.tsx:scope",
  "src/appExtracted/appDeviceDefinitionFactories.tsx:scheme",
  "src/appExtracted/appDeviceDefinitionFactories.tsx:schemes",
  "src/appExtracted/appDeviceDefinitionRenderers.tsx:width",
  "src/appExtracted/appDeviceDefinitionRenderers.tsx:height",
  "src/appExtracted/appGraphMeasurementFactories.tsx:blur",
  "src/appExtracted/appGraphMeasurementFactories.tsx:items",
  "src/appExtracted/appProjectCanvasFactories.tsx:id",
  "src/appExtracted/appSelectionDragFactories.tsx:points",
  "src/appExtracted/appRenderBatch.tsx:valueType",
  "src/appExtracted/appRenderBatch.tsx:typicalValue",
  "src/appExtracted/appRenderBatch.tsx:enumOptions",
  "src/appExtracted/appRenderBatch.tsx:enumValues",
  "src/appExtracted/appRenderBatch.tsx:exportEnabled",
  "src/appExtracted/appRenderBatch.tsx:exportName",
  "src/appExtracted/appView.tsx:valueType",
  "src/appExtracted/appView.tsx:typicalValue",
  "src/appExtracted/appView.tsx:enumOptions",
  "src/appExtracted/appView.tsx:enumValues",
  "src/appExtracted/appView.tsx:exportEnabled",
  "src/appExtracted/appView.tsx:exportName",
  "src/appExtracted/appView.tsx:id",
  "src/VoltageLevelDialog.tsx:isNew"
]);

// 与仓库 tsconfig.json 对齐（target/module/moduleResolution/jsx/lib 取真实值）；
// 少了 DOM 会把 window/document 之类的浏览器全局误报成未定义名。
// 注意：程序化传 lib 必须用 lib.xxx.d.ts 全名（tsconfig 里的 "DOM" 由
// parseJsonConfigFileContent 转换成全名，直接传 "DOM" 会被静默忽略）。
//
// **strict 取 true，与 tsconfig.json 一致**（tsconfig 用的是 "strict": true）。
// 这一项对本脚本的两种模式都至关重要：
//   - strict:false 会让「联合类型未收窄就取属性」也报出来（如
//     `if (res.ok) return;` 之后的 `res.error`），这些在真 tsc 下根本不报，
//     纯噪音（实测 101 条里有 30 条是这类）。
//   - 反过来，若沿用 strict:false，`Record<string, X>` 上缺失属性的真缺陷也会漏掉。
// 结论：审计口径必须与 `tsc -b` 同源，否则结论不可比。
const COMPILER_OPTIONS = {
  noEmit: true,
  allowJs: false,
  jsx: ts.JsxEmit.ReactJSX,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  allowImportingTsExtensions: true,
  strict: true,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"]
};

// 2304: Cannot find name 'X'
// 2552: Cannot find name 'X'. Did you mean ...?
// 2339: Property 'X' does not exist on type 'Y'   → 运行时 TypeError: ... is undefined
// 2551: 同上，但 TS 在同一文件命中过多时改用「and N more」的汇总形式
//
// 2339/2551 与 2304 同属「@ts-nocheck 压掉、运行时才炸」的一类，且不会落在类型位置
// （它们本来就只出现在值位置），故一并纳入。
const UNDEFINED_NAME_CODES = new Set([2304, 2552]);
const CRASHING_DIAGNOSTIC_CODES = new Set([2339, 2551]);

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
// `@ts-nocheck` 压整个文件，`@ts-ignore` / `@ts-expect-error` 压下一行，同样会藏起 2304。
// 此处原先以 `// @ts-nocheck` 开头，但它一直是空转：本文件是 .mjs，不在 tsconfig.json 的 include（只有 ["src"]）内，allowJs 也是 false，tsconfig.node.json 只含 vite.config.ts。那行指令从未被 tsc 读到，只会误导读者以为本文件已做类型检查。
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

// 归一成「相对仓库根、保留原大小写」的形式，让白名单键与平台/调用方式无关。
// 注意**不能**用 pathKey（它会 toLowerCase），否则白名单里写的
// "VoltageLevelDialog.tsx" 永远匹配不上 "voltageleveldialog.tsx"。
function toRepoRelative(filePath) {
  const absolute = path.resolve(filePath).replace(/\\/g, "/");
  const root = path.resolve(repoRoot).replace(/\\/g, "/");
  return absolute.startsWith(root + "/") ? absolute.slice(root.length + 1) : absolute;
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
    const isNameDiag = UNDEFINED_NAME_CODES.has(diag.code);
    const isCrashDiag = CRASHING_DIAGNOSTIC_CODES.has(diag.code);
    // 两种模式互斥：默认只查「未定义名」，--crash-only 只查「属性不存在」。
    // （默认模式**不**顺带报崩溃类：那会让 audit:names 的既有输出与退出码发生漂移。）
    if (options.crashOnly ? !isCrashDiag : !isNameDiag) continue;
    if (!diag.file || diag.start === undefined) continue;
    const fileName = diag.file.fileName;
    if (fileName.replace(/\\/g, "/").includes("node_modules/")) continue;
    // getSemanticDiagnostics() 覆盖整个 program（含 rootNames 的传递依赖），
    // 故只保留**被点名审计**的那些文件的命中。否则 `--files a.ts` 会连
    // a.ts 引用的 18 个其它文件的问题一起报出来（实测即如此），--files 形同虚设。
    if (!originalByKey.has(pathKey(fileName))) continue;
    const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
    let name;
    if (isCrashDiag) {
      // 2339/2551: Property 'X' does not exist on type 'Y'  → 取属性名
      // 注意 message 可能是链式的（同一属性在联合的多个分支上报），
      // 首个 "Property '...' does not exist" 即为该诊断的属性名。
      const propertyMatch = /Property '([^']+)' does not exist/.exec(message);
      name = propertyMatch?.[1] ?? message.split("\n")[0];
      const originalFile = originalByKey.get(pathKey(fileName)) ?? fileName;
      // 已人工核过、确认运行安全的「窄类型上取属性」命中，见 KNOWN_SAFE_PROPERTY_HITS 注释。
      if (!options.includeKnownSafe && KNOWN_SAFE_PROPERTY_HITS.has(`${toRepoRelative(originalFile)}:${name}`)) {
        continue;
      }
      const pos = diag.file.getLineAndCharacterOfPosition(diag.start);
      hits.push({
        file: originalFile,
        line: pos.line + 1,
        column: pos.character + 1,
        name,
        kind: "value"
      });
      continue;
    }
    const match = /Cannot find name '([^']+)'/.exec(message);
    if (!match) continue;
    name = match[1];
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
  const FLAGS = new Set(["--all", "--crash-only", "--all-known-safe"]);
  const includeTypePositions = args.includes("--all");
  const crashOnly = args.includes("--crash-only");
  const includeKnownSafe = args.includes("--all-known-safe");
  const rest = args.filter((arg) => !FLAGS.has(arg));
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
  const hits = findUndefinedNames(files, { includeTypePositions, crashOnly, includeKnownSafe });
  if (hits.length === 0) {
    console.log(crashOnly ? "未发现潜在崩溃点（属性不存在）。" : "未发现未定义名。");
    process.exit(0);
  }
  for (const hit of hits) {
    const marker = hit.kind === "type" ? "  (类型位置，运行时无影响)" : "";
    console.log(`${path.relative(repoRoot, hit.file)}:${hit.line}:${hit.column}  ${hit.name}${marker}`);
  }
  const valueCount = hits.filter((hit) => hit.kind === "value").length;
  if (crashOnly) {
    console.log(`\n共 ${hits.length} 处潜在崩溃点（属性不存在）。`);
  } else {
    console.log(`\n共 ${hits.length} 处未定义名（值位置 ${valueCount} 处）。`);
    if (!includeTypePositions) {
      console.log("加 --all 可同时列出类型位置命中（编译期擦除，不产生 ReferenceError）。");
    }
  }
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
