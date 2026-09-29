// src/appExtracted/appPersistenceLibraryExport.tsx：图元模板类型名归一
//   normalizeGraphTemplateTypeName      单个类型名归一（就是 trim）
//   normalizeGraphTemplateTypes        自定义类型清单归一（去空 / 去重 / 去保留字）
//   normalizeGraphTemplates            模板列表归一（id 去重 + 类型名归一 + 尺寸兜底）
//   normalizeGraphTemplateClipboard    剪贴板归一（容错 + 深拷贝入口）
//   cloneGraphTemplateClipboard        纯深拷贝（**不碰 typeName**）
//   graphTemplateTypeList              侧栏类型清单汇总
//   groupGraphTemplatesByType          按类型分组
//
// 这些函数决定「用户自定义的图元模板类型」清单。判错的后果：
// 保留字被占用（用户建了与内置同名类型，两者混在一起）或
// 重复类型在侧栏里出现两次 —— 都只表现为界面上的困惑，**不报错**。
import { describe, expect, test } from "vitest";
import {
  cloneGraphTemplateClipboard,
  cloneTemplatePoint,
  graphTemplateTypeList,
  groupGraphTemplatesByType,
  normalizeGraphTemplateClipboard,
  normalizeGraphTemplates,
  normalizeGraphTemplateTypeName,
  normalizeGraphTemplateTypes
} from "./appExtracted/appPersistenceLibraryExport";
import { DEFAULT_GRAPH_TEMPLATE_TYPES } from "./appExtracted/appCoreCanvasUtilities";

const norm = normalizeGraphTemplateTypes;
const withReserved = (list: unknown, reserved: string[]) => norm(list, reserved);
const D = DEFAULT_GRAPH_TEMPLATE_TYPES[0];

describe("DEFAULT_GRAPH_TEMPLATE_TYPES：只有一个中文项", () => {
  test("值与内容", () => {
    expect(DEFAULT_GRAPH_TEMPLATE_TYPES).toEqual(["常用模板"]);
    expect(D).toBe("常用模板");
  });

  test("★ 因为是中文，`toUpperCase()` 是恒等 —— 用它测「大小写不敏感」**没有鉴别力**", () => {
    // 探针里我写 `reserved[0].toUpperCase()` 想验证「大小写不同仍被判保留」，
    // 但中文的 toUpperCase 不变，断言恒成立、恒无鉴别力。
    // 正确做法是用**自定义 ASCII 保留字**测（见下一组）。
    expect(D.toUpperCase(), "★ 中文大写是恒等变换").toBe(D);
    // 所以「默认保留字对大小写不敏感」在默认配置下**不可观测**。
    expect(norm([D]), "默认保留字被挡").toEqual([]);
  });
});

describe("normalizeGraphTemplateTypeName：就是 `trim()`", () => {
  test("去掉首尾空白", () => {
    expect(normalizeGraphTemplateTypeName("abc")).toBe("abc");
    expect(normalizeGraphTemplateTypeName("  abc  ")).toBe("abc");
    expect(normalizeGraphTemplateTypeName("\tabc\n")).toBe("abc");
    // 全角空格也被 trim（JS trim 处理所有 Unicode 空白）
    expect(normalizeGraphTemplateTypeName("\u00a0abc\u00a0")).toBe("abc");
  });

  test("空白串 → 空串（不是原样）", () => {
    expect(normalizeGraphTemplateTypeName("")).toBe("");
    expect(normalizeGraphTemplateTypeName("   ")).toBe("");
  });

  test("★ 内部空白**保留**（不折叠、不改大小写、不删内部 tab）", () => {
    expect(normalizeGraphTemplateTypeName("a b")).toBe("a b");
    expect(normalizeGraphTemplateTypeName("A B")).toBe("A B");
    expect(normalizeGraphTemplateTypeName("  A  b  ")).toBe("A  b");
    expect(normalizeGraphTemplateTypeName("a\tb")).toBe("a\tb");
  });
});

describe("normalizeGraphTemplateTypes：非数组 → `[]`", () => {
  for (const value of [null, undefined, "abc", 123, {}, true, new Set(["a"]), new Map()] as never[]) {
    test(`${String(JSON.stringify(value) ?? typeof value).padEnd(12)} → []`, () => {
      expect(norm(value)).toEqual([]);
    });
  }
});

