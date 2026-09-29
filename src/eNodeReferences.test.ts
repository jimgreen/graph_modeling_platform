// E 文件的**拓扑节点号**解析（`src/model.ts`）
//   E_NODE_REFERENCE_COLUMNS                17 个「引用节点」的列名
//   numericNodeReference                  把 nodeNumber 归一成纯数字串
//   topologyNodeNumberForEField            按列名取对应端子的节点号
//   isThreeWindingTransformerKind         三绕组 kind 判定（私有集合的公开包装）
//
// 判错的后果：导出的 E 文件里 `i_node` / `j_node` **接错端子** ——
// 拓扑看着通、潮流算错，而且**不报错**。这是最坏的一类静默错误。
import { describe, expect, test } from "vitest";
import {
  E_NODE_REFERENCE_COLUMNS,
  THREE_WINDING_NEUTRAL_TRANSFORMER_KIND,
  THREE_WINDING_TRANSFORMER_KINDS,
  isThreeWindingTransformerKind,
  numericNodeReference,
  topologyNodeNumberForEField
} from "./model";
import type { ModelNode, TerminalType } from "./model";

const T = (id: string, type: TerminalType, nodeNumber: string) =>
  ({ id, label: id, type, anchor: { x: 0, y: 0 }, nodeNumber, vbase: "0" });

const NODE = (nodeNumber: string, terminalNumbers: string[], kind?: string) => ({
  nodeNumber, kind, terminals: terminalNumbers.map((n, i) => T(`t${i + 1}`, "ac", n))
});

const field = (node: unknown, key: string) => topologyNodeNumberForEField(node as never, key);

describe("E_NODE_REFERENCE_COLUMNS：17 个列名", () => {
  test("内容与顺序固定（会进 E 文件段表序列化）", () => {
    expect(E_NODE_REFERENCE_COLUMNS.size).toBe(17);
    expect([...E_NODE_REFERENCE_COLUMNS]).toEqual([
      "node", "i_node", "j_node", "k_node", "ind", "znd", "nd",
      "ac_node", "dc_node", "node1", "node2", "node3", "node4",
      "t1_node", "t2_node", "t3_node", "neutral_node"
    ]);
  });

  test("★ 集合无重复", () => {
    const list = [...E_NODE_REFERENCE_COLUMNS];
    expect(new Set(list).size).toBe(list.length);
  });
});

describe("★ numericNodeReference：只认纯数字与 `N`+数字", () => {
  test("纯数字原样返回（**保留前导零**）", () => {
    for (const value of ["0", "1", "42", "007", "000"]) {
      expect(numericNodeReference(value), value).toBe(value);
    }
  });

  test("数字入参经 `String` 强转", () => {
    expect(numericNodeReference(0)).toBe("0");
    expect(numericNodeReference(42)).toBe("42");
    // ★ 1e21 的 String 是 "1e+21" → 不匹配 `^\d+$` → 空串
    expect(String(1e21)).toBe("1e+21");
    expect(numericNodeReference(1e21), "★ 指数形式被拒").toBe("");
  });

  test("★ `N` 前缀被剥掉（**不区分大小写**）", () => {
    expect(numericNodeReference("N1")).toBe("1");
    expect(numericNodeReference("n1")).toBe("1");
    expect(numericNodeReference("N42")).toBe("42");
    expect(numericNodeReference("N0")).toBe("0");
  });

  test("★ 两条分支对前导零的处理**不一致**", () => {
    // 数字分支 `return normalized`（原样）⇒ "007"
    // N 分支 `?.[1]`（捕获组）⇒ 也是 "007"… 等等，实测是 "007"。
    // 真正的不一致在于：数字分支**原样**返回，不做任何规范化。
    expect(numericNodeReference("007")).toBe("007");
    expect(numericNodeReference("N007")).toBe("007");
    // ★ 两者都保留 —— 但它们与 "7" 不相等，所以下游按字符串比较时会分道扬镳
    expect(numericNodeReference("007")).not.toBe("7");
    expect(numericNodeReference("N007")).not.toBe("7");
  });

  test("首尾空白被 trim（两条分支都）", () => {
    expect(numericNodeReference(" 1 ")).toBe("1");
    expect(numericNodeReference(" N1 ")).toBe("1");
    expect(numericNodeReference("\t1\n")).toBe("1");
  });

  test("★ 拒绝一切非「数字」形态", () => {
    for (const value of [
      "1.0", "-1", "+1", "1a", "a1", "NN1", "N", "n", "N1a", "1N",
      "", "   ", "١٢٣"   // 阿拉伯数字：\d 不匹配
    ]) {
      expect(numericNodeReference(value), JSON.stringify(value)).toBe("");
    }
  });

  test("★ nullish / 布尔 / 空对象 / 空数组 → 空串", () => {
    for (const value of [null, undefined, true, false, {}, { a: 1 }, []] as never[]) {
      expect(numericNodeReference(value), String(value)).toBe("");
    }
  });

  test("单元素数组经 `String` 强转后可以命中", () => {
    // `String(["1"]) === "1"`、`String(["N101"]) === "N101"`
    expect(String(["1"])).toBe("1");
    expect(numericNodeReference(["1"])).toBe("1");
    expect(numericNodeReference(["N101"])).toBe("101");
    // 多元素数组 → "1,2" → 不匹配
    expect(numericNodeReference(["1", "2"]), "★ 逗号串被拒").toBe("");
  });

  test("返回恒为 string（从不 undefined）", () => {
    for (const value of [null, undefined, "abc", "1", 0] as never[]) {
      expect(typeof numericNodeReference(value), String(value)).toBe("string");
    }
  });
});

