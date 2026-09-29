// src/model-routing.ts：模型图层归一
//   normalizeModelLayers        图层列表归一（默认层兜底 + 去重 + 补齐节点引用的层）
//   resolveActiveModelLayerId   解析当前图层
//   createModelLayer            新建图层
//
// 图层归一决定「节点在不在可见图层里」。默认层被摘掉 → 节点全部不显示；
// 兜底层编号算错 → 用户的层被改名。两者都只在画面上体现，**不报错**。
import { describe, expect, test } from "vitest";
import { createModelLayer, normalizeModelLayers, resolveActiveModelLayerId } from "./model-routing";
import { DEFAULT_MODEL_LAYER_ID, DEFAULT_MODEL_LAYER_NAME, type ModelLayer } from "./model";

const D = DEFAULT_MODEL_LAYER_ID;
const L = (id: string, over: Partial<ModelLayer> = {}): ModelLayer =>
  ({ id, name: `名-${id}`, visible: true, ...over }) as ModelLayer;
const norm = (layers?: unknown, nodes?: unknown, active?: unknown) =>
  normalizeModelLayers(layers as never, nodes as never, active as never);
const ids = (layers: ModelLayer[]) => layers.map((l) => l.id);

describe("常量", () => {
  test("默认图层 id 与名称固定", () => {
    expect(D).toBe("layer-default");
    expect(DEFAULT_MODEL_LAYER_NAME).toBe("默认图层");
  });
});

describe("默认层：恒存在且恒在第一条", () => {
  test("★ 各种空输入都得到恰好一条默认层", () => {
    for (const [layers, nodes, active] of [
      [undefined, undefined, undefined],
      [undefined, [], undefined],
      [[], [], undefined],
      [[], undefined, undefined]
    ] as const) {
      expect(norm(layers, nodes, active), JSON.stringify(layers)).toEqual([
        { id: D, name: DEFAULT_MODEL_LAYER_NAME, visible: true }
      ]);
    }
  });

  test("★ 显式的默认层被提到第一条并**采用它的 name**", () => {
    expect(norm([L("a"), L(D, { name: "自定义默认" })])).toEqual([
      { id: D, name: "自定义默认", visible: true },
      { id: "a", name: "名-a", visible: true }
    ]);
  });

  test("默认层在输入中间也会被提到最前", () => {
    expect(ids(norm([L("a"), L(D), L("b")]))).toEqual([D, "a", "b"]);
  });

  test("两个默认层 → 只取**第一个**", () => {
    expect(norm([L(D, { name: "第一" }), L(D, { name: "第二" })])).toEqual([
      { id: D, name: "第一", visible: true }
    ]);
  });

  test("★ 兜底分支 `normalized.length > 0 ? … : [defaultModelLayer()]` 是死代码", () => {
    // 默认层永远先被 appendLayer 进去，所以 `normalized.length` 恒 ≥ 1。
    // 这里钉住「返回值恒非空」这一事实。
    const layers = norm([]);
    expect(layers).toHaveLength(1);
    expect(layers.some((l) => l.id === D), "恒含默认层").toBe(true);
  });
});