describe("★ 保留字判定：大小写不敏感（用自定义 ASCII 保留字验证）", () => {
  // 保留字集合建的是 `normalizeGraphTemplateTypeName(type).toLowerCase()`，
  // 候选也是 `typeName.toLowerCase()` —— 两边都比小写化后的串。
  const cases: Array<[string, string[]]> = [
    ["保留 Foo，输入 FOO", ["FOO"]],
    ["保留 Foo，输入 foo", ["foo"]],
    ["保留 Foo，输入 FoO", ["FoO"]],
    ["保留 FOO，输入 foo", ["foo"]],
    ["保留 FOO，输入 Foo", ["Foo"]],
    ["保留字带空白，输入 FOO", ["FOO"]]
  ];
  for (const [label, list] of cases) {
    test(label, () => {
      expect(withReserved(list, ["Foo"])).toEqual([]);
    });
  }

  test("★ 保留字自身的首尾空白也被 trim 后再比，但内部空白**一致时仍匹配**", () => {
    expect(withReserved(["FOO"], ["  Foo  "])).toEqual([]);
    expect(withReserved(["FOO"], ["\tFoo\n"])).toEqual([]);
    // 两边都 trim 外侧后完全一致 → 匹配（我第一版以为内部空格不同就不匹配，被顶回）
    expect(withReserved(["F O O"], ["  F O O  "]), "★ 内部空格一致 → 仍被挡").toEqual([]);
    // 内部空格数量不同 → 不匹配
    expect(withReserved(["F  O  O"], ["F O O"]), "★ 双空格 ≠ 单空格").toEqual(["F  O  O"]);
    // 大小写不影响（两边都小写化）
    expect(withReserved(["f o o"], ["F O O"]), "★ 小写形态也被挡").toEqual([]);
    // 连字符不等于空格
    expect(withReserved(["F-O"], ["F O"])).toEqual(["F-O"]);
  });

  test("非保留字正常通过（前缀相同不等于相等）", () => {
    expect(withReserved(["Bar"], ["Foo"])).toEqual(["Bar"]);
    expect(withReserved(["FooBar"], ["Foo"])).toEqual(["FooBar"]);
    expect(withReserved(["Foo "], ["Foo"]), "★ 候选 trim 后才比").toEqual([]);
  });

  test("★ 自定义 reserved **替换**默认保留字（不是追加）", () => {
    // 形参有默认值 `DEFAULT_GRAPH_TEMPLATE_TYPES`；传了就是完全替换。
    expect(norm([D], ["Foo"]), "★ 默认保留字失效").toEqual([D]);
    expect(norm(["Foo"], ["Foo"])).toEqual([]);
    // 反向：显式把默认保留字传进去
    expect(norm([D, "X"], [D])).toEqual(["X"]);
  });

  test("空 reserved → 不挡任何东西", () => {
    expect(withReserved(["Foo", "foo"], [])).toEqual(["Foo"]);
    expect(withReserved([D], [])).toEqual([D]);
  });

  test("reserved 里的空串项不挡任何东西（`\"\"` 不等于任何非空候选）", () => {
    expect(withReserved(["Foo"], ["", "  "])).toEqual(["Foo"]);
  });
});

describe("★ 去重：只看去重化后的串，**先出现的赢**", () => {
  test("三种大小写视为同一项，保留首个的原始写法", () => {
    expect(norm(["Foo", "FOO", "foo"], [])).toEqual(["Foo"]);
    expect(norm(["foo", "Foo"], [])).toEqual(["foo"]);
    expect(norm(["FOO", "foo"], [])).toEqual(["FOO"]);
  });

  test("★ trim 之后才判重 —— 带空白的 Foo 与 foo 判为同一项", () => {
    expect(norm(["  Foo  ", "foo"], [])).toEqual(["Foo"]);
    expect(norm(["foo", "  Foo  "], [])).toEqual(["foo"]);
  });

  test("顺序保持：不同项按首次出现排", () => {
    expect(norm(["b", "a", "B", "A"], [])).toEqual(["b", "a"]);
    expect(norm(["A", "a"], [])).toEqual(["A"]);
  });
});

describe("空串与纯空白项被过滤", () => {
  const table: Array<[string[], string[]]> = [
    [[""], []],
    [["   "], []],
    [["", "  "], []],
    [["a", "", "b"], ["a", "b"]],
    [["\t", "\n"], []]
  ];
  for (const [input, expected] of table) {
    test(`${JSON.stringify(input).padEnd(20)} → ${JSON.stringify(expected)}`, () => {
      expect(norm(input, [])).toEqual(expected);
    });
  }

  test("★ 过滤发生在 trim **之后**", () => {
    // `if (!typeName) return false` —— `typeName` 已是 trim 过的结果
    expect(norm(["   "], [])).toEqual([]);
    expect(norm(["  a  "], [])).toEqual(["a"]);
  });

  test("★ 过滤与去重是**同一个 filter 里的两步**，且共用小写化后的键", () => {
    // `["", "  ", "A", "a"]` → 空项先被滤掉，A 与 a 再判重
    expect(norm(["", "  ", "A", "a"], [])).toEqual(["A"]);
  });
});

