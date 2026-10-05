// src/appExtracted/appCoreCanvasUtilities.tsx：图片资源的**存储边界**与解析回落
//   IMAGE_STORAGE_KEY            localStorage 键
//   readImageAssets               读出 id → dataUrl 映射（容错）
//   saveImageAsset                **合并**写入单个资源（写入失败静默降级，与读侧对称）
//   resolveNodeImage              节点的 backgroundImage 解析
//   resolveNodeForegroundImage    节点的 foregroundImage 解析
//   resolveProjectImage           方案的 canvasBackgroundImage 解析
//   imageAssetsToMap              资产数组 → 映射
//   localImageAssetsFromStorage   映射 → 资产数组（合成 name / folderId）
//
// 判错的后果：图片在画布上不显示（回落链某一级被判错），
// 或**静默显示错误的图**（assetId 命中了别的资源）—— 都只表现为画面不对，**不报错**。
import { afterEach, beforeEach, describe, expect, test } from "vitest";
// domShim 是纯 .mjs，无 .d.mts —— 跨端引用它需要显式降级。
// 它只在测试里装一个 localStorage 桩，不参与生产构建。
// @ts-expect-error -- 纯 JS 模块，无类型声明
import { installDomShim } from "../server/domShim.mjs";
import {
  IMAGE_STORAGE_KEY,
  imageAssetsToMap,
  localImageAssetsFromStorage,
  readImageAssets,
  resolveNodeForegroundImage,
  resolveNodeImage,
  resolveProjectImage,
  saveImageAsset
} from "./appExtracted/appCoreCanvasUtilities";
import type { ModelNode, ProjectFile } from "./model";

// domShim 只装 `globalThis.localStorage`（不装 `window`），而生产代码用
// `window.localStorage` —— 所以测试里把 `globalThis` 自身挂成 `window`。
installDomShim();
(globalThis as unknown as { window: unknown }).window = globalThis;

const store = globalThis.localStorage;
const setRaw = (raw: string | null) => {
  if (raw === null) store.removeItem(IMAGE_STORAGE_KEY);
  else store.setItem(IMAGE_STORAGE_KEY, raw);
};
const nodeWith = (params: Record<string, string>) => ({ params } as ModelNode);
const projectWith = (over: Partial<ProjectFile> = {}) => over as ProjectFile;

beforeEach(() => store.clear());
afterEach(() => store.clear());

describe("IMAGE_STORAGE_KEY", () => {
  test("固定为 `power-system-image-assets`", () => {
    // 改名等于**丢弃用户全部本地图片**（localStorage 里是旧键）。
    expect(IMAGE_STORAGE_KEY).toBe("power-system-image-assets");
    expect(IMAGE_STORAGE_KEY.startsWith("power-system-")).toBe(true);
  });
});

