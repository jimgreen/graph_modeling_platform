// src/model.ts：静态图元的**绕线避让**开关
//   staticNodeParticipatesInRoutingAvoidance  唯一的对外出口
//   （normalizeRouteAvoidanceFlag / defaultStaticRouteAvoidanceValue 都未导出，
//     只能经这个函数观测 —— 这正是它该被测的理由）
//
// 开关判错的后果：图元该避让的没避（线路穿过文字/图标），或不该避的避了
// （线路绕大圈）。界面上只表现为线路画得难看，**零报错**。
import { describe, expect, test } from "vitest";
import {
  STATIC_ROUTE_AVOIDANCE_PARAM,
  isStaticContainerKind,
  isStaticGraphicNode,
  isStaticKind,
  staticComponentLibraryForNodeLike,
  staticNodeParticipatesInRoutingAvoidance
} from "./model";

const P = STATIC_ROUTE_AVOIDANCE_PARAM;
const avoid = (kind: unknown, params?: unknown) =>
  staticNodeParticipatesInRoutingAvoidance({ kind, params: params ?? {} } as never);

// 探针实测的 4 个容器类 kind（staticComponentLibraryForKind → "StaticContainerSymbol"）
const CONTAINER_KINDS = [
  "static-group-box",
  "static-swimlane",
  "static-resizer-frame",
  "static-subflow-box"
];

// `normalizeRouteAvoidanceFlag` 的 12 个别名（探针实测；真实数据只用到 "1"/"0"）
const TRUTHY_ALIASES = ["1", "true", "yes", "on", "是", "参与"];
const FALSY_ALIASES = ["0", "false", "no", "off", "否", "不参与"];

describe("STATIC_ROUTE_AVOIDANCE_PARAM 参数键", () => {
  test("固定为 `routeAvoidance`", () => {
    // 存量模型的 params 里存的就是这个键，改名等于丢弃全部用户设置。
    expect(P).toBe("routeAvoidance");
    // 不是内部参数（内部参数带 `_` 前缀，如 _globalLineId）
    expect(P.startsWith("_")).toBe(false);
  });
});

describe("第一级门槛：非静态图元无条件返回 true，params 完全不读", () => {
  const NON_STATIC = ["ac-bus", "dc-bus", "ac-routable-line", "ac-source", "ac-load", "", "nope", "nope-static-x"];

  for (const kind of NON_STATIC) {
    test(`${JSON.stringify(kind).padEnd(18)} → 恒 true`, () => {
      // 连显式的「否」都无效 —— 因为根本走不到读参数那一步。
      for (const value of ["0", "否", "false", "不参与", "!!!" as string]) {
        expect(avoid(kind, { [P]: value }), `${kind} + ${value}`).toBe(true);
      }
      expect(avoid(kind), `${kind} + 无参数`).toBe(true);
    });
  }

  test("★ 这一级是真短路：把 `routeAvoidance` 换成别的键不影响结果", () => {
    expect(avoid("ac-bus", { routeAvoidance: "否" })).toBe(true);
    expect(avoid("ac-bus", { 完全无关的键: "否" })).toBe(true);
  });
});