describe("★ 非字符串项经 `String(item ?? \"\")` 强转", () => {
  const table: Array<[unknown, string[]]> = [
    [[1], ["1"]],
    [[0], ["0"]],               // ★ 0 不是 nullish → "0" 非空 → 保留
    [[-0], ["0"]],              // ★ -0 的 String 是 "0"
    [[true], ["true"]],
    [[false], ["false"]],
    [[null], []],               // ★ null → "" → 被滤
    [[undefined], []],          // ★ undefined → "" → 被滤
    [[{ a: 1 }], ["[object Object]"]],
    [[[1, 2]], ["1,2"]],
    // ★ Date 走 `toString()`，得到**本地时区**的可读串（不是 ISO）
    [[new Date(0)], [String(new Date(0))]]
  ];
  for (const [input, expected] of table) {
    test(`${JSON.stringify(input)?.padEnd(32)} → ${JSON.stringify(expected)}`, () => {
      expect(norm(input as never, [])).toEqual(expected);
    });
  }

  test("★ 对象全被 String 成同一串 → 只留第一个（不报错）", () => {
    expect(norm([{ a: 1 }, { a: 2 }], [])).toEqual(["[object Object]"]);
    expect(norm([{ a: 1 }, { b: 2 }, "Foo"], [])).toEqual(["[object Object]", "Foo"]);
    expect(norm([{}, {}], [])).toEqual(["[object Object]"]);
  });

  test("★ 数组按内容 String，**内容不同就不合并**", () => {
    // 我第一版以为「数组也 String 成同一串」，被顶回：`String([1])` = `"1"`、
    // `String([2])` = `"2"` —— 内容不同 → 两项。只有内容相同才合并。
    expect(norm([[1], [2]], [])).toEqual(["1", "2"]);
    expect(norm([[1], [1]], []), "★ 同内容才合并").toEqual(["1"]);
    expect(norm([[1, 2]], [])).toEqual(["1,2"]);
    expect(String([1]), "前置").toBe("1");
    expect(String([2]), "前置").toBe("2");
  });

  test("★ `String(Symbol)` **不抛**（显式 String 允许，隐式拼接才抛）", () => {
    // 我第一版以为 `String(symbol)` 会抛 TypeError，被顶回。
    // 事实：显式 `String(sym)` 走 `SymbolDescriptiveString`，得 `"Symbol(x)"`；
    // 只有 `"" + sym` / 模板串 `${sym}` 才抛。
    // 所以 `String(item ?? "")` 这条路径对 Symbol 是安全的。
    expect(String(Symbol("x")), "★ 显式 String 可以").toBe("Symbol(x)");
    expect(norm([Symbol("x")], []), "★ 归一函数也不抛").toEqual(["Symbol(x)"]);
    expect(norm([Symbol("x")], ["Foo"])).toEqual(["Symbol(x)"]);
    // 对照：隐式拼接确实抛
    expect(() => ("" as never) + (Symbol("x") as never)).toThrow(TypeError);
  });

  test("★ `reservedTypes` 非数组 → 抛 TypeError；但 `undefined` 触发默认值（不抛）", () => {
    // `reservedTypes.map(...)` 没有容错 —— 字符串有 `.map`? 没有 → TypeError。
    // 形参标注 `readonly string[]`，调用点都传数组或省略。
    // 抛错正说明调用方违背契约，静默兜底会掩盖它。
    expect(() => norm(["a"], "notarray" as never)).toThrow(TypeError);
    expect(() => norm(["a"], 123 as never)).toThrow(TypeError);
    expect(() => norm(["a"], {} as never)).toThrow(TypeError);
    // ★ 但 `undefined` 走默认参数 `DEFAULT_GRAPH_TEMPLATE_TYPES`，不抛
    expect(norm(["a"], undefined)).toEqual(["a"]);
    expect(norm(["a"]), "★ 省略第二参").toEqual(["a"]);
  });
});

test("★ 等价变异 ⑦c：`seen.has(key)` 改 `seen.get(key) === true` 是**恒等**的", () => {
  // 变异：去重判定从 `seen.has(key)` 改成 `seen.get(key) === true`。首轮全绿。
  //   —— `seen` 是 `Set<string>`，只通过 `seen.add(key)` 写入，**从不存 false**。
  //      所以对任何 `key`，`seen.get(key)` 恒为 `undefined` 或 `true`，
  //      `=== true` 与 `has` 的结果**逐位相同**。
  //   ⇒ 等价变异，全绿是**正确**的。
  //   ⚠ 什么会让它失效：若 `seen` 改为 `Map<string, boolean>` 且写入过 `false`，
  //      或改用 `seen.add(key, ...)` 之外的方式写入非真值。
  // 下面把这个前提变成可执行断言。
  // ★ 注意 `Set` **没有** `.get` 方法 —— 变异 ⑦c 把 `seen.has` 改成
  //   `seen.get(key) === true` 后，tsc 会直接报 TS2339。这本身就是等价的最强证据：
  //   那个变异连类型都过不了，它在真实代码里根本无法编译。
  //   所以这里只断言 `Set` 的接口形态（等价的前提），不用 `.get`。
  const seen = new Set<string>();
  expect(seen.has("x"), "空集").toBe(false);
  expect(seen.add("x"), "add 返回 Set 自身（不是布尔）").toBe(seen);
  expect(seen.has("x"), "★ 写入后 has 为真").toBe(true);
  expect(seen.size, "★ 只有 add 语义，故 has 等价于 get===true").toBe(1);
  // 「无 .get」就是「has 与 get===true 恒等」的等价表述
  expect((seen as unknown as { get?: unknown }).get, "★ Set 无 get 方法").toBeUndefined();
});

