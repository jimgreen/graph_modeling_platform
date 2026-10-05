// globalLineEndpointReference 的直接单测（此前全仓只有 all-network-topology.test.ts:422
// 对**源码字符串**的 toContain 断言 —— 那是文本匹配，不是行为测试，真实函数从未被调用过）。
//
// 该函数是全局线路记录上「首端 / 末端各指向哪一条 boundary 关联」的唯一解析入口，
// 判错的代价是**首末端指错**：线路照样画得出来、照样能存盘，
// 但潮流方向与量测归属全错，且不报任何错。
//
// ## 三级优先（逐级降级，全缺才返回 null）
//
//   ① `record.endpointSlots[endpoint]` —— 新结构
//   ② 遗留键 `terminalSlots.i`（source）/ `terminalSlots.j`（target）
//   ③ `references.find(...)`：命中条件是
//      `boundaryEndpoint === endpoint`，**或** `terminalSlot` 匹配且自身没有 boundaryEndpoint
//
// ## 为什么每条断言都必须让两个容器互相冲突
//
// ① 和 ② 一旦都填上不同的 reference，若不写冲突输入，
//    删掉第①级（降级到②）测试照样绿 —— 那条断言就是废的。
//    所以下面每一级都配一个「上一级有值、下一级也有**别的**值」的输入，
//    删掉任一级降级逻辑都会立刻变红。
//
// 另有一条容易被忽略的契约：第①级判的是 `!== undefined` 而不是「为真」。
// 也就是说 `endpointSlots.source = null`（显式清空）会**就地返回 null**，
// 不会继续降级到 terminalSlots / references。改成真值判断就会静默复活旧关联。
import { describe, expect, test } from "vitest";
import {
  globalLineEndpointReference,
  type GlobalLineRecord,
  type GlobalLineReference
} from "./global-lines";

/** 每个 reference 的 nodeId 各不相同，便于断言「到底返回了哪一条」。 */
function reference(nodeId: string, overrides: Partial<GlobalLineReference> = {}): GlobalLineReference {
  return {
    modelKey: `model/${nodeId}`,
    projectIdx: 7,
    schemePath: ["schemes", nodeId],
    projectName: "工程A",
    nodeId,
    ...overrides
  };
}

function record(overrides: Partial<GlobalLineRecord> = {}): GlobalLineRecord {
  return {
    id: "GL-1",
    idx: 1,
    name: "全局线路1",
    energyType: "ac",
    params: {},
    references: [],
    degree: 2,
    createdAt: "",
    updatedAt: "",
    ...overrides
  };
}

describe("第①级：endpointSlots 存在时直接返回，且压过遗留键与 references", () => {
  test("source 冲突输入：返回 endpointSlots.source，而非 terminalSlots.i 与 references 首条", () => {
    const fromSlots = reference("slots-source");
    const legacy = reference("legacy-source");
    const fallback = reference("references-source", { boundaryEndpoint: "source" });

    expect(
      globalLineEndpointReference(
        record({
          endpointSlots: { source: fromSlots, target: reference("slots-target") },
          terminalSlots: { i: legacy, j: reference("legacy-target") },
          references: [fallback]
        }),
        "source"
      )
    ).toBe(fromSlots);
  });

  test("target 冲突输入：返回 endpointSlots.target，而非 terminalSlots.j 与 references 首条", () => {
    const fromSlots = reference("slots-target");
    const legacy = reference("legacy-target");
    const fallback = reference("references-target", { boundaryEndpoint: "target" });

    expect(
      globalLineEndpointReference(
        record({
          endpointSlots: { source: reference("slots-source"), target: fromSlots },
          terminalSlots: { i: reference("legacy-source"), j: legacy },
          references: [fallback]
        }),
        "target"
      )
    ).toBe(fromSlots);
  });

  test("endpointSlots 里显式 null 就地返回 null，不降级到 terminalSlots / references", () => {
    expect(
      globalLineEndpointReference(
        record({
          endpointSlots: { source: null, target: reference("slots-target") },
          terminalSlots: { i: reference("legacy-source"), j: null },
          references: [reference("references-source", { boundaryEndpoint: "source" })]
        }),
        "source"
      )
    ).toBeNull();
  });
});

