// 容器关系参数键 / 端子查找 / 仅连接节点判定（此前均零直呼）：
//   containerRelationParamKey   E 文件容器关联段的参数键拼装
//   getTerminal                 端子查找（四级回退）
//   virtualBusTerminal          母线类节点的虚拟端子
//   isLineOnlyConnectionNode    派生类（厂站/馈线/台区 电源负载）判定
//
// 这几个都直接决定 **E 文件里容器关联段的列名与端子标签** ——
// 键拼错或序号错一位，下游读出来就是错列，且没有任何报错。
import { describe, expect, test } from "vitest";
import {
  containerRelationParamKey,
  isLineOnlyConnectionNode,
  modelAssociationModelTypeForKind,
  THREE_WINDING_TRANSFORMER_SIDES,
  type ModelNode
} from "./model";
import { getTerminal, virtualBusTerminal } from "./model-routing";

const nodeWith = (over: Partial<ModelNode> = {}) =>
  ({ kind: "ac-line", params: {}, terminals: [], ...over }) as unknown as ModelNode;

const terminal = (id: string) => ({
  id,
  label: `${id} 标签`,
  type: "ac" as const,
  anchor: { x: 0.5, y: 0 },
  nodeNumber: "1",
  vbase: "0"
});

describe("containerRelationParamKey：五级分支的完整输出表", () => {
  test("① fieldName 为空 → 原样返回 column（不做任何加工）", () => {
    const table: Array<[string, string]> = [
      ["r", "r"], ["idx", "idx"], ["name", "name"], ["zzz", "zzz"], ["", ""]
    ];
    for (const [column, expected] of table) {
      expect(containerRelationParamKey("", column), JSON.stringify(column)).toBe(expected);
    }
  });

  test("② 三绕组侧边 × 6 个受支持列（探针实测全表）", () => {
    const expected: Record<string, Record<string, string>> = {
      high: {
        r: "highResistancePu", x: "highReactancePu",
        gt: "highMagnetizingConductancePu", bt: "highMagnetizingSusceptancePu",
        tap: "highTapRatio", shift: "highShift"
      },
      medium: {
        r: "mediumResistancePu", x: "mediumReactancePu",
        gt: "mediumMagnetizingConductancePu", bt: "mediumMagnetizingSusceptancePu",
        tap: "mediumTapRatio", shift: "mediumShift"
      },
      low: {
        r: "lowResistancePu", x: "lowReactancePu",
        gt: "lowMagnetizingConductancePu", bt: "lowMagnetizingSusceptancePu",
        tap: "lowTapRatio", shift: "lowShift"
      }
    };
    for (const side of THREE_WINDING_TRANSFORMER_SIDES) {
      for (const [column, want] of Object.entries(expected[side.suffix])) {
        expect(containerRelationParamKey(side.idxKey, column), `${side.idxKey}.${column}`).toBe(want);
      }
    }
    expect(THREE_WINDING_TRANSFORMER_SIDES.length, "侧边数（改动时须同步核对）").toBe(3);
  });

  test("③ 三绕组侧边 × **不受支持**的列 → 掉到后续分支", () => {
    // 关键：`if (column in sideColumnMap)` 不成立时**不 return**，
    // 会继续走 idx / name / 兜底三条分支。
    const table: Array<[string, string]> = [
      ["idx", "idx_xf_t1"],
      ["name", "name_xf_t1"],
      ["status", "status_xf_t1"],
      ["zzz", "zzz_xf_t1"],
      ["r2", "r2_xf_t1"]
    ];
    for (const [column, expected] of table) {
      expect(containerRelationParamKey("idx_xf_t1", column), column).toBe(expected);
    }
  });

  test("④ 非三绕组的 fieldName（兜底 `${column}_${fieldName 剥一个 idx_ 前缀}`）", () => {
    const table: Array<[string, string, string]> = [
      ["idx_line_1", "r", "r_line_1"],
      ["idx_line_1", "idx", "idx_line_1"],
      ["idx_line_1", "name", "name_line_1"],
      ["idx_line_1", "status", "status_line_1"],
      // name_ 前缀**不剥**
      ["name_thing", "r", "r_name_thing"],
      // `idx_` 剥完是空串 → 留个尾下划线
      ["idx_", "r", "r_"],
      // 只剥**一个**前缀
      ["idx_idx_x", "r", "r_idx_x"],
      // 不带前缀的
      ["plain", "r", "r_plain"]
    ];
    for (const [fieldName, column, expected] of table) {
      expect(containerRelationParamKey(fieldName, column), `("${fieldName}", "${column}")`).toBe(expected);
    }
  });

  test("⑤ 三绕组的三个 idxKey 恰好是 `idx_xf_t1/t2/t3`", () => {
    // 兜底分支的 `replace(/^idx_/, "")` 依赖这个前缀，键名变了这里会转红
    expect(THREE_WINDING_TRANSFORMER_SIDES.map((s) => s.idxKey)).toEqual([
      "idx_xf_t1", "idx_xf_t2", "idx_xf_t3"
    ]);
  });

  test("★ `idx` 列恒返回 fieldName 本身（三绕组与非三绕组都一样）", () => {
    for (const fieldName of ["idx_xf_t1", "idx_line_1", "plain", "idx_"]) {
      expect(containerRelationParamKey(fieldName, "idx"), fieldName).toBe(fieldName);
    }
  });

  test("★ `name` 列走 `containerRelationNameKey`（只把首个 idx_ 换成 name_）", () => {
    expect(containerRelationParamKey("idx_xf_t1", "name")).toBe("name_xf_t1");
    expect(containerRelationParamKey("idx_line_1", "name")).toBe("name_line_1");
    // 已是 name_ 前缀的原样返回
    expect(containerRelationParamKey("name_thing", "name")).toBe("name_thing");
  });
});

