// tsconfig.json 契约守卫 —— 纯只读。本文件不修改任何配置，只断言其结构。
//
// 为什么不用正则扫源码文本：本仓教训是文本正则两头都会出错。
//   ① 误红：注释里出现一个字面量（例如「以前这里写的是 strict: false」）就判失败。
//   ② 静默放行：配置形状一变（include 从字符串换成对象、字段被重命名），
//      正则匹配不到就被当成「没有违规」，而不是「守卫已失效」。
// 故一律 JSON.parse 后按结构断言。tsconfig.json 目前是纯 JSON（无 JSONC 注释），
// 若将来有人加入注释，JSON.parse 会抛错，下面「能被解析」那条元断言会把原因喊出来 ——
// 这正是要的行为：守卫失效必须是响的，不能是哑的。
//
// 契约 4（allowImportingTsExtensions）是承重的：src/export 下大量相对 import 显式写了
// .ts 扩展名，Bundler 模块解析下必须由该开关放行，去掉它整包类型检查会塌。因此额外
// 加一条结构性证据测试，用 TS 自带扫描器 preProcessFile 取 specifier（不是正则），
// 确保这条契约不是一句空转的断言。
import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const tsconfigPath = path.join(repoRoot, "tsconfig.json");
const exportDir = path.join(repoRoot, "src", "export");

// 解析失败时抛出带上下文的 Error，而不是让下游因 undefined 取值给出误导性报错。
function readTsconfig() {
  const raw = readFileSync(tsconfigPath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `tsconfig.json 无法被 JSON.parse 解析：${error.message}。` +
        "若文件已改为带 JSONC 注释，本守卫需改用 ts.parseConfigFileTextToJson。"
    );
  }
}

// ---- 契约谓词（纯函数，供契约测试与下方自测共用，避免两处断言写法漂移）----

const hasStrictTrue = (config) => config?.compilerOptions?.strict === true;

// 恰好等于单元素 ["src"]。写成 include?.length === 1 && include[0] === "src"，
// 是为了让「include 变成字符串 "src"」这种形状漂移也被判为违规。
const includesSrcOnly = (config) => {
  const include = config?.include;
  return Array.isArray(include) && include.length === 1 && include[0] === "src";
};

const allowsTsExtensions = (config) => config?.compilerOptions?.allowImportingTsExtensions === true;

// 钉住引用项的 path 本身，而不是「存在至少一个引用」——后者对把 tsconfig.node.json
// 换成别的文件完全无感。
const referencesNodeTsconfigOnly = (config) => {
  const references = config?.references;
  if (!Array.isArray(references)) return false;
  return references.length === 1 && references[0]?.path === "./tsconfig.node.json";
};

// 用 TS 自带扫描器提取 import specifier。注意 readImportFiles 必须传 true，
// 否则 importedFiles 恒为空数组（实测传 false 得到 count=0），证据测试会永远变红。
// detectJavaScriptImports 传 true 以便 .js/.mjs 的 import 也被计入。
function tsExtensionImportSpecifiers(sourceText) {
  const info = ts.preProcessFile(sourceText, true, true);
  return info.importedFiles.map((imported) => imported.fileName).filter((name) => name.endsWith(".ts"));
}

describe("tsconfig.json 契约", () => {
  test("元断言：tsconfig.json 能被解析成含 compilerOptions 与数组型 include 的对象", () => {
    // 放在最前：解析是其余全部断言的前提。文件一旦损坏，后面几条会因 undefined
    // 取值给出误导性报错，这里先把根因钉住。
    const parsed = readTsconfig();
    expect(parsed, "tsconfig.json 顶层不是对象").toBeTypeOf("object");
    expect(parsed === null || Array.isArray(parsed), "tsconfig.json 顶层不是普通对象").toBe(false);
    expect(parsed.compilerOptions, "tsconfig.json 缺少 compilerOptions").toBeTypeOf("object");
    expect(Array.isArray(parsed.include), "include 必须是数组").toBe(true);
  });

  test("compilerOptions.strict 为 true（全仓不靠 any 逃逸的底线）", () => {
    // 用 === true 而非真值判断：字段被删（undefined）与被写成 false 同样是违规，
    // 真值断言会放过「字段消失」这种回归。
    expect(hasStrictTrue(readTsconfig()), "strict 必须显式为 true").toBe(true);
  });

  test("include 恰为单元素 src（多一个目录就等于类型检查面失控）", () => {
    expect(includesSrcOnly(readTsconfig()), "include 必须恰好是 [\"src\"]").toBe(true);
  });

  test("compilerOptions.allowImportingTsExtensions 为 true（带 .ts 后缀的相对 import 依赖它）", () => {
    expect(allowsTsExtensions(readTsconfig()), "去掉该开关会让 .ts 后缀 import 整包报错").toBe(true);
  });

  test("references 存在且仅指向 tsconfig.node.json（Node 侧配置为独立工程）", () => {
    expect(referencesNodeTsconfigOnly(readTsconfig()), "references 必须恰好指向 ./tsconfig.node.json").toBe(true);
  });

  test("结构化证据：src/export 下确有显式 .ts 后缀的相对 import", () => {
    // 若哪天全仓不再有 .ts 后缀 import，这条应变红并提示重新评估该契约是否还有承重对象，
    // 而非继续对一条已无意义的开关保持沉默。
    const files = readdirSync(exportDir).filter((name) => name.endsWith(".ts"));
    expect(files.length, "src/export 下未找到 .ts 文件，目录约定可能已变").toBeGreaterThan(0);

    const found = [];
    for (const file of files) {
      const sourceText = readFileSync(path.join(exportDir, file), "utf8");
      for (const specifier of tsExtensionImportSpecifiers(sourceText)) found.push(`${file} -> ${specifier}`);
    }
    expect(
      found.length,
      "src/export 下已无 .ts 后缀 import：allowImportingTsExtensions 可能已无承重对象，请重新评估是否保留"
    ).toBeGreaterThan(0);
  });
});