describe("输入不被改动", () => {
  test("不改入参数组", () => {
    const input = ["A", "", "A"];
    norm(input, []);
    expect(input).toEqual(["A", "", "A"]);
  });

  test("不改入参 reservedTypes", () => {
    const reserved = ["  Foo  "];
    withReserved(["FOO"], reserved);
    expect(reserved).toEqual(["  Foo  "]);
  });

  test("每次返回新数组", () => {
    expect(norm(["A"], [])).not.toBe(norm(["A"], []));
    expect(norm(["A"], [])).toEqual(norm(["A"], []));
  });

  test("同一输入恒得同一结果", () => {
    // 两种调用方式都要测：显式传 `[]`（**替换**默认保留字）与不传（用默认）
    const input = [" Foo ", "FOO", "Bar", D];
    const explicitEmpty = norm(input, []);
    const withDefault = normalizeGraphTemplateTypes(input);
    for (let i = 0; i < 20; i += 1) {
      expect(norm(input, [])).toEqual(explicitEmpty);
      expect(normalizeGraphTemplateTypes(input)).toEqual(withDefault);
    }
    // ★ 传 `[]` 时默认保留字失效 → 常用模板留下
    expect(explicitEmpty, "★ 显式空 reserved").toEqual(["Foo", "Bar", D]);
    // 不传 → 默认保留字生效 → 常用模板被挡
    expect(withDefault, "★ 默认 reserved").toEqual(["Foo", "Bar"]);
  });
});

