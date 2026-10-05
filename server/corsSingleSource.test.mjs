// CORS 单源守卫。
//
// server/CLAUDE.md 写着「跨源头**唯一一份**（`access-control-*`）：`server.mjs` 与
// `v1Response.mjs` 均从此导入 —— **勿在别处再定义一份**（T13 单源化）」。
//
// 实际曾有 10 处硬编码散在 6 个文件（apiV1Runtime 4、apiV1Schemes 2、server.mjs 2、
// cimExport 1、eFileExport 1），其中 server.mjs 本身就 import 了 cors.mjs 却仍在
// 自己的响应头里写死 allow-origin —— 正是「同一概念两处硬编码」的典型分叉。
// 现已全部改为从 cors.mjs 取（accessControlHeaders / accessControlOriginOnly）。
//
// 本守卫确保它不再分叉回去。
//
// ——— 扫描器契约 ———
// ① 范围：server/ + src/ + shared/ 下的 .mjs/.ts/.tsx 生产文件（不含 *.test.* / *.spec.*）。
// ② 剥离注释与字符串状态后再扫（stripJsComments）：注释里提到头名**不算**违规。
//    教训 18b49a46 —— 早先做裸字面量扫描，于是注释里只要出现那个字面量就转红，
//    改配置的人踩过两次，其中一次是为了*说明*自己没写它。
// ③ 只报「键位置」的字面量：对象字面量键 `"x": v`、计算属性/中括号赋值 `o["x"] = v`、
//    同一行多个键 `a = 1; b = "x": v`。**位置无关**，不再要求引号在行首。
// ④ 已知缺口（有意不覆盖，写在这里免得下一个人以为守卫是完备的）：
//    `res.setHeader("access-control-allow-origin", "*")` 这种「字符串在实参位」的
//    写法不在本守卫范围 —— 本仓的 CORS 头一律以对象展开进 writeHead，故未覆盖它。
//    另：头名出现在**读取**位（`headers["access-control-allow-origin"]`）不是违规。
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accessControlHeaders, accessControlOriginOnly } from "./cors.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoots = ["server", "src", "shared"];
const sourceExtensions = new Set([".mjs", ".ts", ".tsx"]);
// 跨源头自己就是定义处，必须豁免。这是「不变量级」豁免（它**就是**那份常量），
// 与下面那种「为放行某一行而跳过整个文件」的漏洞不是一回事 —— 检测逻辑自测
// 证明：除 cors.mjs 之外的任何文件，检测函数都能报出违规。
const corsHomeRelative = "server/cors.mjs";

// ——————————————————————— 扫描器（纯函数，可单测） ———————————————————————

// 正则字面量能否在此处开始：看前一个有效字符 / 前一个单词。
// 需要它是因为本仓有 `/[\\/:*?"<>|]+/gu` 这类字符类里同时含引号与斜杠的正则 ——
// 不认得它就会把字符类里的 `"` 当成字符串开头，把后面整行的注释状态算错。
const REGEX_LEADING_PUNCTUATION = new Set("(,=:[!&|?{};+-*%~^<>".split(""));
const REGEX_LEADING_WORDS = new Set([
  "return", "typeof", "case", "in", "of", "new", "delete", "void",
  "yield", "await", "throw", "do", "else", "instanceof"
]);

function isWordChar(ch) {
  return typeof ch === "string" && /[A-Za-z0-9_$]/.test(ch);
}

// 引号串（含模板字符串）原样保留内容，只把注释抹成空格。
// 模板字符串里的 ${...} 嵌套不递归处理：内层再嵌模板串会让状态判断失准，
// 本仓无此写法；若真出现，失准的后果是「那几行的注释没被抹掉」→ 顶多多报一行。
function readQuoted(source, start, quote) {
  let text = source[start];
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    text += ch;
    if (ch === "\\") {
      text += source[i + 1] ?? "";
      i += 2;
      continue;
    }
    i += 1;
    if (ch === quote) break;
    // 单/双引号串里出现裸换行 = 没闭合，止于此行，别把后面整文件当字符串。
    if (ch === "\n" && quote !== "`") break;
  }
  return { text, next: i };
}

