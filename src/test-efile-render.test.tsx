import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { EFileEditor, isTopologyField, type EDeviceRecord } from "./EFileEditor";
import { E_REFERENCE_FIELD_TABLE_IDS } from "./model-eexport";

describe("EFileEditor tooltip 逻辑", () => {
  const records: EDeviceRecord[] = [
    {
      id: "g1", kind: "ac-source", section: "ACGenerator",
      params: { id: "1", name: "G1" }, columns: ["id", "name"]
    }
  ];

  it("组件可正常渲染（不崩溃）", () => {
    const html = renderToStaticMarkup(
      React.createElement(EFileEditor, { open: true, onClose: () => {}, records })
    );
    expect(html).toContain("E文件查看与编辑");
    expect(html).toContain("ACGenerator");
  });

  it("传入 fieldCnNames 后组件仍正常渲染", () => {
    const html = renderToStaticMarkup(
      React.createElement(EFileEditor, {
        open: true, onClose: () => {}, records,
        fieldCnNames: { ACGenerator: { id: "标识", name: "中文名称" } }
      })
    );
    expect(html).toContain("E文件查看与编辑");
  });
});

describe("isTopologyField（编辑模式禁止修改的拓扑结构字段）", () => {
  it("行标识字段 id/idx 一律禁止修改", () => {
    expect(isTopologyField("id")).toBe(true);
    expect(isTopologyField("idx")).toBe(true);
  });

  it("引用/外键字段（REFERENCE_FIELD_MAP 与 E_REFERENCE_FIELD_TABLE_IDS 中定义的）禁止修改", () => {
    // REFERENCE_FIELD_MAP 中定义的外键：节点号/厂站引用/模板引用
    for (const field of ["i_node", "j_node", "node", "ind", "znd", "ist", "zst", "itrfm"]) {
      expect(isTopologyField(field), field).toBe(true);
    }
    // E_REFERENCE_FIELD_TABLE_IDS 中定义的实时库引用 id 字段
    for (const field of ["st_id", "ist_id", "jst_id", "bv_id", "subarea_id", "aclnseg_id", "tapty_id", "dcln_id"]) {
      expect(isTopologyField(field), field).toBe(true);
    }
  });

  it("遵循 xxx_id 命名约定的通用外键字段禁止修改", () => {
    expect(isTopologyField("bay_id")).toBe(true);
    expect(isTopologyField("vl_id")).toBe(true);
    expect(isTopologyField("cmpy_id")).toBe(true);
    expect(isTopologyField("father_id")).toBe(true);
    expect(isTopologyField("line_id")).toBe(true);
    // 配网实时库引用：feeder_id/inode_id/znode_id（_id 后缀）与 node_id（REFERENCE_FIELD_MAP）
    expect(isTopologyField("feeder_id")).toBe(true);
    expect(isTopologyField("inode_id")).toBe(true);
    expect(isTopologyField("znode_id")).toBe(true);
    expect(isTopologyField("node_id")).toBe(true);
  });

  it("普通参数字段（非拓扑结构）可编辑", () => {
    for (const field of ["name", "code", "vbase", "run_stat", "p_max", "q_min", "status", "amprating"]) {
      expect(isTopologyField(field), field).toBe(false);
    }
  });

  it("与既有引用映射保持一致：映射中的每个引用字段都应被判定为拓扑字段", () => {
    for (const field of Object.keys(E_REFERENCE_FIELD_TABLE_IDS)) {
      expect(isTopologyField(field), `E_REFERENCE_FIELD_TABLE_IDS.${field}`).toBe(true);
    }
  });
});
