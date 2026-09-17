// 「查看/编辑E文件」窗口的列解析：必须与导出侧同一单源（eSectionColumns）。
// 成员关系段 ACContainerDev 的记录**不带 columns**（列定义由 E_SECTION_COLUMNS 兜底）——
// 编辑器只读 record.columns 时该表列集为空，表头与单元格全部不渲染（实机反馈轮 16「同一表内容仍是空」的根因）：
// 导出文件同表有列有行（导出走 formatESection → eSectionColumns），窗口却是一片空表。
import { describe, expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { EFileEditor, type EDeviceRecord } from "./EFileEditor";
import {
  buildEDeviceRecords,
  buildEFileExport,
  eFileInterfaceDefinitionIndex,
  eOutputSectionName,
  finalizeEDevicePreviewRecords
} from "./model-eexport";
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

  test("表名 tab 统一宽度:容器挂 ref、按钮吃实测 minWidth、按最大宽度取齐（轮 21）", () => {
    // 实测宽度需真实 DOM（本环境是 node/SSR,渲染不出布局）,守源码接线:
    // 容器 ref → useLayoutEffect 量 max(getBoundingClientRect().width) → 全按钮 style.minWidth
    const source = readFileSync(new URL("./EFileEditor.tsx", import.meta.url), "utf8");
    expect(source).toContain('className="e-file-editor-tabs" ref={tabsRef}');
    expect(source).toContain("style={tabMinWidth ? { minWidth: tabMinWidth } : undefined}");
    // 量前先清零(否则标签变短后量到被撑大的旧值,宽度永远回不去),量完还原,再取 Math.max
    expect(source).toContain('button.style.minWidth = "0px"');
    expect(source).toContain("Math.max(...buttons.map((button) => button.getBoundingClientRect().width))");
    // 单位是 px:minWidth 是数值(React 会加 px);传字符串会漏单位
    expect(source).toContain("const [tabMinWidth, setTabMinWidth] = useState(0)");
  });

  test("模板态容器表以兜底名 container 出现在窗口（轮 17；轮 20 起列集与无模板态一致）", () => {
    const project = createContainerProject();
    // 模板态真实形状：有模板配置、容器类未命中模板（定义仍在、只被类门控置 exportEnabled=false）
    // —— 与实机加载模板后同一形态，列集也照样按定义重建（轮 20 裁决：两态同列）
    const options = {
      eDeviceDefinitionLabels: { ACNode: "交流节点" },
      interfaceDefinitions: [
        {
          componentLibrary: "ACNode",
          exportEnabled: true,
          exportName: "ACNode",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" }
          ]
        },
        {
          componentLibrary: "ACContainer",
          exportEnabled: false,
          exportName: "ACContainer",
          fields: ["idx", "name", "parent", "dev_type", "p", "q", "u", "i", "is_gateway", "bound_device_idx"]
            .map((column) => ({ sourceName: column, exportEnabled: true, exportName: column }))
        }
      ]
    };
    const records = buildEDeviceRecords(project, options);
    finalizeEDevicePreviewRecords(project, options, records);
    // 复刻 appView 的 sectionLabel 链：段标签与导出侧同一单源
    const defs = eFileInterfaceDefinitionIndex(options);
    const containerRecords = records
      .filter((record) => record.section === "ACContainer")
      .map((record) => ({ ...record, sectionLabel: eOutputSectionName(record.section, defs, options) }) as EDeviceRecord);
    expect(containerRecords).toHaveLength(1);
    // 段名分叉：展示标签是兜底名 container（CamelCase ACContainer 是无模板态的展示名）
    expect(containerRecords[0].sectionLabel).toBe("container");

    const html = renderToStaticMarkup(
      createElement(EFileEditor, { open: true, onClose: () => {}, records: containerRecords })
    );
    // 与导出文件列头逐项对拍（含 parent/p/q/u/i 等空值列；修复前该记录压根不产出，窗口无此表）
    expect(html).toContain(">container<");
    const fileText = buildEFileExport(project, ["默认方案"], options).text;
    const fileHeader = fileText.match(/<container>\n@\s+([^\n]+)/);
    expect(fileHeader).toBeTruthy();
    const fileColumns = fileHeader![1].trim().split(/\s+/);
    expect(fileColumns).toEqual(expect.arrayContaining(["parent", "p", "dev_type", "is_gateway"]));
    for (const column of fileColumns) {
      expect(html).toContain(column);
    }
    // 与导出文件逐值对拍：同一模型同模板下 <container> 行的首三列取值
    const containerRow = fileText.match(/<container>[\s\S]*?\n#\s+(\S+)\s+(\S+)\s+(\S+)/);
    expect(containerRow).toBeTruthy();
    expect(html).toContain(`title="${containerRow![1]}"`);
    expect(html).toContain(containerRow![2]);
    expect(html).toContain(containerRow![3]);
  });
});
