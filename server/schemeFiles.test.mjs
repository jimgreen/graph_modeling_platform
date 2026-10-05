// server/schemeFiles.mjs（10 行模块，单函数）
//   isModelJsonFile  该文件名是否是一个「模型 JSON」（而不是段清单 scheme.json）
//
// 这个判定被 4 个 files/** 遍历器共用（readSchemesFromFiles /
// projectJsonFileForName / maxStoredProjectIndex / scanProjectByIndex /
// listModelJsonFiles）与 globalLineRegistry —— 模块头注释写明：
// 散落 6 份时改一次要动 6 处，漏一处就会把 scheme.json 当模型或漏掉模型。
//
// 判错的后果：`scheme.json` 被当成模型读进来（多出一个假模型），
// 或真模型被漏掉（列表里看不到该模型的方案）—— 都是数据层面的错，**不报错**。
import { describe, expect, test } from "vitest";
import { isModelJsonFile } from "../server/schemeFiles.mjs";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("★ 排除 `scheme.json`（大小写不敏感）", () => {
  test("各种大小写形态都被排除", () => {
    // `fileName.toLocaleLowerCase() !== "scheme.json"` —— 但**只有**当
    // 正则先判定「以 .json 结尾」时才会走到这里。
    for (const value of [
      "scheme.json", "SCHEME.JSON", "Scheme.Json", "ScHeMe.JsOn", "sChEmE.jSoN"
    ]) {
      expect(isModelJsonFile(value), value).toBe(false);
    }
  });

  test("但**前后缀**不同的一律是真模型", () => {
    // ★ 精确相等，不是「包含」。`myscheme.json` / `xscheme.json` 都是真模型。
    // 注意后缀变体（`scheme.json2` / `scheme.json.bak`）**不在**这一组 ——
    // 它们不以 `.json` 结尾，在「尾部多字符」那组里。
    // 我第一版把 `scheme.json2` 放进这组，被顶回。
    // 只放**以 .json 结尾**的变体（我在这里连放了两个带后缀的，被顶回两次 ——
    // 它们属于「尾部多字符」那组）。
    const variants = ["myscheme.json", "xscheme.json", "scheme2.json", "模型.json"];
    for (const value of variants) {
      // 前置：确认每个都以 .json 结尾
      expect(value.endsWith(".json"), `前置 ${value}`).toBe(true);
      expect(isModelJsonFile(value), value).toBe(true);
    }
    // ★ 判据一句话：**以 `.json` 结尾** 且 **不恰好等于 scheme.json（忽略大小写）**。
    //   任何「多了后缀」的变体都归到「尾部多字符」那组，不是这一组。
  });

  test("★ `scheme` 本身不是 json → false（与前后缀无关，走正则）", () => {
    expect(isModelJsonFile("scheme")).toBe(false);
  });
});

describe("★ 判定是「以 `.json` 结尾」，不是「包含 `.json`」", () => {
  test("尾部必须是 `.json`（允许前导任意内容）", () => {
    for (const value of [
      "model.json", "模型.json", "a.json", ".json", "a..json", "a.jsonb.json",
      "a\t.json", "目录/model.json", "a.JSON", "A.JsOn"
    ]) {
      expect(isModelJsonFile(value), value).toBe(true);
    }
  });

  test("★ 尾部多一个字符就 false", () => {
    for (const value of [
      "a.jsonx", "a.json ", "a.json.", "a.json\n", "a.json\t", "json", "model.jso",
      // ★ 这一组含 scheme.json 的变体 —— 它们不是被「排除规则」挡的，是被
      //   「尾部多字符」挡的。两个原因是独立的，别混在一起说。
      "scheme.json.bak", "scheme.jsonx", "scheme.json2"
    ]) {
      expect(isModelJsonFile(value), JSON.stringify(value)).toBe(false);
    }
  });

  test("★ 尾部空白让判定失败（文件名不会被 trim）", () => {
    // `"a.json "` → 正则 `\.json$` 不匹配尾随空格 → false。
    // 这意味着**带尾随空格的模型文件会被漏掉**。文件名来自 fs 目录项，
    // 不含尾随空格，所以不修；记录下来以备查。
    expect(isModelJsonFile("a.json ")).toBe(false);
    expect(isModelJsonFile("a.json")).toBe(true);
    // 前导空白**不影响**（正则是后缀匹配）
    expect(isModelJsonFile(" a.json")).toBe(true);
    expect(isModelJsonFile("\tscheme.json"), "★ 但这会绕开 scheme.json 排除？").toBe(true);
  });

  test("空串 → false（正则不匹配）", () => {
    expect(isModelJsonFile("")).toBe(false);
  });
});