// 正则字面量：处理转义与字符类，直到类外的 `/`。
function readRegex(source, start) {
  let text = source[start];
  let i = start + 1;
  let inCharacterClass = false;
  while (i < source.length) {
    const ch = source[i];
    text += ch;
    if (ch === "\\") {
      text += source[i + 1] ?? "";
      i += 2;
      continue;
    }
    i += 1;
    if (ch === "\n") break; // 没闭合，当普通字符处理，止于此行
    if (ch === "[") inCharacterClass = true;
    else if (ch === "]") inCharacterClass = false;
    else if (ch === "/" && !inCharacterClass) break;
  }
  return { text, next: i };
}

// 把源码里的注释替换成等长空格，换行保留 —— 于是行号不变，违规报告仍能指到原行。
export function stripJsComments(source) {
  let out = "";
  let i = 0;
  let prevChar = "";
  let prevWord = "";
  const regexAllowedHere = () =>
    prevChar === "" ||
    REGEX_LEADING_PUNCTUATION.has(prevChar) ||
    REGEX_LEADING_WORDS.has(prevWord);
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    // 注释先于字符串判定：注释里的撇号/引号不能影响词法状态
    // （这正是 repo 里常见的中文注释里带 `'` 的情形）。
    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") {
        out += " ";
        i += 1;
      }
      continue;
    }
    if (ch === "/" && next === "*") {
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        out += source[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      if (i < source.length) {
        out += "  ";
        i += 2;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const read = readQuoted(source, i, ch);
      out += read.text;
      i = read.next;
      prevChar = ch;
      prevWord = "";
      continue;
    }
    if (ch === "/" && regexAllowedHere()) {
      const read = readRegex(source, i);
      out += read.text;
      i = read.next;
      prevChar = "/";
      prevWord = "";
      continue;
    }
    out += ch;
    i += 1;
    if (/\s/.test(ch)) continue;
    if (isWordChar(ch)) {
      prevWord += ch;
      prevChar = ch;
    } else {
      prevWord = "";
      prevChar = ch;
    }
  }
  return out;
}

// 键位置形态（与引号在不在行首无关）：
//   "access-control-allow-origin": v     对象字面量键
//   o["access-control-allow-origin"] = v 计算属性 / 中括号赋值
//   a = 1; b = "access-control-...": v  同一行多个键
// 左侧 (?<![A-Za-z0-9_-]) 排除 `my-access-control-x` 这类更长名字的子串命中。
const CORS_KEY_POSITION = /(?<![A-Za-z0-9_-])(["'`])(access-control-[\w-]*)\1\s*\]?\s*[:=]/g;

// 纯函数：源码文本 → [{ line, header, text }]，text 是该行 trim 后的原文。
export function findCorsHeaderKeys(source) {
  const code = stripJsComments(source);
  const found = [];
  code.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(CORS_KEY_POSITION)) {
      found.push({ line: index + 1, header: match[2], text: line.trim() });
    }
  });
  return found;
}

// ——————————————————————— 已知豁免（逐行钉住） ———————————————————————

// 豁免的粒度是**整行原文**，不是文件：匹配「文件 + 该行 trim 后完全一致」。
// 若写成 `if (file === X) continue`，就把整个文件放过、连新增的违规也一起放过 ——
// 那正是 AGENTS.md 里记的漏洞形态，故由下面的自测钉住行级粒度。
// 按内容（而非行号）匹配，是为了无关的增删行不会误炸这个守卫；但它仍可被「原样复制
// 同一行到别处」骗过 —— 已知且接受，替代方案（钉行号）会因无关编辑频繁误报。
const KNOWN_HARDCODED_SITES = [
  {
    file: "server/eFileExport.mjs",
    exactLine:
      '...(warningsHeader ? { "access-control-expose-headers": "x-e-file-warnings", "x-e-file-warnings": warningsHeader } : {})',
    reason:
      "附件响应的 expose-headers 按端点条件出现，属遗留内联；正解是给 cors.mjs 加 helper 后改此处（TODO）。同文件另一行若再写同族头名不会被本条放过。"
  }
];

function exemptedSiteFor(relativeFile, lineText) {
  return KNOWN_HARDCODED_SITES.find(
    (site) => site.file === relativeFile && site.exactLine === lineText.trim()
  );
}

