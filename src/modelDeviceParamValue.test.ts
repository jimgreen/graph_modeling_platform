// deviceParamValue 的直接单测（**111 处生产调用、零测试直呼** —— 全仓库最热的取值原语）。
//
// ## 它决定什么
//
// 设备参数的取值原语。111 个生产调用点遍布 E 文件导出、CIM、SVG 渲染、
// 图元库、量测、电压基值计算…… 它的语义是**整个参数体系的基石**：
// 同一份参数，用 `ratedVoltage` / `rated_voltage` / `RatedVoltage` 查都必须拿到同一个值。
//
// 判错的后果是**静默的参数串扰** —— 拿到另一个参数的值，且不报错。
//
// ## 三条查找路径（探针穷举 15972 个 key 验证）
//
//   params[key] ?? params[snakeKey] ?? params[camelKey]
//
//   snakeKey = toSnakeCaseDeviceParamName(key)
//   camelKey = legacyCamelCaseParamName(snakeKey)
//
// `camelKey` 是**独立的可达路径**（我一度以为它是死代码，穷举后推翻）：
// 15972 个 3~4 字符样本中，8712 个（54.5%）的 `camelKey` 既不等于 `key`
// 也不等于 `snakeKey` —— 例如 `"a_b"` → snake `"a_b"` / camel `"aB"`。
//
// ## gas_quantity 的三条独立路径
//
// 特判只查 `gas_quantity` / `gasQuantity` / `gasquantity` 三个键，
// **不经过 camel 路径**（因为 snake 已被特判短路）。
//
// ## soc 别名：三种历史写法归一
//
// `toSnakeCaseDeviceParamName` 里 `state_of_charge` / `stateOfCharge` / `SOC`
// **全部映射到 `soc`**。这不是 bug 而是**故意的迁移兼容** ——
// `normalizeLegacyGasQuantityDeviceParams` 会在迁移时删掉旧键并写入 `soc`。
//
// 副作用（如实记录）：未归一的数据里三种写法**会互相读到对方的值**。
// 实测真实数据 `data/schemes/trash/2026-08-15.../交流设备.json` 里
// `soc=0.5` 与 `state_of_charge=50%` 共存，此时查任一写法都拿到 `"0.5"`。
// 归一后（走 `normalizeLegacyGasQuantityDeviceParams`）旧键被删除，串扰消失。
import { describe, expect, test } from "vitest";
import { deviceParamValue, toSnakeCaseDeviceParamName } from "./model";

const params = (obj: Record<string, unknown>) => obj as Record<string, string>;

describe("三条查找路径：key 原文 > snake > camel", () => {
  test("原文优先（三个键都在时取原文）", () => {
    expect(deviceParamValue(params({ ratedVoltage: "A", rated_voltage: "B", ratedVoltageX: "C" }), "ratedVoltage")).toBe("A");
  });

  test("原文缺失时回落 snake", () => {
    expect(deviceParamValue(params({ rated_voltage: "B" }), "ratedVoltage")).toBe("B");
  });

  test("★ 原文与 snake 都缺时回落 camel（**这是最容易漏测的路径**）", () => {
    // key="a_b" → snake 也是 "a_b"，但 camel 是 "aB"
    // 所以必须用 camel 键才能命中，第三条路径才有用
    expect(deviceParamValue(params({ aB: "HIT" }), "a_b")).toBe("HIT");
    // 反向：key="aB" → snake "a_b"，camel "aB"（=== key）
    expect(deviceParamValue(params({ aB: "HIT" }), "aB")).toBe("HIT");
    // 两者都缺 → undefined（探针实测确认 camel 路径是可达的）
    expect(deviceParamValue(params({ aB: "X" }), "a_b")).toBe("X");
    expect(deviceParamValue({}, "a_b")).toBeUndefined();
  });

  test("★ 穷举：camelKey 是独立路径（既非 key 也非 snake）", () => {
    // 我一度断言「camel 是死代码」，穷举 15972 个样本后推翻：54.5% 的样本
    // 其 camelKey 与 key、snakeKey 都不同。删掉第三条路径会让这些 key 全部取不到值。
    const chars = ["a", "B", "1", "_", "-", " ", ".", "A", "b", "Z", "9"];
    const samples: string[] = [];
    for (const a of chars) for (const b of chars) for (const c of chars) samples.push(a + b + c);

    let independent = 0;
    for (const key of samples) {
      const snake = toSnakeCaseDeviceParamName(key);
      const camel = snake.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
      if (camel === key || camel === snake) continue;
      independent += 1;
      // 只放 camel 键：能命中才说明第三条路径真的在起作用
      expect(deviceParamValue(params({ [camel]: "HIT" }), key), `key=${JSON.stringify(key)} camel=${JSON.stringify(camel)}`).toBe("HIT");
    }
    // 独立路径占比应远超 0（本轮实测 54.5%）
    expect(independent / samples.length).toBeGreaterThan(0.3);
  });
});