describe("readImageAssets：容错读取，任何坏值都给 `{}`", () => {
  test("键缺席 / 空串 → `{}`", () => {
    setRaw(null);
    expect(readImageAssets()).toEqual({});
    setRaw("");
    expect(readImageAssets()).toEqual({});
  });

  test("正常对象原样返回（含非 ASCII 键）", () => {
    setRaw(JSON.stringify({ a: "dataA", 图: "dataImg" }));
    expect(readImageAssets()).toEqual({ a: "dataA", 图: "dataImg" });
  });

  test("空对象 → `{}`", () => {
    setRaw("{}");
    expect(readImageAssets()).toEqual({});
  });

  test("★ 坏 JSON → `{}`（catch 分支）", () => {
    for (const raw of ["{oops", "[1,", "undefined", "{'a':1}"]) {
      setRaw(raw);
      expect(readImageAssets(), raw).toEqual({});
    }
  });

  test("★ `null` 字面量 → `{}`（`parsed && typeof …` 的短路）", () => {
    // `JSON.parse("null")` = `null` → `parsed && …` 得 `null`（falsy）
    // → 但 `return` 的是 `null` 而不是 `{}` 吗？实测是 `{}`，因为
    // 表达式是 `parsed && typeof parsed === "object" ? parsed : {}` ——
    // 三元条件的值参与判断，`null && …` 是 falsy → 走 `: {}`。
    setRaw("null");
    expect(readImageAssets()).toEqual({});
    // 数字 / 字符串字面量同理（typeof 不是 object）
    for (const raw of ["123", '"abc"', "true", "1.5"]) {
      setRaw(raw);
      expect(readImageAssets(), raw).toEqual({});
    }
  });

  test("★ 数组被**原样返回**（`typeof [] === \"object\"` 放行）", () => {
    // 守卫只查 `typeof === "object"`，不查 `Array.isArray`。
    // 于是 `"[1,2]"` 解析出数组 → 守卫放行 → **返回数组**。
    // 返回类型标注是 `Record<string, string>`，实际可能是数组。
    setRaw("[1,2]");
    const out = readImageAssets();
    expect(Array.isArray(out), "★ 返回的是数组").toBe(true);
    expect(out).toEqual([1, 2] as never);
    expect(Object.keys(out)).toEqual(["0", "1"]);
  });

  test("值的类型不校验（`null` / 数字原样透出）", () => {
    setRaw(JSON.stringify({ a: null, b: 1 }));
    const out = readImageAssets();
    expect(out.a, "★ null 值不清理").toBeNull();
    expect(out.b).toBe(1);
  });

  test("坏值之后仍可正常读写（catch 不污染 store）", () => {
    setRaw("{oops");
    expect(readImageAssets()).toEqual({});
    saveImageAsset("after", "x");
    // ★ 坏值被覆盖成正常值（saveImageAsset 走 readImageAssets 的 `{}` 再写）
    expect(readImageAssets()).toEqual({ after: "x" });
  });

  test("返回真对象（恒不是 null/undefined）", () => {
    for (const raw of [null, "", "{}", "null", "123", "{oops", "[1]"]) {
      setRaw(raw);
      const out = readImageAssets();
      expect(out, String(raw)).not.toBeNull();
      expect(out, String(raw)).not.toBeUndefined();
    }
  });
});

describe("saveImageAsset：合并写入，不是覆盖", () => {
  test("逐个写入累积", () => {
    setRaw(null);
    saveImageAsset("id1", "d1");
    expect(readImageAssets()).toEqual({ id1: "d1" });
    saveImageAsset("id2", "d2");
    // ★ 合并 —— `JSON.stringify({ ...assets, [id]: dataUrl })`
    expect(readImageAssets()).toEqual({ id1: "d1", id2: "d2" });
  });

  test("同 id 覆盖", () => {
    setRaw(null);
    saveImageAsset("id1", "d1");
    saveImageAsset("id1", "d1b");
    expect(readImageAssets()).toEqual({ id1: "d1b" });
  });

  test("写入的值原样存（不 trim、不校验 dataUrl 形态）", () => {
    setRaw(null);
    saveImageAsset("id1", "  d1  ");
    saveImageAsset("id2", "");
    saveImageAsset("id3", "not-a-data-url");
    expect(readImageAssets()).toEqual({ id1: "  d1  ", id2: "", id3: "not-a-data-url" });
  });

  test("★ 键序：已有键保持原位，新键追加到末尾", () => {
    setRaw(JSON.stringify({ b: "1", a: "2" }));
    saveImageAsset("c", "3");
    expect(Object.keys(JSON.parse(store.getItem(IMAGE_STORAGE_KEY)!))).toEqual(["b", "a", "c"]);
  });

  test("★ `__proto__` 作为 id 是**普通键**（spread 不触发原型链 setter）", () => {
    setRaw(null);
    saveImageAsset("__proto__", "evil");
    // `{ ...assets, ["__proto__"]: "evil" }` —— 计算属性名走 defineProperty，
    // 不走 `__proto__` setter，所以 `__proto__` 成为 own property。
    const out = readImageAssets();
    expect(Object.prototype.hasOwnProperty.call(out, "__proto__")).toBe(true);
    expect(out["__proto__"]).toBe("evil");
    // ★ 但这会让 `localImageAssetsFromStorage` 产出一项 id 为 `__proto__` 的资源
    expect(localImageAssetsFromStorage().map((a) => a.id)).toContain("__proto__");
  });

  test("存的是 JSON 文本（可被别的读取方解析）", () => {
    setRaw(null);
    saveImageAsset("a", "1");
    saveImageAsset("b", "2");
    expect(JSON.parse(store.getItem(IMAGE_STORAGE_KEY)!)).toEqual({ a: "1", b: "2" });
  });
});