// 纯函数：某文件源码 → 该文件里未被豁免的违规 [{ file, line, header, text }]。
export function findCorsHeaderHardcodes(relativeFile, source) {
  const found = [];
  for (const hit of findCorsHeaderKeys(source)) {
    if (exemptedSiteFor(relativeFile, hit.text)) continue;
    found.push({ file: relativeFile, line: hit.line, header: hit.header, text: hit.text });
  }
  return found;
}

// ——————————————————————— 仓库遍历 ———————————————————————

function isExcludedDirectory(name) {
  return (
    name === "node_modules" ||
    name === "dist" ||
    name === "public" ||
    name.startsWith("coverage") ||
    name.startsWith(".coverage")
  );
}

function sourceFilesUnder(directory) {
  const files = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!isExcludedDirectory(entry.name)) pending.push(filePath);
        continue;
      }
      if (
        sourceExtensions.has(path.extname(entry.name)) &&
        !/\.(?:test|spec)\.[^.]+$/i.test(entry.name)
      ) {
        files.push(filePath);
      }
    }
  }
  // 排序只为让失败信息稳定可 diff。
  return files.sort();
}

function scanRepoHardcodes() {
  const found = [];
  for (const root of sourceRoots) {
    for (const filePath of sourceFilesUnder(path.join(repoRoot, root))) {
      const relativeFile = path.relative(repoRoot, filePath).split(path.sep).join("/");
      if (relativeFile === corsHomeRelative) continue;
      found.push(...findCorsHeaderHardcodes(relativeFile, readFileSync(filePath, "utf8")));
    }
  }
  return found;
}

describe("CORS 响应头单源", () => {
  test("除 cors.mjs 外，server/src/shared 生产模块都不得硬编码 access-control-* 头", () => {
    const offenders = scanRepoHardcodes();
    expect(
      offenders,
      `这些行硬编码了 access-control-* 头，请改为从 ./cors.mjs 导入\n` +
        offenders.map((hit) => `${hit.file}:${hit.line}  ${hit.text}`).join("\n")
    ).toEqual([]);
  });

  test("accessControlHeaders 的三个键值完整，origin-only 只含 origin", () => {
    expect(accessControlHeaders).toEqual({
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,x-space"
    });
    expect(Object.keys(accessControlOriginOnly)).toEqual(["access-control-allow-origin"]);
  });

  test("accessControlOriginOnly 与全量头的 origin 取值一致（不会分叉成两个值）", () => {
    expect(accessControlOriginOnly["access-control-allow-origin"]).toBe(
      accessControlHeaders["access-control-allow-origin"]
    );
  });

  test("origin-only 变体确实只含 origin 一项（下载类端点不需要 methods/headers）", () => {
    expect(Object.keys(accessControlOriginOnly)).toEqual(["access-control-allow-origin"]);
  });
});

// ——————————————————————— 检测逻辑自测 ———————————————————————
// 下面这些用例断言的是**扫描器自己**，不是被扫的仓库。没有它们，一次正则写错
// 就能让守卫永远绿 —— 而一个永远绿的守卫比没有守卫更坏。