describe("★ id：trim 后为空则跳过；重复则跳过；`\"\"` 与 `\"   \"` 口径不同", () => {
  test("缺 id / 空串 id → 用兜底 id `layer-N`", () => {
    expect(ids(norm([{ name: "无 id" }, L("a")]))).toEqual([D, "layer-1", "a"]);
    expect(ids(norm([L(""), L("a")]))).toEqual([D, "layer-1", "a"]);
  });

  test("★ 纯空白 id → **被整个跳过**（不拿兜底 id）", () => {
    // `layer?.id || fallbackId`：`"   "` 是 truthy，取到 `"   "`，
    // `.trim()` 得 `""` → `if (!id) return`。而 `""` 是 falsy，走兜底 id。
    // 这就是 `""` 与 `"   "` 落进两条不同分支的原因。
    expect(ids(norm([L("   "), L("a")]))).toEqual([D, "a"]);
    expect(ids(norm([L("   "), L("b")])), "★纯空白 id 不改后续层的 id").toEqual([D, "b"]);
  });

  test("id 两侧空白被 trim", () => {
    expect(ids(norm([L("  b  ")]))).toEqual([D, "b"]);
    expect(norm([L("  b  ")])[1].id).toBe("b");
  });

  test("重复 id 只保留第一个", () => {
    expect(ids(norm([L("a"), L("a"), L("a")]))).toEqual([D, "a"]);
    expect(norm([L("a", { name: "第一" }), L("a", { name: "第二" })])[1].name).toBe("第一");
  });

  test("★ 兜底编号按**过滤后**的下标，被跳过的层仍占号", () => {
    // `.filter(去掉默认层).forEach((layer, index) => appendLayer(layer, \`layer-${index+1}\`, ...))`
    // —— 下标来自 filter 后的数组，被 `return` 掉的层不会让后面的号前移。
    expect(ids(norm([L(""), L("b")]))).toEqual([D, "layer-1", "b"]);
    expect(ids(norm([L("a"), L("a"), L("c")]))).toEqual([D, "a", "c"]);
    expect(ids(norm([L(""), L(""), L("")]))).toEqual([D, "layer-1", "layer-2", "layer-3"]);
  });

  test("兜底 name 与兜底 id 同号：`图层N`", () => {
    // ★ 只有 name 为空时才用兜底名。`{ id: "", name: "x" }` 有名字 → 名字仍是 "x"，
    //   只是 id 落到 `layer-1`。（我第一版把这条写成 name 也回落，被顶回。）
    expect(norm([{ id: "", name: "x" }])[1]).toEqual({ id: "layer-1", name: "x", visible: true });
    // 名字也空 → 兜底名与兜底 id 同号
    expect(norm([{ id: "" }])[1]).toEqual({ id: "layer-1", name: "图层1", visible: true });
    expect(norm([{ id: "", name: "" }, { id: "", name: "" }])[2].name).toBe("图层2");
  });

  test("★ `layers` 本身缺省兜得住，**数组里的 null/undefined 元素兜不住**", () => {
    // `layers?.find(...)` / `(layers ?? []).filter(...)` 里都直接读 `layer.id`，
    // 没有元素级的可选链：
    //   · `null` / `undefined` 元素 → 读 `.id` 抛 TypeError（装箱前的裸值）
    //   · `5` / `true` / `{}` 元素 → 属性访问装箱后取到 undefined，**不抛**，
    //     于是 `layer?.id || fallbackId` 走兜底 id `layer-N`
    // `appendLayer` 内部确实有 `layer?.id`，但它拿到的是上层已过滤过的元素，
    // 救不了 `find` / `filter` 里那两次裸读。
    expect(() => norm([null, L("b")])).toThrow(TypeError);
    expect(() => norm([L("a"), null])).toThrow(TypeError);
    expect(() => norm([null])).toThrow(TypeError);
    // ★ undefined 元素**同样抛**（我第一版以为 `layer?.id` 会兜住，被顶回）
    expect(() => norm([undefined, L("b")])).toThrow(TypeError);
    // 但 `layers` 整个缺省 / 为空数组是合法的
    expect(norm(undefined)).toHaveLength(1);
    expect(norm([])).toHaveLength(1);
    // 数字元素不抛，落到兜底 id
    expect(ids(norm([5, L("b")]))).toEqual([D, "layer-1", "b"]);
    expect(ids(norm([L("a"), 5]))).toEqual([D, "a", "layer-2"]);
    // 空对象同样走兜底（id 缺失）
    expect(ids(norm([{}, L("b")]))).toEqual([D, "layer-1", "b"]);
  });
});