describe("守卫自测：谓词能被变异打红（防恒绿断言）", () => {
  // 取真实配置作基线，证明谓词与线上实际值一致；再对每个契约逐一变异，
  // 断言谓词变 false。若某条变异打不红，说明该守卫是恒绿的、没有承重。
  const baseline = readTsconfig();
  const clone = () => structuredClone(baseline);

  test("基线满足全部四条契约（否则下面的变异断言无意义）", () => {
    expect(hasStrictTrue(baseline)).toBe(true);
    expect(includesSrcOnly(baseline)).toBe(true);
    expect(allowsTsExtensions(baseline)).toBe(true);
    expect(referencesNodeTsconfigOnly(baseline)).toBe(true);
  });

  test("strict：改成 false、被删除、被置为字符串都会让守卫变红", () => {
    const off = clone();
    off.compilerOptions.strict = false;
    expect(hasStrictTrue(off), "strict=false 未被抓住").toBe(false);

    const dropped = clone();
    delete dropped.compilerOptions.strict;
    expect(hasStrictTrue(dropped), "strict 字段被删未被抓住").toBe(false);

    const stringy = clone();
    stringy.compilerOptions.strict = "true";
    expect(hasStrictTrue(stringy), "strict 变成字符串未被抓住（真值断言会放过）").toBe(false);
  });

  test("include：追加目录、变成字符串、清空数组都会让守卫变红", () => {
    const wider = clone();
    wider.include = ["src", "e2e"];
    expect(includesSrcOnly(wider), "include 被追加目录未被抓住").toBe(false);

    const asString = clone();
    asString.include = "src";
    expect(includesSrcOnly(asString), "include 变成字符串未被抓住（形状漂移）").toBe(false);

    const empty = clone();
    empty.include = [];
    expect(includesSrcOnly(empty), "include 清空未被抓住").toBe(false);
  });

  test("allowImportingTsExtensions：改成 false、被删除都会让守卫变红", () => {
    const off = clone();
    off.compilerOptions.allowImportingTsExtensions = false;
    expect(allowsTsExtensions(off), "allowImportingTsExtensions=false 未被抓住").toBe(false);

    const dropped = clone();
    delete dropped.compilerOptions.allowImportingTsExtensions;
    expect(allowsTsExtensions(dropped), "allowImportingTsExtensions 被删未被抓住").toBe(false);
  });

  test("references：改成别的路径、变空、被删除都会让守卫变红", () => {
    const swapped = clone();
    swapped.references = [{ path: "./tsconfig.app.json" }];
    expect(referencesNodeTsconfigOnly(swapped), "references 指向别的文件未被抓住").toBe(false);

    const emptied = clone();
    emptied.references = [];
    expect(referencesNodeTsconfigOnly(emptied), "references 清空未被抓住").toBe(false);

    const dropped = clone();
    delete dropped.references;
    expect(referencesNodeTsconfigOnly(dropped), "references 被删未被抓住").toBe(false);
  });

  test("证据提取器：无 .ts 后缀的源码提取结果为空（证明它不会凭空造出证据）", () => {
    // 静态扫描器自测：给合成输入，断言检测逻辑会变红。这比「我们扫了 N 个文件」强 ——
    // 它证明检测器本身具备变红的能力，与当前源码内容无关。
    expect(tsExtensionImportSpecifiers('import { a } from "./a";\nconst b = 1;\n')).toEqual([]);
    expect(tsExtensionImportSpecifiers("")).toEqual([]);
    // 反向：合法形态必须被识别出来，否则上面的空结果毫无意义。
    expect(tsExtensionImportSpecifiers('import type { M } from "../model.ts";')).toEqual(["../model.ts"]);
  });
});