describe("★ 空串是**有效值**（`??` 不回落）", () => {
  // `??` 只挡 null/undefined。若改成 `||`，空串会静默被后面的值覆盖 ——
  // 而"参数已清空"与"参数未设置"是两件不同的事。
  test("原文为空串时**不**回落到 snake", () => {
    expect(deviceParamValue(params({ ratedVoltage: "", rated_voltage: "B" }), "ratedVoltage")).toBe("");
  });

  test("snake 为空串时**不**回落到 camel", () => {
    expect(deviceParamValue(params({ rated_voltage: "", ratedVoltageX: "C" }), "ratedVoltage")).toBe("");
  });

  test("三条都为空串 → 空串（非 undefined）", () => {
    expect(deviceParamValue(params({ ratedVoltage: "", rated_voltage: "", ratedVoltageX: "" }), "ratedVoltage")).toBe("");
  });

  test("★ 对照：null 会**回落**（违反类型但行为可观测）", () => {
    // `Record<string, string>` 不允许 null，但 JSON 来源的数据可能有
    expect(deviceParamValue(params({ ratedVoltage: null, rated_voltage: "B" }), "ratedVoltage")).toBe("B");
  });
});

describe("gas_quantity 特判：三条独立路径（不经过 camel）", () => {
  test("snake 原名 gas_quantity", () => {
    expect(deviceParamValue(params({ gas_quantity: "1" }), "gasQuantity")).toBe("1");
  });

  test("camel 写法 gasQuantity", () => {
    expect(deviceParamValue(params({ gasQuantity: "2" }), "gasQuantity")).toBe("2");
  });

  test("全小写 gasquantity（第三种历史写法）", () => {
    expect(deviceParamValue(params({ gasquantity: "3" }), "gasQuantity")).toBe("3");
  });

  test("★ 优先级：gas_quantity > gasQuantity > gasquantity", () => {
    expect(deviceParamValue(params({ gas_quantity: "1", gasQuantity: "2" }), "gasQuantity")).toBe("1");
    expect(deviceParamValue(params({ gasQuantity: "1", gasquantity: "2" }), "gasQuantity")).toBe("1");
    expect(deviceParamValue(params({ gas_quantity: "1", gasQuantity: "2", gasquantity: "3" }), "gasQuantity")).toBe("1");
  });

  test("传 snake 原名 / 全小写作 key 仍能取到 camel 键的值", () => {
    // 探针实测：key="gas_quantity" 时 snake 也是 gas_quantity，走同一条特判
    expect(deviceParamValue(params({ gasQuantity: "2" }), "gas_quantity")).toBe("2");
    expect(deviceParamValue(params({ gasQuantity: "2" }), "gasquantity")).toBe("2");
  });
});