describe("第②级：endpointSlots 缺失时回落到遗留 terminalSlots（i↔source、j↔target）", () => {
  test("source 走 terminalSlots.i，忽略 terminalSlots.j 与 references", () => {
    const legacy = reference("legacy-source");

    expect(
      globalLineEndpointReference(
        record({
          terminalSlots: { i: legacy, j: reference("legacy-target") },
          references: [reference("references-source", { boundaryEndpoint: "source" })]
        }),
        "source"
      )
    ).toBe(legacy);
  });

  test("target 走 terminalSlots.j，忽略 terminalSlots.i 与 references", () => {
    const legacy = reference("legacy-target");

    expect(
      globalLineEndpointReference(
        record({
          terminalSlots: { i: reference("legacy-source"), j: legacy },
          references: [reference("references-target", { boundaryEndpoint: "target" })]
        }),
        "target"
      )
    ).toBe(legacy);
  });

  test("endpointSlots 只有另一端的键时不算数，仍走 terminalSlots", () => {
    const legacy = reference("legacy-source");

    expect(
      globalLineEndpointReference(
        record({
          endpointSlots: { source: undefined, target: reference("slots-target") } as unknown as GlobalLineRecord["endpointSlots"],
          terminalSlots: { i: legacy, j: null },
          references: [reference("references-source", { boundaryEndpoint: "source" })]
        }),
        "source"
      )
    ).toBe(legacy);
  });
});

describe("第③级：前两级皆缺时在 references 里 find", () => {
  test("按 boundaryEndpoint 命中：跳过不匹配的项，找到匹配的那条", () => {
    const targetOnly = reference("other-target", { boundaryEndpoint: "target" });
    const matched = reference("references-source", { boundaryEndpoint: "source" });

    expect(
      globalLineEndpointReference(record({ references: [targetOnly, matched] }), "source")
    ).toBe(matched);
  });

  test("无 boundaryEndpoint 时按 terminalSlot 命中：i 对应 source、j 对应 target", () => {
    const legacySource = reference("legacy-shaped-source", { terminalSlot: "i" });
    const legacyTarget = reference("legacy-shaped-target", { terminalSlot: "j" });
    const withBoth = record({ references: [legacySource, legacyTarget] });

    expect(globalLineEndpointReference(withBoth, "source")).toBe(legacySource);
    expect(globalLineEndpointReference(withBoth, "target")).toBe(legacyTarget);
  });

  test("有多条匹配时取第一条", () => {
    const first = reference("first-source", { boundaryEndpoint: "source" });
    const second = reference("second-source", { boundaryEndpoint: "source" });

    expect(
      globalLineEndpointReference(record({ references: [first, second] }), "source")
    ).toBe(first);
  });
});

describe("全部缺失时返回 null", () => {
  test("三个容器都没有内容", () => {
    expect(globalLineEndpointReference(record(), "source")).toBeNull();
    expect(globalLineEndpointReference(record(), "target")).toBeNull();
  });

  test("references 里只有不匹配该端的项：target 查询不应被 source 项与 legacy i 项命中", () => {
    const recordWithOtherEndpointOnly = record({
      references: [
        reference("source-only", { boundaryEndpoint: "source" }),
        reference("legacy-source-only", { terminalSlot: "i" })
      ]
    });

    expect(globalLineEndpointReference(recordWithOtherEndpointOnly, "target")).toBeNull();
  });

  test("legacy terminalSlot 匹配要求该 reference 自身没有 boundaryEndpoint", () => {
    const withBoundaryEndpoint = reference("source-and-legacy-j", {
      terminalSlot: "j",
      boundaryEndpoint: "source"
    });

    expect(
      globalLineEndpointReference(record({ references: [withBoundaryEndpoint] }), "target")
    ).toBeNull();
  });
});