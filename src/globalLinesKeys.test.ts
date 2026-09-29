// src/global-lines.ts（674 行，本会话此前完全没碰过的模块）：
//   globalLineModelKey          跨模型全局线路的**记录键**（双格式）
//   globalLineEnergyTypeForKind 线路能量类型（ac / dc / ""）
//   globalLineEndpointNodeIds   从 params 提取两端节点 id
//   isManagedGlobalLineModelType
//
// 记录键判错的后果是**跨模型引用串台**：全局线路挂到了别的模型上，
// 界面上只是一条线指错地方，没有任何报错。
import { describe, expect, test } from "vitest";
import {
  GLOBAL_LINE_ID_PARAM,
  GLOBAL_LINE_MODEL_PAIR_PARAM,
  globalLineEnergyTypeForKind,
  globalLineEnergyTypeForNode,
  globalLineEndpointNodeIds,
  globalLineModelKey,
  isManagedGlobalLineModelType
} from "./global-lines";
import { ROUTABLE_LINE_SOURCE_NODE_PARAM, ROUTABLE_LINE_TARGET_NODE_PARAM } from "./model";

const SRC = ROUTABLE_LINE_SOURCE_NODE_PARAM;
const DST = ROUTABLE_LINE_TARGET_NODE_PARAM;

describe("全局线路的两个参数键常量", () => {
  test("两个键都以 `_` 开头（内部参数命名约定）", () => {
    // 图元库/全局线路相关参数一律下划线前缀（与 model 里的其它内部参数一致）。
    // 若改成普通名字，存量模型里的参数就读不到了。
    expect(GLOBAL_LINE_ID_PARAM).toBe("_globalLineId");
    expect(GLOBAL_LINE_MODEL_PAIR_PARAM).toBe("_globalLineModelPair");
    for (const key of [GLOBAL_LINE_ID_PARAM, GLOBAL_LINE_MODEL_PAIR_PARAM]) {
      expect(key.startsWith("_"), key).toBe(true);
    }
  });
});

describe("globalLineModelKey：model:N 分支的判定是 `Number.isSafeInteger(Number(idx)) && > 0`", () => {
  const modelBranch: Array<[unknown, string]> = [
    [1, "model:1"], [2, "model:2"], [3, "model:3"],
    [3.0, "model:3"],
    // ★ 字符串会被 Number 强转后命中
    ["3", "model:3"], ["03", "model:3"], [" 3 ", "model:3"],
    ["0x10", "model:16"], ["1e3", "model:1000"],
    // ★ 布尔与数组也会
    [true, "model:1"], [[3], "model:3"],
    [Number.MAX_SAFE_INTEGER, "model:9007199254740991"]
  ];
  for (const [idx, expected] of modelBranch) {
    test(`projectIdx = ${JSON.stringify(idx)?.padEnd(22)} → ${expected}`, () => {
      expect(globalLineModelKey(idx as never, [], "P")).toBe(expected);
    });
  }

  const pathBranch: Array<[unknown, string]> = [
    [0, "path:P"], [-1, "path:P"], [3.5, "path:P"],
    [false, "path:P"], [null, "path:P"], [undefined, "path:P"],
    [[], "path:P"], [{}, "path:P"],
    [1e21, "path:P"],                       // 超过 MAX_SAFE_INTEGER
    [Number.MAX_SAFE_INTEGER + 1, "path:P"],
    ["abc", "path:P"]
  ];
  for (const [idx, expected] of pathBranch) {
    test(`projectIdx = ${String(JSON.stringify(idx)).padEnd(22)} → ${expected}（path 分支）`, () => {
      expect(globalLineModelKey(idx as never, [], "P")).toBe(expected);
    });
  }

  test("★ `projectIdx` 与 `schemePath` 双给时 idx 胜出（path 被忽略）", () => {
    expect(globalLineModelKey(5, ["A", "B"], "C")).toBe("model:5");
    // 0 不算有效 → 落 path，且此时 path 会被真正用上
    expect(globalLineModelKey(0, ["A", "B"], "C")).toBe("path:A/B/C");
  });

  test("★ 全空输入 → 产出 `path:`（带尾冒号、无内容）", () => {
    // 探针实测 `globalLineModelKey(undefined, [], "") === "path:"`。
    // 形参类型是 `string[]` / `string`，但空数组与空串是合法输入 ——
    // 这个 key 会被写进 `_globalLineModelPair`，故如实记录。
    const key = globalLineModelKey(undefined, [], "");
    expect(key).toBe("path:");
    expect(key.startsWith("path:")).toBe(true);
  });
});

