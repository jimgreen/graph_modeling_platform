/**
 * 「data/ 样本依赖」守卫。
 *
 * ## 背景
 *
 * `data/` 整目录被 .gitignore 忽略（见 CLAUDE.md），所以干净检出 / CI 上必然没有样本。
 * 仓库既有约定是给这类用例加 skipIf 守卫（如 ems-rtdb-export-path.test.ts）。
 *
 * 但这个约定有个**极隐蔽的破口**：`describe.skipIf(...)` 只阻止 `it` 执行，
 * **describe 的回调体本身照样会跑**。所以把
 * `readFileSync("data/…")` 写在 describe 体顶层时：
 *   - 本机（有 data/）全绿，一切正常；
 *   - 干净检出 → ENOENT，**套件级**失败（连 skip 都来不及）。
 * 实际踩过一次：dms-rtdb-export-rules.test.ts 因此在纯净检出里红了。
 *
 * 本守卫静态扫出「用了 skipIf 守卫，却仍在 describe 体顶层读 data/」的文件。
 */
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function listTestFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTestFiles(full));
    else if (/\.test\.tsx?$/u.test(entry.name)) out.push(full);
  }
  return out;
}

const testFiles = listTestFiles(path.join(repoRoot, "src"));

/**
 * 判定一个测试是否真的从磁盘读 data/ 目录。
 *
 * 不能简单找 `data/` 字面量 —— 两类假阳性实测都踩过：
 *   1. 内联 data URI（`href="data:image/png;base64,…"`）
 *   2. 硬编码的**假 URL 字符串**，如 svgExport.test.tsx 里的
 *      `'data/images/bg?id=1&name=a"b'` —— 那是测 SVG 属性转义的构造数据，
 *      从不落到磁盘。
 *
 * 可靠判据：只看真正的文件读取调用（readFileSync / existsSync / readdirSync）
 * 的实参里出现 `data/`，或 path.join/resolve 拼出 data/ 路径。
 */
function dependsOnDataDir(source) {
  const reads = source.matchAll(
    /\b(?:readFileSync|existsSync|readdirSync|createReadStream|access|statSync)\s*\(\s*(?:[^,()]*,\s*)?[`'"][^`'"]*\bdata\//gu
  );
  if (reads.length > 0) return true;
  // 拼装形式：path.join("data", …) / join(ROOT, "data/…") / resolve("data", …)
  return /\b(?:join|resolve)\s*\(\s*(?:[^,()]*,\s*)?[`'"]data(?:\/|['"])/u.test(source);
}

/**
 * 找出「describe 回调体顶层」里直接读 data/ 的行。
 *
 * 难点：缩进 2 空格既可能是 describe 体顶层语句，也可能是**顶层函数**（如
 * `function buildEditorRecords() {`）的函数体 —— 后者不是 describe 体求值，不算违规。
 * 所以用括号/花括号深度跟踪：只有当尚未进入任何未闭合的 `{` 时，2 空格缩进行
 * 才算 describe 体顶层。
 */
function describeBodyDataReads(source) {
  const hits = [];
  let depth = 0;
  source.split(/\r?\n/u).forEach((line, index) => {
    const isDescribeTopLevel = /^ {2}\S/u.test(line) && depth === 1;
    if (
      isDescribeTopLevel &&
      /\b(?:readFileSync|existsSync|readdirSync|access|statSync)\s*\(\s*(?:[^,()]*,\s*)?[`'"][^`'"]*\bdata\//u.test(line)
    ) {
      hits.push({ line, index });
    }
    // 去掉字符串与注释后再数深度，避免 URL/正则里的括号干扰
    const code = line
      .replace(/`(?:\\.|[^`\\])*`/gu, '""')
      .replace(/'(?:\\.|[^'\\])*'/gu, '""')
      .replace(/"(?:\\.|[^"\\])*"/gu, '""')
      .replace(/\/\/.*$/u, "");
    for (const ch of code) {
      if (ch === "{" || ch === "(" || ch === "[") depth += 1;
      else if (ch === "}" || ch === ")" || ch === "]") depth -= 1;
    }
    if (depth < 0) depth = 0;
  });
  return hits;
}

describe("data/ 样本依赖的 skipIf 守卫", () => {
  test("扫描面有效：确实扫到了若干测试文件", () => {
    expect(testFiles.length).toBeGreaterThan(50);
  });

  test("凡引用 data/ 样本的测试，都必须带 skipIf 或 existsSync 守卫", () => {
    const offenders = [];
    for (const file of testFiles) {
      const source = readFileSync(file, "utf8");
      if (!dependsOnDataDir(source)) continue;
      const hasGuard =
        /skipIf\s*\(/u.test(source) ||
        /existsSync\s*\(/u.test(source) ||
        /\.skip\b/u.test(source);
      if (!hasGuard) offenders.push(path.relative(repoRoot, file).split(path.sep).join("/"));
    }
    expect(
      offenders,
      `这些测试读 data/ 样本却无任何 skipIf / existsSync 守卫，干净检出会 ENOENT 假红：\n  ${offenders.join("\n  ")}`
    ).toEqual([]);
  });

  test("describe 体顶层不得直接读 data/（skipIf 拦不住 describe 体求值）", () => {
    // 只在「已带 skipIf 守卫」的文件里查 —— 那才是这个坑会咬人的场景。
    const offenders = [];
    for (const file of testFiles) {
      const source = readFileSync(file, "utf8");
      if (!dependsOnDataDir(source)) continue;
      if (!/skipIf\s*\(/u.test(source)) continue;
      // describe 体顶层的 readFileSync：跳过函数体内的同名调用
      for (const { line, index } of describeBodyDataReads(source)) {
        offenders.push(
          `${path.relative(repoRoot, file).split(path.sep).join("/")}:${index + 1}  ${line.trim().slice(0, 70)}`
        );
      }
    }
    expect(
      offenders,
      "describe.skipIf 只阻止 it 执行，describe 回调体仍会求值 —— 顶层读 data/ 会 ENOENT：\n  " +
        offenders.join("\n  ")
    ).toEqual([]);
  });
});
