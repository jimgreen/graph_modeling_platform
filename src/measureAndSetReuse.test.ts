// cloneDeviceMeasurementDefinitions（26 处生产调用，此前零直呼）
// 与 reuseSetOrCreate（21 处生产调用，此前零直呼）
//
// 两个都是**引用语义原语**：一个承诺"克隆后互不影响"，一个承诺"能复用就复用"。
// 两者的正确性都建立在**调用方的使用方式**上，行为断言看不到边界，静态断言才看得到。
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { reuseSetOrCreate } from "./appExtracted/appCoreCanvasUtilities";
import { cloneDeviceMeasurementDefinitions, type DeviceMeasurementDefinition } from "./measurementDefinitionTypes";

const defs = (arr: unknown[]) => arr as DeviceMeasurementDefinition[];

describe("cloneDeviceMeasurementDefinitions：引用关系表", () => {
  test("★ 数组本身是新引用", () => {
    const input = defs([{ measurementTypeId: "A" }]);
    expect(cloneDeviceMeasurementDefinitions(input)).not.toBe(input);
  });

  test("★ 每个元素都是新引用", () => {
    const input = defs([{ measurementTypeId: "A" }, { measurementTypeId: "B" }]);
    const out = cloneDeviceMeasurementDefinitions(input)!;
    expect(out[0]).not.toBe(input[0]);
    expect(out[1]).not.toBe(input[1]);
  });

  test("★ styleOverride 被**深拷贝**（这是它被单独展开的原因）", () => {
    const styleOverride = { color: "red", fontSize: 12 };
    const input = defs([{ measurementTypeId: "A", styleOverride }]);
    const out = cloneDeviceMeasurementDefinitions(input)!;
    expect(out[0].styleOverride).not.toBe(styleOverride);
    // 改新的不影响旧的 —— 深拷贝的实际效果
    out[0].styleOverride!.color = "blue";
    expect(out[0].styleOverride!.color).toBe("blue");
    expect(styleOverride.color, "原对象必须不受影响").toBe("red");
  });

  test("改元素的标量字段也不影响原对象", () => {
    const input = defs([{ measurementTypeId: "A", decimalsOverride: 2, name: "n" }]);
    const out = cloneDeviceMeasurementDefinitions(input)!;
    out[0].decimalsOverride = 9;
    out[0].name = "changed";
    expect(input[0].decimalsOverride).toBe(2);
    expect(input[0].name).toBe("n");
  });

  test("★ 输出保留全部字段（浅展开不是白名单）", () => {
    const full: DeviceMeasurementDefinition = {
      name: "n", measurementTypeId: "A", position: "p", associatedField: "f",
      role: "r", defaultVisible: true, labelOverride: "l", unitOverride: "u",
      formatOverride: "f2", decimalsOverride: 3,
      styleOverride: { color: "c", fontFamily: "F", fontSize: 9, fontWeight: "700", fontStyle: "italic", textDecoration: "underline" }
    };
    const out = cloneDeviceMeasurementDefinitions(defs([full]))!;
    expect(out[0]).toEqual(full);
    expect(Object.keys(out[0]).sort()).toEqual(Object.keys(full).sort());
  });
});

describe("cloneDeviceMeasurementDefinitions：边界输入", () => {
  test("undefined → undefined（不返回空数组）", () => {
    expect(cloneDeviceMeasurementDefinitions(undefined)).toBeUndefined();
  });

  test("★ null → undefined（`?.` 短路，不是抛错）", () => {
    // 探针实测：`null?.map` 短路 → undefined。类型面外输入，但行为可观测。
    expect(cloneDeviceMeasurementDefinitions(null as never)).toBeUndefined();
  });

  test("空数组 → **新**的空数组（不与入参同引用）", () => {
    const empty = defs([]);
    const out = cloneDeviceMeasurementDefinitions(empty);
    expect(out).toEqual([]);
    expect(out).not.toBe(empty);
  });

  test("★ 非数组对象 → 抛 TypeError（`map` 不是函数）", () => {
    // 如实记录：形参类型是 `readonly DeviceMeasurementDefinition[]`，
    // 抛错正说明调用方违背契约，不需要额外兜底。
    expect(() => cloneDeviceMeasurementDefinitions({ length: 2 } as never)).toThrow(TypeError);
  });

  test("★ styleOverride 的 falsy 值一律落 undefined（不是 null）", () => {
    // 用的是 `? :` 真值判定（不是 `!= null`），所以 0 / "" / false / null
    // 全落 undefined。类型上 `styleOverride?: MeasurementStyleOverride`
    // 只允许对象，所以这些是类型面外输入 —— 但行为可观测，钉住。
    for (const so of [null, undefined, 0, "", false] as never[]) {
      const out = cloneDeviceMeasurementDefinitions(defs([{ measurementTypeId: "X", styleOverride: so }]))!;
      expect(out[0].styleOverride, String(so)).toBeUndefined();
      expect("styleOverride" in out[0], `${String(so)} 时该键应仍存在（值为 undefined）`).toBe(true);
    }
  });

  test("空对象 styleOverride 保留为 {}（不被当成 falsy 丢掉）", () => {
    const out = cloneDeviceMeasurementDefinitions(defs([{ measurementTypeId: "X", styleOverride: {} }]))!;
    expect(out[0].styleOverride).toEqual({});
  });
});

