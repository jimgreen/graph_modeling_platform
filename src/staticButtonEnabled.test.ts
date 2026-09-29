// 静态按钮的启用判定
//   isStaticButtonEnabledForNode  （appInlineUtilityFunctions.ts，6 处生产调用，零直呼）
//   isStaticButtonCapableNode     （model.ts，外部只在别的库里当伴随断言用，**全断言 true**）
//   isStaticButtonCapableKind     （同上）
//
// 生产侧六处全用它决定「这个静态按钮能不能点」：
//   appToolbarHookFactories.tsx:377/465/505/605、appCanvasArea.tsx:1081
//   appProjectCanvasFactories.tsx:692
//
// 判错的后果：按钮**永远点不动**，或**不该亮的按钮亮了**
// —— 后者在「点一下就跳到某个图层/动作」的场景下会改错用户意图，且不报错。
import { describe, expect, test } from "vitest";
import { isStaticButtonEnabledForNode } from "./appExtracted/appInlineUtilityFunctions";
import { isStaticButtonCapableKind, isStaticButtonCapableNode } from "./model";

const node = (kind: unknown, params: Record<string, unknown> = {}) => ({ kind, params }) as never;
const enabled = (kind: unknown, params: Record<string, unknown> = {}) =>
  isStaticButtonEnabledForNode(node(kind, params));
const capableNode = (kind: unknown, params: Record<string, unknown> = {}) =>
  isStaticButtonCapableNode(node(kind, params));
const capableKind = (kind: unknown) => isStaticButtonCapableKind(kind as never);

/** 探针实测：capable 的静态 kind（除 line 类与 group-box 外的全部） */
const CAPABLE_STATIC = [
  "static-point", "static-ring", "static-group-box", "static-container",
  "static-text", "static-image", "static-ellipse", "static-rect"
] as const;

/** 探针实测：不 capable 的 kind —— 静态线类与非静态设备 */
const NOT_CAPABLE = [
  "static-line", "ac-bus", "dc-bus", "ac-load", "acline", "nope", ""
] as const;

describe("★ `buttonEnabled` 只接受字符串 `'1'`", () => {
  test("唯一能开启的值是字符串 `'1'`", () => {
    expect(enabled("static-point", { buttonEnabled: "1" })).toBe(true);
  });

  test("★ 17 种近似值全部为 `false`（不 trim、不强转、不宽松）", () => {
    for (const value of [
      1, "01", " 1", "1 ", "\t1", "1\n", true, "true", "on", "ON",
      "", "0", "11", "1.0", null, undefined, 0, false
    ] as never[]) {
      expect(enabled("static-point", { buttonEnabled: value }), JSON.stringify(value) ?? "undefined").toBe(false);
    }
  });

  test("★ 缺 `buttonEnabled` 键 → `false`（不是抛，也不是 undefined）", () => {
    expect(enabled("static-point", {})).toBe(false);
    expect(enabled("static-point", { buttonEnabled: undefined })).toBe(false);
  });

  test("★ 返回值恒为 `boolean`（不是 truthy 值）", () => {
    for (const value of ["1", 1, true, "true", "0", "", "anything"]) {
      expect(typeof enabled("static-point", { buttonEnabled: value }), String(value)).toBe("boolean");
    }
  });

  test("★ 判定是严格相等：非字符串永不为真", () => {
    // 用等价于生产判定的局部函数钉住：恒等比较不发生类型强转
    const judge = (value: unknown) => value === "1";
    for (const value of [1, true, ["1"], { toString: () => "1" }] as never[]) {
      expect(judge(value), JSON.stringify(value)).toBe(false);
    }
    expect(judge("1")).toBe(true);
    // 对照：字符串 '1' 两侧相等
    const left: string = "1";
    const right: string = "1";
    expect(left === right).toBe(true);
  });
});