describe("★ `column in sideColumnMap` 走原型链（判定不修，如实记录）", () => {
  // 探针实测：`in` 走原型链，所以 `toString` / `constructor` / `hasOwnProperty`
  // 都被判为「受支持的列」，随后 `sideColumnMap[column]` 取到 **原型上的函数** ——
  // 而 `containerRelationParamKey` 的返回类型标注是 `string`。
  //
  // **判定不修**（三个理由，与 deviceParamValue 的 `__proto__` 同一类）：
  // ① `column` 来自 E 文件的**列定义表**（E_SECTION_COLUMNS 那类静态数组），
  //    不是外部输入；
  // ② 改用 `Object.hasOwn` 守卫对 9 个调用点是零收益（每次多一次调用，
  //    而键数是固定的 6 个，可直接用数组 includes）；
  // ③ 更实际的问题是「E 文件里会不会出现叫 toString 的列」——已核对列定义表，
  //    不存在这样的列名。
  // 现状钉进测试：日后有人加 hasOwn 守卫，这里会转红提醒。
  test("`toString` 返回 **Object.prototype.toString 函数**", () => {
    const out = containerRelationParamKey("idx_xf_t1", "toString") as unknown;
    expect(typeof out, "实测是函数").toBe("function");
    expect(out).toBe(Object.prototype.toString);
  });

  test("`constructor` 返回 `Object` 构造函数", () => {
    const out = containerRelationParamKey("idx_xf_t1", "constructor") as unknown;
    expect(out).toBe(Object);
  });

  test("`__proto__` 返回 `Object.prototype`", () => {
    const out = containerRelationParamKey("idx_xf_t1", "__proto__") as unknown;
    expect(typeof out).toBe("object");
    expect(out).toBe(({} as unknown as { __proto__: unknown }).__proto__);
  });

  test("`hasOwnProperty` / `valueOf` 同样取到函数", () => {
    expect(containerRelationParamKey("idx_xf_t1", "hasOwnProperty") as unknown)
      .toBe(Object.prototype.hasOwnProperty);
    expect(containerRelationParamKey("idx_xf_t1", "valueOf") as unknown)
      .toBe(Object.prototype.valueOf);
  });

  test("★ 非三绕组不受影响（原型链那条分支要求先命中 transformerSide）", () => {
    // 落到兜底分支后 `^idx_` 照样被剥掉 —— 我第一版忘了这步，被顶回。
    expect(containerRelationParamKey("idx_line_1", "toString")).toBe("toString_line_1");
    expect(containerRelationParamKey("idx_line_1", "constructor")).toBe("constructor_line_1");
    expect(containerRelationParamKey("plain", "toString")).toBe("toString_plain");
  });
});

