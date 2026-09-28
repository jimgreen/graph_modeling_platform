// 分类库名 → 端子类型 / 关联默认值的直接单测（各 7 处生产调用，此前零直呼）。
//
// ## 它决定什么
//
// 图元库里的设备按「分类库」归类，而**端子类型**（交流/直流/氢/热）是从
// **分类库的中文名**里用 `includes` 猜出来的。判错的后果是设备被建成另一种
// 端子类型 —— 直流设备的端子变成交流，量测、电压基值、关联关系全跟着错，
// 而**导出流程不报任何错**。
//
// ## 探针实测出的三条关键事实
//
// ① **判定顺序敏感**：实现是 `直流 → 氢 → 热 → 默认 ac` 的**顺序 if 链**，
//    所以复合词按**先命中者**决定：
//      "交流直流"   → dc    （含"直流"）
//      "氢能热泵"   → h2    （含"氢"与"热"，氢在前）
//      "热氢"       → h2
//      "交流供热锅炉" → heat
//    这不是"更精确的判定"，而是**顺序的副产品**。真实分类库名都是单一能源词，
//    所以碰不到；但日后新建一个叫"氢能热泵"的分类库时，这会静默变成 h2。
//    测试把顺序后果全部钉住，并标注哪些是刻意、哪些是顺序副产品。
//
// ② **只判「包含」，不判「等于」**：`xx直流xx` → dc、`前缀热后缀` → heat。
//    中文分类库名天然带前后缀（"交流厂站电源"、"储氢罐"），这是**必需**的。
//
// ③ **`ac` 是默认值而非命中项**：不含任何关键词的分类库名（`"未知分类"`、
//    `""`、`"AC"`、`"heat"`）一律落到 `ac`。
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  defaultTerminalAssociationForClassTerminal,
  defaultTerminalTypeForCategoryLibrary
} from "./componentLibraryMetadata";
import type { TerminalType } from "./model";

describe("defaultTerminalTypeForCategoryLibrary：中文关键词包含判定", () => {
  test("交流类（命中默认值 ac）", () => {
    for (const name of ["交流", "交流设备", "交流厂站电源", "交流厂站负荷", "交流电负荷", "交流变换器"]) {
      expect(defaultTerminalTypeForCategoryLibrary(name), name).toBe("ac");
    }
  });

  test("直流类：含「直流」", () => {
    for (const name of ["直流", "直流设备", "直流母线"]) {
      expect(defaultTerminalTypeForCategoryLibrary(name), name).toBe("dc");
    }
  });

  test("氢类：含「氢」", () => {
    for (const name of ["氢", "氢能", "氢气", "储氢罐", "横卧式储氢罐", "集装格式储氢罐"]) {
      expect(defaultTerminalTypeForCategoryLibrary(name), name).toBe("h2");
    }
  });

  test("热类：含「热」", () => {
    for (const name of ["热", "热能", "供热锅炉", "供热锅炉2", "储热罐", "换热器"]) {
      expect(defaultTerminalTypeForCategoryLibrary(name), name).toBe("heat");
    }
  });
});

describe("★ 只判「包含」，不判「等于」（中文分类库名天然带前后缀）", () => {
  test("关键词被前后文包裹仍命中", () => {
    expect(defaultTerminalTypeForCategoryLibrary("xx直流xx")).toBe("dc");
    expect(defaultTerminalTypeForCategoryLibrary("前缀热后缀")).toBe("heat");
    expect(defaultTerminalTypeForCategoryLibrary("A氢B")).toBe("h2");
    expect(defaultTerminalTypeForCategoryLibrary("交流(AC)")).toBe("ac");
  });

  test("这正是「交流厂站电源」这类名字能工作的原因", () => {
    // 若改成"必须等于"，上面这些真实分类库名会全部落到默认 ac。
    expect(defaultTerminalTypeForCategoryLibrary("交流厂站电源")).toBe("ac");
    expect("交流厂站电源").not.toBe("交流"); // 说明确实不是相等匹配
  });
});

