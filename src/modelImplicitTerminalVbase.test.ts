// src/model.ts 的 isImplicitTerminalVbaseForType：判断端子电压是不是「模板默认值」而非用户填的。
// 唯一调用方 normalizeNodeTerminalsWithTemplate 用它决定「端子类型被模板改写时，vbase 要不要一起重置」——
// 判错就会把用户手填的电压悄悄抹成 0，或者反过来该重置的没重置。
// 此前零断言。
//
// 11 处变异逐条跑过，全部转红（其中两处落在 isZeroNumericText 上，验证的是「零」的判定本身）。
import { describe, expect, test } from "vitest";

import { isImplicitTerminalVbaseForType } from "./model";
import type { TerminalType } from "./model";

const implicit = (value: string | undefined, type: TerminalType) => isImplicitTerminalVbaseForType(value, type);

describe("isImplicitTerminalVbaseForType：空值与零值", () => {
  test("未填 / 空串 / 纯空白一律算默认值，四种端子类型都一样", () => {
    for (const type of ["ac", "dc", "h2", "heat"] as TerminalType[]) {
      for (const value of [undefined, "", "   "]) {
        expect(implicit(value, type), `${type}/${JSON.stringify(value)}`).toBe(true);
      }
    }
  });

  test("★ 各种写法的零都算默认值（含带单位、小数、前导零、负号）", () => {
    for (const type of ["ac", "dc", "h2", "heat"] as TerminalType[]) {
      for (const value of ["0", "0.0", "0.00", "0kV", "00", "-0"]) {
        expect(implicit(value, type), `${type}/${value}`).toBe(true);
      }
    }
  });

  test("非零的零附近取值不算默认值（0.5 / 0.01）", () => {
    for (const type of ["ac", "dc", "h2", "heat"] as TerminalType[]) {
      expect(implicit("0.5", type), type).toBe(false);
      expect(implicit("0.01", type), type).toBe(false);
    }
  });

  test("★ 归一后为空的杂串不算默认值（没有数字可取）", () => {
    for (const value of ["abc", "kV", "７５０", "10"]) {
      expect(implicit(value, "ac"), value).toBe(value === "10");
    }
  });
});

describe("isImplicitTerminalVbaseForType：交流端子（隐含默认 10）", () => {
  test("10 及带单位 / 带尾巴的 10 算默认值", () => {
    for (const value of ["10", "10kV", "10 kV", "10-"]) {
      expect(implicit(value, "ac"), value).toBe(true);
    }
  });

  test("★ 写法不同但数值等于 10 的不算默认值（比的是归一后的**字符串**）", () => {
    for (const value of ["10.0", "10.00", "010", "1e2", ".10", "10."]) {
      expect(implicit(value, "ac"), value).toBe(false);
    }
  });

  test("其它电压一律是用户填的", () => {
    for (const value of ["110", "220", "380", "5"]) {
      expect(implicit(value, "ac"), value).toBe(false);
    }
  });

  test("直流默认 750 在交流端子眼里不是默认值", () => {
    expect(implicit("750", "ac")).toBe(false);
  });
});

describe("isImplicitTerminalVbaseForType：直流端子（隐含默认 750）", () => {
  test("750 及带单位的 750 算默认值", () => {
    for (const value of ["750", "750kV"]) {
      expect(implicit(value, "dc"), value).toBe(true);
    }
  });

  test("写法不同但数值等于 750 的不算默认值", () => {
    for (const value of ["750.0", "0750"]) {
      expect(implicit(value, "dc"), value).toBe(false);
    }
  });

  test("交流默认 10 在直流端子眼里不是默认值", () => {
    expect(implicit("10", "dc")).toBe(false);
  });
});

describe("isImplicitTerminalVbaseForType：氢能 / 热能端子没有隐含默认", () => {
  test("除空值与零之外一律算用户填的", () => {
    for (const type of ["h2", "heat"] as TerminalType[]) {
      for (const value of ["10", "750", "110", "1.6", "abc"]) {
        expect(implicit(value, type), `${type}/${value}`).toBe(false);
      }
    }
  });
});