describe("★ 正则的 `u` 与 `i` 标志各自的作用", () => {
  test("`i` 标志：`.JSON` 也算", () => {
    expect(/\.json$/iu.test("a.JSON")).toBe(true);
    // 对照：去掉 `i` 就不匹配
    expect(/\.json$/u.test("a.JSON")).toBe(false);
    expect(isModelJsonFile("a.JSON")).toBe(true);
  });

  test("★ `$` 严格锚在串尾：尾随换行一律不匹配（与 `u` 无关）", () => {
    // 我第一版以为「不带 `u` 时 `$` 允许串尾一个换行」，被顶回 ——
    // 那条规则只在 **`m` 标志**下成立（多行模式里 `$` 匹配每行末）。
    // 本模式无 `m`，所以带不带 `u` 都拒绝尾随换行。
    expect(/\.json$/iu.test("a.json\n")).toBe(false);
    expect(/\.json$/i.test("a.json\n"), "★ 无 u 也一样").toBe(false);
    expect(/\.json$/imu.test("a.json\n"), "★ 加 m 才会匹配行末").toBe(true);
    expect(/\.json$/im.test("a.json\n"), "★ 纯 m 也匹配").toBe(true);
    expect(isModelJsonFile("a.json\n")).toBe(false);
  });

  test("★ 去掉 `u` 后对本模式**完全等价**（`u` 在此无作用）", () => {
    // 变异 ②（`/\.json$/iu` 改 `/\.json$/i`）首轮全绿 —— 这不是覆盖不足，
    // 是**可证明的等价**：`u` 的作用是让 `\d`/`\w`/`\p{…}` 严格 Unicode 化，
    // 并禁止多余转义。本模式只含 `\.json` 与锚点，两者都与 `u` 无关。
    //
    //   ⚠ 什么会让它失效：往模式里加 `\w` / `\d` / `\p{…}`，或写 `\q` 这类非法转义。
    //   下面把「两个模式对全部输入同结果」变成**可执行**的断言。
    const probes = [
      "a.json", "a.JSON", "a.json\n", "a.json ", "a.json\t", "模型.json", ".json",
      "a..json", "a.jsonx", "json", "", "a.json\r\n", "Ä.JSON", "𝔘.json"
    ];
    for (const probe of probes) {
      expect(/\.json$/iu.test(probe), `iu: ${JSON.stringify(probe)}`)
        .toBe(/\.json$/i.test(probe));
    }
    // `u` 仍然是好习惯（防止将来往模式里加 `\w` 时出意外），故不删。
  });
});