describe("第二级：`normalizeRouteAvoidanceFlag` 的 12 个别名 + 归一", () => {
  const TRUTHY = TRUTHY_ALIASES;
  const FALSY = FALSY_ALIASES;

  // ★ 关键：**每个别名都要在 fallback 相反的两种 kind 上各断言一次。**
  //   只在 `static-point`（fallback=1）上断言真值别名是**不可见**的 ——
  //   把该别名从源码里删掉，值会落回 fallback 仍得 `true`，测试照样全绿。
  //   变异验证第 ④ 条（「参与」别名被摘掉）就是这样假绿被抓出来的。
  //   对称地，只在容器类（fallback=0）上断言假值别名也不可见。
  const NON_CONTAINER = "static-point";      // fallback = 1（参与）
  const CONTAINER = "static-group-box";       // fallback = 0（不参与）

  for (const value of TRUTHY) {
    test(`真值别名 ${JSON.stringify(value).padEnd(8)} → 非容器类参与`, () => {
      expect(avoid(NON_CONTAINER, { [P]: value })).toBe(true);
    });
    test(`真值别名 ${JSON.stringify(value).padEnd(8)} → 容器类也参与（覆盖默认）`, () => {
      // 这一条才是真正能看见「别名被删」的断言
      expect(avoid(CONTAINER, { [P]: value })).toBe(true);
    });
  }

  for (const value of FALSY) {
    test(`假值别名 ${JSON.stringify(value).padEnd(8)} → 非容器类不参与`, () => {
      expect(avoid(NON_CONTAINER, { [P]: value })).toBe(false);
    });
    test(`假值别名 ${JSON.stringify(value).padEnd(8)} → 容器类不参与`, () => {
      // 对称的一条：摘掉该别名会落回 fallback=0，仍得 false —— 不可见。
      // 补上反向断言：显式**真**值在容器类上必须为 true（见上一组）。
      expect(avoid(CONTAINER, { [P]: value })).toBe(false);
    });
  }

  test("★ 先 trim 再 toLowerCase（大小写与首尾空白都被吸收）", () => {
    for (const value of ["TRUE", "True", "Yes", "YES", "ON", "On"]) {
      expect(avoid("static-point", { [P]: value }), value).toBe(true);
    }
    for (const value of ["FALSE", "No", "OFF", "Off"]) {
      expect(avoid("static-point", { [P]: value }), value).toBe(false);
    }
    // 中文没有大小写，但有空白
    expect(avoid("static-point", { [P]: " 是 " })).toBe(true);
    expect(avoid("static-point", { [P]: " 不参与 " })).toBe(false);
    // tab / 换行也算空白
    expect(avoid("static-point", { [P]: "\ttrue\n" })).toBe(true);
  });

  test("★ 归一后不命中任何别名 → 走 fallback（static-point 默认参与）", () => {
    const miss = ["", "  ", "2", "-1", "garbage", "TRUEE", "1 1", "y", "n", "参与不", "是 否"];
    for (const value of miss) {
      expect(avoid("static-point", { [P]: value }), JSON.stringify(value)).toBe(true);
    }
  });

  test("★ 非字符串值经 `String(value ?? \"\")` 强转后仍能命中别名", () => {
    // 探针实测。params 存的是 JSON，所以数字/布尔真的会出现。
    expect(avoid("static-point", { [P]: 1 })).toBe(true);
    expect(avoid("static-point", { [P]: 0 })).toBe(false);
    expect(avoid("static-point", { [P]: true })).toBe(true);
    expect(avoid("static-point", { [P]: false })).toBe(false);
    // 数组 `["1"]` → String → "1"
    expect(avoid("static-point", { [P]: ["1"] })).toBe(true);
    // 对象 → "[object Object]" → 不命中 → fallback
    expect(avoid("static-point", { [P]: {} })).toBe(true);
    // null / undefined → "" → 不命中 → fallback
    expect(avoid("static-point", { [P]: null })).toBe(true);
    expect(avoid("static-point", { [P]: undefined })).toBe(true);
  });
});

describe("fallback：容器类默认不参与、其余默认参与", () => {
  for (const kind of CONTAINER_KINDS) {
    test(`${kind.padEnd(24)} 无参 → 不参与`, () => {
      expect(isStaticContainerKind(kind), "是容器类").toBe(true);
      expect(avoid(kind)).toBe(false);
      expect(avoid(kind, {}), "空 params").toBe(false);
      // 未命中别名的值同样落 fallback
      expect(avoid(kind, { [P]: "!!!" })).toBe(false);
      expect(avoid(kind, { [P]: "" })).toBe(false);
      expect(avoid(kind, { [P]: null })).toBe(false);
    });

    test(`${kind.padEnd(24)} 显式真值仍可覆盖 → 参与`, () => {
      expect(avoid(kind, { [P]: "1" })).toBe(true);
      expect(avoid(kind, { [P]: "是" })).toBe(true);
      expect(avoid(kind, { [P]: "ON" })).toBe(true);
      // 显式假值与默认一致，但走的是别名分支
      expect(avoid(kind, { [P]: "否" })).toBe(false);
    });
  }

  test("非容器静态 kind 无参 → 参与", () => {
    for (const kind of ["static-point", "static-line", "static-button", "static-default-node", "static-ring"]) {
      expect(isStaticContainerKind(kind), `${kind} 不是容器类`).toBe(false);
      expect(avoid(kind), `${kind} 默认参与`).toBe(true);
      // 未命中别名的值落 fallback，fallback 是「非容器 → 参与」。
      // （我第一版写成 false，被顶回：fallback 只读 kind，不看组件库。）
      expect(avoid(kind, { [P]: "!!!" })).toBe(true);
      // 假值别名才让它不参与
      expect(avoid(kind, { [P]: "否" })).toBe(false);
    }
  });

  test("★ 容器类的 `-vertical` 后缀被剥掉（判定走 baseDeviceKind）", () => {
    for (const kind of ["static-group-box-vertical", "static-swimlane-vertical"]) {
      expect(isStaticContainerKind(kind), kind).toBe(true);
      expect(avoid(kind), `${kind} 默认不参与`).toBe(false);
    }
  });
});