describe("★ 判定顺序：直流 → 氢 → 热 → 默认 ac（复合词按先命中者）", () => {
  // 这些是**顺序的副产品**，不是更精细的语义。真实分类库名都是单一能源词，
  // 碰不到这些组合；此处钉住的目的是：日后有人调整 if 链顺序时会立刻看到后果。
  const orderCases: Array<[string, TerminalType, string]> = [
    ["交流直流", "dc", "含「直流」；虽有「交流」但直流在前"],
    ["直流氢", "dc", "含「直流」"],
    ["交流储氢罐", "h2", "含「氢」"],
    ["氢能热泵", "h2", "★ 含「氢」与「热」，氢在前 → h2"],
    ["热氢", "h2", "★ 含「热」与「氢」，氢在前 → h2（与上一条顺序无关）"],
    ["交流供热锅炉", "heat", "含「热」；虽无更靠前的关键词"],
    ["直流供热锅炉", "dc", "含「直流」，压过「热」"]
  ];

  for (const [name, expected, why] of orderCases) {
    test(`${JSON.stringify(name).padEnd(18)} → ${expected}（${why}）`, () => {
      expect(defaultTerminalTypeForCategoryLibrary(name), name).toBe(expected);
    });
  }

  test("顺序固定为 直流 > 氢 > 热（用两两组合穷举）", () => {
    // 穷举「两关键词 + 顺序无关的两种排列」，确认哪一类总是赢。
    expect(defaultTerminalTypeForCategoryLibrary("直流氢")).toBe("dc");
    expect(defaultTerminalTypeForCategoryLibrary("氢直流")).toBe("dc"); // 「氢直流」含"直流"也含"氢"
    expect(defaultTerminalTypeForCategoryLibrary("氢热")).toBe("h2");
    expect(defaultTerminalTypeForCategoryLibrary("热氢")).toBe("h2");
    expect(defaultTerminalTypeForCategoryLibrary("直流热")).toBe("dc");
    expect(defaultTerminalTypeForCategoryLibrary("热直流")).toBe("dc");
  });

  test("「交流」从不参与竞争（它是默认值，不是命中项）", () => {
    // 含"交流"与其它关键词时，胜负只看其它关键词。
    expect(defaultTerminalTypeForCategoryLibrary("交流直流")).toBe("dc");
    expect(defaultTerminalTypeForCategoryLibrary("交流储氢罐")).toBe("h2");
    expect(defaultTerminalTypeForCategoryLibrary("交流供热锅炉")).toBe("heat");
    // 只含"交流" → 落到默认 ac
    expect(defaultTerminalTypeForCategoryLibrary("交流")).toBe("ac");
  });
});

describe("默认值：无关键词一律 ac", () => {
  test("无关键词的中文名", () => {
    for (const name of ["未知分类", "", "   ", "其他", "自定义"]) {
      expect(defaultTerminalTypeForCategoryLibrary(name), JSON.stringify(name)).toBe("ac");
    }
  });

  test("**只认中文关键词**：英文一律落默认", () => {
    for (const name of ["AC", "DC", "H2", "heat", "Hydrogen", "DirectCurrent"]) {
      expect(defaultTerminalTypeForCategoryLibrary(name), name).toBe("ac");
    }
  });

  test("非字符串输入安全落默认（normalizeName 走 String()）", () => {
    for (const bad of [undefined, null, 0, 1, true, {}, []] as never[]) {
      expect(defaultTerminalTypeForCategoryLibrary(bad), String(bad)).toBe("ac");
    }
  });
});