describe("name：空串 / 纯空白回落 fallbackName", () => {
  test("`\"\"` / `\"   \"` → fallbackName", () => {
    expect(norm([L("a", { name: "" })])[1].name).toBe("图层1");
    expect(norm([L("a", { name: "   " })])[1].name).toBe("图层1");
  });

  test("两侧空白被 trim", () => {
    expect(norm([L("a", { name: "  x  " })])[1].name).toBe("x");
  });

  test("★ fallbackName 本身**不 trim**（`(x || fb).trim() || fb`，末尾的 fb 是原值）", () => {
    // 兜底名都是字面量（`图层1` / `layerId`），看不出差别；
    // 但 `node.layerId` 兜底时用 `node.layerId` 原值 —— 见下面「补齐节点引用的层」。
    expect(norm([L("a", { name: "" })])[1].name).toBe("图层1");
  });
});

describe("★ visible：只有严格的 `false` 才隐藏，active 层强制可见", () => {
  test("隐藏只认 `false` 本身", () => {
    for (const value of [true, undefined, null, 0, 1, "false", "no", "0", ""] as never[]) {
      expect(norm([L("a", { visible: value as never })])[1].visible, JSON.stringify(value) ?? "null").toBe(true);
    }
    expect(norm([L("a", { visible: false })])[1].visible).toBe(false);
  });

  test("★ `activeLayerId` 命中的层强制可见（即使 `visible: false`）", () => {
    const layers = norm([L("a", { visible: false })], [], "a");
    expect(layers[1].visible, "★ 被强制成 true").toBe(true);
    // 不命中的那个仍保持 false
    const other = norm([L("a", { visible: false }), L("b", { visible: false })], [], "b");
    expect(other[1].visible).toBe(false);
    expect(other[2].visible).toBe(true);
  });

  test("activeLayerId 命中默认层不影响其它层", () => {
    expect(norm([L("a", { visible: false })], [], D).map((l) => l.visible)).toEqual([true, false]);
  });

  test("activeLayerId 是空白串时不命中任何层（不 trim）", () => {
    expect(norm([L("a", { visible: false })], [], "  ").map((l) => l.visible)).toEqual([true, false]);
  });
});

describe("★ 节点引用的未知 layerId 会被自动补一层", () => {
  test("补的层排在显式图层**之后**，`name === id`", () => {
    expect(norm([L("a")], [{ layerId: "ghost" }, { layerId: "a" }, { layerId: "" }])).toEqual([
      { id: D, name: DEFAULT_MODEL_LAYER_NAME, visible: true },
      { id: "a", name: "名-a", visible: true },
      { id: "ghost", name: "ghost", visible: true }
    ]);
  });

  test("补的层 id 被 trim（name 也用 trim 后的 id）", () => {
    expect(norm([], [{ layerId: "  g2  " }])[1]).toEqual({ id: "g2", name: "g2", visible: true });
  });

  test("空 / 空白 / 缺省 layerId 不补层", () => {
    for (const layerId of ["", "   ", undefined, null] as never[]) {
      expect(norm([], [{ layerId } as never]), JSON.stringify(layerId) ?? "null").toHaveLength(1);
    }
  });

  test("多个未知 layerId 按**首次出现顺序**补，且只补一次", () => {
    expect(ids(norm([], [{ layerId: "g1" }, { layerId: "g2" }, { layerId: "g1" }]))).toEqual([D, "g1", "g2"]);
  });

  test("`visible` 恒 true（补层时显式传 `visible: true`，而 `true !== false`）", () => {
    const layers = norm([L("a", { visible: false })], [{ layerId: "g" }], "g");
    expect(layers[2].visible, "★ active 命中也不会有别的效果").toBe(true);
  });
});

