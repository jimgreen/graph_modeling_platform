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
 * 去掉注释，但**保留字符串字面量内容**。
 *
 * 为什么需要：静态扫描 `data/` 时，注释里写的 "实测 data/ 下 89 个 json" 会被
 * 当成真依赖 —— 逼着人把注释改丑来骗过守卫（实测踩过：一份新的守卫测试因为
 * 注释里提到 data/ 就被要求加 skipIf，而它根本不读盘）。
 *
 * 为什么不能用正则直接删：字符串里的 `//`（`"http://x"`）会被误当行注释起点，
 * 一路删到行尾就可能把**同一行后面的真 data/ 引用一起删掉** ——
 * 那是把守卫变弱，比假阳性更糟。所以这里做字符串感知的逐字符扫描。
 *
 * 已知简化：模板字符串整体当字符串处理，不解析 `${…}` 插值。
 * 这在**保守方向**上是对的 —— 真读盘必然写成字面量或绑定标识符
 * （`const S = "data/…"` + `readFileSync(S)`），两者都在插值之外。
 */
function stripComments(source) {
  const QUOTES = new Set(["'", '"', "`"]);
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (QUOTES.has(ch)) {
      // 复制整个字符串字面量（含转义），遇到未转义的同类引号或换行即结束
      const quote = ch;
      out += ch;
      i += 1;
      while (i < source.length) {
        out += source[i];
        if (source[i] === "\\") {
          out += source[i + 1] ?? "";
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          i += 1;
          break;
        }
        if (source[i] === "\n") break; // 未闭合：保守处理，停在行尾
        i += 1;
      }
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue; // 保留换行，行号信息不丢
    }
    if (ch === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 2;
      out += " "; // 用一个空格占位，避免 `a/**/b` 被粘成 `ab`
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * 判定一个测试是否真的从磁盘读 data/ 目录。
 *
 * 不能简单找 `data/` 字面量 —— 三类假阳性实测都踩过：
 *   1. 内联 data URI（`href="data:image/png;base64,…"`）
 *   2. 硬编码的**假 URL 字符串**，如 svgExport.test.tsx 里的
 *      `'data/images/bg?id=1&name=a"b'` —— 那是测 SVG 属性转义的构造数据，
 *      从不落到磁盘。
 *   3. **注释里提到 data/**（本轮新踩：`// 实测 data/ 下 89 个 json`）。
 *
 * 可靠判据：先剥掉注释（字符串内容保留），再要求
 * ① 文件里有真正的文件读取调用，且 ② 代码里出现 `data/` 路径。
 */
function dependsOnDataDir(source) {
  // 剥注释，但字符串字面量内容留着 —— 判定要看到 `readFileSync("data/…")` 的实参。
  const code = stripComments(source);
  // 只在**有 fs 调用**的文件里才谈样本依赖：svgExport.test.tsx 里的
  // 'data/images/bg?id=1&name=a"b' 是测 SVG 属性转义的构造数据、从不落盘，
  // 该文件零 fs 调用，据此可与真读盘区分。
  const hasFsCall = /\b(?:readFileSync|readdirSync|createReadStream|access|statSync|existsSync|opendirSync)\s*\(/u.test(
    code
  );
  if (!hasFsCall) return false;
  // 提到 data/ 路径即认为依赖（覆盖字面量、path.join 拼接、以及
  // `const SAMPLE = "data/…"` 后 `readFileSync(SAMPLE)` 的间接引用形式）
  return /[`'"]data\//u.test(code) || /\b(?:join|resolve)\s*\(\s*[`'"]data(?:\/|['"])/u.test(code);
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

  // ↓↓ 这两条是 dependsOnDataDir 的单元测试。
  // 它此前**没有任何单元测试** —— 三类假阳性（data URI / 假 URL 字符串 / 注释）
  // 全靠全仓扫描隐式覆盖，任何一次启发式调整都可能在没人察觉的情况下把它改坏。
  // 合成输入能精确证明判据本身没退化。
  test("stripComments：注释被删，字符串内容（含 //）被保留", () => {
    expect(stripComments('const a = 1; // data/x\nconst b = 2;')).not.toContain("data/x");
    expect(stripComments('const u = "http://data/x"; // 备注')).toContain('"http://data/x"');
    // 块注释
    expect(stripComments('/* data/x */ readFileSync("data/y")')).not.toContain("data/x");
    expect(stripComments('/* data/x */ readFileSync("data/y")')).toContain("data/y");
    // 块注释占位：不能把两段代码粘成一段（`a/**/b` 必须留分隔符）
    expect(stripComments("readFileSync/*c*/(p)")).toBe("readFileSync (p)");
    expect(stripComments("readFileSync/*c*/(p)")).not.toBe("readFileSync(p)");
    // 未闭合的字符串保守处理（停在行尾）
    expect(stripComments('const s = "abc\ndata/x')).toContain("data/x");
    // 转义引号
    expect(stripComments('const s = "a\\"//data/x";')).toContain("//data/x");
  });

  test("dependsOnDataDir：注释里的 data/ **不算**依赖（本次修复点）", () => {
    // 真实回归样本：本轮新加的 src/savedNameKeyAndRouteBounds.test.ts
    // 有 fs 调用（读源码做静态守卫）但零 data/ 读取，只因注释里写了
    // 「实测 data/ 下 89 个 json」就被要求加 skipIf。
    const onlyComment = [
      'import { readFileSync } from "node:fs";',
      '// 真实数据实测（data/schemes 下 89 个 json）',
      'const src = readFileSync("model-routing.ts", "utf8");',
      '// `data/` 目录被 gitignore'
    ].join("\n");
    expect(dependsOnDataDir(onlyComment)).toBe(false);
  });

  test("dependsOnDataDir：三类真依赖都必须被识别", () => {
    // ① 直接字面量
    expect(dependsOnDataDir('readFileSync("data/schemes/a.json", "utf8")')).toBe(true);
    // ② 绑定标识符的间接形式
    expect(dependsOnDataDir('const S = "data/schemes/a.json";\nreadFileSync(S, "utf8");')).toBe(true);
    // ③ path.join 拼接
    expect(dependsOnDataDir('readFileSync(path.join("data", "schemes/a.json"), "utf8")')).toBe(true);
    // ④ 模板字符串字面量
    expect(dependsOnDataDir('readFileSync(`data/schemes/a.json`, "utf8")')).toBe(true);
    // ⑤ 其它 fs 入口
    expect(dependsOnDataDir('readdirSync("data/schemes")')).toBe(true);
    expect(dependsOnDataDir('existsSync("data/schemes/a.json")')).toBe(true);
    // 注释里说了但代码里没有 → 仍然不算
    expect(dependsOnDataDir('// readFileSync("data/a")\nconst x = 1;')).toBe(false);
  });

  test("dependsOnDataDir：两类假阳性不得被误判", () => {
    // 内联 data URI
    expect(dependsOnDataDir('const href = "data:image/png;base64,AAAA";')).toBe(false);
    // 假 URL 字符串（零 fs 调用）
    expect(dependsOnDataDir('const url = \'data/images/bg?id=1&name=a"b\';')).toBe(false);
    // 有 fs 调用但只读非 data 路径
    expect(dependsOnDataDir('readFileSync("public/e-templates/a.e", "utf8")')).toBe(false);
  });

  test("★ 剥注释不得把真依赖藏起来（防止修过头）", () => {
    // 危险形态：同一行先出现字符串里的 `//`，再出现真 data/ 引用。
    // 朴素的「从 // 删到行尾」会把后半句一起删掉 → 守卫被削弱。
    const tricky = 'const u = "http://example.com"; readFileSync("data/schemes/a.json", "utf8");';
    expect(dependsOnDataDir(tricky), "字符串里的 // 之后的真引用必须仍被看到").toBe(true);
    // 注释在前、真引用在后（分两行）
    expect(dependsOnDataDir('// 说明 http://…\nreadFileSync("data/a.json")')).toBe(true);
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
