// measurements 里 6 个「零直呼」函数的直接单测（upsertMeasurementGroups 另已有 5 条）。
//
// 量测绑定的错误是**静默**的：量测点算错、容器组串改绑定设备的值，导出与拓扑计算
// 都不报错，只有核对运行结果才发现。故这些看似平凡的查找/增删函数需要被钉住。
//
// 本文件只覆盖**已核实行为正确**的函数，先跑探针确认语义再据实写断言，不改实现。
import { describe, expect, test } from "vitest";
import {
  measurementGroupForNode,
  measurementGroupsForNode,
  measurementGroupForNodeTerminal,
  upsertMeasurementGroup,
  removeMeasurementGroupForNode,
  containerMeasurementGroupId,
  cloneMeasurementItemBinding,
  EMPTY_PROJECT_MEASUREMENTS
} from "./measurements";
import type { MeasurementGroup, ProjectMeasurementConfig } from "./measurements";

// MeasurementGroup 的必填字段比想象中多（visible / anchor / offset / layout），
// 这里按真实类型补齐，避免用 as 强转绕过检查。
const group = (
  id: string,
  nodeId: string,
  terminalId: string | undefined,
  extra: Partial<MeasurementGroup> = {}
): MeasurementGroup => ({
  id,
  nodeId,
  // terminalId 是**可选属性**（terminalId?: string），设备级组不设该键而不是显式赋 undefined
  ...(terminalId === undefined ? {} : { terminalId }),
  visible: true,
  items: [],
  anchor: "top",
  offset: { x: 0, y: 0 },
  layout: "vertical",
  ...extra
});

const config: ProjectMeasurementConfig = {
  version: 1,
  groups: [group("g1", "n1", "t1"), group("g2", "n1", "t2"), group("g3", "n2", undefined)]
};

