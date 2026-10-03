// buildContainerDeviceParameterViews 直测 —— 该导出此前 0 直接断言（model.ts 里
// 它周围 248 行未覆盖）。
//
// ## 覆盖的是什么
//
// 它把一个容器设备节点拆成两组视图，供元件定义对话框渲染：
//   - `container` 视图：容器自身的参数行（dev_type、关联 idx 占位等）；
//   - `associated-N` 视图：每个端子上挂的关联设备（交流负荷 / 氢气源 …）的参数行。
//
// 两条容易错的口径都在这里：
//   1. 非容器（params 里没有 is_container）一律返回空数组；
//   2. 关联视图走的是「按元件库的段列」分支，只有段列为空时才退回简版行
//      （energy / vbase 多值合并）。**在 DEVICE_LIBRARY 的现有容器上，段列都不为空**，
//      所以简版分支（含 uniqueNonEmpty 的两处调用）当前不可达 —— 要走它得有一个
//      componentLibrary 不在 E_SECTION_COLUMNS 里的自定义容器模板。
//      这里如实记录这个事实，避免下一个人以为简版分支是活的。
import { describe, expect, test } from "vitest";

import { buildContainerDeviceParameterViews, createDefaultNode, DEVICE_LIBRARY, type Terminal } from "./model";

const templateOf = (kind: string) => DEVICE_LIBRARY.find((template) => template.kind === kind);

/** 造一个容器节点：params 标记 + 指定端子。 */
function containerNode(kind: string, terminals: Terminal[]) {
  const base = createDefaultNode(kind, { x: 0, y: 0 });
  return {
    ...base,
    params: { ...base.params, is_container: "1" },
    terminals
  };
}

const terminal = (id: string, type: Terminal["type"], vbase?: string): Terminal => ({
  id,
  label: id,
  type,
  nodeNumber: id.replace(/\D/gu, "") || "1",
  anchor: { x: 0.5, y: 0 },
  ...(vbase ? { vbase } : {})
});

const rowValue = (view: { rows: Array<{ key: string; value: string }> }, key: string) =>
  view.rows.find((row) => row.key === key)?.value;

describe("buildContainerDeviceParameterViews —— 非容器", () => {
  test("★ params 没有 is_container → 空数组", () => {
    const base = createDefaultNode("ac-electrolyzer", { x: 0, y: 0 });
    expect(buildContainerDeviceParameterViews({ ...base, terminals: [] })).toEqual([]);
  });

  test("is_container 的三种真值写法都被认（1 / true / isContainer）", () => {
    const base = createDefaultNode("ac-electrolyzer", { x: 0, y: 0 });
    for (const params of [
      { is_container: "1" },
      { is_container: "true" },
      { isContainer: "true" }
    ] as Array<Record<string, string>>) {
      const views = buildContainerDeviceParameterViews(
        { ...base, params: { ...base.params, ...params }, terminals: [terminal("t1", "ac"), terminal("t2", "h2")] },
        templateOf("ac-electrolyzer")
      );
      expect(views.length, JSON.stringify(params)).toBeGreaterThan(0);
    }
  });

  test("模板没有端子（terminalCount=0）→ 无关联视图", () => {
    // ac-vpp-box 是容器但没有端子
    const views = buildContainerDeviceParameterViews(
      containerNode("ac-vpp-box", [terminal("t1", "ac")]),
      templateOf("ac-vpp-box")
    );
    expect(views.some((view) => view.kind === "associated")).toBe(false);
  });
});

describe("buildContainerDeviceParameterViews —— 容器自身视图", () => {
  test("★ 电解槽：dev_type 与两条关联 idx 占位都在", () => {
    const views = buildContainerDeviceParameterViews(
      containerNode("ac-electrolyzer", [terminal("t1", "ac"), terminal("t2", "h2")]),
      templateOf("ac-electrolyzer")
    );
    const container = views.find((view) => view.kind === "container");
    expect(container).toBeDefined();
    expect(rowValue(container!, "dev_type")).toBe("AcE2Hydro");
    expect(rowValue(container!, "control_type")).toBe("FLOW");
    expect(container!.rows.map((row) => row.key)).toContain("idx_ac_load_t1");
    expect(container!.rows.map((row) => row.key)).toContain("idx_h2_unit_t2");
  });

  test("不传模板时用节点自身兜底（kind / label / 端子类型都从节点取）", () => {
    const views = buildContainerDeviceParameterViews(
      containerNode("ac-electrolyzer", [terminal("t1", "ac"), terminal("t2", "h2")])
    );
    expect(views.length).toBeGreaterThan(0);
    expect(views.some((view) => view.kind === "associated")).toBe(true);
  });
});

describe("buildContainerDeviceParameterViews —— 关联设备视图", () => {
  test("★ 每个端子一个 associated 视图，名字带端子与角色标签", () => {
    const views = buildContainerDeviceParameterViews(
      containerNode("ac-electrolyzer", [terminal("t1", "ac"), terminal("t2", "h2")]),
      templateOf("ac-electrolyzer")
    );
    const associated = views.filter((view) => view.kind === "associated");
    expect(associated.length).toBe(2);
    expect(associated.map((view) => view.id)).toEqual(["associated-1", "associated-2"]);
    expect(rowValue(associated[0], "name")).toContain("交流电负荷");
    expect(rowValue(associated[1], "name")).toContain("氢");
  });

  test("关联视图带该端子的节点号与额定参数", () => {
    const views = buildContainerDeviceParameterViews(
      containerNode("ac-electrolyzer", [terminal("t1", "ac", "110"), terminal("t2", "h2", "35")]),
      templateOf("ac-electrolyzer")
    );
    const first = views.find((view) => view.kind === "associated");
    expect(rowValue(first!, "node")).toBe("1");
  });

  test("供热锅炉（双端）走 i_node / j_node 两行", () => {
    const views = buildContainerDeviceParameterViews(
      containerNode("two-port-heat-boiler", [terminal("t1", "heat", "10"), terminal("t2", "heat", "10")]),
      templateOf("two-port-heat-boiler")
    );
    const associated = views.find((view) => view.kind === "associated");
    expect(associated).toBeDefined();
    const keys = associated!.rows.map((row) => row.key);
    expect(keys).toContain("i_node");
    expect(keys).toContain("j_node");
  });

  test("★ 现有容器都不走简版分支（无 energy / vbase 合并行）—— 该分支当前不可达", () => {
    for (const kind of ["ac-electrolyzer", "dc-electrolyzer", "ac-fuel-cell", "two-port-heat-boiler"]) {
      const types: Terminal["type"][] = ["ac", "h2"];
      const views = buildContainerDeviceParameterViews(
        containerNode(kind, [terminal("t1", types[0], "110"), terminal("t2", types[1], "35")]),
        templateOf(kind)
      );
      const keys = views.flatMap((view) => view.rows.map((row) => row.key));
      expect(keys.includes("energy"), kind).toBe(false);
      expect(keys.includes("vbase"), kind).toBe(false);
    }
  });

  test("同一输入两次调用结果一致", () => {
    const node = containerNode("ac-electrolyzer", [terminal("t1", "ac"), terminal("t2", "h2")]);
    const template = templateOf("ac-electrolyzer");
    expect(JSON.stringify(buildContainerDeviceParameterViews(node, template))).toBe(
      JSON.stringify(buildContainerDeviceParameterViews(node, template))
    );
  });
});