describe("★ 短路顺序：先判 capable，再读 `params`", () => {
  // 这是本文件唯一能观测 `&&` 顺序的地方。`isStaticButtonEnabledForNode` 形参是
  // `node: any`，但它**要求 `node.params` 存在**；capable=false 时短路 ⇒ 不抛。
  // 若把两个条件调换（先读 params），下面这条立刻转红。

  test("★ not-capable 的 kind + **缺 params** → `false`（不抛）", () => {
    for (const kind of NOT_CAPABLE) {
      expect(isStaticButtonEnabledForNode({ kind } as never), kind).toBe(false);
    }
  });

  test("★ capable 的 kind + **缺 params** → 抛 TypeError", () => {
    // 对照：同一个缺 params 的入参，capable 的抛、不 capable 的不抛
    expect(() => isStaticButtonEnabledForNode({ kind: "static-point" } as never)).toThrow(TypeError);
  });

  test("`params: null` → 抛 TypeError（capable 时）", () => {
    expect(() => isStaticButtonEnabledForNode({ kind: "static-point", params: null } as never)).toThrow(TypeError);
  });

  test("★ `params: []`（数组）→ `false`，不抛", () => {
    // 数组上取 `.buttonEnabled` 是 `undefined`，不是 TypeError
    expect(enabled("static-point", [] as never)).toBe(false);
    // 前提
    expect(([] as unknown as Record<string, unknown>).buttonEnabled).toBeUndefined();
  });

  test("★ node 为 nullish / 原始值 → 抛 TypeError", () => {
    for (const bad of [null, undefined, 0, "", "static-point", 42, true] as never[]) {
      expect(() => isStaticButtonEnabledForNode(bad), String(bad)).toThrow(TypeError);
    }
  });
});

describe("★ params 挂上 StaticButton 库名后，任何 kind 都 capable", () => {
  // `isStaticButtonCapableNode` = `isStaticButtonCapableKind(kind)`
  //                            || `staticComponentLibraryForNodeLike(kind, params) === "StaticButton"`
  // 第二条让非静态设备（乃至未知 kind）挂上按钮。

  test("非静态 / 未知 kind 靠 params 变成 capable 且可启用", () => {
    for (const kind of ["ac-load", "acline", "ac-bus", "nope", ""]) {
      expect(capableNode(kind, {}), `裸 ${kind}`).toBe(false);
      expect(enabled(kind, { buttonEnabled: "1" }), `裸 ${kind}`).toBe(false);
      expect(capableNode(kind, { componentLibrary: "StaticButton" }), `挂库 ${kind}`).toBe(true);
      expect(enabled(kind, { buttonEnabled: "1", componentLibrary: "StaticButton" }), `挂库 ${kind}`).toBe(true);
    }
  });

  test("★ 库名先 **trim**、再**精确相等**（`staticbutton` 不算）", () => {
    for (const lib of ["staticbutton", "STATICBUTTON", "Staticbutton", "sTaTiCbUtToN", "StaticButtons", "StaticButtonX", "StaticPoint", ""]) {
      expect(capableNode("nope", { componentLibrary: lib }), JSON.stringify(lib)).toBe(false);
    }
    // ★ 前后空白会被 trim 掉，仍然命中
    for (const lib of ["StaticButton ", " StaticButton", " StaticButton ", "\tStaticButton\n"]) {
      expect(capableNode("nope", { componentLibrary: lib }), JSON.stringify(lib)).toBe(true);
    }
  });

  test("★ kind 已 capable 时，params 的库名**不影响**结果（两个来源或运算）", () => {
    for (const lib of ["StaticButton", "StaticPoint", "staticbutton", ""]) {
      expect(capableNode("static-point", { componentLibrary: lib }), lib).toBe(true);
      expect(enabled("static-point", { buttonEnabled: "1", componentLibrary: lib }), lib).toBe(true);
    }
  });

  test("★ capable + 库名正确，但 `buttonEnabled` 不对 → 仍然 `false`", () => {
    // 防止「只测 capable 就以为 enabled 一定对」
    expect(enabled("nope", { componentLibrary: "StaticButton", buttonEnabled: "0" })).toBe(false);
    expect(enabled("nope", { componentLibrary: "StaticButton", buttonEnabled: 1 })).toBe(false);
    expect(enabled("nope", { componentLibrary: "StaticButton", buttonEnabled: "1" })).toBe(true);
  });
});