// ═══════════════════════════════════════════════════════════════
// 写侧错误路径：与读侧 readImageAssets 的 catch **对称**
//
// 缺陷背景：唯一调用点 appDeviceDefinitionFactories.tsx 约 3924 行
//   catch (error) {                       // ← 上传后台失败
//     showGlobalMessage(...);
//     saveImageAsset(fallbackId, imageData);   // ← 原来裸调，quota 满时抛
//     asset = { id: fallbackId, ... };
//   }
// 这行坐在**别人的 catch 块里**，所以它再抛一次就是「异常逃出 catch 块」——
// 一批图片的剩余处理被中断，本地兜底图片也建不出来。
//
// 降级约定沿用本文件既有写法，不新造错误类型：
//   · 读侧 readImageAssets  catch → `return {}`（静默，见上文 describe）
//   · 写侧 writeStoredInteractionMode / writeRefreshRecoveryProject
//     catch → 静默吞掉、**无返回值**（同文件 211-220 / 3727-3733）
//   ⇒ saveImageAsset 写失败时同样静默吞掉，return undefined。
//
// ★ 鉴别力来源：删掉 try/catch（把 catch 分支改回裸 setItem），
//   下面第一条 `.not.toThrow()` 立刻转红 —— 桩是**抛异常**的实现，
//   不是返回错误值，所以没有「另一条路产出同样结果」的问题。
describe("★ saveImageAsset：写入失败降级，不抛（与读侧 catch 对称）", () => {
  // domShim 装的是普通对象字面量，`setItem` 是自身可写属性，可直接替换。
  const realSetItem = store.setItem;
  const quotaExceeded = () => {
    class QuotaExceededError extends Error {}
    return new QuotaExceededError("quota");
  };
  const failWritesWith = (error: unknown) => {
    Object.defineProperty(store, "setItem", {
      configurable: true,
      writable: true,
      value: () => {
        throw error;
      }
    });
  };
  const restoreWrites = () => {
    Object.defineProperty(store, "setItem", { configurable: true, writable: true, value: realSetItem });
  };

  // 兜底：即使某条用例中途抛错，也不会把「抛异常的 setItem」留给后面的用例。
  afterEach(restoreWrites);

  test("配额写满 → **不抛**（catch 分支）", () => {
    setRaw(null);
    failWritesWith(quotaExceeded());
    expect(() => saveImageAsset("a", "dA")).not.toThrow();
    // ★ 若把 try/catch 删掉，这里就会因 QuotaExceededError 转红。
  });

  test("★ 返回值与降级约定一致：无返回值 `undefined`（不返 false / 不造错误类型）", () => {
    // 写侧的既有约定（writeStoredInteractionMode / writeRefreshRecoveryProject）
    // 就是「catch 里什么都不返回」。若改成 return false / return { ok: false }，
    // 这条断言会转红，且与同文件读侧 `catch → {}` 的形态不对称。
    failWritesWith(quotaExceeded());
    expect(saveImageAsset("a", "dA")).toBeUndefined();
    // 成功路径同样无返回值（成功/失败返回值不可区分 —— 现状即如此）
    restoreWrites();
    expect(saveImageAsset("b", "dB")).toBeUndefined();
  });

  test("★ 失败写入**不污染 store**：既有资源原样保留", () => {
    // 断言对象 = 变异会改的那个对象。catch 分支不能顺手写坏或写空 IMAGE_STORAGE_KEY。
    setRaw(JSON.stringify({ keep: "dKeep" }));
    failWritesWith(quotaExceeded());
    expect(() => saveImageAsset("new", "dNew")).not.toThrow();
    restoreWrites();
    expect(readImageAssets()).toEqual({ keep: "dKeep" });
    expect(JSON.parse(store.getItem(IMAGE_STORAGE_KEY)!)).toEqual({ keep: "dKeep" });
  });

  test("★ 键缺席时失败 → 存储里**没有**被创建出半个键", () => {
    setRaw(null);
    failWritesWith(quotaExceeded());
    expect(() => saveImageAsset("a", "dA")).not.toThrow();
    restoreWrites();
    expect(store.getItem(IMAGE_STORAGE_KEY)).toBeNull();
    expect(readImageAssets()).toEqual({});
  });

  test("★ 任意异常都吞（非 DOM 的 Error、Safari 私密模式的 SecurityError 形态）", () => {
    // catch 不带条件：quota 之外还有「存储被禁用」这一类，同样不该打断调用链。
    for (const error of [
      quotaExceeded(),
      new TypeError("localStorage is not available"),
      Object.assign(new Error("readonly"), { name: "SecurityError" })
    ]) {
      failWritesWith(error);
      expect(() => saveImageAsset("a", "dA"), String(error)).not.toThrow();
      expect(saveImageAsset("a", "dA"), String(error)).toBeUndefined();
    }
  });

  test("失败后恢复正常写入（try/catch 不留坏状态）", () => {
    setRaw(null);
    failWritesWith(quotaExceeded());
    expect(() => saveImageAsset("lost", "dLost")).not.toThrow();
    restoreWrites();
    // ★ 失败的 id 不进存储，成功的照常进；合并语义不受影响
    saveImageAsset("kept", "dKept");
    saveImageAsset("kept2", "dKept2");
    expect(readImageAssets()).toEqual({ kept: "dKept", kept2: "dKept2" });
  });

  test("★ 读侧自身容错不受写侧 catch 影响（两边对称、各自独立）", () => {
    setRaw("{oops");
    failWritesWith(quotaExceeded());
    // 坏 JSON 让 readImageAssets 走自己的 catch → {}；saveImageAsset 随后
    // 写失败走自己的 catch → 静默。两层 catch 都生效，不互相吞掉对方的问题。
    expect(() => saveImageAsset("a", "dA")).not.toThrow();
    expect(readImageAssets()).toEqual({});
    restoreWrites();
    saveImageAsset("a", "dA");
    expect(readImageAssets()).toEqual({ a: "dA" });
  });
});

