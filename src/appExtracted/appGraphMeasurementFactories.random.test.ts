import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCreateMeasurementItemForNode } from "./appGraphMeasurementFactories";

/**
 * `createCreateMeasurementItemForNode` 生成的 item.id 里带一段随机后缀。
 * 这不是纯视觉抖动 —— 它进 projectMeasurements（持久化）、进 runtimeSnapshot、
 * 进渲染层的 `mv-${item.id}`、还进 buildSvgDocument 导出的 SVG 元素 id，
 * 并且 measurements.ts 的 isManualMeasurementItem 会解析它的后缀。
 * 因此本文件把随机源收敛成可注入依赖（`__appScope.randomSource`），
 * 默认实现仍是 Math.random —— 本文件同时锁住「默认行为逐字不变」。
 */

const NODE = {
  id: "node-42",
  kind: "custom-device",
  name: "设备",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 60 },
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  terminals: [],
  params: {}
} as any;

// 时间戳也要钉住，否则 id 里还有一段不可复现的 Date.now()。
// 取值必须是「真实量级」：36^6 = 2176782336，即 1970-01-26 之后 Date.now() 的
// base36 才有 6 位以上字符。随手写 1_000_000（1970-01-01）会得到 4 位时间戳，
// 让下面 isManualMeasurementItem 后缀契约那条断言假红 —— 那是坏 fixture，不是缺陷。
const FIXED_NOW = 1_757_000_000_000; // 2025-09-04 附近，base36 = "mf5kfojk"（8 位）

const MEASUREMENT_TYPE = {
  id: "activePower",
  key: "activePower",
  name: "有功功率",
  defaultUnit: "kW",
  valueType: "number",
  defaultDecimals: 3,
  defaultColor: "#334155",
  defaultVisible: true
} as any;

const PROFILE_ITEM = {
  measurementTypeId: "activePower",
  role: "值",
  associatedField: "t1_node"
} as any;

/** 造一份最小可用的 __appScope；randomSource 由调用方决定是否注入。 */
function createScope(randomSource?: () => number) {
  const measurementConfig = { measurementTypes: [MEASUREMENT_TYPE], deviceProfiles: [] } as any;
  return {
    measurementConfig,
    measurementProfileItemsForMeasurementGroup: () => [PROFILE_ITEM],
    measurementSourcePointForNodeItem: (
      node: any,
      item: any,
      terminalId?: string
    ) => (terminalId
      ? `${node.id}.${terminalId}.${item.associatedField}`
      : `${node.id}.${item.associatedField}`),
    measurementTypeById: new Map([[MEASUREMENT_TYPE.id, MEASUREMENT_TYPE]]),
    ...(randomSource ? { randomSource } : {})
  } as Record<string, any>;
}

/** item.id 里 Date.now() 之后的那一截随机后缀。 */
function randomSuffixOf(id: string) {
  return id.split("-").slice(-1)[0];
}