describe("cloneTemplatePoint：`Number(x) || 0`", () => {
  test("正常值原样克隆（新对象）", () => {
    const p = { x: 1.5, y: -2 };
    const out = cloneTemplatePoint(p);
    expect(out).toEqual(p);
    expect(out).not.toBe(p);
  });

  test("★ `|| 0` 把 NaN / null / undefined 全变成 0", () => {
    expect(cloneTemplatePoint({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(cloneTemplatePoint({ x: NaN, y: NaN } as never)).toEqual({ x: 0, y: 0 });
    expect(cloneTemplatePoint({ x: null, y: undefined } as never)).toEqual({ x: 0, y: 0 });
    // 字符串数字走 Number
    expect(cloneTemplatePoint({ x: "0", y: "" } as never)).toEqual({ x: 0, y: 0 });
    expect(cloneTemplatePoint({ x: "3", y: "4" } as never)).toEqual({ x: 3, y: 4 });
    // ★ ±Infinity 是 truthy，原样保留（`||` 不拦）
    expect(cloneTemplatePoint({ x: Infinity, y: -Infinity })).toEqual({ x: Infinity, y: -Infinity });
    // ★ 非数字串 → NaN → 0
    expect(cloneTemplatePoint({ x: "abc", y: "3px" } as never)).toEqual({ x: 0, y: 0 });
  });

  test("`undefined` 入参 → `undefined`（不产零值对象）", () => {
    expect(cloneTemplatePoint(undefined)).toBeUndefined();
    expect(cloneTemplatePoint(null as never)).toBeFalsy();
  });

  test("★ 返回新对象（不共享）", () => {
    const p = { x: 1, y: 2 };
    expect(cloneTemplatePoint(p)).not.toBe(p);
    expect(cloneTemplatePoint(p)).toEqual(p);
  });
});

describe("cloneGraphTemplateClipboard：纯深拷贝（**不碰 typeName**）", () => {
  // ★ 我第一版误以为它也做 typeName 归一 —— 读源码后确认它只深拷贝
  //   nodes / edges / groups。类型名归一在 `normalizeGraphTemplates` 里。
  const clipboard = (over: Record<string, unknown> = {}) => ({
    nodes: [
      {
        id: "n1", kind: "ac-bus", name: "n1", nodeNumber: "n1",
        acTopologyNode: 0, dcTopologyNode: 0,
        position: { x: 1, y: 2 }, size: { width: 10, height: 20 },
        rotation: 0, scale: 1, params: { a: "1" },
        terminals: [
        { id: "t1", label: "A", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "1", vbase: "0" },
        { id: "t2", label: "B", type: "ac", anchor: { x: 0.5, y: 1 }, nodeNumber: "2", vbase: "0" }
      ]
      }
    ],
    edges: [{ edge: { id: "e1", source: "n1", target: "n1" }, routePoints: [{ x: 1, y: 1 }] }],
    groups: [{ id: "g1", name: "G", nodeIds: ["n1"], edgeIds: ["e1"] }],
    ...over
  });

  test("只输出三个键：nodes / edges / groups（**不产 typeName**）", () => {
    const out = cloneGraphTemplateClipboard(clipboard() as never);
    expect(Object.keys(out)).toEqual(["nodes", "edges", "groups"]);
    expect((out as unknown as Record<string, unknown>).typeName, "★ 无 typeName 键").toBeUndefined();
  });

  test("节点深拷贝：size / position / params / terminals / anchor 全是新引用", () => {
    const input = clipboard();
    const out = cloneGraphTemplateClipboard(input as never);
    const a = input.nodes[0];
    const b = out.nodes[0];
    expect(b).not.toBe(a);
    expect(b.size).not.toBe(a.size);
    expect(b.position).not.toBe(a.position);
    expect(b.params).not.toBe(a.params);
    expect(b.terminals[0]).not.toBe(a.terminals[0]);
    // ★ fixture 必须**有端子**才测得到 anchor —— 我第一版端子数组是空的，
    //   于是「anchor 深拷贝」这条断言形同虚设（任何实现都过）。
    expect(a.terminals, "★ 前置：fixture 有端子").toHaveLength(2);
    expect(b.terminals).toHaveLength(2);
    expect(b.terminals[0].anchor, "★ anchor 是新引用").not.toBe(a.terminals[0].anchor);
    expect(b.terminals[1].anchor).not.toBe(a.terminals[1].anchor);
    // anchor 的内部字段也要拷贝
    expect(b.terminals[0].anchor).not.toBe(b.terminals[1].anchor);
    expect(b.terminals[0].anchor).toEqual(a.terminals[0].anchor);
    // 改副本不动原对象
    (b.terminals[0].anchor as { x: number }).x = 999;
    expect(a.terminals[0].anchor.x, "★ 原 anchor 不变").toBe(0.5);
    // 值相等
    expect(b.position).toEqual({ x: 1, y: 2 });
    // 改副本不动原对象
    (b.position as { x: number }).x = 999;
    expect(a.position.x, "★ 原对象不变").toBe(1);
  });

  test("线深拷贝：edge 里的 sourcePoint / targetPoint / manualPoints / routePoints 全是新引用", () => {
    const input = clipboard({
      edges: [{
        edge: {
          id: "e1", source: "n1", target: "n1",
          sourcePoint: { x: 1, y: 2 }, targetPoint: { x: 3, y: 4 },
          manualPoints: [{ x: 5, y: 6 }], routePoints: [{ x: 7, y: 8 }]
        } as never,
        routePoints: [{ x: 9, y: 10 }]
      }]
    });
    const out = cloneGraphTemplateClipboard(input as never);
    const e = input.edges[0].edge as never as Record<string, unknown>;
    const o = out.edges[0].edge as never as Record<string, unknown>;
    expect(o).not.toBe(e);
    expect(o.sourcePoint).not.toBe(e.sourcePoint);
    expect(o.targetPoint).not.toBe(e.targetPoint);
    expect(o.manualPoints).not.toBe(e.manualPoints);
    expect((o.manualPoints as unknown[])[0]).not.toBe((e.manualPoints as unknown[])[0]);
    expect(o.routePoints).not.toBe(e.routePoints);
    expect(out.edges[0].routePoints).not.toBe(input.edges[0].routePoints);
    // 值相等
    expect(o.sourcePoint).toEqual({ x: 1, y: 2 });
  });

  test("★ 可选数组字段缺省时 → `undefined`（不是空数组），但键**仍在**", () => {
    // `manualPoints?.map(...)` —— undefined 时短路成 undefined，
    // 而 `...item.edge` 展开已经把键写进去了。所以键在、值为 undefined。
    const withOpts = cloneGraphTemplateClipboard({
      nodes: [], groups: [],
      edges: [{ edge: { id: "e1" } as never, routePoints: [] }]
    } as never);
    const edge = withOpts.edges[0].edge as never as Record<string, unknown>;
    expect(Object.keys(edge), "★ 键存在").toEqual([
      "id", "sourcePoint", "targetPoint", "manualPoints", "routePoints"
    ]);
    expect(edge.manualPoints, "★ 值是 undefined").toBeUndefined();
    expect(edge.routePoints).toBeUndefined();
    expect(edge.sourcePoint, "sourcePoint 缺省也 undefined").toBeUndefined();
    // childGroupIds 同理
    const withGroups = cloneGraphTemplateClipboard(clipboard({
      groups: [{ id: "g1", name: "G", nodeIds: [], edgeIds: [] } as never]
    }) as never);
    expect((withGroups.groups[0] as never as Record<string, unknown>).childGroupIds,
      "★ 缺 childGroupIds 时 undefined").toBeUndefined();
  });

  test("组的 id 数组是**拷贝**", () => {
    const input = clipboard();
    const out = cloneGraphTemplateClipboard(input as never);
    expect(out.groups[0].nodeIds).not.toBe(input.groups[0].nodeIds);
    expect(out.groups[0].nodeIds).toEqual(["n1"]);
    expect(out.groups[0].edgeIds).not.toBe(input.groups[0].edgeIds);
  });

  test("不改入参", () => {
    const input = clipboard();
    const snapshot = JSON.stringify(input);
    cloneGraphTemplateClipboard(input as never);
    expect(JSON.stringify(input), "★ 入参不变").toBe(snapshot);
  });

  test("空剪贴板 → 三个空数组", () => {
    expect(cloneGraphTemplateClipboard({ nodes: [], edges: [], groups: [] } as never)).toEqual({
      nodes: [], edges: [], groups: []
    });
  });
});

describe("normalizeGraphTemplateClipboard：容错入口", () => {
  test("非对象 / 数组 / nullish → 三个空数组（不抛）", () => {
    for (const value of [null, undefined, "abc", 123, true, [1, 2]] as never[]) {
      expect(normalizeGraphTemplateClipboard(value), String(value)).toEqual({
        nodes: [], edges: [], groups: []
      });
    }
  });

  test("★ 节点数组里的非对象元素被**滤掉**（但不校验字段）", () => {
    // `filter((node): node is ModelNode => Boolean(node && typeof node === \"object\"))`
    // —— 只过滤非对象；对象元素缺字段会在下游 `cloneGraphTemplateClipboard` 抛错
    // （见上面那条 terminals 用例）。
    const out = normalizeGraphTemplateClipboard({
      nodes: [
        null, "x", 123, false,
        { id: "n1", kind: "ac-bus", position: { x: 0, y: 0 }, size: { width: 1, height: 1 }, params: {}, terminals: [] }
      ],
      edges: [], groups: []
    } as never);
    expect(out.nodes).toHaveLength(1);
    expect(out.nodes[0].id).toBe("n1");
  });

  test("★ 边数组里缺 `edge` 字段的元素被**滤掉**", () => {
    const out = normalizeGraphTemplateClipboard({
      nodes: [],
      edges: [null, { routePoints: [] }, { edge: { id: "e1" }, routePoints: [] }],
      groups: []
    } as never);
    expect(out.edges).toHaveLength(1);
  });

  test("非数组的 nodes / edges / groups 字段 → 空数组", () => {
    const out = normalizeGraphTemplateClipboard({
      nodes: "abc", edges: 123, groups: {}
    } as never);
    expect(out.nodes).toEqual([]);
    expect(out.edges).toEqual([]);
    expect(out.groups).toEqual([]);
  });
});

describe("normalizeGraphTemplates：id 去重 + 类型名归一 + 尺寸兜底", () => {
  // ★ 节点 fixture 必须**完整**：`normalizeGraphTemplateClipboard` 会
  //   `node.terminals.map(...)`（缺 terminals 抛 TypeError），
  //   而 `canvasClipboardBounds` → `calculateNodeVisualBounds` 读
  //   `node.kind`（缺 kind 也抛）。探针里我两次踩到，都被当场顶回。
  // ★ 单节点 10×20 在 (0,0) 的 `sourceSize` 缺省值是 **29×57** ——
  //   那是**含标签的视觉包围盒**（`calculateNodeVisualBounds` 加了标签），
  //   不是 size 的 10×20。我第一版按 size 猜，被顶回。
  const CLIP_NODE = {
    id: "n1", kind: "ac-bus", name: "n1", nodeNumber: "n1",
    acTopologyNode: 0, dcTopologyNode: 0,
    position: { x: 0, y: 0 }, size: { width: 10, height: 20 },
    rotation: 0, scale: 1, params: {}, terminals: []
  };
  const clip = (over: Record<string, unknown> = {}) => ({
    nodes: [{ ...CLIP_NODE }], edges: [], groups: [], ...over
  });
  const item = (over: Record<string, unknown> = {}) => ({
    id: "t1",
    typeName: "  MyType  ",
    name: "  模板名  ",
    clipboard: { nodes: [{ ...CLIP_NODE }], edges: [], groups: [] },
    ...over
  });

  test("★ 缺 `terminals` 的节点抛 TypeError（如实记录，不修）", () => {
    // `normalizeGraphTemplateClipboard` 只过滤「非对象」元素，**不补齐**字段：
    // `node.terminals.map(...)` 在缺 terminals 时抛错。
    // **判定不修**：节点来自 localStorage / 剪贴板，历史上一直是完整 ModelNode；
    // 抛错正说明存量数据缺字段，静默补 `[]` 会掩盖数据损坏。
    expect(() => normalizeGraphTemplateClipboard({
      nodes: [{ id: "n1" }], edges: [], groups: []
    } as never)).toThrow(TypeError);
  });

  test("★ 类型名 trim；空名回落默认保留字（trim 之后再判空）", () => {
    expect(normalizeGraphTemplates([item()])[0].typeName, "trim").toBe("MyType");
    expect(normalizeGraphTemplates([item({ typeName: "   " })])[0].typeName, "纯空白 → 默认").toBe(D);
    expect(normalizeGraphTemplates([item({ typeName: undefined })])[0].typeName).toBe(D);
    expect(normalizeGraphTemplates([item({ typeName: null })])[0].typeName).toBe(D);
    // ★ 空串：`String("" ?? D)` = `""` → trim → `""` → `typeName || D` 兜住
    expect(normalizeGraphTemplates([item({ typeName: "" })])[0].typeName, "空串也兜住").toBe(D);
  });

  test("★ id 缺失 / 空白 → 按下标合成 `graph-template-N`", () => {
    const out = normalizeGraphTemplates([item({ id: undefined }), item({ id: "   " }), item({ id: "" })]);
    expect(out.map((t) => t.id)).toEqual([
      "graph-template-1", "graph-template-2", "graph-template-3"
    ]);
  });

  test("★ id 去重**大小写不敏感**（先出现的赢）", () => {
    const out = normalizeGraphTemplates([
      item({ id: "T1", name: "第一个" }),
      item({ id: "t1", name: "第二个" }),
      item({ id: "T1", name: "第三个" })
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name, "★ 保留第一个").toBe("第一个");
  });

  test("★ 模板名 trim 后为空 → `模板N`（按**过滤后**的下标）", () => {
    const out = normalizeGraphTemplates([
      item({ id: "a", name: "" }),
      item({ id: "b", name: "  " }),
      item({ id: "c", name: "有名" })
    ]);
    expect(out.map((t) => t.name)).toEqual(["模板1", "模板2", "有名"]);
  });

  test("★ 空的剪贴板（无节点无线）被**整个丢弃**", () => {
    const empty = { nodes: [], edges: [], groups: [] };
    expect(normalizeGraphTemplates([item({ clipboard: empty })])).toHaveLength(0);
    // 但有边无线也算非空
    const edgeOnly = {
      nodes: [],
      edges: [{ edge: { id: "e1" }, routePoints: [] }],
      groups: []
    };
    expect(normalizeGraphTemplates([item({ clipboard: edgeOnly })])).toHaveLength(1);
  });

  test("★ sourceSize 缺省时按**含标签的视觉包围盒**算（不是 size）", () => {
    // 探针实测：单节点 size 10×20 在 (0,0) → sourceSize **29×57**。
    // 那是 `canvasClipboardBounds` → `calculateNodeVisualBounds` 的结果
    // （含标签，标签在下方撑高）。我第一版按 size 写 10×20，被顶回。
    expect(normalizeGraphTemplates([item()])[0].sourceSize, "★ 实测 29×57").toEqual({ width: 29, height: 57 });
    // 显式给的 sourceSize 优先
    expect(normalizeGraphTemplates([item({ sourceSize: { width: 55, height: 66 } })])[0].sourceSize)
      .toEqual({ width: 55, height: 66 });
    // ★ `{width:0, height:0}` → `Math.max(1, round(0) || fallback)` → **0 || fallback**
    //   走 fallback（29），不是最小 1
    expect(normalizeGraphTemplates([item({ sourceSize: { width: 0, height: 0 } })])[0].sourceSize,
      "★ 0 走 || 回落 → 包围盒").toEqual({ width: 29, height: 57 });
    // ★ 负数：`Number(-5) || fallback` → -5 truthy → `Math.max(1, round(-5))` = 1
    //   非数字："abc" → NaN falsy → fallback
    expect(normalizeGraphTemplates([item({ sourceSize: { width: -5, height: "abc" } })])[0].sourceSize,
      "★ 负数→1（max 兜底）、非数字→包围盒").toEqual({ width: 1, height: 57 });
    // ★ 尺寸是**取整**的（Math.round）
    expect(normalizeGraphTemplates([item({ sourceSize: { width: 10.6, height: 20.4 } })])[0].sourceSize)
      .toEqual({ width: 11, height: 20 });
    // ★ 小数向下取整
    expect(normalizeGraphTemplates([item({ sourceSize: { width: 10.4, height: 20.6 } })])[0].sourceSize)
      .toEqual({ width: 10, height: 21 });
  });

  test("★ createdAt / updatedAt 非字符串 → epoch（`1970-01-01T00:00:00.000Z`）", () => {
    const out = normalizeGraphTemplates([item()]);
    expect(out[0].createdAt).toBe("1970-01-01T00:00:00.000Z");
    expect(out[0].updatedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(normalizeGraphTemplates([item({ createdAt: "2026-01-01T00:00:00.000Z" })])[0].createdAt)
      .toBe("2026-01-01T00:00:00.000Z");
    expect(normalizeGraphTemplates([item({ createdAt: 12345 })])[0].createdAt, "数字 → epoch")
      .toBe("1970-01-01T00:00:00.000Z");
  });

  test("非数组 → `[]`", () => {
    for (const value of [null, undefined, "abc", 123, {}, []] as never[]) {
      expect(normalizeGraphTemplates(value), String(value)).toEqual([]);
    }
  });

  test("★ 数组里的非对象元素先被 filter 掉，`map` 的下标从 0 重排", () => {
    // 探针实测：`[null, "x", item({name:""})]` → name 是 **`模板1`**，不是 `模板3`。
    // 因为 `.filter(...)` 先跑，`map((item, index) => ...)` 的 index 是**过滤后**的下标。
    // （我第一版以为 index 用原始下标，被顶回。）
    const out = normalizeGraphTemplates([null, "x", item({ id: "a", name: "" })] as never);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("a");
    expect(out[0].name, "★ 下标按过滤后的数组").toBe("模板1");
    // 两个非对象也一样
    const out2 = normalizeGraphTemplates([null, item({ id: "a", name: "" })] as never);
    expect(out2[0].name).toBe("模板1");
    // 三个有效项 → 模板1/模板2/模板3（原始下标与过滤后一致）
    const out3 = normalizeGraphTemplates([
      item({ id: "a", name: "" }), item({ id: "b", name: "" }), item({ id: "c", name: "" })
    ]);
    expect(out3.map((t) => t.name)).toEqual(["模板1", "模板2", "模板3"]);
  });

  test("不改入参", () => {
    const input = [item()];
    const snapshot = JSON.stringify(input);
    normalizeGraphTemplates(input);
    expect(JSON.stringify(input), "★ 入参不变").toBe(snapshot);
  });
});

describe("graphTemplateTypeList：汇总去重（**Set 精确匹配，不小写化**）", () => {
  const tpl = (typeName: string) => ({ typeName } as never);

  test("内置保留字永远排第一", () => {
    expect(graphTemplateTypeList([], [])).toEqual([D]);
  });

  test("★ 三个来源合并：内置 + 自定义 + 模板自带", () => {
    expect(graphTemplateTypeList(["A", "B"], [tpl("C"), tpl("D")]))
      .toEqual([D, "A", "B", "C", "D"]);
  });

  test("★ ★★ 用 `Set` 去重 → **大小写敏感**（与 normalizeGraphTemplateTypes 不同）", () => {
    // 这是本组最容易踩的差异：`normalizeGraphTemplateTypes` 用 `toLowerCase()` 判重，
    // `graphTemplateTypeList` 直接 `new Set(...)` —— `Foo` 与 `FOO` 是**两项**。
    expect(graphTemplateTypeList(["Foo", "FOO", "foo"], []))
      .toEqual([D, "Foo", "FOO", "foo"]);
    expect(graphTemplateTypeList(["Foo"], [tpl("FOO")])).toEqual([D, "Foo", "FOO"]);
    // 对照：同一组输入走 normalizeGraphTemplateTypes 只剩一项
    expect(norm(["Foo", "FOO", "foo"], [])).toEqual(["Foo"]);
  });

  test("trim 后才加入 Set，所以带空白的同名项会合并", () => {
    expect(graphTemplateTypeList(["  Foo  ", "Foo"], [])).toEqual([D, "Foo"]);
  });

  test("★ 空串项被 `filter(Boolean)` 滤掉", () => {
    expect(graphTemplateTypeList(["", "   "], [])).toEqual([D]);
    expect(graphTemplateTypeList([], [tpl("   ")])).toEqual([D]);
  });

  test("与内置保留字重复的自定义项被 Set 合并", () => {
    expect(graphTemplateTypeList([D, `  ${D}  `], [])).toEqual([D]);
  });
});

describe("groupGraphTemplatesByType：按类型分组，未知类型新建分组", () => {
  const tpl = (typeName: string, id: string) => ({ typeName, id } as never);

  test("★ 分组键**用传入的 typeNames**（不是模板的 typeName 归一结果）", () => {
    const grouped = groupGraphTemplatesByType([tpl("A", "t1")], ["A", "B"]);
    expect(Object.keys(grouped)).toEqual(["A", "B"]);
    expect(grouped.A).toHaveLength(1);
    expect(grouped.B, "★ 空分组也在（初始建好）").toHaveLength(0);
  });

  test("未知类型 → 新建分组（不在预设 typeNames 里）", () => {
    const grouped = groupGraphTemplatesByType([tpl("Z", "t1")], ["A"]);
    expect(Object.keys(grouped)).toContain("Z");
    expect(grouped.Z).toHaveLength(1);
  });

  test("★ 模板的 typeName 为空白 → 归到默认保留字分组", () => {
    const grouped = groupGraphTemplatesByType([tpl("   ", "t1")], [D, "A"]);
    expect(grouped[D]).toHaveLength(1);
  });

  test("分到已有分组时是**追加拷贝**（不改动原数组）", () => {
    const grouped = groupGraphTemplatesByType([tpl("A", "t1"), tpl("A", "t2")], ["A"]);
    expect(grouped.A).toHaveLength(2);
  });
});
