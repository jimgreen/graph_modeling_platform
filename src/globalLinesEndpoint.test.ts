// global-lines 端点判定的直接单测（7 + 4 处生产调用，此前零测试直呼）。
//
// ## modelAssociationGlobalLineEndpointForNode
//
// 决定一个节点在全局线路里是**首端（source）**还是**末端（target）**，或都不算。
// 判错的后果是全局线路的**首末端接反** —— 图形仍然连着、线路仍然存在，
// 但潮流方向 / 量测归属全错，且**不报任何错**。
//
// 判定链是**两级**的，缺一不可：
//
//   ① `modelAssociationModelTypeForKind(kind)` 必须非空
//      —— 即 kind 命中 `MODEL_ASSOCIATION_DERIVED_CLASS_SPEC_BY_KIND`
//   ② `baseDeviceKind(kind)` 剥掉 `-vertical` 后缀后，以 `-source` / `-load` 结尾
//
// ## 探针实测的关键事实（写测试时才发现，比预想窄得多）
//
// **只有 6 个 kind 真的参与全局线路**，全部是「厂站/馈线/台区」三级模型的具体类型：
//
//   source: ac-station-source / ac-feeder-source / ac-district-source
//           dc-station-source / dc-feeder-source / dc-district-source
//   target: ac-station-load / ac-feeder-load / ac-district-load
//           dc-station-load / dc-feeder-load / dc-district-load
//
// 而 `ac-source` / `dc-source` / `ac-load` / `dc-load` / `ac-storage` /
// `hydrogen-source` / `heat-source` 这些**裸名一个都不参与**（第①级就返回空串）——
// 它们没有 modelType，是"本地"设备。这条极容易被想当然地写反，故显式钉住。
//
// **第②级的 `baseDeviceKind` 确实必要**：`ac-station-source-vertical` 会命中
// （实测 → `source`），说明源/荷类作为 2 端子设备**确实有** `-vertical` 变体，
// 不剥后缀就会静默丢端点。
import { describe, expect, test } from "vitest";
import {
  isGlobalLineBoundaryNode,
  isManagedGlobalLineModelType,
  modelAssociationGlobalLineEndpointForNode
} from "./global-lines";
import { baseDeviceKind, modelAssociationModelTypeForKind, type ModelNode } from "./model";

const node = (kind: string) => ({ kind, params: {} }) as Pick<ModelNode, "kind" | "params">;

describe("第①级：只有「厂站/馈线/台区」的具体类型参与全局线路", () => {
  const participating = [
    "ac-station-source", "ac-feeder-source", "ac-district-source",
    "dc-station-source", "dc-feeder-source", "dc-district-source"
  ];
  const local = [
    "ac-source", "dc-source", "hydrogen-source", "heat-source", "ac-storage",
    "ac-load", "dc-load", "hydrogen-load", "heat-load", "ac-terminal-transformer-load"
  ];

  for (const kind of participating) {
    test(`${kind.padEnd(24)} 有 modelType（${modelAssociationModelTypeForKind(kind)}）`, () => {
      expect(modelAssociationModelTypeForKind(kind)).not.toBe("");
      expect(isGlobalLineBoundaryNode(node(kind))).toBe(true);
    });
  }

  for (const kind of local) {
    test(`★ ${kind.padEnd(24)} 是「本地」设备，不参与全局线路`, () => {
      expect(modelAssociationModelTypeForKind(kind), `${kind} 不应有 modelType`).toBe("");
      expect(isGlobalLineBoundaryNode(node(kind)), kind).toBe(false);
      expect(modelAssociationGlobalLineEndpointForNode(node(kind)), kind).toBe("");
    });
  }

  test("裸名与具体名的对照（最容易被写反的一组）", () => {
    // ac-station-source 参与，ac-source 不参与 —— 差一个 "station-"
    expect(isGlobalLineBoundaryNode(node("ac-station-source"))).toBe(true);
    expect(isGlobalLineBoundaryNode(node("ac-source"))).toBe(false);
    expect(isGlobalLineBoundaryNode(node("ac-station-load"))).toBe(true);
    expect(isGlobalLineBoundaryNode(node("ac-load"))).toBe(false);
  });
});