describe("soc 别名：三种历史写法归一（故意的迁移兼容）", () => {
  // toSnakeCaseDeviceParamName 里 `state_of_charge` → `soc`
  // normalizeLegacyGasQuantityDeviceParams 迁移时删旧键、写入 soc
  test("三种写法都映射到 snake `soc`", () => {
    for (const key of ["state_of_charge", "stateOfCharge", "soc", "SOC", "Soc", "State_Of_Charge"]) {
      expect(toSnakeCaseDeviceParamName(key), key).toBe("soc");
    }
  });

  test("★ 副作用：未归一数据里三种写法按「**原文优先**」各取各的值", () => {
    // 实测真实数据（data/schemes/trash/2026-08-15.../交流设备.json）：
    // soc=0.5 与 state_of_charge=50% 共存。
    //
    // 确切形态是「原文优先」：params[key] 命中就直接返回，
    // **只有原文缺失时**才沿 snake(=soc) 找到别人的值。
    // 我第一版写成"三者互相串扰"，被测试当场抓出（实测 state_of_charge 拿到 "50%"）。
    const mixed = params({ soc: "0.5", state_of_charge: "50%", stateOfCharge: "50%" });
    expect(deviceParamValue(mixed, "soc")).toBe("0.5");
    expect(deviceParamValue(mixed, "state_of_charge")).toBe("50%");
    expect(deviceParamValue(mixed, "stateOfCharge")).toBe("50%");
    // 删掉原文后才沿 snake 串到 soc
    const onlySoc = params({ soc: "0.5" });
    expect(deviceParamValue(onlySoc, "state_of_charge"), "旧键缺失 → 沿 snake 串到 soc").toBe("0.5");
    expect(deviceParamValue(onlySoc, "stateOfCharge")).toBe("0.5");
  });

  test("**归一后三种写法同值**（这才是迁移的目的）", () => {
    // normalizeLegacyGasQuantityDeviceParams 迁移时删掉旧键、写入 soc。
    // 归一后查旧写法会沿 snake 串到 soc —— 不是"取不到"，而是"取到归一后的同一个值"，
    // 语义上正确（这正是归一的目的）。
    const normalized = params({ soc: "0.5" });
    const values = ["soc", "state_of_charge", "stateOfCharge"].map((k) => deviceParamValue(normalized, k));
    expect(values).toEqual(["0.5", "0.5", "0.5"]);
    expect(new Set(values).size, "归一后三种写法应同值").toBe(1);
  });

  test("带后缀的写法**不归一**（只对完全匹配的 key 生效）", () => {
    // 探针实测：state_of_charge_t1 → snake 是 state_of_charge_t1（不是 soc）
    expect(toSnakeCaseDeviceParamName("state_of_charge_t1")).toBe("state_of_charge_t1");
    expect(deviceParamValue(params({ stateOfCharge: "50" }), "state_of_charge_t1")).toBeUndefined();
  });
});

describe("toSnakeCaseDeviceParamName：把各种写法收敛到同一 snake", () => {
  const cases: Array<[string, string]> = [
    ["ratedVoltage", "rated_voltage"],
    ["rated_voltage", "rated_voltage"],
    ["RatedVoltage", "rated_voltage"],
    ["RATED_VOLTAGE", "rated_voltage"],
    ["rated  voltage", "rated_voltage"],   // 空格
    ["rated-voltage", "rated_voltage"],   // 连字符
    ["rated.voltage", "rated_voltage"],   // 点
    ["__rated__voltage__", "rated_voltage"], // 前后下划线被剥
    ["  ratedVoltage  ", "rated_voltage"], // 首尾空白
    ["ratedVoltageT1", "rated_voltage_t1"],
    ["rated_voltage_t1", "rated_voltage_t1"],
    ["maxP", "max_p"],
    ["maxPMax", "max_p_max"],
    ["ACBusbar", "ac_busbar"],           // 连续大写
    ["acBusbar", "ac_busbar"],
    ["ratedVoltage1", "rated_voltage1"], // 数字不拆
    ["v2Busbar", "v2_busbar"],
    ["ABCDef", "abc_def"],
    ["aB", "a_b"],
    ["aBC", "a_bc"],
    ["ABCd", "ab_cd"],
    ["", ""]
  ];

  test("逐条核对（含连续大写、缩写、全大写下划线）", () => {
    for (const [input, expected] of cases) {
      expect(toSnakeCaseDeviceParamName(input), JSON.stringify(input)).toBe(expected);
    }
  });

  test("**幂等**：snoke(snake(x)) === snake(x)", () => {
    // 幂等是 deviceParamValue 正确性的前提：否则同一个 key 查两次得到不同 snake
    for (const [input] of cases) {
      const once = toSnakeCaseDeviceParamName(input);
      expect(toSnakeCaseDeviceParamName(once), `${JSON.stringify(input)} 幂等性`).toBe(once);
    }
  });

  test("中文字符被替换为下划线后剥掉（可能得到空串）", () => {
    expect(toSnakeCaseDeviceParamName("构造函数")).toBe("");
    expect(toSnakeCaseDeviceParamName("电压")).toBe("");
  });
});