describe("getTerminal：四级回退", () => {
  const twoTerminals = nodeWith({ terminals: [terminal("t1"), terminal("t2")] as never });

  test("命中 terminalId", () => {
    expect(getTerminal(twoTerminals, "t2").id).toBe("t2");
  });

  test("★ 未命中 → 落 `terminals[0]`（不是 undefined）", () => {
    expect(getTerminal(twoTerminals, "t9").id).toBe("t1");
    expect(getTerminal(twoTerminals).id, "不传 id").toBe("t1");
    expect(getTerminal(twoTerminals, undefined).id, "显式 undefined").toBe("t1");
  });

  test("单端子节点：未命中与命中同一个", () => {
    const one = nodeWith({ terminals: [terminal("t1")] as never });
    expect(getTerminal(one, "t1").id).toBe("t1");
    expect(getTerminal(one, "t9").id).toBe("t1");
  });

  test("★ 空 terminals 且非母线类 → 返回 undefined（返回类型标注是 Terminal，非可选）", () => {
    // 四级回退的最后一级又写了 `node.terminals[0]`，但那时数组是空的。
    // **判定不修**：10 个调用点拿它的结果直接算端子坐标，
    // 真实节点实测总有 ≥1 个端子（`createNodeFromTemplate` 保证），
    // 返回 undefined 意味着「节点本身没有端子」——那是数据问题，
    // 静默造一个默认端子会掩盖它。现状钉进测试。
    const empty = nodeWith({ kind: "ac-line", terminals: [] });
    const out = getTerminal(empty, "t1") as unknown;
    expect(out, "实测是 undefined").toBeUndefined();
  });

  test("空 terminals 但母线类 → 落虚拟端子（第三级）", () => {
    const bus = nodeWith({ kind: "ac-bus", terminals: [] });
    const out = getTerminal(bus, "t2");
    expect(out.id, "第三级 virtualBusTerminal").toBe("t2");
    expect(out.type).toBe("ac");
    expect(out.nodeNumber, "虚拟端子的 nodeNumber 是字符串 0").toBe("0");
  });

  test("★ 空 terminals、母线类 → 落虚拟端子（terminalId 原样成为 id 与下标）", () => {
    const bus = nodeWith({ kind: "ac-bus", terminals: [] });
    const out = getTerminal(bus, "t7");
    expect(out.id, "id 原样透传 terminalId").toBe("t7");
    // label 按 `parseInt("7") = 7` 算 → `terminalLabelForType(type, 6)` = 端7
    // （我第一版以为会落回端1，被顶回：只有 parseInt 得 0 或 NaN 才落 1）
    expect(out.label).toBe("交流设备端7");
  });
});

describe("virtualBusTerminal：母线类才有，且 terminalId 解析很宽松", () => {
  const bus = nodeWith({ kind: "ac-bus", terminals: [] });

  test("母线类 kind 各有对应端子类型", () => {
    const table: Array<[string, string]> = [
      ["ac-bus", "ac"], ["dc-bus", "dc"],
      ["hydrogen-bus", "h2"], ["heat-bus", "heat"]
    ];
    for (const [kind, type] of table) {
      const out = virtualBusTerminal(nodeWith({ kind, terminals: [] }), "t1");
      expect(out, kind).toBeDefined();
      expect(out!.type, kind).toBe(type);
    }
  });

  test("非母线类 → undefined", () => {
    for (const kind of ["ac-line", "ac-breaker", "transformer-2w", "ac-load"]) {
      expect(virtualBusTerminal(nodeWith({ kind, terminals: [] }), "t1"), kind).toBeUndefined();
    }
  });

  test("★ terminalId 解析表（探针实测：`Math.max(1, parseInt(id.replace(/^t/, \"\")) || 1)`）", () => {
    // 规则的三个要点：
    // ① `id` 原样透传（`id: terminalId || \`t${index}\``）—— 只有空串才用合成 id
    // ② `label` / `anchor` 按 parseInt 出的下标算，parseInt 失败或得 0 都落 1
    // ③ `replace(/^t/, "")` 只剥**一个**小写 t
    const table: Array<[string | undefined, string, string]> = [
      // terminalId, 期望 id, 期望 label
      ["t1", "t1", "交流设备端1"],
      ["t2", "t2", "交流设备端2"],
      ["t9", "t9", "交流设备端9"],
      ["t0", "t0", "交流设备端1"],        // parseInt 得 0 → `|| 1`
      ["tx", "tx", "交流设备端1"],         // parseInt("x") = NaN → 1
      ["x2", "x2", "交流设备端1"],         // `^t` 不匹配 → replace 原样 → parseInt("x2") = NaN
      ["", "t1", "交流设备端1"],           // 空串 → id 合成 t1
      ["t-1", "t-1", "交流设备端1"],       // parseInt("-1") = -1 → max(1,-1) = 1
      ["t 2", "t 2", "交流设备端2"],       // parseInt(" 2") = 2（parseInt 会 trim）
      ["t2x", "t2x", "交流设备端2"],       // parseInt 前缀匹配 → 2
      ["T3", "T3", "交流设备端1"],         // 大写 T 不被剥 → parseInt("T3") = NaN
      [undefined, "t1", "交流设备端1"],
      [null as never, "t1", "交流设备端1"]
    ];
    for (const [terminalId, expectedId, expectedLabel] of table) {
      const out = virtualBusTerminal(bus, terminalId as string | undefined);
      expect(out, `terminalId=${JSON.stringify(terminalId)}`).toBeDefined();
      expect(out!.id, `terminalId=${JSON.stringify(terminalId)} 的 id`).toBe(expectedId);
      expect(out!.label, `terminalId=${JSON.stringify(terminalId)} 的 label`).toBe(expectedLabel);
    }
  });

  test("★ 数字 terminalId 会抛 TypeError（形参标注是 string）", () => {
    // `terminalId?.replace` 在数字上是「有值但不可调用」→ 抛错，
    // 与 nullish（可选链短路）行为不同。如实记录，不修。
    expect(() => virtualBusTerminal(bus, 5 as never)).toThrow(TypeError);
    expect(() => virtualBusTerminal(bus, {} as never)).toThrow(TypeError);
  });

  test("★ 有真实端子时也**新建**一个虚拟端子（只有「类型」取自真实端子）", () => {
    // 我第一版以为「有真实端子就返回它」，被顶回：实现是**无条件构造**新对象，
    // `getBusTerminalType` 只把 `terminals[0].type` 借来定类型。
    // 所以真实端子的 id / label / nodeNumber 一律不参与。
    const withReal = nodeWith({ kind: "ac-bus", terminals: [terminal("t7")] as never });
    const out = virtualBusTerminal(withReal, "t2");
    expect(out!.id, "id 取 terminalId，不是真实端子的 t7").toBe("t2");
    expect(out!.label, "label 重新按 t2 的下标算").toBe("交流设备端2");
    expect(out!.nodeNumber, "虚拟端子的 nodeNumber 恒为字符串 0").toBe("0");
    // 真实端子的 type 被借来当虚拟端子的 type
    expect(out!.type).toBe(withReal.terminals[0].type);
  });
});