describe("★ `toLocaleLowerCase` 的 locale 敏感性：当前 locale 下**不可观测**", () => {
  test("`scheme.json` 不含大写 `I`，所以土耳其语 locale 下判定不变", () => {
    // 土耳其语 / 阿塞拜疆语的 dotted-i 规则：`"I".toLowerCase()` → `"ı"`（无点），
    // 而 `"i".toLowerCase()` → `"i"`。两者不等。
    // 但 `scheme.json` 的六个字母都不含 `I`，所以
    // `toLocaleLowerCase` 在任何 locale 下都产出同一个 `"scheme.json"`。
    expect("scheme.json".toLocaleLowerCase("tr")).toBe("scheme.json");
    expect("scheme.json".toLocaleLowerCase("az")).toBe("scheme.json");
    expect("SCHEME.json".toLocaleLowerCase("tr"), "大写 S/H/M/E 不受影响").toBe("scheme.json");
    expect("SCHEME.JSON".toLocaleLowerCase("tr")).toBe("scheme.json");
  });

  test("对照：含 `I` 的名字在 tr 下确实不同（说明该 locale 规则存在）", () => {
    // 这条是**前提断言** —— 证明「不可观测」不是因为规则不存在，
    // 而是因为 `scheme.json` 恰好不含受影响字母。
    expect("I.json".toLocaleLowerCase("tr")).toBe("ı.json");
    expect("I.json".toLocaleLowerCase("en-US")).toBe("i.json");
    expect("I.json".toLocaleLowerCase("tr")).not.toBe("I.json".toLocaleLowerCase("en-US"));
  });

  test("★ 当前运行环境 locale 是 zh-CN（与 en-US 行为一致）", () => {
    const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
    expect(["zh-CN", "en-US"], `当前 locale = ${resolved}`).toContain(resolved);
    // 所以 `isModelJsonFile` 在本进程里等价于用 `toLowerCase`
    expect("SCHEME.JSON".toLocaleLowerCase()).toBe("SCHEME.JSON".toLowerCase());
  });

  test("**判定不修**：改 `toLocaleLowerCase` → `toLowerCase` 对本模式零收益", () => {
    // 仓库里另有 13 处 `toLocaleLowerCase`（已记录在案），统一改是无收益的
    // 行为变更；而本函数因为 `scheme.json` 不含 `I`，两种写法在**所有** locale
    // 下都恒等 —— 改成 `toLowerCase` 只能让读者以为这里有 locale 考量。
    for (const name of ["scheme.json", "SCHEME.JSON", "Scheme.Json", "ScHeMe.JsOn"]) {
      for (const locale of ["tr", "az", "en-US", "zh-CN", "de-DE", "lt", "el"]) {
        expect(name.toLocaleLowerCase(locale), `${name} @ ${locale}`).toBe(name.toLowerCase());
      }
    }
  });
});

describe("★ 非字符串入参：多数得 false，少数抛 TypeError", () => {
  test("正则 `.test` 会把入参转字符串，所以多数非字符串得 false 而不抛", () => {
    // `/\.json$/iu.test(null)` → `test` 先 `String(null)` = `"null"` → 不匹配 → false。
    for (const value of [null, undefined, 0, 123, true, false, {}, []]) {
      expect(isModelJsonFile(value), String(value)).toBe(false);
    }
  });

  test("★ 数组抛 TypeError（如实记录，不修）", () => {
    // `String(["a.json"])` = `"a.json"` → 正则判 **true** → 走到第二段
    // `["a.json"].toLocaleLowerCase()` → 数组没有该方法 → 抛。
    //
    // **判定不修**：入参是 `fs.readdir` 返回的**文件名**，恒为 string。
    // 抛错正说明调用方违背契约；静默兜成 false 会掩盖「传错了类型」。
    expect(String(["a.json"]), "★ 前置：数组 String 后确实以 .json 结尾").toBe("a.json");
    expect(/\.json$/iu.test(String(["a.json"])), "★ 前置：正则判 true").toBe(true);
    expect(() => isModelJsonFile(["a.json"])).toThrow(TypeError);
  });

  test("★ 对照：对象 `{}` **不抛**（正则判 false，短路了）", () => {
    // `String({})` = `"[object Object]"` → 不以 `.json` 结尾 → `&&` 短路，
    // 根本不会调 `toLocaleLowerCase`。
    // 我第一版以为「对象没有该方法 → 抛」，被顶回 —— 短路救了他。
    expect(String({}), "前置").toBe("[object Object]");
    expect(isModelJsonFile({})).toBe(false);
    // ★ 即使对象**有** `toLocaleLowerCase`，第一段仍按 `String(obj)` = `"[object Object]"`
    //   判 false → 短路。方法只在「正则已判 true」时才被调用。
    //   我第一版以为「会走 `toLocaleLowerCase` → 得 model.json」，被顶回。
    expect(isModelJsonFile({ toLocaleLowerCase: () => "model.json" }), "★ 短路，方法未被调用")
      .toBe(false);
    // 唯一能同时满足「`String(obj)` 以 .json 结尾」和「有 toLocaleLowerCase」的
    // 非常规输入是「单元素数组包一个 json 名」—— 数组没有那个方法 → 抛。
    expect(String(["model.json"]), "前置").toBe("model.json");
    expect(() => isModelJsonFile(["model.json"])).toThrow(TypeError);
  });

  test("★ Symbol 抛 TypeError（如实记录，不修）", () => {
    // 正则 `test` 对 Symbol 抛 TypeError（`String(Symbol)` 在隐式转换上下文不行）。
    // **判定不修**：入参恒为 string。
    expect(() => isModelJsonFile(Symbol("x"))).toThrow(TypeError);
    // 对照：显式 String 可以
    expect(String(Symbol("x")), "★ 显式 String 不抛").toBe("Symbol(x)");
  });
});