describe("返回值形状", () => {
  test("★ 键序固定 `id` / `name` / `visible`", () => {
    // 这三个字段会被序列化进存盘，键序变了就是存量 diff 噪声。
    expect(Object.keys(norm([L("a")])[1])).toEqual(["id", "name", "visible"]);
    expect(Object.keys(norm([L("a")])[0])).toEqual(["id", "name", "visible"]);
  });

  test("每个元素都是新对象（不共享入参）", () => {
    const input = L("a");
    const out = norm([input])[1];
    expect(out).not.toBe(input);
    expect(out).toEqual(input);
  });

  test("不改入参数组", () => {
    const input = [L("a"), L("b")];
    const snapshot = JSON.stringify(input);
    norm(input, [{ layerId: "ghost" }]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

test("★ 下面这条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
    // ⑬ `return normalized.length > 0 ? normalized : [defaultModelLayer()];`
    // 改 `return normalized;`
    //   —— 兜底分支**不可达**：`appendLayer(layers?.find(默认层) ?? defaultModelLayer(), …)`
    //      在函数第一行就无条件执行，而它的 `id` 恒非空（`DEFAULT_MODEL_LAYER_ID` 是
    //      非空常量），所以 `normalized` 恒至少有一个元素。
    //   ⇒ 删掉兜底分支对任何输入的输出都不变，全绿是应有结果。
    //   ⚠ 什么会让它失效：若 `DEFAULT_MODEL_LAYER_ID` 变成空串 / undefined，
    //      或 `appendLayer` 的第一处调用被删掉。
    // 下面这两行把「默认层恒进」变成可执行的断言。
    expect(norm([])).toHaveLength(1);
    expect(norm([], [{ layerId: "x" }]).length, "恒非空").toBeGreaterThan(0);
    expect(DEFAULT_MODEL_LAYER_ID, "默认 id 恒非空（兜底不可达的前提）").not.toBe("");
    expect(DEFAULT_MODEL_LAYER_ID).not.toBeUndefined();
  });

describe("resolveActiveModelLayerId", () => {
  const layers = norm([L("a"), L("b")]);   // [default, a, b]

  test("命中则原样返回", () => {
    expect(resolveActiveModelLayerId(layers, "a")).toBe("a");
    expect(resolveActiveModelLayerId(layers, "b")).toBe("b");
    expect(resolveActiveModelLayerId(layers, D)).toBe(D);
  });

  test("未命中 / 缺席 → **第一条**（即默认层）", () => {
    expect(resolveActiveModelLayerId(layers, "zzz")).toBe(D);
    expect(resolveActiveModelLayerId(layers, undefined)).toBe(D);
    expect(resolveActiveModelLayerId(layers, "")).toBe(D);
    expect(resolveActiveModelLayerId(layers, null as never)).toBe(D);
  });

  test("★ 空数组 + 无 active → 靠 `??` 兜到默认 id（**不返回 undefined**）", () => {
    expect(resolveActiveModelLayerId([], undefined)).toBe(D);
    expect(resolveActiveModelLayerId([], "zzz")).toBe(D);
  });

  test("返回类型确实是 string", () => {
    for (const active of [undefined, "", "a", "zzz", D] as never[]) {
      expect(typeof resolveActiveModelLayerId(layers, active as never)).toBe("string");
    }
  });
});

describe("createModelLayer：uuid 前缀 + 名称去重", () => {
  const existing = (...names: string[]): ModelLayer[] =>
    names.map((n) => ({ id: "x", name: n, visible: true }));

  test("id 前缀是 `layer-` 且每次不同", () => {
    const a = createModelLayer("图层A");
    const b = createModelLayer("图层A");
    expect(a.id.startsWith("layer-")).toBe(true);
    expect(a.id).not.toBe(b.id);
  });

  test("名称无冲突时原样保留", () => {
    expect(createModelLayer("图层A").name).toBe("图层A");
  });

  test("★ 名称冲突时加序号后缀（`图层A (2)`）", () => {
    expect(createModelLayer("图层A", existing("图层A")).name).toBe("图层A (2)");
    expect(createModelLayer("图层A", existing("图层A", "图层A (2)")).name).toBe("图层A (3)");
    expect(createModelLayer("图层A", existing("图层B")).name).toBe("图层A");
  });

  test("空名称 → 兜底 `新建图层`（再去重）", () => {
    expect(createModelLayer("").name).toBe("新建图层");
    expect(createModelLayer("", existing("新建图层")).name).toBe("新建图层 (2)");
  });

  test("`visible` 恒 true", () => {
    expect(createModelLayer("x").visible).toBe(true);
    expect(createModelLayer("x", existing("x")).visible).toBe(true);
  });
});
