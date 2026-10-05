// 空间 id 生成与校验：允许中文（目录可读性），排除路径分隔符与 Windows 保留名。
import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spaceIdFromName, isValidSpaceId, isReservedSpaceId } from "./spaceId.mjs";

/**
 * 去重后缀的静态守卫 —— 放在**模块加载期**（收集阶段）执行，不放进 test 里。
 *
 * 去重是 `for (let n = 2; ; n += 1)`。若后缀被写成常量（如 `"-2"`），候选永不变化，
 * 这个 for(;;) 会**同步死循环**：阻塞事件循环，连 vitest 自己的超时定时器都触发不了。
 *
 * 为什么必须是模块级 throw 而非 test 断言（实测踩了两次坑）：
 *   1. testTimeout 救不了 —— 同步循环阻塞事件循环，定时器根本没机会触发；
 *   2. **断言失败也不会中止后续用例** —— 守卫排在文件中间或末尾时，它转红后 vitest
 *      继续执行下一条带冲突的用例（如「冲突时追加 -2 -3」），当场死循环，
 *      整轮挂到外部超时，反而看不出是守卫抓到了问题。
 * 在收集阶段直接抛出，文件根本来不及执行任何用例，失败信息也最直接。
 */
{
  const src = readFileSync(fileURLToPath(new URL("./spaceId.mjs", import.meta.url)), "utf8");
  if (/const suffix = "-\d+";/.test(src)) {
    throw new Error(
      "spaceId.mjs 的去重后缀被写成了常量：候选永不变化，`for (let n = 2; ; n += 1)` 会同步死循环。" +
        "后缀必须插值自 n。"
    );
  }
  if (!/const suffix = `-\$\{n\}`;/.test(src)) {
    throw new Error(
      "spaceId.mjs 的去重后缀未由循环变量 n 派生：候选可能永不变化，`for (;;)` 会同步死循环。"
    );
  }
}

test("去重后缀由循环变量派生（模块加载期已校验，此处只钉住正向路径）", () => {
  const taken = [];
  for (let i = 0; i < 5; i += 1) taken.push(spaceIdFromName("守卫", taken));
  expect(new Set(taken).size).toBe(5);
  expect(taken[1]).toBe("守卫-2");
});

test("中文名直接用作 id", () => {
  expect(spaceIdFromName("张三")).toBe("张三");
});

test("空格与路径分隔符折叠为连字符", () => {
  expect(spaceIdFromName("张 三")).toBe("张-三");
  expect(spaceIdFromName("李四/测试")).toBe("李四-测试");
  expect(spaceIdFromName("a\\b")).toBe("a-b");
});

test("连续合法分隔符折叠，首尾连字符剥除", () => {
  expect(spaceIdFromName("--a---b--")).toBe("a-b");
});

test("冲突时追加 -2 -3", () => {
  expect(spaceIdFromName("李四", ["李四"])).toBe("李四-2");
  expect(spaceIdFromName("李四", ["李四", "李四-2"])).toBe("李四-3");
});

test("冲突判定不区分大小写（NTFS 语义）", () => {
  expect(spaceIdFromName("Abc", ["abc"])).toBe("Abc-2");
});

test("Windows 保留名加下划线前缀", () => {
  expect(spaceIdFromName("con")).toBe("_con");
  expect(spaceIdFromName("COM1")).toBe("_COM1");
  expect(isReservedSpaceId("con")).toBe(true);
});

test("全符号名兜底为 space", () => {
  expect(spaceIdFromName("🎉")).toBe("space");
  expect(spaceIdFromName("   ")).toBe("space");
});

test("截断至 40 字符，且冲突后缀不撑破上限", () => {
  const long = "字".repeat(50);
  expect(spaceIdFromName(long)).toBe("字".repeat(40));
  expect([...spaceIdFromName(long, ["字".repeat(40)])].length).toBe(40);
});

test("非法 id 被拒绝", () => {
  for (const bad of ["", "-a", "a/b", "a\\b", "a.b", "a b", "字".repeat(41), 123, null]) {
    expect(isValidSpaceId(bad)).toBe(false);
  }
  for (const ok of ["default", "张三", "_con", "a", "a-b_c", "字".repeat(40)]) {
    expect(isValidSpaceId(ok)).toBe(true);
  }
});

// 以下两组是保留名的哨兵：上面「Windows 保留名」用例只断言了 con，
// 删掉 prn|aux|nul|com[1-9]|lpt[1-9] 分支或去掉结尾 $ 锚点，那 9 个用例仍全绿，
// 故两处失败模式在此各钉一组。isReservedSpaceId 是 spaceIdFromName（加前缀）与
// spaceStore.scanWorkspaces（目录准入）共用的唯一判据，漏一个即两处同时失守。
test("保留名清单完整覆盖（不止 con）", () => {
  for (const name of ["prn", "aux", "nul", "com1", "lpt9", "COM9", "Nul"]) {
    expect(isReservedSpaceId(name)).toBe(true);
  }
});

