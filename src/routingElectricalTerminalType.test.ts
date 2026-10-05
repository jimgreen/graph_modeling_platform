// model-routing.ts 导出的 isElectricalTerminalType 的**独立**直测。
//
// 为什么必须独立成文件、而不是挂在 model-routingVoltageIsland.test.ts 里：
// 那份用例第 192 行已明写「入口那道判定不能作为覆盖证据」——从
// collectVoltageBaseIslandForTerminal 之类的入口走进去，拿到的是**被上游
// 过滤之后**的端子集合，永远观察不到本函数对 h2/heat 的返回值，也观察不到
// 大小写、未收录字符串、非字符串入参这三类输入。要钉住它，只能直呼。
//
// 本函数在 model-routing.ts 内部被 14 处用来 filter 端子（.some / .find /
// .filter），判错的直接后果是：热端子（heat）被当成电端子进电压岛归并、
// 或者交直流被漏掉 → 跨电压级误改或整片拓扑岛漏改。属静默算错一类，
// 不抛异常、不打日志，所以只能靠断言钉住。
//
// 判定本体（model-routing.ts:3668）：`type === "ac" || type === "dc"`
// —— 纯 === 比较，无守卫、无归一化、无兜底。故：
//   · 大小写敏感（=== 不折叠大小写）
//   · 不抛 TypeError（=== 两侧类型不同只会得到 false，不做类型收窄强转）
import { describe, expect, test } from "vitest";

import { isElectricalTerminalType } from "./model-routing";
import type { ElectricalTerminalType } from "./model-routing";
import type { Terminal, TerminalType } from "./model";

/**
 * 参数标注是 TerminalType，但我们要喂的正是标注之外的入参。
 * 这里统一绕过标注，好把**运行期真实行为**（含非字符串）钉成契约，
 * 而不是让类型检查在编译期就把这些用例挡掉。
 */
const check = (value: unknown): boolean => isElectricalTerminalType(value as TerminalType);

/** TerminalType 的全集，逐个成员都要有断言——集合外的成员才是回归的入口。 */
const ALL_TERMINAL_TYPES: readonly TerminalType[] = ["ac", "dc", "h2", "heat"];

describe("isElectricalTerminalType 判定集合", () => {
  test("四个已收录端子类型逐一断言：仅 ac 与 dc 为真，h2 与 heat 为假", () => {
    expect(check("ac")).toBe(true);
    expect(check("dc")).toBe(true);
    expect(check("h2")).toBe(false);
    expect(check("heat")).toBe(false);
  });

  test("全集成员逐个过一遍，且判定为真者恰是 ac 与 dc 两个", () => {
    const truthy = ALL_TERMINAL_TYPES.filter((type) => isElectricalTerminalType(type));
    // 不写死 ["ac", "dc"] 的顺序敏感比较：判定是纯 === ，与顺序无关。
    expect([...truthy].sort()).toEqual(["ac", "dc"]);
    expect(truthy).toHaveLength(2);
  });

  test("未收录的字符串与空串返回假", () => {
    expect(check("")).toBe(false);
    expect(check(" a")).toBe(false);
    expect(check("ac ")).toBe(false); // 尾部空格不做 trim
    expect(check(" ac")).toBe(false); // 首部空格不做 trim
    expect(check("a")).toBe(false);
    expect(check("AB")).toBe(false);
    expect(check("toString")).toBe(false); // 继承链上的名字也不是端子类型
    expect(check("undefined")).toBe(false);
    expect(check("null")).toBe(false);
  });

  test("判定区分大小写：AC、DC、Ac、dC、Heat 等混合大小写形式一律为假", () => {
    expect(check("AC")).toBe(false);
    expect(check("DC")).toBe(false);
    expect(check("Ac")).toBe(false);
    expect(check("dC")).toBe(false);
    expect(check("H2")).toBe(false);
    expect(check("Heat")).toBe(false);
    expect(check("hEAT")).toBe(false);
  });

  // 现状契约：源码只做 === 比较，压根不会抛 TypeError，故这些入参都返回假。
  // 已知健壮性缺口：形参标注是 TerminalType（编译期已挡住非字符串），
  // 运行期却靠 === 的类型不相等「顺手」兜住——若日后改成 type.startsWith /
  // type.trim() 之类要取属性的写法，这批用例会从 false 变成 TypeError，
  // 那正是它们存在的意义：提醒补正式守卫，而不是默默炸在生产链路上。
  test("非字符串入参不抛错，一律返回假", () => {
    expect(check(0)).toBe(false);
    expect(check(1)).toBe(false);
    expect(check(-1)).toBe(false);
    expect(check(NaN)).toBe(false);
    expect(check(null)).toBe(false);
    expect(check(undefined)).toBe(false);
    expect(check(true)).toBe(false);
    expect(check(false)).toBe(false);
    expect(check({})).toBe(false);
    expect(check({ type: "ac" })).toBe(false); // 传对象不等于传 ac
    expect(check([])).toBe(false);
    expect(check(["ac"])).toBe(false);
    expect(check(Symbol("ac"))).toBe(false);
    expect(() => check(null)).not.toThrow();
  });
});