describe("normalizeName 的 trim 生效：带空白的关键词仍命中", () => {
  // ★ 变异验证时发现：把 `normalizeName` 的 `.trim()` 去掉，这组测试**依然全绿** ——
  // 因为 `"  直流  ".includes("直流")` 本来就为真，trim 对本判定**不可观测**。
  // 也就是说：这条契约在**这个函数**上无法用行为断言钉住。
  //
  // 契约成立的条件是「某处不做某事」（这里：不做 trim），按本会话既定做法
  // 改用**静态断言**钉住 —— 否则日后有人删掉 trim 不会有任何测试转红。
  test("首尾空白不影响判定（`includes` 本身就容忍前后缀）", () => {
    expect(defaultTerminalTypeForCategoryLibrary("  直流  ")).toBe("dc");
    expect(defaultTerminalTypeForCategoryLibrary("\t氢\n")).toBe("h2");
    expect(defaultTerminalTypeForCategoryLibrary(" 热 ")).toBe("heat");
    expect(defaultTerminalTypeForCategoryLibrary("  交流  ")).toBe("ac");
  });

  test("**内部空白不参与判定**（「直 流」不含「直流」；「储氢 罐」仍含「氢」）", () => {
    // 这条钉住「不做内部空白归一」：关键词被空格**拆开**时不命中。
    expect(defaultTerminalTypeForCategoryLibrary("直 流")).toBe("ac");
    // 但若关键词本身完整、只是别处有空格，仍命中 —— 说明判据是"包含完整关键词"
    expect(defaultTerminalTypeForCategoryLibrary("储氢 罐")).toBe("h2");
    expect(defaultTerminalTypeForCategoryLibrary("储 氢罐")).toBe("h2");
  });

  test("静态断言：`normalizeName` 仍带 `.trim()`", () => {
    // 行为断言证明不了"没有做 trim"（因为 includes 天然容忍），只能静态钉。
    const source = readFileSync("src/componentLibraryMetadata.ts", "utf8");
    expect(source).toMatch(/const normalizeName = \(value: unknown\) => String\(value \?\? ""\)\.trim\(\);/);
  });
});

describe("defaultTerminalAssociationForClassTerminal：端子类型 → 关联默认值", () => {
  test("四个合法类型各有对应默认值", () => {
    expect(defaultTerminalAssociationForClassTerminal("ac")).toBe("ac-load");
    expect(defaultTerminalAssociationForClassTerminal("dc")).toBe("dc-load");
    expect(defaultTerminalAssociationForClassTerminal("h2")).toBe("h2-load");
    expect(defaultTerminalAssociationForClassTerminal("heat")).toBe("heat-load");
  });

  test("**一一对应**：四个值互不相同，且都是 `xx-load` 形态", () => {
    const values = (["ac", "dc", "h2", "heat"] as const).map(defaultTerminalAssociationForClassTerminal);
    expect(values).toEqual(["ac-load", "dc-load", "h2-load", "heat-load"]);
    expect(new Set(values).size).toBe(4);
    for (const [type, value] of (["ac", "dc", "h2", "heat"] as const).map((t) => [t, defaultTerminalAssociationForClassTerminal(t)] as const)) {
      expect(value, `${type} 的默认值应形如 "${type}-load"`).toBe(`${type}-load`);
    }
  });

  test("非法类型 → 落 `ac-load`（与 ac 同值）", () => {
    for (const bad of ["xx", "", "AC", "AC-Load", "hydrogen"] as never[]) {
      expect(defaultTerminalAssociationForClassTerminal(bad), JSON.stringify(bad)).toBe("ac-load");
    }
  });

  test("**不做大小写归一**：`AC` ≠ `ac`", () => {
    expect(defaultTerminalAssociationForClassTerminal("AC" as never)).toBe("ac-load");
    // 两者同值是巧合（都落默认），所以用 DC 验证更清楚：
    expect(defaultTerminalAssociationForClassTerminal("DC" as never)).toBe("ac-load");
    expect(defaultTerminalAssociationForClassTerminal("dc")).toBe("dc-load");
  });

  test("与端子类型判定**独立**（不共用关键词逻辑）", () => {
    // 分类库名 → 端子类型走中文关键词；端子类型 → 关联值走精确相等。
    // 混用会出错，所以显式对照两组映射的输入域。
    expect(defaultTerminalTypeForCategoryLibrary("直流")).toBe("dc");
    expect(defaultTerminalAssociationForClassTerminal("dc")).toBe("dc-load");
    // 但「直流」这个分类库名**不能**直接喂给第二个函数
    expect(defaultTerminalAssociationForClassTerminal("直流" as never)).toBe("ac-load");
  });
});