describe("★ resolveNodeImage 的回落链：`(assetId && assets[assetId]) || backgroundImage || \"\"`", () => {
  const A = { a: "assetA", b: "assetB" };
  const resolve = resolveNodeImage as (n: ModelNode, assets?: Record<string, string>) => string;

  test("assetId 命中 → 资源的 url", () => {
    expect(resolve(nodeWith({ backgroundImageAssetId: "a" }), A)).toBe("assetA");
  });

  test("assetId 未命中 → 回落 `backgroundImage`", () => {
    expect(resolve(nodeWith({ backgroundImageAssetId: "zz", backgroundImage: "bg" }), A)).toBe("bg");
  });

  test("全无 → 空串", () => {
    expect(resolve(nodeWith({}), A)).toBe("");
    expect(resolve(nodeWith({ backgroundImageAssetId: "zz" }), A)).toBe("");
    expect(resolve(nodeWith({ backgroundImageAssetId: "", backgroundImage: "" }), A)).toBe("");
  });

  test("★ assetId 是空串 → 跳过资源层，直接看 `backgroundImage`", () => {
    expect(resolve(nodeWith({ backgroundImageAssetId: "", backgroundImage: "bg" }), A)).toBe("bg");
  });

  test("★ 资源值是空串 / null / 0 → 继续回落（`||` 的语义）", () => {
    // `(assetId && assets[assetId])` 的结果是 falsy → `||` 生效 → 回落
    expect(resolve(nodeWith({ backgroundImageAssetId: "a", backgroundImage: "bg" }), { a: "" })).toBe("bg");
    expect(resolve(nodeWith({ backgroundImageAssetId: "a", backgroundImage: "bg" }), { a: null as never })).toBe("bg");
    expect(resolve(nodeWith({ backgroundImageAssetId: "a", backgroundImage: "bg" }), { a: 0 as never })).toBe("bg");
    // 没有 backgroundImage 时落到空串
    expect(resolve(nodeWith({ backgroundImageAssetId: "a" }), { a: "" })).toBe("");
  });

  test("★ 资源值是 falsy 时**不会**显示该资源（不显示「有 id 但图没了」）", () => {
    // 这条是设计选择：资源被删除后节点不显示残缺图，而是回落到内联 url 或空。
    expect(resolve(nodeWith({ backgroundImageAssetId: "a" }), {})).toBe("");
  });

  test("不改动入参", () => {
    const n = nodeWith({ backgroundImageAssetId: "a" });
    const snapshot = JSON.stringify(n.params);
    resolve(n, A);
    expect(JSON.stringify(n.params)).toBe(snapshot);
  });

  test("★ 等价变异 ⑭ 全绿是**正确的**（`&&` 改三元是恒等）", () => {
    // ⑭ `(assetId && assets[assetId])` 改 `(assetId ? assets[assetId] : undefined)`
    //   —— `&&` 与 `? :` 在这里的语义完全一致（都是「assetId falsy 就短路」），
    //      且 falsy 分支两边分别给 `""` / `undefined`，都触发后面的 `||`。
    //   ⇒ 恒等变异，全绿是应有结果。
    const falsyId = "";
    expect(falsyId && "x", "★ && 短路给 falsy").toBeFalsy();
    expect(falsyId ? "x" : undefined, "★ 三元短路给 undefined").toBeFalsy();
  });

  test("★ 变异 ⑤（去掉 `assetId &&`）现在**会**转红 —— 因为反例存在", () => {
    // 首轮 ⑤ 全绿，我当时判成「等价」。查清原因：它只对**没有空串键**的映射恒等，
    // 而 `assets` 是从 localStorage 读来的 `Record<string, string>`，
    // 键完全由 `saveImageAsset` 的入参决定 —— 写成 `""` 就产生空串键。
    //
    // 于是补了一条**能区分**的输入：映射里有 `""` 键。
    //   · 直接取键（变异 ⑤）→ `assets[""]` 命中 → 显示 `emptyAsset`
    //   · 生产实现 → `"" && …` 短路 → 回落 `backgroundImage`
    // 补上后 ⑤ 转红。说明「等价」的判断是错的 —— 那是输入覆盖不足。
    const withEmptyKey: Record<string, string> = { "": "emptyAsset" };
    // 变异 ⑤ 的形态
    expect(withEmptyKey[""] || "bg", "★ 直接取键会命中空串键").toBe("emptyAsset");
    // 生产实现的形态
    expect(resolve(nodeWith({ backgroundImageAssetId: "", backgroundImage: "bg" }), withEmptyKey),
      "★ 生产实现跳过空 assetId，回落内联 url").toBe("bg");
    // 两个形态确实不同 —— 这就是 ⑤ 的鉴别力来源
    expect(withEmptyKey[""] || "bg").not.toBe(resolve(nodeWith({ backgroundImageAssetId: "", backgroundImage: "bg" }), withEmptyKey));
    // 反向：没有空串键时两者恒等（这部分我首轮只测了这个）
    for (const assets of [{}, { a: "assetA" }] as Array<Record<string, string>>) {
      for (const assetId of ["", "a", "zz"]) {
        expect((assets[assetId] || "bg"), `无空串键时恒等: ${assetId}`)
          .toBe(resolve(nodeWith({ backgroundImageAssetId: assetId, backgroundImage: "bg" }), assets));
      }
    }
  });
});