describe("globalLineModelKey：path 分支的拼装规则", () => {
  // `[...schemePath, projectName].map((part) => String(part ?? "").trim()).filter(Boolean).join("/")`
  const cases: Array<[string, Array<unknown>, unknown, string]> = [
    ["空 path + 名字", [], "P", "path:P"],
    ["一级 path", ["方案A"], "模型B", "path:方案A/模型B"],
    ["多级 path + 空名", ["方案A", "子方案", "模型B"], "", "path:方案A/子方案/模型B"],
    // ★ trim 掉空白段，filter(Boolean) 掉 trim 后为空的段
    ["纯空白段被丢", ["  方案A  ", "  ", "模型B"], "", "path:方案A/模型B"],
    ["名字两边空白", ["  "], "  x  ", "path:x"],
    // ★ nullish 变空串后被 filter 掉；中间空洞仍以 / 连接
    ["nullish 段", [null, undefined, "x"], "y", "path:x/y"],
    ["中间空洞", ["a", null, "b"], "", "path:a/b"],
    ["空串段", ["a", "", "b"], "", "path:a/b"],
    ["数字被 String()", [1, 2], 3, "path:1/2/3"],
    ["单段空串", [""], "x", "path:x"]
  ];
  for (const [label, path, name, expected] of cases) {
    test(label, () => {
      expect(globalLineModelKey(undefined, path as never, name as never)).toBe(expected);
    });
  }

  test("★ path 分支**不做路径转义** → 名字含 `/` 会与多级 path 碰撞", () => {
    // 探针实测：`path:["a/b"], name="c"` 与 `path:["a","b"], name="c"` 都得
    // `path:a/b/c` —— 两条不同的模型算出同一个键。
    //
    // **判定不修**：已核对 `data/` 下 89 个 json，**scheme / model 名含 `/` 的 0 条**
    // （含 `/` 的 10 条全是**图元库分类名**如 `预设/矩形 / 正方形`，
    //  那些走的是图元库键，不经过本函数）。所以碰撞在当前数据里不可达。
    // 修它要给每段做 encodeURIComponent —— 而那会让**所有**存量模型的键都变，
    // 等于一次破坏性迁移。已把「数据里 0 条」这个判断依据写在这里，
    // 若日后出现含 `/` 的方案名，这条会提醒先做迁移评估。
    const collideA = globalLineModelKey(undefined, ["a/b"], "c");
    const collideB = globalLineModelKey(undefined, ["a", "b"], "c");
    expect(collideA, "单段含斜杠").toBe("path:a/b/c");
    expect(collideB, "拆成两段").toBe("path:a/b/c");
    expect(collideA, "★ 两者真的相同").toBe(collideB);
  });

  test("两分支**不会**互相碰撞（前缀不同）", () => {
    const viaModel = globalLineModelKey(1, [], "X");
    const viaPath = globalLineModelKey(undefined, ["X"], "");
    expect(viaModel).toBe("model:1");
    expect(viaPath).toBe("path:X");
    expect(viaModel).not.toBe(viaPath);
  });

  test("★ 下面两条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
    // ⑨ `model:${numericIndex}` 改 `model:${String(numericIndex)}`
    //   —— 到这行时 numericIndex 已被 `Number.isSafeInteger` 证明是整数，
    //      `String(整数)` 与模板串对数字的隐式转换结果**逐字节相同**。
    //   → 变异在语义上根本不不同，全绿是应有结果，测试无需加强。
    //   ⚠ 什么会让它失效：若把 `Number.isSafeInteger` 一并去掉（改成 `isFinite`），
    //      numericIndex 就可能是 `1e21` → `String(1e21)` = `"1e+21"`，
    //      而模板串同样得 `"1e+21"` —— 仍等价。真正能让它分开的是
    //      `numericIndex` 变成 `NaN`/`Infinity`，但那已被判定挡掉。
    expect(globalLineModelKey(1e21 as never, [], "P"), "isFinite 放行的最大量级").toBe("path:P");

    // ⑩ `GLOBAL_LINE_MODEL_TYPES.has(x)` 改 `[...SET].includes(x)`
    //   —— 三元素 Set 对 7 个输入的 membership 结果与数组 `includes`
    //      完全一致（`includes` 用 SameValueZero，`Set.has` 也用 SameValueZero）。
    //   → 同样是等价变异。全绿正确。
    //   ⚠ 什么会让它失效：若集合变大到需要性能，`includes` 是 O(n)；
    //      那属于性能退化，输出断言看不见 —— 要断言得改性能断言。
    const byArray = ["厂站", "馈线", "台区"].includes("厂站");
    expect(byArray, "数组版对命中项的结论一致").toBe(
      isManagedGlobalLineModelType("厂站")
    );
  });

  test("不改动入参（`[...schemePath]` 是拷贝）", () => {
    const path = ["a", "b"];
    globalLineModelKey(undefined, path as never, "c");
    expect(path).toEqual(["a", "b"]);
  });

  test("同一输入恒得同一 key（键必须稳定）", () => {
    const once = globalLineModelKey(undefined, ["方案A", "子方案"], "模型B");
    for (let i = 0; i < 50; i += 1) {
      expect(globalLineModelKey(undefined, ["方案A", "子方案"], "模型B")).toBe(once);
    }
  });
});