describe("判定稳定性", () => {
  test("同一输入恒得同一结果（用于目录遍历，不应随调用次数变化）", () => {
    const names = ["model.json", "scheme.json", "SCHEME.JSON", "a.json ", "", "模型.json"];
    const once = names.map((n) => isModelJsonFile(n));
    for (let i = 0; i < 20; i += 1) {
      expect(names.map((n) => isModelJsonFile(n))).toEqual(once);
    }
    expect(once, "实测").toEqual([true, false, false, false, false, true]);
  });

  test("返回真布尔（非真值）", () => {
    for (const name of ["model.json", "scheme.json", "", "a.json "]) {
      expect(typeof isModelJsonFile(name)).toBe("boolean");
    }
  });

  test("不改入参（形参是 string）", () => {
    const name = "  model.json  ";
    isModelJsonFile(name);
    expect(name).toBe("  model.json  ");
  });

  test("★ 遍历一组真实目录名的覆盖（模拟 files/** 场景）", () => {
    // 一个模型目录里典型会有：若干 `1.json` / `模型A.json` + 一个 `scheme.json`
    const dirEntries = ["scheme.json", "1.json", "2.json", "模型A.json", "说明.txt", "图.png"];
    const models = dirEntries.filter(isModelJsonFile);
    expect(models, "★ 只挑出 json 且排除 scheme.json").toEqual([
      "1.json", "2.json", "模型A.json"
    ]);
    expect(models).not.toContain("scheme.json");
  });
});

// ══════════════════════════════════════════════════════════════════════
// ★ 单源守卫：「什么算模型 json」在 server/src 里只允许有一份判据
// ══════════════════════════════════════════════════════════════════════
//
// 本文件上面所有用例都是**行为**断言：它们证明 isModelJsonFile 此刻判定正确。
// 但没有一条能拦住「别人再内联一份」—— 生产侧的真实教训是这组判据曾散落 6 份
// （readSchemesFromFiles / projectJsonFileForName / maxStoredProjectIndex /
// scanProjectByIndex / listModelJsonFiles / globalLineRegistry 各写一遍）。
// 散落时改一次要动 6 处，漏一处就把 scheme.json 当模型或漏掉真模型，且**不报错**。
//
// 所以这里钉的是**结构**而非行为：
//   ① 三个生产遍历器必须从 schemeFiles.mjs 导入那个判据函数（server.mjs 有 4 个
//      调用点、schemeArchive.mjs 与 globalLineRegistry.mjs 各 1 个）；
//   ② 无人再内联「以 .json 结尾」+「不等于 scheme.json」这**同一条**判据；
//   ③ 扫描范围覆盖 server/ 与 src/，且排除测试文件自身。
//
// ⚠ 与 corsSingleSource.test.mjs 同型的坑：不要用裸字面量正则扫源码。本仓注释密度
//   极高，`server.mjs:3489` 的「其它条目（如 scheme.json）原样铺开」是**纯注释**，
//   裸扫描必然误伤。故本守卫先剥注释（stripComments），再按**代码形态**匹配。

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const SINGLE_SOURCE = "server/schemeFiles.mjs";
// 三个 files/** 遍历器所在模块。server.mjs 里那 4 处调用点属于
// readSchemeDirectory / projectJsonFileForName / maxStoredProjectIndex /
// scanProjectByIndex，schemeArchive.mjs 是 listModelJsonFiles，
// globalLineRegistry.mjs 是 listProjectJsonFiles。
const ITERATORS = [
  "server/server.mjs",
  "server/schemeArchive.mjs",
  "server/globalLineRegistry.mjs"
];
// 扫描范围照抄 corsSingleSource.test.mjs：两个源码根 + 排除产物/依赖目录。
const SOURCE_ROOTS = ["server", "src"];
const SOURCE_EXTENSIONS = new Set([".mjs", ".ts", ".tsx"]);
// 判据的本地绑定名也要求是这一个（不带别名），否则下面两条断言会给出含糊的报错。
const CRITERION_NAME = "isModelJsonFile";

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
        SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
        !/\.(?:test|spec)\.[^.]+$/i.test(entry.name)
      ) {
        files.push(filePath);
      }
    }
  }
  return files;
}