describe("measurementGroupForNode / measurementGroupsForNode（单数取首个，复数取全部）", () => {
  test("单数版：同节点多组时返回**第一个**（探针实测），不是最后也不是全部", () => {
    expect(measurementGroupForNode(config, "n1")?.id).toBe("g1");
    expect(measurementGroupForNode(config, "n2")?.id).toBe("g3");
  });

  test("单数版：节点不存在返回 undefined（调用方据此判断「无组」）", () => {
    expect(measurementGroupForNode(config, "zz")).toBeUndefined();
  });

  test("复数版：返回该节点的全部组，顺序保持原序", () => {
    expect(measurementGroupsForNode(config, "n1").map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(measurementGroupsForNode(config, "n2").map((g) => g.id)).toEqual(["g3"]);
  });

  test("复数版：无组时返回空数组（不是 undefined，便于直接 map）", () => {
    expect(measurementGroupsForNode(config, "zz")).toEqual([]);
  });
});

describe("measurementGroupForNodeTerminal（nodeId 与 terminalId 都要匹配）", () => {
  test("按 (nodeId, terminalId) 精确定位", () => {
    expect(measurementGroupForNodeTerminal(config, "n1", "t1")?.id).toBe("g1");
    expect(measurementGroupForNodeTerminal(config, "n1", "t2")?.id).toBe("g2");
  });

  test("设备级组（terminalId 为 undefined）不属本函数职责（参数是必填 string）", () => {
    // terminalId 的类型是必填 string，设备级组（无端子）由 measurementGroupForNode 取。
    // 钉住这条边界，避免有人日后把 terminalId 改成可选却没处理 undefined 命中。
    expect(measurementGroupForNode(config, "n2")?.id).toBe("g3");
    expect(measurementGroupForNode(config, "n2")?.terminalId).toBeUndefined();
  });

  test("端子不匹配返回 undefined（不跨节点、也不跨端子误取）", () => {
    expect(measurementGroupForNodeTerminal(config, "n1", "t9")).toBeUndefined();
    // 关键：nodeId 对但端子错，不得退化成「按 nodeId 取第一个」
    expect(measurementGroupForNodeTerminal(config, "n1", "t9")?.id).not.toBe("g1");
  });
});

describe("upsertMeasurementGroup（按 id 覆盖或追加，不改入参）", () => {
  test("已存在同 id → 就地覆盖，条数不变", () => {
    // labelVisible 是 MeasurementGroup 的真实可选字段，用它标记「被改过」
    const next = upsertMeasurementGroup(config, group("g1", "n1", "t1", { labelVisible: false }));
    expect(next.groups).toHaveLength(3);
    expect(next.groups.find((g) => g.id === "g1")?.labelVisible).toBe(false);
    // 其它组不受影响
    expect(next.groups.map((g) => g.id)).toEqual(["g1", "g2", "g3"]);
  });

  test("新 id → 追加到末尾，version 恒为 1", () => {
    const next = upsertMeasurementGroup(config, group("g9", "n9", "t9"));
    expect(next.groups).toHaveLength(4);
    expect(next.groups.map((g) => g.id)).toEqual(["g1", "g2", "g3", "g9"]);
    expect(next.version).toBe(1);
  });

  test("不改入参（原配置对象与其 groups 保持原样）", () => {
    upsertMeasurementGroup(config, group("g1", "n1", "t1", { labelVisible: false }));
    expect(config.groups).toHaveLength(3);
    expect(config.groups[0].labelVisible).toBeUndefined();
  });

  test("空配置上新增得到单组", () => {
    const next = upsertMeasurementGroup(EMPTY_PROJECT_MEASUREMENTS, group("g1", "n1", "t1"));
    expect(next.groups).toHaveLength(1);
  });
});

describe("removeMeasurementGroupForNode（按 nodeId 删该节点全部组）", () => {
  test("删除该节点的**所有**组（不是只删一个）", () => {
    const next = removeMeasurementGroupForNode(config, "n1");
    expect(next.groups.map((g) => g.id)).toEqual(["g3"]);
  });

  test("节点不存在时原样返回等价的空操作结果（不抛错、不丢数据）", () => {
    const next = removeMeasurementGroupForNode(config, "zz");
    expect(next.groups.map((g) => g.id)).toEqual(["g1", "g2", "g3"]);
  });

  test("不改入参", () => {
    removeMeasurementGroupForNode(config, "n1");
    expect(config.groups).toHaveLength(3);
  });
});

describe("containerMeasurementGroupId（容器镜像组的 id 恒为 measurement-<containerId>）", () => {
  test("按 containerId 拼出固定前缀的 id（探针实测）", () => {
    expect(containerMeasurementGroupId("n1")).toBe("measurement-n1");
    expect(containerMeasurementGroupId("容器-1")).toBe("measurement-容器-1");
  });

  test("同一 containerId 恒得同一 id（重复同步是覆盖式、不会建重复组）", () => {
    expect(containerMeasurementGroupId("n1")).toBe(containerMeasurementGroupId("n1"));
  });

  test("不同 containerId 必得不同 id（不会串组）", () => {
    expect(containerMeasurementGroupId("n1")).not.toBe(containerMeasurementGroupId("n2"));
  });
});

describe("cloneMeasurementItemBinding（测点拷贝：防「改容器组串改绑定设备」）", () => {
  const item = {
    id: "i1",
    measurementTypeId: "mt1",
    sourcePoint: "n1.t1",
    visible: true,
    decimalsOverride: 3,
    styleOverride: { color: "red", fontSize: 12 }
  };

  test("顶层引用不同（否则两个组共享同一 item 会互相污染）", () => {
    const cloned = cloneMeasurementItemBinding(item);
    expect(cloned).not.toBe(item);
    expect(cloned).toEqual(item);
  });

  test("styleOverride 也单独拷贝（改克隆不影响原测点）", () => {
    // MeasurementStyleOverride 的字段全是原始值（color/fontFamily/fontSize/
    // fontWeight/fontStyle/textDecoration），故 { ...styleOverride } 即完整拷贝
    const cloned = cloneMeasurementItemBinding(item);
    expect(cloned.styleOverride).not.toBe(item.styleOverride);
    cloned.styleOverride!.color = "blue";
    expect(item.styleOverride.color).toBe("red");
  });

  test("无 styleOverride 时该字段为 undefined（探针实测：键存在但值为 undefined）", () => {
    // `{ ...item, styleOverride: item.styleOverride ? {...} : undefined }` 在无值时
    // 仍会**建出** styleOverride 键、只是值为 undefined。功能无害（JSON.stringify 会丢掉
    // undefined 键，`in` 判断才会看到它），此处按实测钉住真实形状，不臆断「不产生多余键」。
    const bare = cloneMeasurementItemBinding({ id: "i2", measurementTypeId: "mt2", sourcePoint: "p" });
    expect(bare.styleOverride).toBeUndefined();
    expect(Object.keys(bare).sort()).toEqual(["id", "measurementTypeId", "sourcePoint", "styleOverride"]);
    // 序列化后的实际载荷不含该键（这才是真正会落盘/传输的形状）
    expect(JSON.parse(JSON.stringify(bare))).toEqual({ id: "i2", measurementTypeId: "mt2", sourcePoint: "p" });
  });
});