describe("第②级：剥 `-vertical` 后缀后按 -source / -load 判端点", () => {
  const sources = ["ac-station-source", "ac-feeder-source", "ac-district-source",
    "dc-station-source", "dc-feeder-source", "dc-district-source"];
  const targets = ["ac-station-load", "ac-feeder-load", "ac-district-load",
    "dc-station-load", "dc-feeder-load", "dc-district-load"];

  for (const kind of sources) {
    test(`${kind.padEnd(24)} → "source"`, () => {
      expect(modelAssociationGlobalLineEndpointForNode(node(kind)), kind).toBe("source");
    });
  }

  for (const kind of targets) {
    test(`${kind.padEnd(24)} → "target"`, () => {
      expect(modelAssociationGlobalLineEndpointForNode(node(kind)), kind).toBe("target");
    });
  }

  test("★ `-vertical` 变体与水平版**端点相同**（baseDeviceKind 生效）", () => {
    // 实测 ac-station-source-vertical → source，与水平版一致。
    for (const kind of sources) {
      const vertical = `${kind}-vertical`;
      expect(modelAssociationGlobalLineEndpointForNode(node(vertical)), vertical)
        .toBe(modelAssociationGlobalLineEndpointForNode(node(kind)));
    }
  });

  test("`baseDeviceKind` 确实会剥后缀（判据本身的前提）", () => {
    // 若哪天 baseDeviceKind 改了行为，这条会红并提醒重新评估第②级。
    expect(baseDeviceKind("ac-station-source-vertical")).toBe("ac-station-source");
    expect(baseDeviceKind("ac-station-source")).toBe("ac-station-source");
  });

  test("不参与全局线路的 kind，即便加 `-vertical` 也不参与", () => {
    expect(modelAssociationGlobalLineEndpointForNode(node("ac-source-vertical"))).toBe("");
    expect(modelAssociationGlobalLineEndpointForNode(node("ac-load-vertical"))).toBe("");
  });
});

describe("第①级在第②级之前：后缀匹配但无 modelType → 空串", () => {
  // 这组证明两级判定**顺序正确**：不能先看后缀。
  // 注意：第②级用的是 `endsWith("-source")`，所以造出来的 kind 必须真的以
  // `-source` / `-load` 结尾（`ac-linesource` 不含连字符，不满足该前提）。
  const suffixButNoModelType = ["ac-line-source", "zzz-source", "foo-load", "ac-x-load"];

  for (const kind of suffixButNoModelType) {
    test(`${JSON.stringify(kind).padEnd(18)} 虽以 -source/-load 结尾但不参与`, () => {
      expect(kind.endsWith("-source") || kind.endsWith("-load"), `${kind} 应满足后缀前提`).toBe(true);
      expect(modelAssociationModelTypeForKind(kind), `${kind} 应无 modelType`).toBe("");
      expect(modelAssociationGlobalLineEndpointForNode(node(kind)), kind).toBe("");
    });
  }

  test("`ac-linesource`（无连字符）连第②级前提都不满足", () => {
    // 顺手钉住：`-source` 的连字符是硬要求，`linesource` 不算。
    expect("ac-linesource".endsWith("-source")).toBe(false);
    expect(modelAssociationGlobalLineEndpointForNode(node("ac-linesource"))).toBe("");
  });
});

describe("大小写敏感：不做 toLowerCase", () => {
  test("大写 kind 不命中", () => {
    for (const kind of ["AC-STATION-SOURCE", "Ac-Station-Source", "AC-STATION-LOAD"]) {
      expect(modelAssociationModelTypeForKind(kind), kind).toBe("");
      expect(modelAssociationGlobalLineEndpointForNode(node(kind)), kind).toBe("");
    }
  });

  test("与水平版形成对照（证明确实区分大小写）", () => {
    expect(modelAssociationGlobalLineEndpointForNode(node("ac-station-source"))).toBe("source");
    expect(modelAssociationGlobalLineEndpointForNode(node("AC-STATION-SOURCE"))).toBe("");
  });
});