describe("globalLineEnergyTypeForKind：只有 4 个 baseKind 命中", () => {
  const table: Array<[string, string]> = [
    ["ac-routable-line", "ac"],
    ["ac-zero-routable-branch", "ac"],
    ["dc-routable-line", "dc"],
    ["dc-zero-routable-branch", "dc"],
    // ★ `-vertical` 被 baseDeviceKind 剥掉，四个都仍然命中
    ["ac-routable-line-vertical", "ac"],
    ["dc-routable-line-vertical", "dc"],
    ["ac-zero-routable-branch-vertical", "ac"],
    ["dc-zero-routable-branch-vertical", "dc"],
    // 不命中
    ["ac-line", ""], ["dc-line", ""], ["ac-breaker", ""], ["ac-routable", ""],
    ["", ""], ["nope", ""], ["routable-line", ""]
  ];
  for (const [kind, expected] of table) {
    test(`${JSON.stringify(kind).padEnd(34)} → ${JSON.stringify(expected)}`, () => {
      expect(globalLineEnergyTypeForKind(kind)).toBe(expected);
    });
  }

  test("★ 判定走 `baseDeviceKind`，所以只有 4 个 baseKind 能命中", () => {
    const hitting = new Set(
      ["ac-routable-line", "ac-zero-routable-branch", "dc-routable-line", "dc-zero-routable-branch",
        "ac-routable-line-vertical", "ac-zero-routable-branch-vertical",
        "dc-routable-line-vertical", "dc-zero-routable-branch-vertical"]
        .filter((k) => globalLineEnergyTypeForKind(k) !== "")
    );
    expect(hitting.size, `命中的 kind 数：${[...hitting].join(", ")}`).toBe(8);
  });

  test("`globalLineEnergyTypeForNode` 只是转发 `kind`（不读 params）", () => {
    expect(globalLineEnergyTypeForNode({ kind: "ac-routable-line" } as never)).toBe("ac");
    expect(globalLineEnergyTypeForNode({ kind: "dc-routable-line" } as never)).toBe("dc");
    expect(globalLineEnergyTypeForNode({ kind: "ac-line" } as never)).toBe("");
    // 与 `globalLineEnergyTypeForKind("")` 完全一致 —— 转发是无条件的
    expect(globalLineEnergyTypeForNode({ kind: "" } as never))
      .toBe(globalLineEnergyTypeForKind(""));
  });

  test("★ 缺 `kind` 抛 TypeError（如实记录，不修）", () => {
    // 探针实测：`baseDeviceKind(undefined)` 读 `.endsWith` 抛错。
    // 与 `globalLineEnergyTypeForKind("")` 不同 —— 空串能过，undefined 不能。
    // 形参是 `Pick<ModelNode, "kind">`，`kind` 在类型上必存在，抛错正说明
    // 调用方违背契约，静默兜成 `""` 反而会掩盖「取不到线路」这个真问题。
    expect(() => globalLineEnergyTypeForNode({} as never)).toThrow(TypeError);
    expect(() => globalLineEnergyTypeForNode({ kind: undefined } as never)).toThrow(TypeError);
    expect(() => globalLineEnergyTypeForNode({ kind: null } as never)).toThrow(TypeError);
    // 对照：空串走的是 baseDeviceKind 的正常路径，不抛
    expect(globalLineEnergyTypeForNode({ kind: "" } as never)).toBe("");
  });
});