describe("量测项 id 的随机源可注入", () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // 固定 Date.now()：id 里还有一段时间戳，不固定它就无法逐字比对。
    nowSpy = vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  test("注入固定随机源后，同一输入产出逐字相同的 id", () => {
    const scopeA = createScope(() => 0.123456789);
    const scopeB = createScope(() => 0.123456789);

    const a = createCreateMeasurementItemForNode(scopeA)(NODE, undefined, undefined);
    const b = createCreateMeasurementItemForNode(scopeB)(NODE, undefined, undefined);

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    // 两次独立构造（不同 __appScope 实例、不同闭包）结果完全一致 —— 可复现。
    expect(a!.id).toBe(b!.id);
  });

  test("注入的随机值真的进了 id 的随机后缀，而不是被忽略", () => {
    // 两个不同的随机源必须产出不同的 id；否则说明 randomSource 没接上。
    const low = createCreateMeasurementItemForNode(createScope(() => 0.123456789))(NODE)!;
    const high = createCreateMeasurementItemForNode(createScope(() => 0.999999))(NODE)!;

    expect(low.id).not.toBe(high.id);
    // 0.123456789 -> base36 "0.4fzz..." -> slice(2,6) = "4fzz"
    expect(randomSuffixOf(low.id)).toBe("4fzz");
    // 0.999999   -> base36 "0.zzzy..." -> slice(2,6) = "zzzy"
    expect(randomSuffixOf(high.id)).toBe("zzzy");
  });

  test("随机后缀仍满足 measurements.ts 的 isManualMeasurementItem 后缀格式", () => {
    // 该函数按 `${group.id}-${typeId}-<base36{6,}>-<base36{4}>` 切前缀并用
    // /^[a-z0-9]{6,}-[a-z0-9]{4}$/i 判后缀。注入随机源不能破坏这个契约，
    // 否则手工加的项会被误判成「自动生成的」而被 reconcile 覆盖。
    const item = createCreateMeasurementItemForNode(createScope(() => 0.42))(NODE)!;
    const groupId = `measurement-${NODE.id}`;

    expect(item.id.startsWith(`${groupId}-${MEASUREMENT_TYPE.id}-`)).toBe(true);
    const suffix = item.id.slice(`${groupId}-${MEASUREMENT_TYPE.id}-`.length);
    expect(suffix).toMatch(/^[a-z0-9]{6,}-[a-z0-9]{4}$/i);
  });

  test("未注入 randomSource 时回落到 Math.random，id 形状与默认一致", () => {
    // 默认路径必须「仍然随机」：同一 __appScope 上连建两次，后缀应当不同。
    // 这里同时把随机数 spy 成常量，确认回落的确实是 Math.random 本身，
    // 而不是某个被顺带硬编码的默认值。
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    try {
      const scope = createScope(); // 故意不注入 randomSource
      const factory = createCreateMeasurementItemForNode(scope);

      const a = factory(NODE)!;
      const b = factory(NODE)!;

      // Math.random 被钉住，所以两次结果一致 —— 证明默认实现确实调用了它。
      expect(a.id).toBe(b.id);
      expect(randomSuffixOf(a.id)).toBe("4fzz");
    } finally {
      randomSpy.mockRestore();
    }

    // 一旦放开 Math.random，默认路径又变回不确定 —— 兜底没有把随机性吃掉。
    const factory = createCreateMeasurementItemForNode(createScope());
    expect(randomSuffixOf(factory(NODE)!.id)).toMatch(/^[a-z0-9]{1,}$/);
    const suffixes = new Set(
      Array.from({ length: 40 }, () => randomSuffixOf(factory(NODE)!.id))
    );
    expect(suffixes.size).toBeGreaterThan(1);
  });

  test("randomSource 缺省或非函数时都回落到 Math.random，不抛错", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    try {
      for (const bogus of [undefined, null, 42, "nope", {}]) {
        const scope = createScope();
        if (bogus !== undefined) {
          scope.randomSource = bogus;
        }
        const item = createCreateMeasurementItemForNode(scope)(NODE);
        expect(item).not.toBeNull();
        expect(randomSuffixOf(item!.id)).toBe("4fzz");
      }
    } finally {
      randomSpy.mockRestore();
    }
  });

  test("randomSource 每次调用都被重新取，构造期注入后仍可覆盖", () => {
    // 守卫这条：__appScope 每帧重建，randomSource 不能在工厂构造时被快照走。
    // 若实现写成 `const rs = __appScope.randomSource ?? Math.random` 放在工厂体内，
    // 下面这次覆盖就不会生效。
    const scope = createScope(() => 0.123456789);
    const factory = createCreateMeasurementItemForNode(scope);
    expect(randomSuffixOf(factory(NODE)!.id)).toBe("4fzz");

    scope.randomSource = () => 0.999999;
    expect(randomSuffixOf(factory(NODE)!.id)).toBe("zzzy");
  });
});