test("含保留名但不相等的名字不算保留名（钉死 $ 锚点）", () => {
  // 缺 $ 锚点时 con-2 / concat / console 会被误判为保留名，com10 / lpt0 同理。
  for (const name of ["con-2", "concat", "console", "null", "com10", "lpt0"]) {
    expect(isReservedSpaceId(name)).toBe(false);
  }
});

// ===== 属性化不变量 =====
//
// 上面那些是逐个例子。真正的风险在**跨函数不变量**上：
// `spaceIdFromName` 产出的 id 会被当成目录名拼进 data/workspaces/<id>/，
// 并由 `isValidSpaceId`（准入）与 `isReservedSpaceId`（Windows 保留名）把关。
// 任何一条不成立，症状都是「空间建出来了但访问不到」，或更糟 —— 目录名逃出
// workspaces/ 造成跨空间读写。单个例子很难覆盖到字符类组合，这里用确定性伪随机
// （固定种子，无 Math.random）大批量扫。

/** 确定性伪随机（LCG），保证用例可复现。 */
function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** 覆盖各种字符类：ASCII、中文、全角、emoji、零宽、路径分隔符、百分号。 */
const FUZZ_ALPHABET = [..."abcXYZ019-_ ./\\中文字符éＡ😀%2e"];

function fuzzNames(count = 1500) {
  const rng = makeRng(20260928);
  const names = [
    // 手工边界（比随机更容易命中极端组合）
    "张三", "a/b", "a\\b", "..", "../..", ".", "  ", "___", "con", "CON", "com1", "LPT9",
    "nul.txt", "con.txt", "a".repeat(100), "中文".repeat(50), "-lead", "trail-", "--mid--",
    "123", "_under", "a-1-2", "  空格  ", "　全角空格　", "é", "ＡＢＣ", "ｱｲｳ", "①②",
    "emoji😀name", "𝕏math", "a.b.c", "...", "-", "----", "%2e%2e", "a%2Fb",
    "x".repeat(39), "x".repeat(40), "x".repeat(41)
  ];
  for (let i = 0; i < count; i += 1) {
    const len = 1 + Math.floor(rng() * 12);
    let text = "";
    for (let k = 0; k < len; k += 1) {
      text += FUZZ_ALPHABET[Math.floor(rng() * FUZZ_ALPHABET.length)];
    }
    names.push(text);
  }
  return names;
}

const FUZZ_NAMES = fuzzNames();
const TAKEN_SETS = [[], ["空间"], ["a", "A", "a-2"]];

test("生成的 id 必通过 isValidSpaceId（跨函数不变量）", () => {
  const bad = [];
  for (const name of FUZZ_NAMES) {
    for (const taken of TAKEN_SETS) {
      const id = spaceIdFromName(name, taken);
      if (!isValidSpaceId(id)) bad.push({ name, id });
    }
  }
  expect(bad.slice(0, 5), `共 ${bad.length} 个生成的 id 未通过校验`).toEqual([]);
});

test("生成的 id 绝不含路径分隔符或 ..（防逃出 workspaces/<id>/）", () => {
  const bad = [];
  for (const name of FUZZ_NAMES) {
    for (const taken of TAKEN_SETS) {
      const id = spaceIdFromName(name, taken);
      if (id.includes("/") || id.includes("\\") || id.includes("..")) bad.push({ name, id });
    }
  }
  expect(bad.slice(0, 5), `共 ${bad.length} 个 id 含路径成分`).toEqual([]);
});

test("生成的 id 不会是 Windows 保留名", () => {
  const bad = [];
  for (const name of FUZZ_NAMES) {
    const id = spaceIdFromName(name, []);
    if (isReservedSpaceId(id)) bad.push({ name, id });
  }
  expect(bad.slice(0, 5), `共 ${bad.length} 个 id 命中保留名`).toEqual([]);
});

test("生成的 id 长度不超 40 码点（中文按码点计，不按 UTF-16 单元）", () => {
  const bad = [];
  for (const name of FUZZ_NAMES) {
    for (const taken of TAKEN_SETS) {
      const id = spaceIdFromName(name, taken);
      if ([...id].length > 40) bad.push({ name, id, len: [...id].length });
    }
  }
  expect(bad.slice(0, 5), `共 ${bad.length} 个 id 超长`).toEqual([]);
});