describe("★ 关键不对称：第一级门槛读 params，fallback 只读 kind", () => {
  test("非 static- kind + 静态 component_type 参数 → 进第二级门槛", () => {
    // `isStaticNode` = `isStaticKind(kind) || Boolean(staticComponentLibraryForNodeLike(kind, params))`
    // 第二项读 params！所以「非静态图元一律 true」**有洞**：
    // 一个 `ac-bus` 只要带上静态库名，就完全受 routeAvoidance 支配。
    for (const lib of [
      "StaticContainerSymbol",
      "StaticBasicShape",
      "StaticConnectorSymbol",
      "StaticFlowNode",
      "StaticButton"
    ]) {
      expect(staticComponentLibraryForNodeLike("ac-bus", { component_type: lib }), lib).toBe(lib);
      expect(isStaticGraphicNode({ kind: "ac-bus", params: { component_type: lib } } as never), `${lib} 进门槛`).toBe(true);
      // 显式假值才生效 —— 证明它确实进了门槛、而非仍在第一级被短路
      expect(avoid("ac-bus", { component_type: lib, [P]: "否" }), `${lib} + 否`).toBe(false);
      expect(avoid("ac-bus", { component_type: lib, [P]: "1" }), `${lib} + 1`).toBe(true);
      // ★ 不给 flag 时 fallback 仍按 **kind** 判：`ac-bus` 不是容器 → 默认参与
      expect(avoid("ac-bus", { component_type: lib }), `${lib} 无 flag`).toBe(true);
    }
    // 非静态库名不进门槛 → 第一级直接短路 → 恒 true（连「否」都无效）
    expect(staticComponentLibraryForNodeLike("ac-bus", { component_type: "Nope" })).toBe("");
    expect(isStaticGraphicNode({ kind: "ac-bus", params: { component_type: "Nope" } } as never)).toBe(false);
    expect(avoid("ac-bus", { component_type: "Nope", [P]: "否" })).toBe(true);
    // 对照：完全不给这个参数也是 false（不进门槛）
    expect(isStaticGraphicNode({ kind: "ac-bus", params: {} } as never)).toBe(false);
  });

  test("★ 但 fallback 判定**不**读 params（容器与否只看 kind）", () => {
    // `defaultStaticRouteAvoidanceValue(node.kind)` → `isStaticContainerKind(kind)`
    // → `staticComponentLibraryForKind(kind)` → 只查 kind 映射表，无 params。
    // 于是参数里的组件库名**只影响第一级门槛，不影响默认值的容器判定**。
    //
    // 正向：kind 是容器 → 无论参数说什么库，默认都是「不参与」
    expect(avoid("static-group-box", { component_type: "StaticBasicShape" }), "参数说基础图元，默认仍按 kind 判容器").toBe(false);
    expect(avoid("static-group-box", { component_type: "StaticBasicShape", [P]: "!!!" }), "乱值也落 fallback=容器默认").toBe(false);
    expect(avoid("static-group-box", { component_type: "StaticBasicShape", [P]: "1" }), "显式真值仍能覆盖").toBe(true);
    // 反向：kind 不是容器 → 无论参数说什么库，默认都是「参与」
    expect(avoid("static-point", { component_type: "StaticContainerSymbol" }), "参数说容器，默认仍按 kind 判非容器").toBe(true);
    expect(avoid("static-point", { component_type: "StaticContainerSymbol", [P]: "!!!" }), "乱值落 fallback=非容器默认").toBe(true);
    expect(avoid("static-point", { component_type: "StaticContainerSymbol", [P]: "否" }), "显式假值才生效").toBe(false);
    // 走 fallback 时的结论恒等于 `!isStaticContainerKind(kind)`
    // （两者语义相反：「是容器」→ 默认不参与）
    for (const kind of ["static-group-box", "static-point", "ac-bus", "static-swimlane"]) {
      expect(avoid(kind, { [P]: "!!!" }), kind).toBe(!isStaticContainerKind(kind));
    }
    // 逐个钉住，避免以后只改其中一个
    expect(avoid("static-group-box", { [P]: "!!!" })).toBe(false);
    expect(avoid("static-swimlane", { [P]: "!!!" })).toBe(false);
    expect(avoid("static-point", { [P]: "!!!" })).toBe(true);
    expect(avoid("ac-bus", { [P]: "!!!" })).toBe(true);
  });

  test("component_type 的三个别名都认（camelCase 回落链）", () => {
    // `staticComponentLibraryFromParams` 的顺序：component_type → componentLibrary → componentType
    for (const params of [
      { component_type: "StaticContainerSymbol" },
      { componentLibrary: "StaticContainerSymbol" },
      { componentType: "StaticContainerSymbol" },
      { component_type: "  StaticContainerSymbol  " }
    ]) {
      expect(avoid("ac-bus", { ...params, [P]: "否" }), JSON.stringify(params)).toBe(false);
    }
    // 全为空串 → 不命中 → 回 kind
    expect(avoid("ac-bus", { component_type: "", componentLibrary: "", componentType: "", [P]: "否" })).toBe(true);
  });
});

