// appStateBatch.tsx 里 6 个零覆盖内部纯函数的行为钉桩。
//
// 这 6 个都是 useAppStateBatch 体内的闭包（随后 Object.assign 回 __appScope），
// 既没有导出、也无法在不改生产代码的前提下从外部直接触达 —— 整个 hook 有上千行
// React 依赖，接一个最小 __appScope 去 renderHook 会把无关的耦合全拖进来。
// 故沿用本仓既有手法（userCustomizations.test.ts / savedNameKeyAndRouteBounds.test.ts）：
// **按锚点从真实源码切出这段声明、转译后在沙箱里求值**。跑的是实际交付的那份代码，
// 不是测试里的复刻；锚点切不到直接抛错（cut 里没有静默兜底），不会假绿。
//
// 依赖注入只覆盖「函数自己看不见的外部量」：routeRenderBounds / PADDING / inferESection /
// 模板 Map 全部**用真实模块**（routeStore、appCoreCanvasUtilities、model-eexport），
// 只有 hook 运行时才产生的 4 个闭包局部量（visibleNodes / visibleNodeById / nodeById /
// orderedNodeFromList）才可注入 —— 它们本来就没有模块级来源。
//
// ★ 下面 4 条是探针实测到的、与直觉相反、且必须绕开的行为（探针跑完即删）：
//
// ① `filterSelectionComponentLibraryKey` 的兜底读的是 `node.params.component_type`，
//    **没有可选链**（不是 `node.params?.component_type`）。所以 params 缺失不是
//    「回退到 kind」，而是**抛 TypeError**。而且只有当前三条 fallback 都落空时才抛：
//    `static-resistor` 在 DEVICE_LIBRARY 里查不到、inferESection 对它两次都返回空串，
//    正好落在最后一条；`static-text` 命中模板 Map 就短路，params 缺失也照样返回
//    "StaticTextSymbol"。所以「抛/不抛」必须**两侧都断言**，只测一侧等于没测
//    fallback 顺序。
//
// ② `nodeForRoutingList` 的分支判据是 **引用相等** `sourceNodes === visibleNodes`，
//    不是内容相等。传一个内容完全相同的新数组，会走另一条分支
//    （orderedNodeFromList）并返回完全不同的对象 —— 这正是引用语义的可观察后果。
//    nodeId 查不到时返回 `undefined`（不是 null，也不抛）。
//
// ③ `smartAlignmentGuideSignature` 用 `Math.round`，是**向 +∞ 取半**（2.5→3、
//    -2.5→-2），不是 Math.floor 也不是 Math.trunc；且 position 为 -0.5 时
//    Math.round 得 -0，模板串把 -0 打成 "0"，于是 position -0.5 与 position 0
//    **产出同一个签名**。签名还**保留数组顺序**（不排序），所以同批 guide 换序会
//    改变签名 —— 想验「顺序无关」会恒红。
//
// ④ `snapshotRouteBounds` 对 `points: []` 的边产出的是 **null**（routeRenderBounds
//    的空数组早退），但**键照样保留**在结果里 —— 不是把这条边丢掉。另外结果是普通
//    对象，类数组键（"2"）会被 JS 排到字符串键前面，与插入顺序无关。
import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, test } from "vitest";

import { DEVICE_LIBRARY } from "../model";
import { inferESection } from "../model-eexport";
import { routeRenderBounds } from "../routeStore";
import { CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING } from "./appCoreCanvasUtilities";
import { filterSelectionTemplateComponentLibraryKey } from "./appPersistenceLibraryExport";

const stateBatchSource = readFileSync(new URL("./appStateBatch.tsx", import.meta.url), "utf8");