describe("CORS 扫描器的检测逻辑自测", () => {
  test("三种违规写法都要报出违规：行首对象键、计算属性赋值、同一行多个键", () => {
    const objectKey = findCorsHeaderKeys(
      'export const h = {\n  "access-control-allow-origin": "*"\n};'
    );
    expect(objectKey).toHaveLength(1);
    expect(objectKey[0]).toMatchObject({ line: 2, header: "access-control-allow-origin" });

    // 旧正则要求引号在行首，这一行引号前面是 `[`，必须照样报出。
    const computed = findCorsHeaderKeys(
      'headers["access-control-allow-origin"] = "*";\n'
    );
    expect(computed).toHaveLength(1);
    expect(computed[0]).toMatchObject({ line: 1, header: "access-control-allow-origin" });

    // 旧正则同样漏掉：同一行第二个键。
    const sameLine = findCorsHeaderKeys(
      'const extra = { "x-space": 1; "access-control-allow-headers": "content-type" };'
    );
    expect(sameLine).toHaveLength(1);
    expect(sameLine[0]).toMatchObject({ line: 1, header: "access-control-allow-headers" });

    // 三个样本必须一次性都红 —— 少报一个就说明形态覆盖退化了。
    expect(objectKey.length + computed.length + sameLine.length).toBe(3);
  });

  test("干净样本返回空：没有头名、有头名但在读取位、头名只出现在注释里", () => {
    expect(
      findCorsHeaderKeys(
        'import { accessControlOriginOnly } from "./cors.mjs";\n' +
          "response.writeHead(200, { ...accessControlOriginOnly });\n" +
          'const seen = headers["access-control-allow-origin"];\n' +
          'const also = map["access-control-allow-methods"] ?? "*";\n' +
          'const prefixed = { "my-access-control-allow-origin": 1 };\n'
      )
    ).toEqual([]);

    // 18b49a46 的教训的可执行版本：注释里**必须**能贴出带引号的真写法而不转红 ——
    // 写注释说明「我没这么写」的人贴的就是带引号那一份。
    // 注意样本里必须是**带引号的键写法**：裸头名（access-control-allow-origin: x）
    // 本来就不在检测契约内，拿它当样本会让这条用例对「注释剥离失效」完全免疫
    // （变异验证实测：剥离整个短路掉，这条仍然全绿）。
    const onlyComments = [
      '// 曾经的写法：headers["access-control-allow-origin"] = "*"，已全部改从 cors.mjs 取',
      '/* { "access-control-allow-origin": "*" } —— 这段注释不该让守卫转红 */',
      "const ok = 1; // 旧默认值 { \"access-control-allow-methods\": \"GET,POST\" }"
    ].join("\n");
    expect(findCorsHeaderKeys(onlyComments)).toEqual([]);
  });

  test("注释剥离器：字符串里的双斜杠、注释里的撇号、正则字面量都不该被误判成注释", () => {
    const tricky = [
      'const base = "http://127.0.0.1:5174/api"; // 行尾注释：{ "access-control-allow-origin": "*" }',
      "const note = 'it\\'s ok'; // 注释里的撇号 { \"access-control-allow-origin\": \"*\" }",
      'const safe = raw.replace(/[\\\\/:*?"<>|]+/gu, "_"); // 正则字符类里含引号与斜杠',
      'const url = `http://${host}/v1`; // 模板字符串里的双斜杠'
    ].join("\n");
    const stripped = stripJsComments(tricky);

    // 字符串/模板/正则的内容原样保留（否则会把真代码吃掉 → 漏报）。
    expect(stripped).toContain('"http://127.0.0.1:5174/api"');
    expect(stripped).toContain('`http://${host}/v1`');
    expect(stripped).toContain('/[\\\\/:*?"<>|]+/gu');
    // 四行注释都被抹掉了。
    expect(stripped).not.toContain("行尾注释");
    expect(stripped).not.toContain("注释里的撇号");
    expect(stripped).not.toContain("正则字符类里含引号");
    expect(stripped).not.toContain("模板字符串里的双斜杠");
    // 换行数不变 —— 违规报告要靠行号指到原行。
    expect(stripped.split("\n")).toHaveLength(tricky.split("\n").length);
    expect(findCorsHeaderKeys(tricky)).toEqual([]);
  });

  test("已知豁免是逐行的：同文件另一行的同族写法照样报出违规", () => {
    const site = KNOWN_HARDCODED_SITES[0];
    const synthetic = [
      site.exactLine,
      'const other = { "access-control-expose-headers": "x-other" };'
    ].join("\n");
    const found = findCorsHeaderHardcodes(site.file, synthetic);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ file: site.file, line: 2 });
  });

  test("已知豁免清单不过期：被豁免的那一行修好后必须删掉豁免", () => {
    for (const site of KNOWN_HARDCODED_SITES) {
      const source = readFileSync(path.join(repoRoot, site.file), "utf8");
      const matchedLines = source
        .split("\n")
        .map((line, index) => ({ line: index + 1, text: line.trim() }))
        .filter((row) => row.text === site.exactLine);
      expect(
        matchedLines.length,
        `${site.file} 里已找不到被豁免的那一行（${site.reason}），请删除 KNOWN_HARDCODED_SITES 里对应的条目。`
      ).toBe(1);
    }
  });
});