describe("★ 静态守卫：两个类型必须保持「全扁平」", () => {
  // `cloneDeviceMeasurementDefinitions` 只展开**一层** + 单独克隆 `styleOverride`。
  // 之所以这就够了，**完全依赖 DeviceMeasurementDefinition 与
  // MeasurementStyleOverride 的所有字段都是原始值或字符串字面量联合**。
  //
  // 探针实测：塞一个类型面外的嵌套字段（`extra: {deep:{x:1}}` / `list: [1,2,3]`），
  // 克隆后**与原对象同引用** —— 静默共享。行为断言抓不到（字段不存在时无从断言），
  // 所以这里读源码，把「没有嵌套类型」这个前提变成可执行的断言。
  //
  // **若日后给任一类型加了数组 / 对象 / Record / Array 字段，必须同步改这个克隆函数。**
  const source = readFileSync(new URL("./measurementDefinitionTypes.ts", import.meta.url), "utf8");

  const bodyOf = (typeName: string) => {
    const start = source.indexOf(`export type ${typeName} = {`);
    expect(start, `找不到类型 ${typeName}`).toBeGreaterThan(-1);
    const end = source.indexOf("\n};", start);
    expect(end, `${typeName} 的类型体没有正确闭合`).toBeGreaterThan(start);
    return source.slice(start, end);
  };

  for (const typeName of ["MeasurementStyleOverride", "DeviceMeasurementDefinition"]) {
    test(`${typeName}：无数组 / 对象 / Record 字段`, () => {
      const body = bodyOf(typeName);
      const fields = body
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.endsWith(";") && !line.startsWith("export type"));
      expect(fields.length, `${typeName} 字段数（改动类型时须同步核对）`).toBe(
        typeName === "MeasurementStyleOverride" ? 6 : 11
      );
      for (const field of fields) {
        expect(field, `${typeName} 的 ${field} 含嵌套类型`).not.toMatch(
          /\[\]|Array<|Record<|\{\s*$|ReadonlyArray|Pick<|Partial<|Map<|Set</
        );
      }
    });
  }

  test("三个字符串字面量联合本身也不是对象", () => {
    for (const alias of ["MeasurementFontWeight", "MeasurementFontStyle", "MeasurementTextDecoration"]) {
      const start = source.indexOf(`export type ${alias} =`);
      expect(start, `找不到 ${alias}`).toBeGreaterThan(-1);
      const line = source.slice(start, source.indexOf("\n", start));
      expect(line, `${alias} 应是字符串字面量联合`).toMatch(/=\s*("[^"]*"\s*\|?\s*)+;\s*$/);
    }
  });
});

describe("reuseSetOrCreate：★ 别名语义（传 Set 就返回同一个 Set）", () => {
  // 函数名里的 reuse 就是这个意思：拖拽热路径上避免为已存在的 Set 再分配一个。
  // 代价是**返回的 Set 与入参同引用** —— 改结果就是改入参。
  // 实测全部 21 个调用点都只读（`.size` / `.has` / 迭代 / `.filter`），
  // 所以当前无害；但这个前提靠约定维持，见文件末尾的静态守卫。
  test("传 Set → **同一引用**", () => {
    const input = new Set([1, 2, 3]);
    expect(reuseSetOrCreate(input)).toBe(input);
  });

  test("★ 改结果会改到入参（别名的实际后果）", () => {
    const input = new Set([1, 2, 3]);
    const reused = reuseSetOrCreate(input);
    reused.add(99);
    expect([...input]).toEqual([1, 2, 3, 99]);
    reused.clear();
    expect(input.size, "clear 把入参也清空了").toBe(0);
  });

  test("传数组 → **新** Set（与入参无引用关系）", () => {
    const arr = [1, 2, 3, 3];
    const set = reuseSetOrCreate(arr);
    expect(set).not.toBe(arr as never);
    expect([...set]).toEqual([1, 2, 3]);
    set.add(99);
    expect(arr, "入参数组必须不受影响").toEqual([1, 2, 3, 3]);
  });

  test("★ Set 子类也走同引用分支（instanceof 命中）", () => {
    class MySet extends Set<string> {}
    const input = new MySet(["a"]);
    const out = reuseSetOrCreate(input);
    expect(out).toBe(input);
    expect(out).toBeInstanceOf(MySet);
  });
});

describe("reuseSetOrCreate：各种可迭代输入", () => {
  const cases: Array<[string, Iterable<unknown>, unknown[]]> = [
    ["Map（产出条目数组而非键！）", new Map([["a", 1]]), [["a", 1]]],
    ["字符串（逐字符）", "ab", ["a", "b"]],
    ["重复字符字符串（去重）", "aab", ["a", "b"]],
    ["Uint8Array", new Uint8Array([1, 2]), [1, 2]],
    ["generator", (function* () { yield 1; })(), [1]],
    ["空 Set", new Set(), []],
    ["空数组", [], []],
    ["数组含重复（去重）", [1, 2, 2], [1, 2]]
  ];

  for (const [label, input, expected] of cases) {
    test(`${label} → [${expected.join(", ")}]`, () => {
      expect([...reuseSetOrCreate(input)]).toEqual(expected);
    });
  }

  test("★ null / undefined → **空 Set**（不抛错）", () => {
    // 与 `new Set(5)` 抛 TypeError 形成对比 —— JS 规范明确允许 null/undefined。
    // 这个不对称很容易被误记成"也会抛"。
    expect([...reuseSetOrCreate(null as never)]).toEqual([]);
    expect([...reuseSetOrCreate(undefined as never)]).toEqual([]);
    expect(reuseSetOrCreate(null as never).size).toBe(0);
  });

  test("★ 其它不可迭代输入 → 抛 TypeError", () => {
    for (const bad of [5, true, {}, { length: 2, 0: 1, 1: 2 }] as never[]) {
      expect(() => reuseSetOrCreate(bad), String(JSON.stringify(bad))).toThrow(TypeError);
    }
  });
});

describe("★ 静态守卫：别名语义与「只读」前提", () => {
  // 上一版这里只扫 appCoreCanvasUtilities.tsx —— 那个文件只**定义**函数，
  // 21 个调用点全在别的文件，于是「无内联 mutate」这条断言**永远不可能红**。
  // 改成扫整个 src/。守卫如果扫不到任何调用点，就必须显式失败（见末尾那条）。
  const srcDir = new URL("./", import.meta.url);
  const allSources = (() => {
    const files: Array<{ name: string; text: string }> = [];
    const walk = (dir: URL, prefix: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(new URL(`${rel}/`, srcDir), rel);
        } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
          // ★ 必须排除 *.test.* —— 本文件自己就在合法地用这个函数做断言，
          //   不排除的话守卫会咬到自己（我第一版就踩了，整整两条断言全红）
          files.push({ name: rel, text: readFileSync(new URL(rel, srcDir), "utf8") });
        }
      }
    };
    walk(srcDir, "");
    return files;
  })();
  const definition = allSources.find((f) => f.text.includes("export function reuseSetOrCreate"))!;
  // ★ 只排除**定义那一行**，不排除整个文件。
  //   我第一版写的是 `if (file === definition) continue`，结果变异把内联 mutate
  //   注入到定义所在文件（`isMultiNodeMoveState` 那一带，恰好同文件）时被整体跳过，
  //   守卫全绿 —— 典型的「守卫有洞」。定义行本身不含 `reuseSetOrCreate(` 的调用形态
  //   （只有 `export function reuseSetOrCreate<T>(...`），显式排除它即可。
  const isDefinitionLine = (text: string) => /export function reuseSetOrCreate/.test(text);
  const hasCall = (text: string) => /[^a-zA-Z]reuseSetOrCreate\(/.test(text);
  const MUTATOR = /\)\s*\.(add|delete|clear|pop)\s*\(/;

  /** 找出所有「内联 mutate」的行（返回 `行号: 原文` 便于报错定位）。 */
  const findInlineMutate = (lines: readonly string[]): string[] => {
    const hits: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (isDefinitionLine(lines[i]) || !hasCall(lines[i])) continue;
      for (let j = i; j < Math.min(i + 3, lines.length); j += 1) {
        if (j !== i && hasCall(lines[j])) break;
        if (MUTATOR.test(lines[j])) hits.push(`${i + 1}: ${lines[i].trim().slice(0, 50)} → ${lines[j].trim().slice(0, 40)}`);
      }
    }
    return hits;
  };

  const callLines = allSources.flatMap((f) =>
    f.text.split("\n")
      .map((line, index) => ({ file: f.name, line: index + 1, text: line }))
      .filter((r) => !isDefinitionLine(r.text) && hasCall(r.text))
  );

  test("扫到了足够的文件与调用点（防止守卫变空洞）", () => {
    expect(allSources.length, "src 下 .ts/.tsx 文件数（已排除 *.test.*）").toBeGreaterThan(100);
    // 扫描口径：`rg` 实测 21 处生产调用（不含定义与测试文件），全在**两个**文件里。
    // 钉住文件列表而不是只钉数量 —— 新增调用点时这条会提醒同步核对。
    const filesWithCalls = [...new Set(callLines.map((r) => r.file))].sort();
    expect(filesWithCalls, "有调用的文件列表（新增调用点时须同步核对）").toEqual([
      "appExtracted/appGraphMeasurementFactories.tsx",
      "appExtracted/appSelectionDragFactories.tsx"
    ]);
    expect(callLines.length, `实际扫到的调用行数：${callLines.length}`).toBe(21);
  });

  test("★ 守卫的检测逻辑自测（合成输入，含「注入到定义所在文件」这一形态）", () => {
    // 这条比「必须扫到 N 个调用点」强得多：它直接证明 findInlineMutate 会红。
    // 我第一版的洞正是「按文件跳过定义文件」—— 下面第 3 段就是那次变异的原文。
    const synthetic = [
      "export function reuseSetOrCreate<T>(items: Iterable<T>): Set<T> {",
      "  return items instanceof Set ? items : new Set(items);",
      "}",
      "export function isMultiNodeMoveState(dragState: DraggingState) {",
      'const __mutProbe = (s: Set<string>) => reuseSetOrCreate(s).add("X");',
      "  return false;",
      "}",
      "const ok1 = reuseSetOrCreate(ids);",
      "const ok2 = reuseSetOrCreate(ids).size;",
      "const ok3 = reuseSetOrCreate(a) ?? reuseSetOrCreate(b);"
    ];
    const hits = findInlineMutate(synthetic);
    expect(hits, "应恰好抓到第 6 行那一处").toHaveLength(1);
    expect(hits[0]).toContain("__mutProbe");
    // 三种合法形态不得误报
    expect(findInlineMutate(["const ok1 = reuseSetOrCreate(ids);"])).toEqual([]);
    expect(findInlineMutate(["const ok2 = reuseSetOrCreate(ids).size;"])).toEqual([]);
    expect(findInlineMutate(["const ok3 = reuseSetOrCreate(a) ?? reuseSetOrCreate(b);"])).toEqual([]);
  });

  test("实现仍是那一行（防止被「顺手」改成总是新建，拖拽热路径多一次分配）", () => {
    const start = definition.text.indexOf("export function reuseSetOrCreate");
    const body = definition.text.slice(start, definition.text.indexOf("\n}", start));
    expect(body.replace(/\s+/g, " ")).toContain(
      "return items instanceof Set ? items : new Set(items);"
    );
  });

  test("★ 全部调用点都**不 mutate** 返回值（否则别名语义会变成 bug）", () => {
    // 逐个调用点检查紧随其后两行有没有 .add / .delete / .clear / .pop。
    // 覆盖"内联 mutate"这一最可能的误用形态（`reuseSetOrCreate(x).add(y)`）。
    // 「先赋给局部变量、下一行再 mutate」这个形态正则抓不到 ——
    // 那需要跨语句的数据流分析，超出本守卫范围，改为在这里写明。
    const offenders: string[] = [];
    for (const file of allSources) {
      for (const hit of findInlineMutate(file.text.split("\n"))) {
        offenders.push(`${file.name}:${hit}`);
      }
    }
    expect(offenders, `出现内联 mutate：${offenders.join(" | ")}`).toEqual([]);
  });

  test("没有裸语句丢弃的调用（`reuseSetOrCreate(x);` 单独成句）", () => {
    // 只匹配「整条语句就是这个调用」这一种真正的无意义写法。
    // 形如 `const x = ...` / `return ...` / 三元 `a ? b : reuseSetOrCreate(c)`
    // / 作为实参出现 —— 都不算裸调用，不去误伤（我第一版试图穷举这些形状，
    // 结果把一处合法的三元表达式判成了裸调用）。
    const bare = callLines.filter((r) => /^reuseSetOrCreate\([^;]*\);\s*$/.test(r.text.trim()));
    expect(bare.map((r) => `${r.file}:${r.line}`), `存在裸调用：${bare.map((r) => r.text.trim()).join(" | ")}`).toEqual([]);
  });
});