describe("isElectricalTerminalType 作为类型收窄守卫", () => {
  // 它存在的唯一理由就是 `type is ElectricalTerminalType`：
  // model-routing.ts 内 14 处靠它把 node.terminals 里的热端子滤掉。
  // 下面的赋值若收窄失效（谓词退化成 boolean），tsc 会直接报错——
  // 于是这条用例同时钉住运行时行为与类型语义两件事。
  test("filter 只留交直流端子；在 if 内 type 才被收窄为 ElectricalTerminalType", () => {
    const terminal = (id: string, type: TerminalType): Terminal =>
      ({ id, label: id, type, anchor: { x: 0, y: -0.5 } }) as unknown as Terminal;
    const terminals: Terminal[] = [
      terminal("t-ac", "ac"),
      terminal("t-h2", "h2"),
      terminal("t-dc", "dc"),
      terminal("t-heat", "heat"),
    ];

    const electrical = terminals.filter((t) => isElectricalTerminalType(t.type));
    expect(electrical.map((t) => t.id)).toEqual(["t-ac", "t-dc"]);

    // 收窄的是**属性** t.type，不是元素 t —— 所以 electrical 的元素类型仍是
    // Terminal，直接 `electrical[0].type` 赋给 ElectricalTerminalType 编译不过
    // （tsc 已实测报 TS2322）。要拿到窄化后的联合，得像下面这样在 if 内对
    // 同一属性再问一次，这也是 model-routing.ts 里 4636/4725/4769 行的用法。
    const narrowedTypes: ElectricalTerminalType[] = [];
    for (const t of electrical) {
      if (isElectricalTerminalType(t.type)) {
        // 若谓词退化成 boolean，此行编译报错——收窄语义即被钉住。
        narrowedTypes.push(t.type);
      } else {
        // 不可省：否则 if 恒假时下面那条 expect 会空跑，断言恒绿。
        throw new Error("filter 出来的端子不该落到 else 分支");
      }
    }
    expect(narrowedTypes).toEqual(["ac", "dc"]);
  });

  test("some 判定与 filter 结果一致：只要存在电端子则为真", () => {
    const types: TerminalType[] = ["heat", "h2", "dc"];
    expect(types.some((type) => isElectricalTerminalType(type))).toBe(true);
    expect(types.every((type) => isElectricalTerminalType(type))).toBe(false);
    expect((["h2", "heat"] as TerminalType[]).some((type) => isElectricalTerminalType(type))).toBe(false);
  });

  // 已知的等价变异：把判定改写成 ["ac","dc"].includes(type)，本文件一条都不会红。
  // 这是**可证等价**，不必补断言去硬凑：Array.prototype.includes 用 SameValueZero
  // 比较，而数组元素全是字符串，SameValueZero 与 === 在字符串上完全一致
  // （两者唯一的分歧点是 NaN 与 ±0，而此处被比较方恒为字符串，分歧不可能出现）。
  // 真正会红的是下面这些，已逐一变异验证过：
  //   删掉 ac / 删掉 dc                -> 对应单个用例红
  //   误纳 h2 / 误纳 heat              -> 对应单个用例红
  //   恒 true / 恒 false               -> 31 / 2 条红
  //   改成大小写不敏感（toLowerCase）  -> AC/DC/Ac/dC 四条红
  //   改成先 trim 再比                  -> " ac" / "ac " / " ac" 三条红
  // 换言之：这批断言的区分力覆盖了「成员增减」与「归一化」两个维度，
  // 缺的输入维度不存在。
  test("已记录：includes 改写在本输入集下不可观测，属可证等价变异", () => {
    const equivalent = (value: unknown): boolean => ["ac", "dc"].includes(value as TerminalType);
    for (const type of ALL_TERMINAL_TYPES) {
      expect(equivalent(type)).toBe(isElectricalTerminalType(type));
    }
    // 大小写与空串这两类「本就不在联合内」的输入同样一致。
    expect(equivalent("AC")).toBe(check("AC"));
    expect(equivalent("")).toBe(check(""));
  });
});