test("重复创建同名空间：每次都拿到不同 id（去重循环不退化）", () => {
  const taken = [];
  for (let i = 0; i < 60; i += 1) taken.push(spaceIdFromName("同名空间", taken));
  expect(new Set(taken).size, "60 次创建出现 id 碰撞").toBe(60);
}, 10_000);

test("去重对大小写不敏感（NTFS 语义），且截断后仍不超长", () => {
  const taken = [];
  // 每轮都用已被占用的大小写变体，逼出 -2/-3 后缀
  for (const name of ["Abc", "abc", "ABC", "aBc", "abc"]) {
    taken.push(spaceIdFromName(name, taken));
  }
  expect(new Set(taken.map((id) => id.toLowerCase())).size).toBe(5);
  for (const id of taken) expect([...id].length).toBeLessThanOrEqual(40);
  // 后缀版不得撞上原始版
  expect(taken[0]).toBe("Abc");
  expect(taken[1]).toBe("abc-2");
});

// ─── NFKC 归一（变异验证补）────────────────────────────────
//
// 删掉 spaceIdFromName 里的 `.normalize("NFKC")` 后，既有 205 行守卫一条不红。
// 因为 id 字符集本来就允许 CJK 与全角字母，不归一时 `ＡＢＣ` 会原样落成目录名 ——
// 能建、能用，只是与「ＡＢＣ / ABC 视为同一个空间」的设计意图不符，且在
// NTFS（本身做 NFKC 归一）与 Linux（不做）之间行为分叉。
test("全角字母折叠成半角", () => {
  expect(spaceIdFromName("ＡＢＣ")).toBe("ABC");
  expect(spaceIdFromName("１２３")).toBe("123");
});

test("全角名与半角名算出同一个 id（去重时撞上 → 走 -2 后缀）", () => {
  const halfWidth = spaceIdFromName("ABC");
  expect(spaceIdFromName("ＡＢＣ", [halfWidth])).toBe("ABC-2");
});

test("兼容分解字符折叠成预组合形式（NFC 归一）", () => {
  // 显式转义：编辑器/输入法会把 U+0065 U+0301 自动折成 U+00E9，写字面量就分不出两者了。
  const decomposed = "école";   // e + 组合锐音符（两码点）
  const precomposed = "école";   // é 预组合（一码点）
  expect(decomposed).not.toBe(precomposed);
  // NFKC 后两者必须算出同一个 id，否则视觉相同的名字会开出两个目录
  expect(spaceIdFromName(decomposed)).toBe(spaceIdFromName(precomposed));
  expect(spaceIdFromName(decomposed)).toBe("école");
});

test("圈数字母折叠（① → 1）", () => {
  expect(spaceIdFromName("①区")).toBe("1区");
});

test("全角空格折叠成半角空格后再被替换规则吃掉", () => {
  expect(spaceIdFromName("Ａ　Ｂ")).toBe("A-B");
});

// ─── 非字符串入参（变异验证补）────────────────────────────
//
// 这三个函数的入参在生产调用链上都是字符串/数组，但类型标注（.mjs 里靠约定）不构成约束，
// 下面把 coercion 与「不防御」两种现状钉成契约：改掉就得同步改这些断言，
// 而不是让某个上游的意外入参悄悄换一个 id 出去。

test("spaceIdFromName 对非字符串 name 走 String 强制转换，空值落回 space 兜底", () => {
  // 注意这里不是「拒绝」而是「转换」：null/undefined/空数组经 String() 得空串，
  // 于是和全符号名一样落到 space 兜底。若把 `String(name ?? "")` 误改成 `String(name)`，
  // null 会变成字符串 null —— 那是个合法且可用的 id，静默换 id，不报错。
  expect(spaceIdFromName(null)).toBe("space");
  expect(spaceIdFromName(undefined)).toBe("space");
  expect(spaceIdFromName([])).toBe("space");
  // 非空值：String() 的结果直接进入后续归一链
  expect(spaceIdFromName(123)).toBe("123");
  expect(spaceIdFromName(true)).toBe("true");
  expect(spaceIdFromName(12n)).toBe("12");
  // 对象的 String() 是 [object Object] → 括号与空格被替换规则吃掉
  expect(spaceIdFromName({})).toBe("object-Object");
  // 单元素数组的 String() 等于元素本身（Array#join 语义），不是 JSON
  expect(spaceIdFromName(["a", "b"])).toBe("a-b");
  expect(spaceIdFromName([["ab"]])).toBe("ab");
  // 这些 id 仍必须过准入校验，否则 coercion 会造出建不出目录的 id
  for (const raw of [null, undefined, [], 123, true, {}]) {
    expect(isValidSpaceId(spaceIdFromName(raw))).toBe(true);
  }
  // 变异验证：把 `String(name ?? "")` 换成模板插值 `${name ?? ""}` 是**等价变异**，
  // 28 条用例一条不红 —— 两者对任何实参都走同一条 ToString 路径（Symbol 同样都抛）。
  // 故下面断言钉的是「结果长什么样」，不是「用哪种写法拿到它」。
  // 真正把这条打红的是把 coercion 整个删掉（`name.normalize(...)`）或换成 `Object(name).toString()`。
});

