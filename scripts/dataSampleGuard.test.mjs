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
  // 只在**有 fs 调用**的文件里才谈样本依赖：svgExport.test.tsx 里的
  // 'data/images/bg?id=1&name=a"b' 是测 SVG 属性转义的构造数据、从不落盘，
  // 该文件零 fs 调用，据此可与真读盘区分。
  const hasFsCall = /\b(?:readFileSync|readdirSync|createReadStream|access|statSync|existsSync|opendirSync)\s*\(/u.test(
    source
  );
  if (!hasFsCall) return false;
  // 提到 data/ 路径即认为依赖（覆盖字面量、path.join 拼接、以及
  // `const SAMPLE = "data/…"` 后 `readFileSync(SAMPLE)` 的间接引用形式）
  return /[`'"]data\//u.test(source) || /\b(?:join|resolve)\s*\(\s*[`'"]data(?:\/|['"])/u.test(source);
}

/**
 * 找出「describe 回调体顶层」里做磁盘读取的行。
 *
 * 难点一：**必须限定在 describe 上下文内**。缩进 2 空格 + 深度 1 这两个条件
 * 单用都会误判：
 *   - `function buildEditorRecords() {`（模块级 helper）的函数体也是 2 空格、深度 1
 *   - 反过来，只看缩进会漏掉 describe 体内嵌在更小结构里的情况
 * 所以先定位 `describe` / `describe.skipIf(` 开头的行，从**那一行之后**才开始算深度。
 * 模块级 helper 定义在 describe 之前，自然被排除。
 *
 * 难点二：**参数无关**。只匹配 `readFileSync("…data/…")` 字面量会漏掉
 * `readFileSync(TITAN_PROJECT_SAMPLE)` 这种变量形式 —— 实测变异正是走的变量形式，
 * 守卫当时没抓到。故凡 describe 体顶层出现读取动作即标记。
 * `existsSync` 排除：那正是样本守卫本身，放 describe 体顶层是正确的。
 */
const DESCRIBE_TOP_LEVEL_READ =
  /\b(?:readFileSync|readdirSync|createReadStream|access|statSync|opendirSync)\s*\(/u;
const DESCRIBE_OPEN = /^\s*describe(?:\.\w+)*\s*\(/u;

/**
 * 收集「绑定到 data/ 路径字面量」的标识符。
 *
 * 必须解析这一层间接引用，否则守不住这种写法（实测变异正是它）：
 *   const TITAN_PROJECT_SAMPLE = "data/schemes/files/…json";
 *   describe.skipIf(…, () => {
 *     fs.readFileSync(TITAN_PROJECT_SAMPLE, "utf-8");   // ← 行内没有 data/ 字面量
 *   });
 */
function dataPathIdentifiers(source) {
  const ids = new Set();
  for (const m of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*[`'"][^`'"\n]*\bdata\/[^`'"\n]*[`'"]/gu)) {
    ids.add(m[1]);
  }
  return ids;
}

function describeBodyDataReads(source) {
  const lines = source.split(/\r?\n/u);
  // 只在第一个 describe 之后才判定：此前的模块级 helper 不算
  const firstDescribe = lines.findIndex((line) => DESCRIBE_OPEN.test(line));
  if (firstDescribe < 0) return [];

  const dataIds = dataPathIdentifiers(source);
  const hits = [];
  let depth = 0;
  lines.forEach((line, index) => {
    if (index === firstDescribe) {
      // describe( 本身开启一层，之后其体内的顶层语句处于深度 1
      depth = 1;
      return;
    }
    if (index < firstDescribe) return;
    const isDescribeTopLevel = /^ {2}\S/u.test(line) && depth === 1;
    if (!isDescribeTopLevel || !DESCRIBE_TOP_LEVEL_READ.test(line)) return;
    // 是 data/ 专属读取吗？行内字面量，或引用了绑定 data/ 路径的标识符
    const referencesDataId = [...dataIds].some((id) => new RegExp(`\\b${id}\\b`, "u").test(line));
    if (!/data\//u.test(line) && !referencesDataId) return;
    hits.push({ line, index });
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
      // describe 体顶层的读取：只有当该行涉及 **data/ 专属路径** 时才算违规。
      // 读 public/e-templates/*.e 这类受版本跟踪、始终存在的文件放在 describe 体顶层
      // 是合法的（basevoltage-dedup / ems-rtdb-export-rules 都这么写）。
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