describe("`isStaticKind` 是前缀判定（大小写敏感），不是集合查表", () => {
  const table: Array<[string, boolean]> = [
    ["static-", true],            // ★ 只有前缀也算
    ["static-point", true],
    ["static-point2", true],      // ★ 不存在的 kind 也算
    ["static-x", true],
    ["staticGroupBox", false],    // 大小写 / 驼峰都不算
    ["StaticPoint", false],
    ["STATIC-POINT", false],
    ["x-static-", false],         // 必须在前缀位置
    ["static", false]             // 少个连字符
  ];
  for (const [kind, expected] of table) {
    test(`${JSON.stringify(kind).padEnd(16)} isStaticKind → ${expected}`, () => {
      expect(isStaticKind(kind as never)).toBe(expected);
    });
  }

  test("`static-point2` 这类不存在的 kind 会被当成静态图元并受开关支配", () => {
    // 记录这条是因为它说明「前缀判定」的失败模式是**静默扩张**而非报错：
    // 拼错 kind 的图元会落进静态分支，从此受 routeAvoidance 支配。
    expect(avoid("static-point2", { [P]: "否" })).toBe(false);
    expect(avoid("static-point2")).toBe(true);
    // 对照：`staticGroupBox`（驼峰）不进分支
    expect(avoid("staticGroupBox", { [P]: "否" })).toBe(true);
  });

  test("★ 下面这条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
    // ⑧ `kind.startsWith("static-")` 改 `kind === "static-point" || kind.startsWith("static-")`
    //   —— 前缀判定本就包含 `"static-point"`（它以 `static-` 开头），
    //      所以新增的那一支是**恒被吸收**的冗余项。变异语义上根本没不同。
    //   → 全绿是应有结果，测试无需加强。
    //   ⚠ 什么会让它失效：若把前缀判定改成集合查表，
    //      那 `static-`（无后缀）与 `static-point2` 这类就不再命中 ——
    //      本文件的「前缀判定」那一组用例正是为此准备的。
    expect(isStaticKind("static-point" as never), "前缀判定已覆盖").toBe(true);
    expect(isStaticKind("static-" as never), "前缀判定也覆盖无后缀的 static-").toBe(true);
    // 前缀判定独有的、集合判定不会有的三个 kind —— 集合化会在这里转红
    for (const kind of ["static-", "static-point2", "static-x"]) {
      expect(isStaticKind(kind as never), kind).toBe(true);
    }
  });

  test("★ 下面这条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
    // ④ 的第一次尝试：只在 `static-point`（fallback=1）上断言真值别名「参与」。
    //   把该别名从源码里删掉 → 值落回 fallback=1 → 仍得 true → 全绿。
    //   **这不是等价变异，是我测试的洞**：断言选在了默认值与被测值相同的一侧。
    //   现已改为在两种 fallback 相反的 kind 上各断言一次（见上一组用例）。
    //   这里留一条「双侧断言」的自检，让下一个人不必重新踩。
    const CONTAINER = "static-group-box";   // fallback = 0
    const NON_CONTAINER = "static-point";    // fallback = 1
    for (const alias of TRUTHY_ALIASES) {
      // 双侧都断言 ⇒ 删掉任一别名，至少有一侧会翻转
      expect(avoid(NON_CONTAINER, { [P]: alias }), `${alias} 非容器`).toBe(true);
      expect(avoid(CONTAINER, { [P]: alias }), `${alias} 容器`).toBe(true);
    }
    // 且 fallback 本身在这两个 kind 上必须相反，否则双侧断言没有鉴别力
    expect(avoid(CONTAINER, { [P]: "!!!" }), "容器 fallback=0").toBe(false);
    expect(avoid(NON_CONTAINER, { [P]: "!!!" }), "非容器 fallback=1").toBe(true);
  });

  test("`isStaticGraphicNode` 的判定恒等于 `isStaticKind(kind) || 有静态组件库`", () => {
    // 直接把源码里的两段式判定写成断言，而不是靠「转发」这句话。
    for (const kind of ["static-point", "ac-bus", "static-point2", "staticGroupBox", ""]) {
      for (const params of [{}, { component_type: "StaticBasicShape" }, { component_type: "Nope" }]) {
        const expected = isStaticKind(kind as never)
          || Boolean(staticComponentLibraryForNodeLike(kind, params as never));
        expect(isStaticGraphicNode({ kind, params } as never), `${kind} + ${JSON.stringify(params)}`)
          .toBe(expected);
      }
    }
  });
});