test("taken 非数组时抛 TypeError —— 该函数不防御，调用方必须传真数组", () => {
  // 现状是抛错而非静默降级，钉住：把 `taken.map(...)` 改成 `(taken ?? []).map(...)`
  // 或 Array.isArray 兜底，会让这些用例转红（调用方的类型错误被静默吞掉，
  // 去重失效 → 同名空间开出同一个目录）。
  for (const bad of ["abc", 123, null, {}, Symbol("t"), { map: 1 }]) {
    expect(() => spaceIdFromName("x", bad)).toThrow(TypeError);
  }
  // null 与 undefined 必须区别对待：默认值 `taken = []` 只在 undefined 时生效，
  // 显式传 null 仍会落到 `null.map` 抛错。
  expect(spaceIdFromName("x", undefined)).toBe("x");
  // taken 的元素不校验类型，逐元素 String() 后参与小写去重
  expect(spaceIdFromName("123", [null, 123])).toBe("123-2");
});

test("isValidSpaceId 不做 String 强制转换，非字符串一律拒收", () => {
  // 与 isReservedSpaceId 相反：这里是 `typeof id === "string" &&` 短路在前，
  // 所以包装对象（new String("abc")、new Number(1)）也一律 false。
  // 若删掉 typeof 守卫，ID_OK.test(123) 会把数字转成 "123" 而返回 true —— 准入校验形同虚设。
  for (const bad of [123, 0, null, undefined, true, {}, [], new String("abc"), new Number(1)]) {
    expect(isValidSpaceId(bad)).toBe(false);
  }
  // 同为「空」的两条路结果一致：空串与纯空白都不满足 ID_OK 的首字符要求
  expect(isValidSpaceId("")).toBe(false);
  expect(isValidSpaceId("   ")).toBe(false);
  expect(isValidSpaceId("abc")).toBe(true);
});

test("isReservedSpaceId 会做 String 强制转换，非字符串也能判成保留名", () => {
  // 这里没有 typeof 守卫，只有 `String(id ?? "")`。所以自定义 toString 的对象、
  // 装着保留名的单元素数组都会被判为保留名 —— 与 isValidSpaceId 对同一入参的
  // 结论恰好相反（此处 true，那里 false）。这两个函数的入参类型约定不一致，别顺手统一。
  expect(isReservedSpaceId({ toString: () => "con" })).toBe(true);
  expect(isReservedSpaceId({ toString: () => "LPT3" })).toBe(true);
  expect(isReservedSpaceId(["con"])).toBe(true);
  expect(isValidSpaceId({ toString: () => "con" })).toBe(false);
  // 这里逐个枚举「非保留」的 falsy 与近形值。**注意其中两处是等价变异**，
  // 变异验证实测 28 条用例一条不红，故意不假装它是承重的：
  //   ① `?? ""` 相对裸 `String(id)`：差别只在 null/undefined 上（"" vs "null"/"undefined"），
  //      而 RESERVED 两条都不命中（nul 有 $ 锚点，"null" 比它多一个 l）。
  //   ② 包裹的 String(...) 整层：RegExp#test 自己会对实参做 ToString，
  //      故 `RESERVED.test(id)` 与 `RESERVED.test(String(id))` 对任意入参（含对象、包装对象）
  //      结果完全一致。
  // 上面三条 true 断言钉的是**行为**（非字符串也能判成保留名），不是那层显式转换。
  // 真正承重的是 isValidSpaceId 那边 —— 它靠 `typeof` 短路，没有隐式 ToString 兜底。
  for (const notReserved of [123, null, undefined, "", "   ", "con-2", "null", "com10"]) {
    expect(isReservedSpaceId(notReserved)).toBe(false);
  }
});

test("正常路径回归：非字符串入参不扰动常规生成与去重", () => {
  // 防误伤：以上 coercion 断言不得改动常规调用链的行为。
  expect(spaceIdFromName("张三")).toBe("张三");
  expect(spaceIdFromName("李四", ["李四"])).toBe("李四-2");
  expect(spaceIdFromName("con")).toBe("_con");
  expect(spaceIdFromName("🎉")).toBe("space");
  expect(spaceIdFromName("ＡＢＣ")).toBe("ABC");
  expect(spaceIdFromName("字".repeat(50))).toBe("字".repeat(40));
  expect(isReservedSpaceId("con")).toBe(true);
  expect(isValidSpaceId("default")).toBe(true);
});