describe("foreground / project 的回落链与 node 同构", () => {
  const A = { a: "assetA" };

  test("resolveNodeForegroundImage 读 `foregroundImageAssetId` / `foregroundImage`", () => {
    expect(resolveNodeForegroundImage(nodeWith({ foregroundImageAssetId: "a" }), A)).toBe("assetA");
    expect(resolveNodeForegroundImage(nodeWith({ foregroundImageAssetId: "zz", foregroundImage: "fg" }), A)).toBe("fg");
    expect(resolveNodeForegroundImage(nodeWith({}), A)).toBe("");
  });

  test("resolveProjectImage 读方案的 `canvasBackgroundImageAssetId` / `canvasBackgroundImage`", () => {
    expect(resolveProjectImage(projectWith({ canvasBackgroundImageAssetId: "a", canvasBackgroundImage: "pb" }), A))
      .toBe("assetA");
    expect(resolveProjectImage(projectWith({ canvasBackgroundImageAssetId: "zz", canvasBackgroundImage: "pb" }), A))
      .toBe("pb");
    expect(resolveProjectImage(projectWith({}), A)).toBe("");
  });

  test("★ 三个函数的回落链**完全同构**（只有参数名不同）", () => {
    // 逐项对照，确保没有哪个漏了某一级。
    const probes: Array<[string, Record<string, string>, Record<string, string>]> = [
      ["命中", { backgroundImageAssetId: "a", foregroundImageAssetId: "a", canvasBackgroundImageAssetId: "a", backgroundImage: "bg", foregroundImage: "fg", canvasBackgroundImage: "pb" }, A],
      ["未命中 + 内联", { backgroundImageAssetId: "z", foregroundImageAssetId: "z", canvasBackgroundImageAssetId: "z", backgroundImage: "bg", foregroundImage: "fg", canvasBackgroundImage: "pb" }, A],
      ["全无", {}, A]
    ];
    for (const [label, params, assets] of probes) {
      const n = nodeWith(params);
      const p = projectWith({
        canvasBackgroundImageAssetId: params.canvasBackgroundImageAssetId,
        canvasBackgroundImage: params.canvasBackgroundImage
      });
      const results = [
        resolveNodeImage(n, assets),
        resolveNodeForegroundImage(n, assets),
        resolveProjectImage(p, assets)
      ];
      // 三个结果的「是否为空」一致（具体值随参数名不同）
      expect(new Set(results.map((r) => (r === "" ? "空" : "非空"))).size, label).toBe(1);
    }
  });
});