describe("globalLineEndpointNodeIds：`String(x ?? \"\").trim()` + `filter(Boolean)`", () => {
  const ids = (params: Record<string, unknown>) => globalLineEndpointNodeIds({ params } as never);

  test("正常路径：两端都取到（顺序固定为 source → target）", () => {
    expect(ids({ [SRC]: "n1", [DST]: "n2" })).toEqual(["n1", "n2"]);
    expect(ids({ [SRC]: "n1" })).toEqual(["n1"]);
    expect(ids({ [DST]: "n2" })).toEqual(["n2"]);
  });

  test("首尾空白被 trim", () => {
    expect(ids({ [SRC]: "  n1  " })).toEqual(["n1"]);
    expect(ids({ [SRC]: "\tn1\n" })).toEqual(["n1"]);
  });

  test("★ 空 / 纯空白 / null 的端被**过滤掉**（不产出空串）", () => {
    expect(ids({})).toEqual([]);
    expect(ids({ [SRC]: "" })).toEqual([]);
    expect(ids({ [SRC]: "   " })).toEqual([]);
    expect(ids({ [SRC]: null })).toEqual([]);
    expect(ids({ [SRC]: "n1", [DST]: "  " })).toEqual(["n1"]);
  });

  test("非字符串值经 `String()` 转换后仍可能进结果", () => {
    expect(ids({ [SRC]: 123 })).toEqual(["123"]);
    expect(ids({ [SRC]: true })).toEqual(["true"]);
    expect(ids({ [SRC]: 0 })).toEqual(["0"]);
    expect(ids({ [SRC]: ["a", "b"] })).toEqual(["a,b"]);
    expect(ids({ [SRC]: {} })).toEqual(["[object Object]"]);
  });

  test("★ `params` 为 null / undefined 抛 TypeError（如实记录，不修）", () => {
    // 探针实测。形参标注是 `Pick<ModelNode, "params">`，而 `ModelNode.params`
    // 在类型上必存在 —— 抛错正说明调用方违背契约。
    // 记录这条是为了让「为什么这里没有 `?.`」有据可查。
    expect(() => globalLineEndpointNodeIds({ params: null } as never)).toThrow(TypeError);
    expect(() => globalLineEndpointNodeIds({ params: undefined } as never)).toThrow(TypeError);
  });

  test("返回的是**新数组**（不共享内部结构）", () => {
    const params = { [SRC]: "n1", [DST]: "n2" };
    const a = ids(params);
    const b = ids(params);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe("isManagedGlobalLineModelType：三类模型类型精确匹配", () => {
  test("厂站 / 馈线 / 台区 → true", () => {
    for (const modelType of ["厂站", "馈线", "台区"]) {
      expect(isManagedGlobalLineModelType(modelType), modelType).toBe(true);
    }
  });

  test("★ 精确匹配：带空白或其它值 → false", () => {
    // 没有 trim、没有大小写处理、没有前缀匹配。
    for (const modelType of ["线路", "", undefined, null, "厂站 ", " 厂站", "厂站模型"] as never[]) {
      expect(isManagedGlobalLineModelType(modelType as never), JSON.stringify(modelType) ?? "null").toBe(false);
    }
  });
});