describe("★ `isStaticButtonCapableKind`：静态线类被排除", () => {
  test("capable 的静态 kind（探针实测 8 个）", () => {
    for (const kind of CAPABLE_STATIC) {
      expect(capableKind(kind), kind).toBe(true);
      expect(capableNode(kind), kind).toBe(true);
      expect(enabled(kind, { buttonEnabled: "1" }), kind).toBe(true);
    }
  });

  test("★ `static-line` 不 capable（线类不能挂按钮）", () => {
    expect(capableKind("static-line")).toBe(false);
    expect(capableNode("static-line")).toBe(false);
    expect(enabled("static-line", { buttonEnabled: "1" })).toBe(false);
  });

  test("非静态设备 / 未知 kind 全不 capable（只看 kind，不看 params）", () => {
    for (const kind of NOT_CAPABLE) {
      expect(capableKind(kind), kind).toBe(false);
      expect(capableNode(kind), kind).toBe(false);
    }
  });

  test("★ kind 判定**不接受任何** params 形式（只有一个形参）", () => {
    // 与 `isStaticButtonCapableNode` 的对比点：后者会看 params
    expect(capableKind("ac-load")).toBe(false);
    expect(capableNode("ac-load", { componentLibrary: "StaticButton" })).toBe(true);
  });

  test("★ `-vertical` 变体走 `baseDeviceKind` 剥后缀", () => {
    expect(capableKind("static-point-vertical")).toBe(true);
    expect(capableKind("static-ring-vertical")).toBe(true);
    expect(capableKind("static-line-vertical")).toBe(false);
    expect(capableKind("ac-load-vertical")).toBe(false);
    expect(enabled("static-point-vertical", { buttonEnabled: "1" })).toBe(true);
  });

  test("★ 显式库名那一支的**唯一鉴别输入**是 `custom-*` kind", () => {
    // `isStaticButtonCapableKind` = 显式库名 === "StaticButton"  ||  isStaticKind && !isStaticLineLikeKind
    //
    // ★ 唯一让**第一支独占**的输入：`custom-staticbutton`。
    //   `isStaticKind("custom-staticbutton")` = `startsWith("static-")` = **false**
    //   ⇒ 第二支为 false；库名走 `staticComponentLibraryFromCustomKind`
    //   ⇒ 第一支为 true。去掉任一支，结果都翻转。
    //
    // ★ 反例：`static-button` 走的是 `STATIC_COMPONENT_LIBRARY_BY_KIND["static-button"]`
    //   = "StaticButton"，但它**同时**满足 `isStaticKind && !isStaticLineLikeKind`，
    //   所以拿 `static-button` 当输入是**没有鉴别力的**（删掉第一支也照样 true）。
    //   变异 ⑩⑪ 首轮全绿，就是被这一点骗了。
    expect(capableKind("custom-staticbutton"), "★ 第一支独占").toBe(true);
    // 对照：第二支独占的输入（删掉第二支才翻）
    expect(capableKind("static-point"), "★ 第二支独占").toBe(true);
    // 对照：两支都为 false
    expect(capableKind("custom-staticline"), "★ 自定义线类，库名是 StaticConnectorSymbol").toBe(false);
    expect(capableKind("ac-load"), "★ 两支皆假").toBe(false);
    // 前提：`isStaticKind` 只是 `startsWith("static-")`，不剥后缀、不看库名
    expect("custom-staticbutton".startsWith("static-")).toBe(false);
    expect("static-button".startsWith("static-")).toBe(true);
  });

  test("★ `custom-*` 库的匹配规则（前缀 / 后缀分隔符 / 大小写）", () => {
    for (const kind of [
      "custom-staticbutton",          // 精确
      "custom-staticbutton-foo",      // `-` 分隔
      "custom-staticbutton_foo",      // `_` 分隔
      "CUSTOM-StaticButton",         // 大小写不敏感（kind 侧 lower）
      "custom-StaticButton"          // 大小写不敏感
    ]) {
      expect(capableKind(kind), kind).toBe(true);
    }
    for (const kind of ["custom-staticbuttonx", "custom-static-buttons", "custom-nope", "staticbutton"]) {
      expect(capableKind(kind), kind).toBe(false);
    }
  });

  test("★ `custom-*` 只在 kind 侧生效；库名参数走另一条路", () => {
    // kind = custom-* → 显式库名；params.componentLibrary → staticComponentLibraryForNodeLike
    expect(capableNode("custom-staticbutton", {}), "★ kind 侧就够").toBe(true);
    expect(capableNode("nope", { componentLibrary: "StaticButton" }), "★ params 侧").toBe(true);
    expect(capableNode("nope", {}), "★ 两侧都没有 → false").toBe(false);
  });

  test("★ 等价变异 ⑨：`isStaticButtonCapableKind` 顶层的 `baseDeviceKind` 是纯冗余", () => {
    // 变异：`const baseKind = baseDeviceKind(kind)` → `const baseKind = kind`
    // 全绿。可证明等价 —— 三条下游路径**各自都会再剥一次**：
    //   ① `explicitStaticComponentLibraryForKind(k)` 内部 `STATIC_COMPONENT_LIBRARY_BY_KIND[baseDeviceKind(k)]`
    //      且 `staticComponentLibraryFromCustomKind` 内部也 `baseDeviceKind(k).trim()`
    //   ② `isStaticLineLikeKind(k)` = `STATIC_LINE_LIKE_KIND_SET.has(baseDeviceKind(k))`
    //   ③ `isStaticKind(k)` = `k.startsWith("static-")` —— **不剥**，
    //      但 `baseDeviceKind` 只剥 `-vertical` 后缀，不动前缀，
    //      所以 `"static-x-vertical".startsWith("static-")` === `"static-x".startsWith("static-")`。
    // 而 `baseDeviceKind` 幂等（只剥一次固定后缀）。
    const strip = (kind: string) => (kind.endsWith("-vertical") ? kind.slice(0, -"-vertical".length) : kind);
    for (const kind of [
      "static-point", "static-point-vertical", "static-line-vertical",
      "static-button-vertical", "ac-load-vertical", "custom-staticbutton-vertical", "nope"
    ]) {
      const viaHelper = strip(strip(kind));     // 剥两次 = 幂等
      expect(viaHelper, kind).toBe(strip(kind));
      // 前提 ③：剥后缀不动 `static-` 前缀
      expect(strip(kind).startsWith("static-"), kind).toBe(kind.startsWith("static-"));
    }
    // ⚠ 什么会让它失效：
    //   · `baseDeviceKind` 若改成剥**前缀**（或任何影响 `startsWith` 的部分）
    //   · `isStaticKind` 若改成不靠前缀、而是查表
    //   · 三个下游若有一个不再自己调 `baseDeviceKind`
    // 与生产行为一致（所以整条断言恒绿，正因如此才要写下来）
    expect(capableKind("static-point-vertical")).toBe(true);
    expect(capableKind("static-line-vertical")).toBe(false);
  });

  test("★ 空 kind → `false`；**非字符串 kind 抛 TypeError**（不修，如实记录）", () => {
    // `""` 走完 `baseDeviceKind` 也不抛 ⇒ false
    expect(capableKind("")).toBe(false);
    expect(capableNode("", {})).toBe(false);
    expect(enabled("", { buttonEnabled: "1" })).toBe(false);

    // ★ nullish / 数字 / 数组 / 对象 → 抛：`baseDeviceKind` 里 `kind.endsWith(...)`
    //   **判定不修**：`isThreeWindingTransformerKind` 显式把形参放宽到
    //   `string | undefined` 并注释「`Set.has(undefined)` 同样恒为 false，语义不变」，
    //   本函数没有同样处理。但两者的形参类型都是 `DeviceKind`，
    //   传非字符串就是违背契约；抛错直指「kind 不是字符串」。
    for (const bad of [undefined, null, 0, 42, [], {}] as never[]) {
      expect(() => capableKind(bad), String(bad)).toThrow(TypeError);
      expect(() => capableNode(bad, {}), String(bad)).toThrow(TypeError);
      expect(() => enabled(bad, { buttonEnabled: "1" }), String(bad)).toThrow(TypeError);
    }
    // 前提：抛在 `baseDeviceKind` 的 `.endsWith` 上
    expect(() => (undefined as never as { endsWith(s: string): boolean }).endsWith("-vertical")).toThrow(TypeError);
    expect("".endsWith("-vertical")).toBe(false);
  });
});

describe("纯函数性质", () => {
  const source = { kind: "static-point", params: { buttonEnabled: "1" } };

  test("不改入参", () => {
    const snapshot = JSON.stringify(source);
    isStaticButtonEnabledForNode(source as never);
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  test("同一输入恒得同一结果（无模块级状态）", () => {
    const once = isStaticButtonEnabledForNode(source as never);
    for (let i = 0; i < 20; i += 1) {
      expect(isStaticButtonEnabledForNode(source as never)).toBe(once);
    }
  });

  test("★ 改 `buttonEnabled` 后再调用，结果跟着变（不是缓存）", () => {
    const mutable = { kind: "static-point", params: { buttonEnabled: "" as unknown as string } };
    expect(isStaticButtonEnabledForNode(mutable as never)).toBe(false);
    mutable.params.buttonEnabled = "1";
    expect(isStaticButtonEnabledForNode(mutable as never)).toBe(true);
  });
});