const blankOut = (text) => text.replace(/[^\n]/g, " ");

/**
 * 把注释抹成等长空格（换行与列位置都保留），字符串 / 模板 / 正则**原样保留**。
 *
 * 为什么必须有这一步：corsSingleSource.test.mjs 的头部记着同一条教训 —— 早先对
 * 配置块做裸字面量扫描，于是注释里只要出现那个字面量就转红。本仓的
 * 「scheme.json」注释遍布 server.mjs（:483 legacy 缺席、:3489 原样铺开）。
 *
 * 抹成等长空格而非删除，是为了让报错里的「文件:行号」仍然指向原文那一行。
 *
 * 状态机四态：code / single / double / template。模板里的 `${…}` 会压入一个新的
 * code 帧并用花括号深度计数，闭合时弹回模板态 —— 否则模板字面量里的 `//` 会被
 * 当成行注释，把后面整行代码抹掉（那是**假阴性**：真违规反而扫不出来）。
 */
function stripComments(src) {
  const frames = [{ kind: "code", depth: 0 }];
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const frame = frames[frames.length - 1];
    if (frame.kind === "code") {
      if (ch === "/" && src[i + 1] === "/") {
        const newline = src.indexOf("\n", i);
        const end = newline === -1 ? src.length : newline;
        out += blankOut(src.slice(i, end));
        i = end;
        continue;
      }
      if (ch === "/" && src[i + 1] === "*") {
        const close = src.indexOf("*/", i + 2);
        const end = close === -1 ? src.length : close + 2;
        out += blankOut(src.slice(i, end));
        i = end;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === "`") {
        frames.push({ kind: ch === "`" ? "template" : ch === "'" ? "single" : "double", depth: 0 });
        out += ch;
        i += 1;
        continue;
      }
      if (ch === "{") {
        frame.depth += 1;
        out += ch;
        i += 1;
        continue;
      }
      if (ch === "}") {
        if (frame.depth === 0 && frames.length > 1) frames.pop();
        else if (frame.depth > 0) frame.depth -= 1;
        out += ch;
        i += 1;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }
    if (frame.kind === "single" || frame.kind === "double") {
      if (ch === "\\") {
        out += src.slice(i, i + 2);
        i += 2;
        continue;
      }
      out += ch;
      if (ch === (frame.kind === "single" ? "'" : '"')) frames.pop();
      i += 1;
      continue;
    }
    // template
    if (ch === "\\") {
      out += src.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === "`") {
      out += ch;
      frames.pop();
      i += 1;
      continue;
    }
    if (ch === "$" && src[i + 1] === "{") {
      out += "${";
      frames.push({ kind: "code", depth: 0 });
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * 判据的第一半：「这个文件名以 .json 结尾」。
 * 覆盖正则形态 `/\.json$/iu`、字符串形态 `".json$"`、以及 endsWith(".json")。
 * 注意 `server.mjs` / `schemeArchive.mjs` 都有 `replace(/\.json$/iu, "")` 这种
 * **剥后缀**用法，所以这条单独看不能作为违规判据 —— 它必须与第二半**同时**出现。
 */
function testsJsonSuffix(code) {
  return /\.json\$/.test(code) || /endsWith\(\s*["'`]+\.json["'`]+/i.test(code);
}

/**
 * 判据的第二半：「不等于 scheme.json（忽略大小写）」。
 * 只认**等值比较**形态，两侧都认：
 *   name !== "scheme.json"   /   name.toLowerCase() !== 'scheme.json'
 *   "scheme.json" === name
 *
 * 刻意**不**把 `join(schemeDir, "scheme.json")`（server.mjs:478，读清单的路径）
 * 或 `{ "scheme.json": … }` 判成违规 —— 那是另一个概念（清单文件在哪），
 * 不是「什么算模型」这条判据。也不能把 `includes` / `startsWith` 算进来：
 * 那是更宽松的写法，会把 `myscheme.json` 误判为非模型，属行为变更，
 * 由本文件上面的行为用例负责，不在本静态守卫的射程内。
 */
const SCHEME_JSON_COMPARISON =
  /[!=]==?\s*["'`]scheme\.json["'`]|["'`]scheme\.json["'`]\s*[!=]==?/;

function criterionSignals(code) {
  return { suffix: testsJsonSuffix(code), exclusion: SCHEME_JSON_COMPARISON.test(code) };
}

function isInlineCriterion(code) {
  const signals = criterionSignals(code);
  return signals.suffix && signals.exclusion;
}

/** 扫出的条目已剥好注释（code 字段是「只剩代码」的文本）。 */
function scanProductionSources() {
  const entries = [];
  for (const root of SOURCE_ROOTS) {
    for (const filePath of sourceFilesUnder(path.join(repoRoot, root))) {
      const src = readFileSync(filePath, "utf8");
      entries.push({
        relPath: path.relative(repoRoot, filePath).split(path.sep).join("/"),
        code: stripComments(src)
      });
    }
  }
  return entries;
}

/** 唯一豁免：判据的源头本身。单源豁免的是**这一个文件**，不是「凡是提到它的行」。 */
function findInlineCriterion(entries) {
  const offenders = [];
  for (const entry of entries) {
    if (entry.relPath === SINGLE_SOURCE) continue;
    if (!isInlineCriterion(entry.code)) continue;
    const hits = [];
    entry.code.split("\n").forEach((line, index) => {
      if (isInlineCriterion(line)) hits.push(`${entry.relPath}:${index + 1}  ${line.trim()}`);
    });
    offenders.push(...(hits.length > 0 ? hits : [`${entry.relPath}  同一行内两半判据均出现`]));
  }
  return offenders;
}

describe("★ 单源守卫：模型 json 判据只允许有一份", () => {
  test("三个生产遍历器都必须从 schemeFiles.mjs 导入那个判据函数", () => {
    for (const relPath of ITERATORS) {
      const code = stripComments(readFileSync(path.join(repoRoot, relPath), "utf8"));
      expect(
        code,
        `${relPath} 必须有 import { ${CRITERION_NAME} } from "./schemeFiles.mjs"`
      ).toMatch(
        new RegExp(
          String.raw`import\s*\{[^}]*\b${CRITERION_NAME}\b[^}]*\}\s*from\s*["'][^"']*schemeFiles\.mjs["']`
        )
      );
    }
  });

  test("★ 导入还不够，三个遍历器必须真的调用它（导入了却不用等于判据没生效）", () => {
    for (const relPath of ITERATORS) {
      const code = stripComments(readFileSync(path.join(repoRoot, relPath), "utf8"));
      const callSites = code.match(new RegExp(String.raw`\b${CRITERION_NAME}\s*\(`, "g")) ?? [];
      expect(callSites.length, `${relPath} 里没有 ${CRITERION_NAME}( 的调用点`).toBeGreaterThan(0);
      expect(
        code,
        `${relPath} 不得自带一份 ${CRITERION_NAME} 定义`
      ).not.toMatch(new RegExp(String.raw`\b(?:function|const|let|var|class)\s+${CRITERION_NAME}\b`));
    }
  });

  test("★ 除 schemeFiles.mjs 外，任何 server/src 生产模块都不得内联这组判据", () => {
    const offenders = findInlineCriterion(scanProductionSources());
    expect(
      offenders,
      `这些文件自己判了「以 .json 结尾 且 不等于 scheme.json」，请改为从 ./schemeFiles.mjs 导入 ${CRITERION_NAME}\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  test("★ 判据函数在整个 server/src 里只允许被定义一次", () => {
    const declarers = scanProductionSources()
      .filter((entry) => (
        new RegExp(String.raw`\b(?:function|const|let|var|class)\s+${CRITERION_NAME}\b`).test(entry.code)
      ))
      .map((entry) => entry.relPath)
      .sort();
    expect(declarers, `${CRITERION_NAME} 只能定义在 ${SINGLE_SOURCE}`).toEqual([SINGLE_SOURCE]);
  });

  test("扫描范围覆盖 server/ 与 src/ 的生产模块，且不含测试文件自身", () => {
    const relPaths = scanProductionSources().map((entry) => entry.relPath);
    for (const anchor of [
      SINGLE_SOURCE,
      ...ITERATORS,
      "server/cors.mjs",
      "src/fileIO.ts"
    ]) {
      expect(relPaths, `扫描范围应包含 ${anchor}`).toContain(anchor);
    }
    expect(relPaths.filter((relPath) => relPath.startsWith("server/")).length, "server/ 扫到的文件太少").toBeGreaterThan(5);
    expect(relPaths.filter((relPath) => relPath.startsWith("src/")).length, "src/ 扫到的文件太少").toBeGreaterThan(5);
    // 守卫自己所在的文件也带 .test. —— 若不排除，它会因注释里写了整条判据而自伤。
    expect(relPaths.filter((relPath) => /\.(?:test|spec)\./i.test(relPath)), "测试文件不得参与扫描").toEqual([]);
  });

  test("★ 检测逻辑自测：违规形态必须报出，四类合法形态必须放行", () => {
    // ① 违规：把源头那一行抄进别的文件（最可能的再分叉方式）
    const copiedVerbatim = findInlineCriterion([{
      relPath: "server/someOther.mjs",
      code: stripComments('function keep(name) {\n  return /\\.json$/iu.test(name) && name.toLocaleLowerCase() !== "scheme.json";\n}\n')
    }]);
    expect(copiedVerbatim, "抄写源头那一行必须被判违规").toHaveLength(1);
    expect(copiedVerbatim[0]).toContain("server/someOther.mjs:2");

    // ② 违规：改写成 endsWith 形态（判据没抄字面，但语义完全一样）
    expect(
      findInlineCriterion([{
        relPath: "server/someOther.mjs",
        code: stripComments('const keep = (name) => name.endsWith(".json") && name !== "scheme.json";')
      }]),
      "endsWith 形态的同一判据必须被判违规"
    ).toHaveLength(1);

    // ③ 合法（注释里写整条判据）—— corsSingleSource 栽过的那个坑，必须放行
    expect(
      findInlineCriterion([{
        relPath: "server/someOther.mjs",
        code: stripComments(
          '// 曾经内联过：return /\\.json$/iu.test(name) && name !== "scheme.json";\n' +
          '/* 另一处历史写法：\n   name.endsWith(".json") && name !== "scheme.json"\n*/\n' +
          'const keep = (n) => n.endsWith(".json");\n'
        )
      }]),
      "注释里的判据不得被判违规（裸字面量扫描的老坑）"
    ).toEqual([]);

    // ④ 合法：只是拼清单文件的路径（server.mjs:478 的现状），不是这条判据
    expect(
      findInlineCriterion([{
        relPath: "server/someOther.mjs",
        code: stripComments(
          'const metaPath = join(schemeDir, "scheme.json");\n' +
          'const fileBaseName = entry.name.replace(/\\.json$/iu, "");\n'
        )
      }]),
      "读 scheme.json 的路径不是模型判据，必须放行"
    ).toEqual([]);

    // ⑤ 合法：只剥后缀、不做排除（server.mjs / schemeArchive.mjs 的现状）
    expect(
      findInlineCriterion([{
        relPath: "server/someOther.mjs",
        code: stripComments(
          'if (!entry.isFile() || !isModelJsonFile(entry.name)) continue;\n' +
          'found.push({ modelName: entry.name.replace(/\\.json$/iu, "") });\n'
        )
      }]),
      "只有后缀判定没有 scheme.json 排除，不构成内联判据，必须放行"
    ).toEqual([]);

    // ⑥ 剥注释器本身的判别力：字符串 / 模板 / 正则里的 `//` 与引号不得被当成
    //    注释起手。若剥错了，下面这三条违规都会被抹成空 → 断言失败（假阴性被抓住）。
    const tricky = [
      'const mark = "路径//分隔"; const keep = (n) => n.endsWith(".json") && n !== "scheme.json";',
      'const q = /["\']/;\nconst keep = (n) => /\\.json$/iu.test(n) && n !== "scheme.json";',
      'const t = `a${"//"}b`;\nconst keep = (n) => n.endsWith(".json") && n !== "scheme.json";'
    ];
    for (const source of tricky) {
      expect(findInlineCriterion([{ relPath: "server/someOther.mjs", code: stripComments(source) }]), source)
        .toHaveLength(1);
    }
  });

  test("★ 检测逻辑在真实源码上确实咬得动：源头自身必须被识别成判据源", () => {
    // 前一条用合成输入证明扫描器会红；这一条把**真实的** schemeFiles.mjs 喂进去，
    // 证明扫描器在真实仓库内容上同样看得见这条判据（合成输入挑对了形状、
    // 真实文件却因某处编码差异扫不出来，是最常见的假绿）。
    const realCode = stripComments(readFileSync(path.join(repoRoot, SINGLE_SOURCE), "utf8"));
    expect(criterionSignals(realCode).suffix, `${SINGLE_SOURCE} 应含 .json 后缀判定`).toBe(true);
    expect(criterionSignals(realCode).exclusion, `${SINGLE_SOURCE} 应含 scheme.json 等值比较`).toBe(true);
    // 同样的内容换个文件名就是违规 —— 单源豁免的是这一个文件，不是这段形状。
    expect(
      findInlineCriterion([{ relPath: SINGLE_SOURCE, code: realCode }]),
      "源头自身必须被豁免"
    ).toEqual([]);
    expect(
      findInlineCriterion([{ relPath: "server/duplicated.mjs", code: realCode }]),
      "把源头原样搬到别的文件必须被判违规"
    ).toHaveLength(1);

    // 再进一步：剥注释器在**真实大文件**上确实干活（server.mjs 有 4500+ 行、
    // 大量块注释，其中 :483 与 :3489 两处提到 scheme.json）。
    // 若剥注释器在这类文件上静默失灵，下面两条会红 —— 那正是 corsSingleSource
    // 当年栽的地方（注释里出现字面量就误伤 / 或者反过来把代码当注释抹掉）。
    const rawServer = readFileSync(path.join(repoRoot, "server/server.mjs"), "utf8");
    const strippedServer = stripComments(rawServer);
    expect(strippedServer.split("\n"), "抹注释不得改变行数（否则报错行号会漂）")
      .toHaveLength(rawServer.split("\n").length);
    const rawHits = (rawServer.match(/scheme\.json/gu) ?? []).length;
    const strippedHits = (strippedServer.match(/scheme\.json/gu) ?? []).length;
    expect(rawHits, "前提：server.mjs 里确有 scheme.json 字面量/注释").toBeGreaterThan(1);
    expect(strippedHits, "注释里的 scheme.json 应已被抹掉").toBeLessThan(rawHits);
    // 反向：真正的**代码**不能被抹掉。server.mjs:478 是读清单的路径（合法用途）。
    expect(strippedServer, 'server.mjs 里 join(schemeDir, "scheme.json") 这句代码必须保留')
      .toContain('join(schemeDir, "scheme.json")');
  });
});