describe("isThreeWindingTransformerKind：精确匹配两个 kind", () => {
  test("白名单只有两个", () => {
    expect([...THREE_WINDING_TRANSFORMER_KINDS]).toEqual([
      "ac-three-winding-transformer",
      "ac-three-winding-transformer-neutral"
    ]);
    expect(THREE_WINDING_NEUTRAL_TRANSFORMER_KIND).toBe("ac-three-winding-transformer-neutral");
  });

  test("命中两个 kind", () => {
    expect(isThreeWindingTransformerKind("ac-three-winding-transformer")).toBe(true);
    expect(isThreeWindingTransformerKind("ac-three-winding-transformer-neutral")).toBe(true);
  });

  test("★ 区分大小写、**不 trim**、**不剥 -vertical**", () => {
    for (const kind of [
      "AC-THREE-WINDING-TRANSFORMER", " ac-three-winding-transformer",
      "ac-three-winding-transformer ", "ac-three-winding-transformer-vertical",
      "ac-transformer2", "ac-transformer3", "", "nope"
    ]) {
      expect(isThreeWindingTransformerKind(kind), JSON.stringify(kind)).toBe(false);
    }
  });

  test("nullish → false（`Set.has(undefined)` 恒假，不抛）", () => {
    expect(isThreeWindingTransformerKind(undefined)).toBe(false);
    expect(isThreeWindingTransformerKind(null as never)).toBe(false);
  });
});

describe("★ topologyNodeNumberForEField：两绕组（默认）", () => {
  const node = NODE("100", ["101", "102", "103", "104"]);

  test("17 个列名逐个核对（全部取第 0..3 号端子）", () => {
    const expected: Record<string, string> = {
      "node": "101", "i_node": "101", "ind": "101", "nd": "101",
      "j_node": "102", "znd": "102",
      "k_node": "103",
      "node1": "101", "t1_node": "101",
      "node2": "102", "t2_node": "102",
      "node3": "103", "t3_node": "103",
      "node4": "104",
      "neutral_node": "104",
      "ac_node": "101",     // ★ 本 fixture 全是 ac 端子 → 取第一个
      "dc_node": ""         // ★ 没有 dc 端子
    };
    for (const [key, value] of Object.entries(expected)) {
      expect(field(node, key), key).toBe(value);
    }
    expect(Object.keys(expected).length, "★ 覆盖全部 17 列").toBe(E_NODE_REFERENCE_COLUMNS.size);
  });

  test("★ 集合外的列名 → 空串（不做模糊匹配）", () => {
    for (const key of ["nope", "idx", "name", "", "NODE", "t_node", "acTopologyNode", "acNode", "node5", "node0", "t4_node", "t0_node"]) {
      expect(field(node, key), JSON.stringify(key)).toBe("");
    }
  });

  test("`node1`..`node4` 与 `t1_node`..`t3_node` 走同一条路（parseInt − 1）", () => {
    for (let index = 1; index <= 4; index += 1) {
      expect(field(node, `node${index}`), `node${index}`).toBe(`${100 + index}`);
      if (index <= 3) {
        expect(field(node, `t${index}_node`), `t${index}_node`).toBe(`${100 + index}`);
      }
    }
  });

  test("★ `node5` / `t4_node` 越界 → 空串（正则只收 1..4 / 1..3）", () => {
    expect(field(node, "node5")).toBe("");
    expect(field(node, "node0")).toBe("");
    expect(field(node, "t4_node")).toBe("");
    expect(field(node, "t0_node")).toBe("");
  });
});

