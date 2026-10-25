import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  LIBRARY_TREE_ORDER_STORAGE_KEY,
  EMPTY_LIBRARY_TREE_ORDER,
  parseLibraryTreeOrder,
  readLibraryTreeOrder,
  writeLibraryTreeOrder,
  sortByKeyOrder,
  reorderKeys,
  moveKeyToEdge
} from "./libraryTreeOrder";

// 图元库面板树拖动排序的纯函数契约。存储属「本机 UI 偏好」（spaceCache 白名单成员），
// 畸形输入一律归空而不是抛错 —— 面板不能因坏数据拒绝渲染。
// 测试环境是 node（无 jsdom），与 spaceCache.test.ts 同法注入内存 localStorage 桩。

function createStorageStub(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    }
  };
}

let originalLocalStorage: unknown;

beforeEach(() => {
  originalLocalStorage = (globalThis as any).localStorage;
  (globalThis as any).localStorage = createStorageStub();
});

afterEach(() => {
  (globalThis as any).localStorage = originalLocalStorage;
  vi.restoreAllMocks();
});

describe("parseLibraryTreeOrder：畸形输入一律归空", () => {
  test("null / 非对象 / 数组都返回空覆盖", () => {
    expect(parseLibraryTreeOrder(null)).toEqual(EMPTY_LIBRARY_TREE_ORDER);
    expect(parseLibraryTreeOrder("junk")).toEqual(EMPTY_LIBRARY_TREE_ORDER);
    expect(parseLibraryTreeOrder(42)).toEqual(EMPTY_LIBRARY_TREE_ORDER);
    expect(parseLibraryTreeOrder([])).toEqual(EMPTY_LIBRARY_TREE_ORDER);
  });

  test("字段类型不对时逐字段归空，不抛错", () => {
    expect(parseLibraryTreeOrder({ categoryLibraries: "x", componentLibraries: 5 })).toEqual(EMPTY_LIBRARY_TREE_ORDER);
    expect(parseLibraryTreeOrder({ categoryLibraries: [1, null, "", "ok", "ok"] })).toEqual({ categoryLibraries: ["ok"], componentLibraries: {}, templateTypes: [], templates: {}, projectSchemes: {}, projectModels: {} });
    expect(parseLibraryTreeOrder({ componentLibraries: { "": ["a"], g: "junk", g2: ["b", 1, "c"] } })).toEqual({
      categoryLibraries: [],
      componentLibraries: { g2: ["b", "c"] },
      templateTypes: [],
      templates: {},
      projectSchemes: {},
      projectModels: {}
    });
    expect(parseLibraryTreeOrder({ templateTypes: [3, "t", "t"], templates: { "": ["x"], T: "junk", T2: ["a", 2] } })).toEqual({
      categoryLibraries: [],
      componentLibraries: {},
      templateTypes: ["t"],
      templates: { T2: ["a"] },
      projectSchemes: {},
      projectModels: {}
    });
  });

  test("模型库方案/模型顺序桶：空串父键保留，空桶丢弃", () => {
    expect(parseLibraryTreeOrder({
      projectSchemes: { "": ["s2", "s1"], s1: ["c1"], s2: [] },
      projectModels: { s1: ["m1", "m2", "m1"] }
    })).toEqual({
      categoryLibraries: [],
      componentLibraries: {},
      templateTypes: [],
      templates: {},
      projectSchemes: { "": ["s2", "s1"], s1: ["c1"] },
      projectModels: { s1: ["m1", "m2"] }
    });
  });

  test("合法 payload 原样解析", () => {
    expect(parseLibraryTreeOrder({
      categoryLibraries: ["交流设备", "静态图元"],
      componentLibraries: { "静态图元": ["StaticTextSymbol"] },
      templateTypes: ["常用模板"],
      templates: { "常用模板": ["tpl-1", "tpl-2"] }
    })).toEqual({
      categoryLibraries: ["交流设备", "静态图元"],
      componentLibraries: { "静态图元": ["StaticTextSymbol"] },
      templateTypes: ["常用模板"],
      templates: { "常用模板": ["tpl-1", "tpl-2"] },
      projectSchemes: {},
      projectModels: {}
    });
  });
});

