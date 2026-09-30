// src/model.ts 的 migrateElectricGenerationContainerParams：旧版「发电容器」节点
// （风电 / 光伏 / 火力 / 水电 / 核电机组）落库前补一遍 buildDefaultParams 的默认值，
// 并把 is_container 钉成 "1"。判定看的是**模板**的 kind 与 isContainer，不是节点 kind。
// 此前零断言。判错不抛异常：只是参数表少几列默认值，导出 E 文件时该有的运行值 / dev_type 不在。
//
// 19 处变异逐条跑过，全部转红（守卫两项、缺键判据、提前返回两项、合并顺序、is_container 写值）。
import { describe, expect, test } from "vitest";

import { migrateElectricGenerationContainerParams } from "./model";
import type { DeviceTemplate, ModelNode } from "./model";

type Params = Record<string, string>;

const node = (kind: string, params: Params = {}): ModelNode =>
  ({
    id: "n1",
    kind,
    name: "n1",
    nodeNumber: "n1",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    scale: 1,
    terminals: [],
    params
  }) as unknown as ModelNode;

const tpl = (kind: string, extra: Record<string, unknown> = {}): DeviceTemplate =>
  ({
    kind,
    label: kind,
    params: {},
    size: { width: 100, height: 100 },
    terminalType: "ac",
    isContainer: true,
    ...extra
  }) as unknown as DeviceTemplate;

const run = (template: DeviceTemplate, params: Params = {}): ModelNode =>
  migrateElectricGenerationContainerParams(node("placeholder", params), template);

const paramsOf = (result: ModelNode): Params => result.params as Params;

// 旧对照表里的七种（baseDeviceKind 之后比较）
const LEGACY_CONTAINER_KINDS = [
  "ac-wind-source",
  "dc-wind-source",
  "ac-pv-source",
  "dc-pv-source",
  "ac-thermal-source",
  "ac-hydro-source",
  "ac-nuclear-source"
];

// 跑一次拿到 buildDefaultParams 补出来的默认值，避免用例里抄一份会漂的清单
const defaultsOf = (kind: string): Params => paramsOf(run(tpl(kind)));

describe("migrateElectricGenerationContainerParams：适用范围", () => {
  test("★ 非容器模板原样返回**同一引用**", () => {
    for (const kind of ["ac-line", "ac-source", "ac-wind-source", "custom-x"]) {
      const input = node(kind, { p: "1" });
      expect(migrateElectricGenerationContainerParams(input, tpl(kind, { isContainer: false })), kind).toBe(input);
      expect(migrateElectricGenerationContainerParams(input, tpl(kind, { isContainer: undefined })), kind).toBe(input);
    }
  });

  test("模板 isContainer 缺字段也算非容器", () => {
    const input = node("ac-wind-source", { p: "1" });
    const template = { ...tpl("ac-wind-source"), isContainer: undefined } as unknown as DeviceTemplate;
    expect(migrateElectricGenerationContainerParams(input, template)).toBe(input);
  });

  test("★ 容器模板但 kind 不在旧对照表里也原样返回同一引用", () => {
    for (const kind of ["ac-line", "ac-storage", "diesel-source", "ac-diesel-source", "static-rect", "ac-source"]) {
      const input = node("placeholder", { p: "1" });
      expect(migrateElectricGenerationContainerParams(input, tpl(kind)), kind).toBe(input);
    }
  });

  test("七种旧对照 kind 都参与补默认值", () => {
    for (const kind of LEGACY_CONTAINER_KINDS) {
      expect(paramsOf(run(tpl(kind))).is_container, kind).toBe("1");
    }
  });

  test("-vertical 后缀按 baseDeviceKind 归一后同样命中", () => {
    expect(paramsOf(run(tpl("ac-wind-source-vertical"))).is_container).toBe("1");
  });

  test("判的是模板 kind：节点 kind 无关", () => {
    const input = node("ac-line", {});
    expect(migrateElectricGenerationContainerParams(input, tpl("ac-pv-source"))).not.toBe(input);
  });
});