describe("缺失与异常输入", () => {
  test("缺失 → undefined（不是空串/null）", () => {
    expect(deviceParamValue({}, "ratedVoltage")).toBeUndefined();
    expect(deviceParamValue(params({ a: "1" }), "zzz")).toBeUndefined();
  });

  test("空/空白/下划线 key → undefined", () => {
    for (const key of ["", "  ", "_", "0", "1"]) {
      expect(deviceParamValue({}, key), JSON.stringify(key)).toBeUndefined();
    }
  });

  test("★ 中文 key：**原文命中即可取到**（不经 snake 化）", () => {
    // 探针实测我先记成"取不到"，被测试抓出：`params[key]` 是第一条路径，
    // 中文 key 只要 params 里真有同名的键就能取到。snake 化只影响第 2/3 条路径。
    expect(deviceParamValue(params({ 电压: "220" }), "电压")).toBe("220");
    // 但 snake 化后为空，所以 camel 路径也没用；换个写法就取不到
    expect(deviceParamValue(params({ 电压: "220" }), " 电压 "), "带空白的 key 走 snake 化（得空）").toBeUndefined();
  });

  test("非字符串值原样透出（`Record<string,string>` 被违反时）", () => {
    for (const v of [0, false, 1, true] as never[]) {
      expect(deviceParamValue(params({ ratedVoltage: v }), "ratedVoltage"), String(v)).toBe(v);
    }
  });

  test("params 为 null/undefined 会抛 TypeError（类型面问题，如实记录）", () => {
    // 判定为类型面问题，不修：`deviceParamValue(params: Record<string,string>, ...)`
    // 的形参类型不允许 null，抛异常正说明调用方违背了契约。
    // 保留这条断言：若日后有人加 `params?.` 兜底让它们不抛，这里会转红提醒。
    expect(() => deviceParamValue(null as never, "ratedVoltage")).toThrow(TypeError);
    expect(() => deviceParamValue(undefined as never, "ratedVoltage")).toThrow(TypeError);
  });

  test("★ 如实记录：`__proto__` 会返回 Object.prototype（原型链穿透）", () => {
    // 探针实测：deviceParamValue({}, "__proto__") 返回 {} —— 正是 Object.prototype。
    //
    // **判定为理论形态，不修**：
    // ① 真实 params 来自 JSON.parse 时，`__proto__` 是**自有属性**，
    //    实测 deviceParamValue(JSON.parse('{"__proto__":"EVIL"}'), "__proto__") === "EVIL"，
    //    返回的是真实值而非原型；
    // ② 只有 params 恰为 `{}` **字面量**（原型链完整）且 key 为 `__proto__` 时才返回原型。
    //    而参数名来自设备库配置，不可能是 `__proto__`。
    //
    // 修复（`Object.prototype.hasOwnProperty.call` 守卫）会给 111 个调用点
    // 的每次取值加一次 hasOwnProperty 调用 —— 性能代价确定、收益为零。
    const viaProto = deviceParamValue({}, "__proto__");
    expect(viaProto, "确实返回原型对象").toBe(({} as unknown as { __proto__: unknown }).__proto__);
    expect(typeof viaProto).toBe("object");
  });

  test("★ 真实 JSON 来源下 `__proto__` 是自有属性，返回真实值", () => {
    const fromJson = JSON.parse('{"__proto__":"EVIL"}') as Record<string, string>;
    expect(deviceParamValue(fromJson, "__proto__")).toBe("EVIL");
  });

  test("★ 其它原型链键返回**原型上的函数/对象**（原型链穿透，与 `__proto__` 同类）", () => {
    // 探针实测我先记成"返回 undefined"，被测试抓出：`params[key]` 会沿原型链找，
    // 所以 toString / valueOf / hasOwnProperty / constructor 都能取到原型上的东西。
    //
    // **与 `__proto__` 同类判定，不修**：参数名来自设备库配置，
    // 不可能是这些内置方法名；加 hasOwnProperty 守卫会给 111 个调用点
    // 的每次取值加一次调用 —— 性能代价确定、收益为零。
    expect(typeof deviceParamValue({}, "toString")).toBe("function");
    expect(typeof deviceParamValue({}, "valueOf")).toBe("function");
    expect(typeof deviceParamValue({}, "hasOwnProperty")).toBe("function");
    expect(typeof deviceParamValue({}, "constructor")).toBe("function");
    // 不可枚举的其它 Object.prototype 方法
    expect(typeof deviceParamValue({}, "toLocaleString")).toBe("function");
    // `__defineGetter__` / `__lookupSetter__` 同样能取到（它们在原型上，可枚举性不影响 `in`/属性访问）
    expect(typeof deviceParamValue({}, "__defineGetter__")).toBe("function");
    expect(typeof deviceParamValue({}, "__lookupSetter__")).toBe("function");
  });
});