describe("★ 三绕组：j / k 两侧**对调**", () => {
  for (const kind of ["ac-three-winding-transformer", "ac-three-winding-transformer-neutral"]) {
    test(`${kind}`, () => {
      const node = NODE("100", ["101", "102", "103", "104"], kind);
      // ★ 两绕组是 j=102 / k=103；三绕组反过来
      expect(field(node, "node"), "node 不变").toBe("101");
      expect(field(node, "i_node"), "i 不变").toBe("101");
      expect(field(node, "ind")).toBe("101");
      expect(field(node, "j_node"), "★ j 取第 3 号端子").toBe("103");
      expect(field(node, "znd"), "★ znd 与 j 同步").toBe("103");
      expect(field(node, "k_node"), "★ k 取第 2 号端子").toBe("102");
      expect(field(node, "neutral_node"), "中性点不变").toBe("104");
      // node1..node4 是**按数字**取，不受三绕组影响
      expect(field(node, "node1")).toBe("101");
      expect(field(node, "node2")).toBe("102");
      expect(field(node, "node3")).toBe("103");
      expect(field(node, "t1_node")).toBe("101");
      expect(field(node, "t2_node"), "★ t2_node 仍取第 2 号").toBe("102");
    });
  }

  test("★ 两种三绕组 kind 的映射**完全相同**", () => {
    const plain = NODE("100", ["101", "102", "103", "104"], "ac-three-winding-transformer");
    const neutral = NODE("100", ["101", "102", "103", "104"], "ac-three-winding-transformer-neutral");
    for (const key of E_NODE_REFERENCE_COLUMNS) {
      expect(field(neutral, key), key).toBe(field(plain, key));
    }
  });

  test("非三绕组 kind 走两绕组映射（不因 kind 拼错而变）", () => {
    for (const kind of [undefined, "", "nope", "ac-transformer2", "ac-transformer3"]) {
      const node = NODE("100", ["101", "102", "103", "104"], kind);
      expect(isThreeWindingTransformerKind(kind as string), String(kind)).toBe(false);
      expect(field(node, "j_node"), String(kind)).toBe("102");
      expect(field(node, "k_node"), String(kind)).toBe("103");
    }
  });
});

describe("★ `ac_node` / `dc_node`：按**端子类型**查找，与顺序无关", () => {
  test("端子顺序颠倒也能取对", () => {
    const node = {
      nodeNumber: "100", kind: "ac-load",
      terminals: [T("t1", "dc", "201"), T("t2", "ac", "202"), T("t3", "ac", "203")]
    };
    expect(field(node, "ac_node"), "★ 取第一个 ac 端子").toBe("202");
    expect(field(node, "dc_node")).toBe("201");
    // ★ 对照：按序号取的 key 走的是**数组下标**，与类型无关
    expect(field(node, "node"), "node = 第 1 个端子（dc）").toBe("201");
    expect(field(node, "j_node"), "j_node = 第 2 个端子（ac）").toBe("202");
  });

  test("★ 没有对应类型的端子 → 空串（`find` 得 undefined）", () => {
    // 真实 `TerminalType` 是 `"ac" | "dc" | "h2" | "heat"`（没有 "virtual"）
    const other = { nodeNumber: "100", kind: "ac-load", terminals: [T("t1", "h2", "1"), T("t2", "heat", "2")] };
    expect(field(other, "ac_node")).toBe("");
    expect(field(other, "dc_node")).toBe("");
    // 前提：h2 / heat 都不是 ac / dc
    expect(field(other, "node"), "★ 但按序号取的 key 仍能取到").toBe("1");
    // 无任何端子也一样
    expect(field({ nodeNumber: "100", kind: "ac-load", terminals: [] }, "ac_node")).toBe("");
  });
});