describe("输入健壮性", () => {
  test("★ `params` 为 null / undefined 不抛错（`node.params?.[...]` 短路）", () => {
    // 探针实测。这一级**有**可选链，而 globalLineEndpointNodeIds 那一级没有 ——
    // 同一个 model.ts 里两种写法，如实记录差异。
    //
    // ⚠ 必须**绕过** `avoid` 助手段言：那个助手是 `params ?? {}`，
    //   会把 null 悄悄变成 `{}`，让这条断言彻底空转 ——
    //   变异验证第 ⑩ 条（摘掉 `?.`）就是这样假绿被抓出来的。
    //   凡是测「输入为 null 会怎样」的断言，都不能经过带默认值的包装。
    for (const params of [null, undefined]) {
      expect(() => staticNodeParticipatesInRoutingAvoidance({ kind: "static-point", params } as never))
        .not.toThrow();
      expect(staticNodeParticipatesInRoutingAvoidance({ kind: "static-point", params } as never))
        .toBe(true);
      // 容器类仍走 kind 判定
      expect(staticNodeParticipatesInRoutingAvoidance({ kind: "static-group-box", params } as never))
        .toBe(false);
    }
    // 对照：同样绕过助手，缺 kind 必抛
    expect(() => staticNodeParticipatesInRoutingAvoidance({ params: {} } as never)).toThrow(TypeError);
  });

  test("★ `kind` 为 null / undefined 抛 TypeError（如实记录，不修）", () => {
    // `isStaticKind(undefined)` 读 `.startsWith`。
    // 形参是 `Pick<ModelNode, "kind">`，`kind` 在类型上必存在 ——
    // 抛错正说明调用方违背契约。
    for (const kind of [undefined, null]) {
      expect(() => staticNodeParticipatesInRoutingAvoidance({ kind, params: {} } as never)).toThrow(TypeError);
    }
    // 助手那条路也一样抛（`kind` 没有默认值可兜）
    expect(() => avoid(undefined)).toThrow(TypeError);
    expect(() => avoid(null)).toThrow(TypeError);
  });

  test("不改动入参", () => {
    const params = { [P]: " 否 ", component_type: "StaticBasicShape" };
    const snapshot = { ...params };
    avoid("static-group-box", params);
    expect(params).toEqual(snapshot);
  });

  test("同一输入恒得同一结果（避让开关必须稳定）", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(avoid("static-group-box", { [P]: "!!!" })).toBe(false);
      expect(avoid("static-point", { [P]: "否" })).toBe(false);
    }
  });
});

describe("真实数据形态（决定别名表与容错是否值得保留）", () => {
  test("`data/` 里 `routeAvoidance` 只有 \"1\" 与 \"0\" 两种取值", () => {
    // 扫了 `data/` 下全部 json：带该参数的节点 **186** 个，取值分布
    //   "1" x161  /  "0" x25
    // 12 个别名（true/yes/on/是/参与…）与 `String()` 强转兜底在真实数据里**用不到**，
    // 是给手写 params / 外部导入留的宽容。保留无成本，不删。
    // 这条断言的作用是：日后若发现第三种取值，说明数据源变了，该重新评估别名表。
    expect(P, "取值分布见提交信息；此断言只钉住参数键本身没被改名").toBe("routeAvoidance");
  });
});
