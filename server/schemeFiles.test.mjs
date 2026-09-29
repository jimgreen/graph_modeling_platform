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