// 从 `from` 标记切到 `to` 标记（不含 to）。两个标记在本文件里各只出现一次，
// 已用 grep 核对；切不到就抛，绝不返回空串让下游静默通过。
const cutSource = (from: string, to: string) => {
  const start = stateBatchSource.indexOf(from);
  const end = stateBatchSource.indexOf(to);
  if (start < 0 || end <= start) {
    throw new Error(`未能在 appStateBatch.tsx 中定位「${from}」→「${to}」之间的声明块`);
  }
  return stateBatchSource.slice(start, end);
};

// 第 4 段从 filterSelectionComponentLibraryKey 一直切到 filterSelectionItemKey 的
// Object.assign：三个 filterSelection* 是相邻声明，filterSelectionItemKey 要引用
// 前两个，所以必须整段一起求值（少切一个就是 ReferenceError，而不是断言失败）。
const stateBatchPureFnsJs = ts.transpileModule(
  cutSource("const smartAlignmentGuideSignature", "Object.assign(__appScope, { smartAlignmentGuideSignature });")
    + cutSource("const snapshotRouteBounds", "Object.assign(__appScope, { snapshotRouteBounds });")
    + cutSource("const nodeForRoutingList", "Object.assign(__appScope, { nodeForRoutingList });")
    + cutSource("const filterSelectionComponentLibraryKey", "Object.assign(__appScope, { filterSelectionItemKey });"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
).outputText;

type NodeForRoutingDeps = {
  visibleNodes?: unknown[];
  visibleNodeById?: Map<string, unknown>;
  nodeById?: Map<string, unknown>;
  orderedNodeFromList?: (sourceNodes: unknown[], nodeId: string) => unknown;
};

type LibDeps = { templateLibraryByKind?: Map<string, string> };

type PureFns = {
  smartAlignmentGuideSignature: (guides: Array<Record<string, unknown>>) => string;
  snapshotRouteBounds: (routePointsByEdgeId: Record<string, Array<{ x: number; y: number }>>) => Record<string, unknown>;
  nodeForRoutingList: (sourceNodes: unknown[], nodeId: string) => unknown;
  filterSelectionComponentLibraryKey: (node: { kind?: string; params?: unknown }) => string;
  filterSelectionSpecificTypeKey: (node: { kind?: string }) => unknown;
  filterSelectionItemKey: (node: { kind?: string; params?: unknown }) => string;
};

const NOT_CALLED = () => {
  throw new Error("orderedNodeFromList 不该被调用：说明分支判据走错了");
};

// routeRenderBounds / PADDING / inferESection 一律注入**真实模块**，只有 4 个
// hook 闭包局部量走可注入路径（见文件头注释）。每次 build 传一个全新的 __appScope，
// 免得 Object.assign 的回写在用例之间串味。
const buildPureFns = (deps: NodeForRoutingDeps & LibDeps = {}): PureFns => new Function(
  "__appScope",
  "routeRenderBounds",
  "CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING",
  "visibleNodes",
  "visibleNodeById",
  "nodeById",
  "orderedNodeFromList",
  "filterSelectionTemplateComponentLibraryByKind",
  "inferESection",
  `${stateBatchPureFnsJs}
return { smartAlignmentGuideSignature, snapshotRouteBounds, nodeForRoutingList, filterSelectionComponentLibraryKey, filterSelectionSpecificTypeKey, filterSelectionItemKey };`
)(
  {},
  routeRenderBounds,
  CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING,
  deps.visibleNodes ?? [],
  deps.visibleNodeById ?? new Map(),
  deps.nodeById ?? new Map(),
  deps.orderedNodeFromList ?? NOT_CALLED,
  deps.templateLibraryByKind ?? new Map(),
  inferESection
) as PureFns;

// 生产里 filterSelectionTemplateComponentLibraryByKind 由 DEVICE_LIBRARY +
// customDeviceTemplates 现算（appStateBatch L888）。这里用同样的两个真实来源重建，
// 这样「模板 Map 命中」和「Map 落空」两侧都落在真实数据上，而不是自造的假 kind。
const realTemplateLibraryByKind = new Map<string, string>(
  [...DEVICE_LIBRARY].map((template) => [template.kind, filterSelectionTemplateComponentLibraryKey(template)])
);

// static-resistor 是本文件的关键探针 kind：DEVICE_LIBRARY 里没有它（Map 落空），
// 且 inferESection 对**空 params** 返回空串，于是 filterSelectionComponentLibraryKey
// 一路落到最后那条 `node.params.component_type` 兜底（params 缺失就在这里抛）。
// 把这两点钉死，防止以后 DEVICE_LIBRARY 收进 static-resistor 导致下面的边界全部失效
// （那时它们会**恒绿**而不是转红）。
describe("前提：static-resistor 确实落在 filterSelectionComponentLibraryKey 的最后一条兜底", () => {
  test("DEVICE_LIBRARY 不含该 kind，且对空 params 的 inferESection 返回空串", () => {
    expect(realTemplateLibraryByKind.has("static-resistor")).toBe(false);
    expect(inferESection("static-resistor", {})).toBe("");
  });

  test("对照组：static-text 命中模板 Map（第一条 fallback 就短路）", () => {
    expect(realTemplateLibraryByKind.get("static-text")).toBe("StaticTextSymbol");
  });
});

describe("smartAlignmentGuideSignature", () => {
  const { smartAlignmentGuideSignature: signature } = buildPureFns();

  test("空数组产出空串（不是 undefined，也不是 '[]'）", () => {
    expect(signature([])).toBe("");
  });

  test("只取 orientation 与四舍五入后的 position，id/start/end 一律不进签名", () => {
    // id / start / end 三者全不同、只有 orientation+position 相同 → 必须同签名。
    // 这条对「把整个 guide 塞进签名」是红的。
    const a = { id: "g-a", orientation: "vertical", position: 42.4, start: 0, end: 1 };
    const b = { id: "g-b", orientation: "vertical", position: 42.4, start: 900, end: 901 };
    expect(signature([a])).toBe("vertical:42");
    expect(signature([a])).toBe(signature([b]));
  });

  test("position 按 Math.round 向 +∞ 取半（2.5→3、-2.5→-2，不是 floor 也不是 trunc）", () => {
    expect(signature([{ orientation: "vertical", position: 2.5 }])).toBe("vertical:3");
    expect(signature([{ orientation: "vertical", position: -2.5 }])).toBe("vertical:-2");
    // Math.floor 会给 -3，Math.trunc 会给 2，三者都能被这两行区分开。
    expect(signature([{ orientation: "vertical", position: 2.4 }])).toBe("vertical:2");
    expect(signature([{ orientation: "vertical", position: -2.6 }])).toBe("vertical:-3");
  });

  test("position 为 -0.5 时 Math.round 得 -0，模板串打成 '0' —— 与 position 0 同签名", () => {
    // Math.round(-0.5) 是 -0，`${-0}` 是 "0"。所以签名在这两个输入上**碰撞**。
    // 这条钉住现状（签名不是单射）；若改成保号格式化，下面这条会转红。
    expect(signature([{ orientation: "vertical", position: -0.5 }])).toBe("vertical:0");
    expect(signature([{ orientation: "vertical", position: -0.5 }])).toBe(
      signature([{ orientation: "vertical", position: 0 }])
    );
  });

  test("保留数组顺序：同批 guide 换序会改变签名（签名不排序）", () => {
    const vertical = { orientation: "vertical", position: 1 };
    const horizontal = { orientation: "horizontal", position: 2 };
    expect(signature([vertical, horizontal])).toBe("vertical:1|horizontal:2");
    expect(signature([horizontal, vertical])).toBe("horizontal:2|vertical:1");
    expect(signature([vertical, horizontal])).not.toBe(signature([horizontal, vertical]));
  });

  test("多元素以 | 连接；只有一条时不带分隔符", () => {
    expect(signature([
      { orientation: "vertical", position: 10 },
      { orientation: "horizontal", position: 20 },
      { orientation: "vertical", position: 30 }
    ])).toBe("vertical:10|horizontal:20|vertical:30");
    expect(signature([{ orientation: "horizontal", position: 20 }])).not.toContain("|");
  });

  test("orientation 参与签名：同 position 不同朝向不可互换（不是只比 position）", () => {
    expect(signature([{ orientation: "vertical", position: 5 }])).not.toBe(
      signature([{ orientation: "horizontal", position: 5 }])
    );
  });

  test("非有限 position 不被过滤，原样进签名（守卫缺失的现状）", () => {
    expect(signature([{ orientation: "vertical", position: Number.NaN }])).toBe("vertical:NaN");
  });
});

describe("snapshotRouteBounds", () => {
  const { snapshotRouteBounds } = buildPureFns();
  const PAD = CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING;

  test("空对象产出空结果", () => {
    expect(snapshotRouteBounds({})).toEqual({});
  });

  test("points 为空数组的边取到 null，但**键照样保留**（不是把这条边丢掉）", () => {
    // 若实现改成过滤掉空点位的边，结果会是 {} —— 这条转红。
    const result = snapshotRouteBounds({ e1: [], e2: [{ x: 0, y: 0 }] });
    expect(Object.keys(result)).toEqual(["e1", "e2"]);
    expect(result.e1).toBeNull();
    expect(result.e2).not.toBeNull();
  });

  test("单点边也按 padding 外扩（padding 恒生效，不因只有一个点而跳过）", () => {
    // 去掉 padding 会得到 left/right/top/bottom 全 0 —— 这条转红。
    expect(snapshotRouteBounds({ e1: [{ x: 0, y: 0 }] })).toEqual({
      e1: { left: -PAD, right: PAD, top: -PAD, bottom: PAD }
    });
  });

  test("多点边取 min/max 外扩，且负坐标方向不塌陷", () => {
    // 点集刻意不对称且含负值，避免「左右取成同一个点」这种退化夹具。
    expect(snapshotRouteBounds({
      e1: [{ x: -10, y: -20 }, { x: 130, y: -20 }, { x: 130, y: -20 }]
    })).toEqual({
      e1: { left: -10 - PAD, right: 130 + PAD, top: -20 - PAD, bottom: -20 + PAD }
    });
  });

  test("每条边独立取界：一条边的极值不会污染另一条", () => {
    const result = snapshotRouteBounds({
      small: [{ x: 0, y: 0 }],
      large: [{ x: -1000, y: -1000 }, { x: 1000, y: 1000 }]
    });
    expect(result.small).toEqual({ left: -PAD, right: PAD, top: -PAD, bottom: PAD });
    expect(result.large).toEqual({
      left: -1000 - PAD, right: 1000 + PAD, top: -1000 - PAD, bottom: 1000 + PAD
    });
  });

  test("产出的是普通对象：类数组键被 JS 排到前面，与插入顺序无关", () => {
    // 这是 Object 的键序规则（整数索引键升序前置），不是本函数的排序逻辑；
    // 记在这里是为了别把「键序」误读成实现的意图。
    expect(Object.keys(snapshotRouteBounds({ z: [{ x: 0, y: 0 }], "2": [{ x: 0, y: 0 }] }))).toEqual(["2", "z"]);
  });

  test("不改动传入对象（快照语义）", () => {
    const input = { e1: [{ x: 3, y: 4 }] };
    snapshotRouteBounds(input);
    expect(input).toEqual({ e1: [{ x: 3, y: 4 }] });
  });
});

describe("nodeForRoutingList", () => {
  const visibleA = { id: "a", kind: "kind-a" };
  const visibleB = { id: "b", kind: "kind-b" };
  const visibleNodes = [visibleA, visibleB];
  const visibleBFromMap = { id: "b", kind: "visible-from-map" };
  const allBFromMap = { id: "b", kind: "all-from-nodeById" };
  const fromOrdered = { id: "b", kind: "from-orderedNodeFromList" };

  test("sourceNodes 就是 visibleNodes 这个引用时，走 visibleNodeById", () => {
    // orderedNodeFromList 埋成「一调用就抛」，走错分支立刻炸，不会静默返回同样的值。
    const { nodeForRoutingList } = buildPureFns({
      visibleNodes,
      visibleNodeById: new Map([["b", visibleBFromMap]]),
      nodeById: new Map([["b", allBFromMap]])
    });
    expect(nodeForRoutingList(visibleNodes, "b")).toBe(visibleBFromMap);
  });

  test("★ 内容相同但不是同一引用时改走 orderedNodeFromList —— 判据是引用相等，不是内容相等", () => {
    const { nodeForRoutingList } = buildPureFns({
      visibleNodes,
      visibleNodeById: new Map([["b", visibleBFromMap]]),
      nodeById: new Map([["b", allBFromMap]]),
      orderedNodeFromList: () => fromOrdered
    });
    // 断言对象同一性：换成 toEqual 的话，两条分支的返回值可能碰巧字段相近就放过。
    expect(nodeForRoutingList([visibleA, visibleB], "b")).toBe(fromOrdered);
    expect(nodeForRoutingList([visibleA, visibleB], "b")).not.toBe(visibleBFromMap);
  });

  test("可见列表分支：visibleNodeById 未命中时回退到 nodeById", () => {
    const { nodeForRoutingList } = buildPureFns({
      visibleNodes,
      visibleNodeById: new Map([["a", visibleA]]),
      nodeById: new Map([["b", allBFromMap]]),
      orderedNodeFromList: NOT_CALLED
    });
    expect(nodeForRoutingList(visibleNodes, "b")).toBe(allBFromMap);
  });

  test("非可见列表分支：orderedNodeFromList 未命中时回退到 nodeById", () => {
    const { nodeForRoutingList } = buildPureFns({
      visibleNodes,
      nodeById: new Map([["b", allBFromMap]]),
      orderedNodeFromList: () => undefined
    });
    expect(nodeForRoutingList([], "b")).toBe(allBFromMap);
  });

  test("nodeId 不存在时返回 undefined（不是 null，也不抛）", () => {
    const { nodeForRoutingList } = buildPureFns({
      visibleNodes,
      visibleNodeById: new Map([["a", visibleA]]),
      nodeById: new Map([["a", visibleA]]),
      orderedNodeFromList: () => undefined
    });
    // 两条分支都断一次：可见列表分支与非可见列表分支的「查不到」是不同的两行代码。
    expect(nodeForRoutingList(visibleNodes, "missing-id")).toBeUndefined();
    expect(nodeForRoutingList([], "missing-id")).toBeUndefined();
  });

  test("空数组不是特殊值：照常按引用比较走分支", () => {
    // [] !== visibleNodes（非空数组）→ 走 orderedNodeFromList 分支。
    // 若给空数组开了特例，这条会转红。
    const { nodeForRoutingList } = buildPureFns({
      visibleNodes,
      orderedNodeFromList: () => fromOrdered
    });
    expect(nodeForRoutingList([], "b")).toBe(fromOrdered);
  });
});

describe("filterSelectionComponentLibraryKey", () => {
  const withRealLibrary = (node: { kind?: string; params?: unknown }) =>
    buildPureFns({ templateLibraryByKind: realTemplateLibraryByKind }).filterSelectionComponentLibraryKey(node);

  test("模板 Map 命中时短路，params 缺失也不抛", () => {
    // 与下面 static-resistor 的抛错成对：证明「抛不抛」取决于前三条 fallback，
    // 而不是无条件的。删掉第一条 fallback 这条会转红。
    expect(withRealLibrary({ kind: "static-text", params: undefined })).toBe("StaticTextSymbol");
  });

  test("Map 里的空串不短路（用的是 || 而非 ??），继续往下走", () => {
    // 模板 Map 的值全非空（见 describe 里 0 条的实测），所以这条用手写 Map 才能构造。
    const lib = buildPureFns({ templateLibraryByKind: new Map([["static-resistor", ""]]) })
      .filterSelectionComponentLibraryKey;
    expect(lib({ kind: "static-resistor", params: {} })).toBe("static-resistor");
    // 换成 ?? 的话空串会直接返回 ""，这条转红。
  });

  test("★ node.params 缺失时抛 TypeError —— 兜底读的是 node.params.component_type，没有可选链", () => {
    const lib = buildPureFns({ templateLibraryByKind: realTemplateLibraryByKind }).filterSelectionComponentLibraryKey;
    // 与 static-text 那条对照：同样 params 缺失，一个抛一个不抛。
    expect(() => lib({ kind: "static-resistor" })).toThrow(TypeError);
    expect(() => lib({ kind: "static-resistor", params: undefined })).toThrow(/component_type/);
    // params 为 null 同样抛（`null.foo` 也炸），错误信息不同但都是 TypeError。
    expect(() => lib({ kind: "static-resistor", params: null })).toThrow(TypeError);
  });

  test("params 齐全时兜底到 kind 本身", () => {
    expect(withRealLibrary({ kind: "static-resistor", params: {} })).toBe("static-resistor");
  });

  test("第二次 inferESection 带着 params 求值：params 能改变结果（不是被第一次完全遮蔽）", () => {
    // 先把「两次结果不同」钉死，否则「第二次调用可被第一次遮蔽」这个怀疑无法排除。
    // 第一次（空 params）落空、第二次（带 params）才拿到库名 —— 两次不是同一个值，
    // 所以第二次调用是承重的，不是恒等重复。删掉第二次调用下面这条转红。
    expect(inferESection("static-resistor", {})).toBe("");
    expect(inferESection("static-resistor", { component_type: "ZZLIB" })).toBe("ZZLIB");
    expect(withRealLibrary({ kind: "static-resistor", params: { component_type: "ZZLIB" } })).toBe("ZZLIB");
  });

  test("params 三个别名按 component_type > componentLibrary > componentType 顺序取第一个非空", () => {
    // 三者齐全时必须是 component_type；删掉任一分支，这条与下面两条会转红。
    expect(withRealLibrary({
      kind: "static-resistor",
      params: { component_type: "A", componentLibrary: "B", componentType: "C" }
    })).toBe("A");
    expect(withRealLibrary({
      kind: "static-resistor",
      params: { component_library_unused: "X", componentLibrary: "B", componentType: "C" }
    })).toBe("B");
    expect(withRealLibrary({ kind: "static-resistor", params: { componentType: "C" } })).toBe("C");
  });

  test("空串是假值：三个别名全空串时继续回退到 kind", () => {
    // 用 || 而非 ?? 的直接后果。换成 ?? 会返回 ""，这条转红。
    expect(withRealLibrary({
      kind: "static-resistor",
      params: { component_type: "", componentLibrary: "", componentType: "" }
    })).toBe("static-resistor");
  });

  test("字符串 '0' 是真值，原样透传（不被当成假值丢掉）", () => {
    expect(withRealLibrary({ kind: "static-resistor", params: { component_type: "0" } })).toBe("0");
  });

  test("inferESection 命中时不看 params（如 static-image）", () => {
    expect(inferESection("static-image", {})).toBe("StaticMediaSymbol");
    expect(withRealLibrary({ kind: "static-image", params: { component_type: "ZZLIB" } })).toBe("StaticMediaSymbol");
  });
});

describe("filterSelectionSpecificTypeKey", () => {
  const { filterSelectionSpecificTypeKey: specificKey } = buildPureFns();

  test("原样返回 node.kind，不做任何归一化（不去空格、不改大小写）", () => {
    expect(specificKey({ kind: "static-text" })).toBe("static-text");
    expect(specificKey({ kind: "  ZZ-Upper  " })).toBe("  ZZ-Upper  ");
  });

  test("kind 缺失时返回 undefined（不 String 化、不兜底）", () => {
    // 若改成 String(node.kind) 会得到 "undefined"；若加了兜底会得到某个字面量。
    expect(specificKey({ kind: undefined })).toBeUndefined();
  });

  test("不看 params：params 里的 component_type 不影响返回值", () => {
    expect(specificKey({ kind: "static-text", params: { component_type: "ZZLIB" } } as never)).toBe("static-text");
  });
});

describe("filterSelectionItemKey", () => {
  const itemKeyOf = (node: { kind?: string; params?: unknown }) =>
    buildPureFns({ templateLibraryByKind: realTemplateLibraryByKind }).filterSelectionItemKey(node);

  test("由「库名 :: 具体类型」拼成，顺序是库名在前", () => {
    expect(itemKeyOf({ kind: "static-text", params: {} })).toBe("StaticTextSymbol::static-text");
    expect(itemKeyOf({ kind: "static-resistor", params: {} })).toBe("static-resistor::static-resistor");
  });

  test("两个入参的贡献可分离：换 kind 或换 params 都改变结果", () => {
    // kind 走的是「模板 Map 未命中 → 走 params」这条路，所以两个 node 用 static-resistor
    // （不在 DEVICE_LIBRARY 里），只让 params 不同：库名段必须跟着变。
    // 删掉 filterSelectionComponentLibraryKey 的结果 → 第一条转红。
    expect(itemKeyOf({ kind: "static-resistor", params: { component_type: "LIB_A" } })).toBe("LIB_A::static-resistor");
    expect(itemKeyOf({ kind: "static-resistor", params: { component_type: "LIB_B" } })).toBe("LIB_B::static-resistor");
  });

  test("同一库名下 kind 不同 → 结果不同（第二段确实参与了拼接）", () => {
    // 两个 kind 都由 params 解析到同一个库名，唯一差别就是 kind。
    // 删掉 filterSelectionSpecificTypeKey（第二段写死）→ 两条断言相等 → 转红。
    expect(itemKeyOf({ kind: "static-resistor", params: { component_type: "SHARED" } }))
      .toBe("SHARED::static-resistor");
    expect(itemKeyOf({ kind: "static-capacitor", params: { component_type: "SHARED" } }))
      .toBe("SHARED::static-capacitor");
    expect(itemKeyOf({ kind: "static-resistor", params: { component_type: "SHARED" } })).not.toBe(
      itemKeyOf({ kind: "static-capacitor", params: { component_type: "SHARED" } })
    );
  });

  test("kind 缺失时抛 TypeError —— 库名那段先过 inferESection(undefined) 就炸了", () => {
    // 与 filterSelectionSpecificTypeKey 直接调用返回 undefined 相反：itemKey 要先算
    // 库名，而 inferESection → baseDeviceKind 里 kind.endsWith 对 undefined 直接抛。
    // 所以这里**不是** "undefined::undefined"（那是用空 Map 兜住第一段才拿不到的）。
    expect(() => itemKeyOf({ kind: undefined, params: {} })).toThrow(/endsWith/);
  });

  test("分隔符是 :: ，库名自身含 :: 时不构成可逆编码（可能撞车）", () => {
    const lib = buildPureFns({ templateLibraryByKind: new Map([["k1", "A::B"], ["k2", "C"]]) });
    // "A::B::k1" 与 "C::k2" 两段数不同，现状下不撞；但记录库名含分隔符时的实际产出，
    // 以便日后若分隔符变更能看出差异。
    expect(lib.filterSelectionItemKey({ kind: "k1", params: {} })).toBe("A::B::k1");
    expect(lib.filterSelectionItemKey({ kind: "k2", params: {} })).toBe("C::k2");
  });
});