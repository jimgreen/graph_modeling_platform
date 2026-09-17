// 「查看/编辑E文件」窗口的列解析：必须与导出侧同一单源（eSectionColumns）。
// 成员关系段 ACContainerDev 的记录**不带 columns**（列定义由 E_SECTION_COLUMNS 兜底）——
// 编辑器只读 record.columns 时该表列集为空，表头与单元格全部不渲染（实机反馈轮 16「同一表内容仍是空」的根因）：
// 导出文件同表有列有行（导出走 formatESection → eSectionColumns），窗口却是一片空表。
import { describe, expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EFileEditor, type EDeviceRecord } from "./EFileEditor";
import { buildEDeviceRecords, buildEFileExport, finalizeEDevicePreviewRecords } from "./model-eexport";
import { assignPermanentDeviceIndex, type ModelNode, type ProjectFile } from "./model";
import { createDefaultNode } from "./model-node-ops";

/** 容器 + 1 个成员（成员经 containerId 归属）——与用户实机模型同构的最小夹具 */
function createContainerProject(): ProjectFile {
  let counters: Record<string, number> = {};
  const make = (kind: string): ModelNode => {
    const assigned = assignPermanentDeviceIndex(createDefaultNode(kind as never, { x: 100, y: 100 }), counters);
    counters = assigned.counters;
    return assigned.node;
  };
  const container = make("ac-vpp-box");
  const member = make("ac-source");
  member.containerId = container.id;
  return { version: 1, name: "编辑器列解析模型", nodes: [container, member], edges: [] };
}

/** 复刻 appView 打开窗口时的 records 生成链（buildEDeviceRecords → 定稿），取成员关系段 */
function memberRecordsFromWindowChain(project: ProjectFile): EDeviceRecord[] {
  const records = buildEDeviceRecords(project);
  finalizeEDevicePreviewRecords(project, {}, records);
  return records.filter((record) => record.section === "ACContainerDev") as EDeviceRecord[];
}

describe("EFileEditor 成员关系段列解析", () => {
  test("ACContainerDev 记录不带 columns 时仍按兜底列渲染（表头 + 单元格非空）", () => {
    const project = createContainerProject();
    const memberRecords = memberRecordsFromWindowChain(project);
    expect(memberRecords).toHaveLength(1);
    // 数据事实：成员记录没有 columns 字段（列定义在 E_SECTION_COLUMNS 兜底）—— 这正是窗口空表的前提
    expect(memberRecords[0].columns).toBeUndefined();

    const html = renderToStaticMarkup(
      createElement(EFileEditor, { open: true, onClose: () => {}, records: memberRecords })
    );

    // 三列表头必须出现在窗口里（修复前：列集为空 → 表头与行全不渲染，用户看到空表）
    expect(html).toContain("device_id");
    expect(html).toContain("container_idx");
    expect(html).toContain("container_type");
    // 单元格取值与导出文件逐值对拍：device_id 为定稿后的「表名_idx」，container_idx 为容器裸 idx
    const fileText = buildEFileExport(project).text;
    const fileRow = fileText.match(/<ACContainerDev>[\s\S]*?\n#\s+(\S+)\s+(\S+)\s+(\S+)/);
    expect(fileRow).toBeTruthy();
    expect(html).toContain(fileRow![1]);
    expect(html).toContain(`title="${fileRow![2]}"`);
    expect(html).toContain(fileRow![3]);
  });
});