describe("isLineOnlyConnectionNode：只有 12 个派生类为 true", () => {
  test("三类 modelType × 交流/直流 × 电源/负载 = 12 个派生类", () => {
    const table: Array<[string, string]> = [
      ["ac-station-source", "厂站"], ["ac-feeder-source", "馈线"], ["ac-district-source", "台区"],
      ["dc-station-source", "厂站"], ["dc-feeder-source", "馈线"], ["dc-district-source", "台区"],
      ["ac-station-load", "厂站"], ["ac-feeder-load", "馈线"], ["ac-district-load", "台区"],
      ["dc-station-load", "厂站"], ["dc-feeder-load", "馈线"], ["dc-district-load", "台区"]
    ];
    for (const [kind, modelType] of table) {
      expect(modelAssociationModelTypeForKind(kind), kind).toBe(modelType);
      expect(isLineOnlyConnectionNode(nodeWith({ kind })), kind).toBe(true);
    }
    expect(table.length, "派生类数量（新增时须同步核对）").toBe(12);
  });

  test("★ 基类 kind（去掉派生后缀）**不**算", () => {
    // 查表用的是 `baseDeviceKind(kind)`，但 Map 的键是**完整的派生 kind**。
    // 所以 `ac-source` 查不到 —— 它不是任何一条 spec 的 key。
    for (const kind of ["ac-source", "dc-source", "ac-load", "dc-load"]) {
      expect(modelAssociationModelTypeForKind(kind), kind).toBe("");
      expect(isLineOnlyConnectionNode(nodeWith({ kind })), kind).toBe(false);
    }
  });

  test("普通设备全部为 false", () => {
    for (const kind of ["ac-line", "dc-line", "ac-breaker", "ac-bus", "transformer-2w", "load", "gen", "pv"]) {
      expect(isLineOnlyConnectionNode(nodeWith({ kind })), kind).toBe(false);
    }
  });

  test("★ `-vertical` 后缀会先被剥掉（走 baseDeviceKind）", () => {
    // 与三绕组判定同一条规则（baseDeviceKind 剥 `-vertical`），
    // 所以 `ac-station-source-vertical` 仍被判为 true。
    expect(modelAssociationModelTypeForKind("ac-station-source-vertical")).toBe("厂站");
    expect(isLineOnlyConnectionNode(nodeWith({ kind: "ac-station-source-vertical" }))).toBe(true);
  });

  test("空 kind / 未知 kind → 空串 + false（不抛错）", () => {
    for (const kind of ["", "nope", "-vertical", "t1"]) {
      expect(modelAssociationModelTypeForKind(kind), JSON.stringify(kind)).toBe("");
      expect(isLineOnlyConnectionNode(nodeWith({ kind })), JSON.stringify(kind)).toBe(false);
    }
  });

  test("只读 `kind`，不读 `params`（形参虽含 params 但实现不用）", () => {
    expect(isLineOnlyConnectionNode({ kind: "ac-station-source" } as never)).toBe(true);
    expect(isLineOnlyConnectionNode({ kind: "ac-line" } as never)).toBe(false);
  });
});