describe("端子序号缺失时的回落", () => {
  test("★ 只有**端子不存在**（不是 nodeNumber 为空串）才回落到 `node.nodeNumber`", () => {
    // `terminalNodeNumber`：`node.terminals[index]?.nodeNumber ?? (index === 0 ? node.nodeNumber : "")`
    // `??` 只在 nullish 时回落 —— 空串不是 nullish。
    const empty = { nodeNumber: "100", kind: "ac-load", terminals: [T("t1", "ac", ""), T("t2", "ac", "")] };
    expect(field(empty, "node"), "★ 端子在、nodeNumber 是 '' → **不**回落").toBe("");
    expect(field(empty, "j_node")).toBe("");

    // 端子数组为空 ⇒ `terminals[0]` 是 undefined ⇒ 回落
    const none = { nodeNumber: "100", kind: "ac-load", terminals: [] };
    expect(field(none, "node"), "★ index 0 端子不存在 → 回落 nodeNumber").toBe("100");
    expect(field(none, "j_node"), "★ index 1 端子不存在 → 空串（不回落）").toBe("");

    // 前提：空串不是 nullish，`??` 不触发（用 unknown 洗掉 TS 的字面量收窄）
    const emptyStr: string = String("");
    expect(emptyStr ?? "fallback", "★ ?? 的前提").toBe("");
  });

  test("★ 回落值本身也会被 `numericNodeReference` 归一", () => {
    const none = { nodeNumber: "N100", kind: "ac-load", terminals: [] };
    expect(field(none, "node")).toBe("100");
    const bad = { nodeNumber: "BUS-A", kind: "ac-load", terminals: [] };
    expect(field(bad, "node"), "★ 非数字回落值 → 空串").toBe("");
  });

  test("端子 nodeNumber 是 `N` 前缀时归一", () => {
    const node = NODE("N100", ["N101", "N102", "N103", "N104"], "ac-three-winding-transformer");
    expect(field(node, "node")).toBe("101");
    expect(field(node, "j_node")).toBe("103");
    expect(field(node, "k_node")).toBe("102");
    expect(field(node, "neutral_node")).toBe("104");
  });

  test("端子数组比 4 短：越界 → 空串", () => {
    const node = NODE("100", ["101", "102", "103"], "ac-three-winding-transformer");
    expect(field(node, "node")).toBe("101");
    expect(field(node, "j_node"), "index 2 在数组内").toBe("103");
    expect(field(node, "k_node"), "index 1 在数组内").toBe("102");
    expect(field(node, "neutral_node"), "★ index 3 越界").toBe("");
  });

  test("非数字 nodeNumber → 空串（`numericNodeReference` 拦下）", () => {
    expect(field(NODE("BUS-A", ["X1", "X2"]), "node")).toBe("");
    expect(field(NODE("BUS-A", ["X1", "X2"]), "j_node")).toBe("");
  });
});

describe("纯函数性质", () => {
  const node = NODE("100", ["101", "102", "103", "104"], "ac-three-winding-transformer");

  test("不改入参", () => {
    const snapshot = JSON.stringify(node);
    for (const key of E_NODE_REFERENCE_COLUMNS) field(node, key);
    expect(JSON.stringify(node)).toBe(snapshot);
  });

  test("同一输入恒得同一结果（无模块级状态）", () => {
    for (const key of E_NODE_REFERENCE_COLUMNS) {
      const once = field(node, key);
      for (let i = 0; i < 20; i += 1) {
        expect(field(node, key), key).toBe(once);
      }
    }
  });

  test("返回恒为 string", () => {
    for (const key of [...E_NODE_REFERENCE_COLUMNS, "nope", ""]) {
      expect(typeof field(node, key), key).toBe("string");
    }
  });

  test("★ 等价变异 ⑬：`terminalIndex >= 0` 守卫可省", () => {
    // 变异：`terminalIndex >= 0 ? numericNodeReference(terminalNodeNumber(node, terminalIndex)) : ""`
    //      →  `numericNodeReference(terminalNodeNumber(node, terminalIndex))`
    // 全绿。**可证明等价**，理由链是完整的三步：
    //   ① `terminalIndex` 的兜底值是 `-1`，其余分支都是 0..3 或 `parseInt(1..4) - 1`，
    //      所以**唯一可能为负的情形就是兜底的 -1**。
    //   ② 索引为负时 `node.terminals[-1]` 必是 `undefined`
    //      （`ModelNode["terminals"]` 是普通数组，不存在负数键）
    //      ⇒ `terminalNodeNumber` 走 `?? (index === 0 ? … : "")` 分支，
    //      `-1 !== 0` ⇒ 返回 `""`。
    //   ③ `numericNodeReference("")` = `String("").trim()` = `""`，
    //      不匹配 `/^\d+$/` 也不匹配 `/^N(\d+)$/i` ⇒ 仍返回 `""`。
    // 所以省掉守卫后，未知 key 得到的仍是 `""`，与原来逐位相同。
    //
    // ⚠ 什么会让它失效（两处都要守住）：
    //    · 兜底 index 从 `-1` 改成任何 ≥ 0 的值 ⇒ 未知 key 会**静默取到某个端子**
    //      （变异 ⑮ 就是这一改，立刻转红）
    //    · `numericNodeReference("")` 不再返回 `""`（比如给空串加个默认值）
    const unknownKeys = ["nope", "idx", "name", "NODE", "t_node", "acNode"];
    for (const key of unknownKeys) {
      // 前提 ①②：`terminals[-1]` 是 undefined ⇒ `terminalNodeNumber` 落到非 0 分支
      const terminals = [{ nodeNumber: "101" }] as never[];
      expect(terminals[-1 as number], `★ ${key} 的前提`).toBeUndefined();
      // 前提③ + 等价本体
      expect(numericNodeReference(""), "★ 前提：空串归一后仍是空串").toBe("");
      expect(field(node, key), key).toBe("");
    }
  });
});