describe("imageAssetsToMap / localImageAssetsFromStorage：互逆", () => {
  test("`imageAssetsToMap` 取 `id` → `url`（**不是** dataUrl）", () => {
    // 探针实测字段名是 `url`；我第一版写 `dataUrl` 全部得到 `{}`，被顶回。
    expect(imageAssetsToMap([])).toEqual({});
    expect(imageAssetsToMap([{ id: "a", url: "d" } as never])).toEqual({ a: "d" });
  });

  test("重复 id → 后者赢（`Object.fromEntries`）", () => {
    const out = imageAssetsToMap([
      { id: "a", url: "first" } as never,
      { id: "a", url: "second" } as never
    ]);
    expect(out).toEqual({ a: "second" });
  });

  test("★ `localImageAssetsFromStorage` 按 `Object.entries` 顺序编号合成 name", () => {
    setRaw(JSON.stringify({ b: "dB", a: "dA" }));
    expect(localImageAssetsFromStorage()).toEqual([
      { id: "b", name: "本地图片 1", folderId: "root", url: "dB" },
      { id: "a", name: "本地图片 2", folderId: "root", url: "dA" }
    ]);
  });

  test("空存储 → 空数组", () => {
    setRaw(null);
    expect(localImageAssetsFromStorage()).toEqual([]);
    setRaw("{}");
    expect(localImageAssetsFromStorage()).toEqual([]);
  });

  test("★ 数组存储也会被 `Object.entries` 拆成项（`[\"a\"]` 变一个资源）", () => {
    setRaw("[\"d0\"]");
    expect(localImageAssetsFromStorage()).toEqual([
      { id: "0", name: "本地图片 1", folderId: "root", url: "d0" }
    ]);
  });

  test("两者互逆（值层面）", () => {
    setRaw(JSON.stringify({ a: "dA", b: "dB" }));
    expect(imageAssetsToMap(localImageAssetsFromStorage())).toEqual({ a: "dA", b: "dB" });
  });
});
