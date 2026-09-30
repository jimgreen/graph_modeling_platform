// src/model.ts 的电压等级设置持久化：readVoltageLevelSettings / writeVoltageLevelSettings。
// 这份设置是用户自己维护的「电压等级表」（名称 + 额定电压），存 localStorage，
// 读回来直接决定电压色、额定容量默认值、电压设定值填充。
// 此前零断言。判错不抛异常：读到坏数据就悄悄退回内置表，用户改的等级「不见了」。
//
// 15 处变异逐条跑过，12 处转红。三处没转红的原因都记在这里：两处**源码等价** ——
// ① `if (stored)` 改成 `if (stored !== null)`：空串会被 JSON.parse 抛掉，catch 后同样退回内置表；
// ② 去掉 `typeof parsed === "object"`：JSON 能解析出来的标量（数字 / 字符串 / null）本来就没有
//    ac / dc 数组，后面两道 Array.isArray 已经把它们挡住了。第三处是**无效变异**（我写坏的）：
// 锚点缩进没对上，代码根本没被改过，不算覆盖。
//
// 测试自带一个内存 localStorage 桩（仓库默认 environment 是 node，没有真 localStorage；
// 也不引 jsdom —— 那是新增依赖）。桩同时能抛错，用来钉「存储不可用时不炸」这条路径。
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  BUILTIN_VOLTAGE_LEVELS,
  readVoltageLevelSettings,
  writeVoltageLevelSettings,
  type VoltageLevelSettings
} from "./model";

const KEY = "graph-model-voltage-levels";

/** 内存 localStorage 桩；`broken` 时所有读写都抛（隐私模式 / 配额满的近似）。 */
const installStorage = (broken = false) => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => {
      if (broken) throw new Error("storage blocked");
      return store.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (broken) throw new Error("quota exceeded");
      store.set(key, value);
    },
    removeItem: (key: string) => {
      if (broken) throw new Error("storage blocked");
      store.delete(key);
    },
    clear: () => store.clear()
  };
  return store;
};

const builtinDefaults = () => ({
  ac: BUILTIN_VOLTAGE_LEVELS.map((value) => ({ name: value, vltp: value })),
  dc: BUILTIN_VOLTAGE_LEVELS.map((value) => ({ name: value, vltp: value }))
});

let store: Map<string, string>;

beforeEach(() => {
  store = installStorage();
});
afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("readVoltageLevelSettings：没有设置时给内置表", () => {
  test("★ 空存储返回内置等级表，ac / dc 同表且逐项都是 {name, vltp}", () => {
    expect(readVoltageLevelSettings()).toEqual(builtinDefaults());
  });

  test("内置表覆盖 0.4 / 10 / 110 / 500 这几档常用电压", () => {
    const values = readVoltageLevelSettings().ac.map((item) => item.vltp);
    for (const v of ["0.4", "10", "110", "500"]) {
      expect(values, v).toContain(v);
    }
  });
});

describe("readVoltageLevelSettings：写进去读回来", () => {
  test("★ 原样往返（含自定义等级与名称）", () => {
    const settings: VoltageLevelSettings = {
      ac: [{ name: "低压 400V", vltp: "0.4" }, { name: "中压 10kV", vltp: "10" }],
      dc: [{ name: "直流 750V", vltp: "750" }]
    };
    writeVoltageLevelSettings(settings);
    expect(readVoltageLevelSettings()).toEqual(settings);
  });

  test("落盘的是 JSON（同一份设置在别的标签页能读到）", () => {
    writeVoltageLevelSettings({ ac: [], dc: [{ name: "D", vltp: "35" }] });
    expect(JSON.parse(store.get(KEY) ?? "null")).toEqual({ ac: [], dc: [{ name: "D", vltp: "35" }] });
  });

  test("★ 写空表也算有效设置（读回来还是空表，不退回内置）", () => {
    writeVoltageLevelSettings({ ac: [], dc: [] });
    expect(readVoltageLevelSettings()).toEqual({ ac: [], dc: [] });
  });
});

describe("readVoltageLevelSettings：坏数据退回内置表", () => {
  test("非法 JSON", () => {
    store.set(KEY, "{ 不是 json");
    expect(readVoltageLevelSettings()).toEqual(builtinDefaults());
  });

  test("★ ac / dc 缺一个、或不是数组 → 整份退回内置表（不局部保留）", () => {
    for (const raw of [
      JSON.stringify({ ac: [] }),
      JSON.stringify({ dc: [] }),
      JSON.stringify({ ac: {}, dc: [] }),
      JSON.stringify({ ac: [], dc: "10" }),
      JSON.stringify([{ name: "x", vltp: "1" }]),
      JSON.stringify(null),
      JSON.stringify("10")
    ]) {
      store.set(KEY, raw);
      expect(readVoltageLevelSettings(), raw).toEqual(builtinDefaults());
    }
  });

  test("结构对但内容是怪值时不校验、原样透出（渲染层自己负责）", () => {
    const weird = { ac: [{ name: 1, vltp: null }], dc: [{ name: {}, vltp: [] }] } as unknown as VoltageLevelSettings;
    store.set(KEY, JSON.stringify(weird));
    expect(readVoltageLevelSettings()).toEqual(weird);
  });

  test("存储不可用（读抛错）时返回内置表而不是崩", () => {
    installStorage(true);
    expect(readVoltageLevelSettings()).toEqual(builtinDefaults());
  });
});

describe("writeVoltageLevelSettings：写失败不抛", () => {
  test("★ 存储抛错时静默吞掉（设置对话框照常关）", () => {
    installStorage(true);
    expect(() => writeVoltageLevelSettings({ ac: [], dc: [] })).not.toThrow();
  });

  test("写入后立刻能读回来（同一次会话内生效）", () => {
    const settings: VoltageLevelSettings = { ac: [{ name: "A", vltp: "1" }], dc: [] };
    writeVoltageLevelSettings(settings);
    expect(readVoltageLevelSettings()).toEqual(settings);
  });
});