describe("migrateElectricGenerationContainerParams：补什么", () => {
  test("★ 缺默认键时补齐，且 is_container 钉成 1", () => {
    const params = paramsOf(run(tpl("ac-wind-source")));
    expect(params.is_container).toBe("1");
    expect(params).toMatchObject({
      run_stat: "1",
      status: "1",
      rdf_id: "",
      frequency: "50",
      short_circuit_capacity: "500",
      p: "0",
      q: "0",
      u: "0",
      f: "0",
      dev_type: "ACWindGen"
    });
    expect(params._labelVisible).toBe("1");
    expect(params._customParamDefinitions).toBeTruthy();
  });

  test("直流机组的默认列与交流不同（i_max / i，没有 q / f）", () => {
    const params = paramsOf(run(tpl("dc-wind-source")));
    expect(params).toMatchObject({ dev_type: "DCWindGen", i_max: "2000", p: "0", u: "0", i: "0" });
    expect(Object.prototype.hasOwnProperty.call(params, "q")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(params, "f")).toBe(false);
  });

  test("dev_type 按机组类型给（不是同一个模板套全部）", () => {
    expect(paramsOf(run(tpl("ac-pv-source"))).dev_type).toBe("ACPVGen");
    expect(paramsOf(run(tpl("dc-pv-source"))).dev_type).toBe("DCPVGen");
  });

  test("★ 节点上同名的值压过默认值（只补缺的那个键）", () => {
    const defaults = defaultsOf("ac-wind-source");
    const params: Params = { ...defaults, frequency: "60", p: "5" };
    delete params.q;
    const result = paramsOf(run(tpl("ac-wind-source"), params));
    expect(result.frequency).toBe("60");
    expect(result.p).toBe("5");
    expect(result.q).toBe(defaults.q);
  });

  test("★ is_container 写成 0 也会被改回 1（节点值不让步）", () => {
    const params = paramsOf(run(tpl("ac-wind-source"), { is_container: "0" }));
    expect(params.is_container).toBe("1");
  });

  test("缺任何一个默认键都会触发重建（哪怕只缺 is_container 之外的一个）", () => {
    const defaults = defaultsOf("ac-wind-source");
    for (const key of Object.keys(defaults)) {
      if (key === "is_container") continue;
      const params: Params = { ...defaults };
      delete params[key];
      const result = run(tpl("ac-wind-source"), params);
      expect(result.params, key).not.toBe(params);
      expect(paramsOf(result)[key], key).toBe(defaults[key]);
    }
  });

  test("默认值齐全且 is_container 已是 1 时原样返回同一引用", () => {
    const params = defaultsOf("ac-wind-source");
    const input = node("placeholder", params);
    expect(migrateElectricGenerationContainerParams(input, tpl("ac-wind-source"))).toBe(input);
  });

  test("默认值齐全但 is_container 不是 1 仍要重建", () => {
    const params = { ...defaultsOf("ac-wind-source"), is_container: "0" };
    const input = node("placeholder", params);
    const result = migrateElectricGenerationContainerParams(input, tpl("ac-wind-source"));
    expect(result).not.toBe(input);
    expect(paramsOf(result).is_container).toBe("1");
  });

  test("模板 params 里写的默认值会影响补出来的结果", () => {
    const params = paramsOf(run(tpl("ac-wind-source", { params: { frequency: "60" } })));
    expect(params.frequency).toBe("60");
  });
});

describe("migrateElectricGenerationContainerParams：入参不被改", () => {
  test("节点对象与 params 都不就地改（迁移走副本）", () => {
    const original: Params = { ratedCapacity: "99 MW" };
    const input = node("placeholder", original);
    const result = migrateElectricGenerationContainerParams(input, tpl("ac-wind-source"));
    expect(result).not.toBe(input);
    expect(paramsOf(result)).not.toBe(original);
    expect(original).toEqual({ ratedCapacity: "99 MW" });
  });

  test("节点上的其余字段原样带过", () => {
    const input = node("ac-wind-source", { p: "1" });
    const result = migrateElectricGenerationContainerParams(input, tpl("ac-wind-source"));
    expect(result.id).toBe(input.id);
    expect(result.kind).toBe("ac-wind-source");
    expect(result.position).toBe(input.position);
    expect(result.terminals).toBe(input.terminals);
    expect(paramsOf(result).p).toBe("1");
  });

  test("补完再补一次不再变（幂等）", () => {
    const once = run(tpl("ac-wind-source"));
    expect(migrateElectricGenerationContainerParams(once, tpl("ac-wind-source"))).toBe(once);
  });
});