describe("返回值与类型契约", () => {
  test("返回值只可能是 'source' / 'target' / ''", () => {
    for (const kind of ["ac-station-source", "ac-station-load", "ac-bus", "", "zzz", "ac-station-source-vertical"]) {
      expect(["source", "target", ""], kind).toContain(modelAssociationGlobalLineEndpointForNode(node(kind)));
    }
  });

  test("isGlobalLineBoundaryNode 返回真正的 boolean", () => {
    for (const kind of ["ac-station-source", "ac-bus", ""]) {
      expect(typeof isGlobalLineBoundaryNode(node(kind)), kind).toBe("boolean");
    }
  });

  test("isGlobalLineBoundaryNode ≡ Boolean(modelAssociationModelTypeForKind(kind))", () => {
    for (const kind of ["ac-station-source", "ac-station-load", "ac-bus", "ac-breaker", "ac-load", "", "zzz", "ac-station-source-vertical"]) {
      expect(isGlobalLineBoundaryNode(node(kind)), kind).toBe(Boolean(modelAssociationModelTypeForKind(kind)));
    }
  });
});

describe("★ 非字符串 kind 会抛 TypeError（探针实测，如实记录，不修）", () => {
  // 探针实测：`undefined` / `null` / 数字 / 对象都会抛
  // `Cannot read properties of undefined (reading 'endsWith')` 或
  // `kind.endsWith is not a function`。
  //
  // **判定为类型面问题，不修**：`ModelNode["kind"]` 在类型上是必填的 `DeviceKind`，
  // 而三个函数的形参类型也都是 `Pick<ModelNode, "kind" | ...>`。抛异常说明
  // 调用方违背了类型契约 —— 加 `String(kind)` 兜底反而会掩盖真实的数据问题
  // （空 kind 会静默变成 `""` 参与后续匹配）。
  //
  // 本组用例的作用是：**若日后有人"顺手"加兜底让它们不抛了，这里会转红提醒**，
  // 让那个决定变成显式的，而不是无声的行为变更。
  for (const [label, bad] of [["undefined", undefined], ["null", null], ["数字 0", 0], ["空对象", {}]] as const) {
    test(`${label.padEnd(10)} 抛 TypeError（` + "`kind.endsWith`" + `）`, () => {
      const n = node(bad as never);
      expect(() => modelAssociationGlobalLineEndpointForNode(n)).toThrow(TypeError);
      expect(() => isGlobalLineBoundaryNode(n)).toThrow(TypeError);
      expect(() => modelAssociationModelTypeForKind(bad as never)).toThrow(TypeError);
    });
  }

  test("**空串 kind 不抛**（它是合法字符串，只是不命中任何映射）", () => {
    const n = node("");
    expect(() => modelAssociationGlobalLineEndpointForNode(n)).not.toThrow();
    expect(modelAssociationGlobalLineEndpointForNode(n)).toBe("");
    expect(isGlobalLineBoundaryNode(n)).toBe(false);
  });
});

describe("isManagedGlobalLineModelType：nullish 安全的 Set 成员判定", () => {
  test("命中的正是那三个中文模型类型（探针实测的唯一真值集合）", () => {
    for (const modelType of ["厂站", "馈线", "台区"]) {
      expect(isManagedGlobalLineModelType(modelType), modelType).toBe(true);
    }
  });

  test("nullish / 空串 → false（不抛异常）", () => {
    expect(isManagedGlobalLineModelType(undefined)).toBe(false);
    expect(isManagedGlobalLineModelType(null as unknown as undefined)).toBe(false);
    expect(isManagedGlobalLineModelType("")).toBe(false);
  });

  test("非 ModelType 的字符串 → false", () => {
    for (const s of ["Source", "Target", "SourceTarget", "Load", "ac-source", "ZZZ", "source", "target", "厂站 "]) {
      expect(isManagedGlobalLineModelType(s as never), JSON.stringify(s)).toBe(false);
    }
  });

  test("**不做 trim**：带空格的 `厂站 ` 不命中", () => {
    expect(isManagedGlobalLineModelType("厂站")).toBe(true);
    expect(isManagedGlobalLineModelType("厂站 ")).toBe(false);
  });
});