describe("readLibraryTreeOrder / writeLibraryTreeOrder：localStorage 往返", () => {
  test("未设置时返回空覆盖", () => {
    expect(readLibraryTreeOrder()).toEqual(EMPTY_LIBRARY_TREE_ORDER);
  });

  test("写入后能读回同一状态", () => {
    writeLibraryTreeOrder({
      categoryLibraries: ["b", "a"],
      componentLibraries: { g: ["x", "y"] },
      templateTypes: ["t2", "t1"],
      templates: { T: ["a"] },
      projectSchemes: { "": ["s2", "s1"], s1: ["c1"] },
      projectModels: { s1: ["m1", "m2"] }
    });
    expect(readLibraryTreeOrder()).toEqual({
      categoryLibraries: ["b", "a"],
      componentLibraries: { g: ["x", "y"] },
      templateTypes: ["t2", "t1"],
      templates: { T: ["a"] },
      projectSchemes: { "": ["s2", "s1"], s1: ["c1"] },
      projectModels: { s1: ["m1", "m2"] }
    });
    expect(JSON.parse(localStorage.getItem(LIBRARY_TREE_ORDER_STORAGE_KEY) ?? "")).toEqual({
      categoryLibraries: ["b", "a"],
      componentLibraries: { g: ["x", "y"] },
      templateTypes: ["t2", "t1"],
      templates: { T: ["a"] },
      projectSchemes: { "": ["s2", "s1"], s1: ["c1"] },
      projectModels: { s1: ["m1", "m2"] }
    });
  });

  test("盘上畸形 JSON / 畸形结构归空，不抛错", () => {
    localStorage.setItem(LIBRARY_TREE_ORDER_STORAGE_KEY, "{not json");
    expect(readLibraryTreeOrder()).toEqual(EMPTY_LIBRARY_TREE_ORDER);
    localStorage.setItem(LIBRARY_TREE_ORDER_STORAGE_KEY, JSON.stringify({ categoryLibraries: 7 }));
    expect(readLibraryTreeOrder()).toEqual(EMPTY_LIBRARY_TREE_ORDER);
  });
});

describe("sortByKeyOrder：表内居前按表序，表外垫底保持原相对顺序", () => {
  test("空覆盖返回原引用", () => {
    const items = ["c", "a", "b"];
    expect(sortByKeyOrder(items, (item) => item, [])).toBe(items);
  });

  test("部分覆盖：表内按表序居前，未覆盖项保持原相对顺序垫底", () => {
    expect(sortByKeyOrder(["c", "a", "b", "d", "e"], (item) => item, ["d", "c"])).toEqual(["d", "c", "a", "b", "e"]);
  });

  test("覆盖表里有清单中不存在的键不影响其余项", () => {
    expect(sortByKeyOrder(["a", "b"], (item) => item, ["ghost", "b", "a"])).toEqual(["b", "a"]);
  });

  test("重复键（理论不可达）取首个名次", () => {
    expect(sortByKeyOrder(["a", "b"], (item) => item, ["b", "b", "a"])).toEqual(["b", "a"]);
  });

  test("keyOf 变换生效（用 section 对象模拟二级分组）", () => {
    const groups = [{ section: "S2" }, { section: "S1" }];
    expect(sortByKeyOrder(groups, (group) => group.section, ["S1"])).toEqual([{ section: "S1" }, { section: "S2" }]);
  });
});

describe("reorderKeys：落点语义（向下拖插到目标后，向上拖插到目标前）", () => {
  test("向下拖：插到目标之后", () => {
    expect(reorderKeys(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
  });

  test("向上拖：插到目标之前", () => {
    expect(reorderKeys(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  test("自拖 / 未知键返回 null（调用方无需写状态）", () => {
    expect(reorderKeys(["a", "b"], "a", "a")).toBeNull();
    expect(reorderKeys(["a", "b"], "a", "ghost")).toBeNull();
    expect(reorderKeys(["a", "b"], "ghost", "a")).toBeNull();
  });

  test("相邻交换两个方向都能达成", () => {
    expect(reorderKeys(["a", "b"], "a", "b")).toEqual(["b", "a"]);
    expect(reorderKeys(["a", "b"], "b", "a")).toEqual(["b", "a"]);
  });
});

describe("moveKeyToEdge：方向由指针位置显式给出（不靠索引反推）", () => {
  test("before = 插到目标之前", () => {
    expect(moveKeyToEdge(["a", "b", "c"], "c", "a", "before")).toEqual(["c", "a", "b"]);
  });

  test("after = 插到目标之后", () => {
    expect(moveKeyToEdge(["a", "b", "c"], "a", "c", "after")).toEqual(["b", "c", "a"]);
  });

  test("关键回归：已在目标前面的项，拖到目标上方（before）应插到目标之前，而不是被推后", () => {
    // 覆盖表顺序 [b, a]，用户把 a 拖到 b 上方（想插到 b 前面）→ 结果 [a, b]，
    // 若按索引反推方向会得到 [b, a]（看起来像两项互换）。
    expect(moveKeyToEdge(["b", "a"], "a", "b", "before")).toEqual(["a", "b"]);
    // 已经在目标之前，再要求 before → 无变化（null），而不是"互换"。
    expect(moveKeyToEdge(["a", "b"], "a", "b", "before")).toBeNull();
  });

  test("非法入参 / 位置无变化返回 null", () => {
    expect(moveKeyToEdge(["a", "b"], "a", "a", "before")).toBeNull();
    expect(moveKeyToEdge(["a", "b"], "a", "ghost", "before")).toBeNull();
    expect(moveKeyToEdge(["a", "b"], "ghost", "a", "before")).toBeNull();
  });
});
